import { NextFunction, Request, Response } from "express";
import userModel, { User } from "../modules/user_modules";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Document } from "mongoose";
import { log, profile } from "console";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleSignin = async (req: Request, res: Response): Promise<void> => {
  const credential = req.body.credential;
  if (!credential) {
    console.error(" Missing credential");
    res.status(400).send("Missing Google credential");
    return;
  }

  try {
    console.log("Verifying Google ID token...");
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log("🔹 Google Payload:", payload);

    if (!payload || !payload.email) {
      console.error("Invalid Google token or missing email in payload");
      res.status(400).send("Invalid Google token");
      return;
    }

    const email = payload.email;
    let user = await userModel.findOne({ email });

    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString("hex");

      console.log("🔹 Creating new user...");
      user = await userModel.create({
        email: email,
        password: randomPassword,
        fullName: payload.name,
        profilePicture: payload.picture,
      });
    } else {
      if (!user.profilePicture) {
        user.profilePicture = payload.picture;
        await user.save();
      }
    }

    console.log("🔹 Generating tokens for user...");
    const tokens = await generateToken(user);

    res.status(200).send({
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        profilePicture: user.profilePicture
          ? user.profilePicture
          : "https://placehold.co/150x150",
      },
      accessToken: tokens.accessToken,
    });
  } catch (err: any) {
    console.error("Google Sign-in Error:", err);
    res.status(400).send({ message: err.message });
  }
};

const generateToken = async (user: Document & User) => {
  const accessToken = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET!, {
    expiresIn: process.env.TOKEN_EXPIRES,
  });
  const refreshToken = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET!);
  if (!user.refreshToken) {
    user.refreshToken = [refreshToken];
  } else {
    user.refreshToken.push(refreshToken);
  }
  await user.save();
  return { accessToken, refreshToken };
};

const register = async (req: Request, res: Response) => {
  try {
    console.log("reg body" + req.body.fullName);
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await userModel.create({
      email: req.body.email,
      fullName: req.body.fullName,
      password: hashedPassword,
    });
    console.log("register user" + user);
    res.status(200).send(user);
  } catch (err) {
    res.status(400).send(err);
  }
};

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

const createToken = (userId: string): Tokens | null => {
  if (!process.env.TOKEN_SECRET) {
    return null;
  }
  // generate token
  const random = Math.random().toString();
  const accessToken = jwt.sign(
    {
      _id: userId,
      random: random,
    },
    process.env.TOKEN_SECRET,
    { expiresIn: process.env.TOKEN_EXPIRES }
  );

  const refreshToken = jwt.sign(
    {
      _id: userId,
      random: random,
    },
    process.env.TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES }
  );
  return {
    accessToken: accessToken,
    refreshToken: refreshToken,
  };
};

const login = async (req: Request, res: Response) => {
  try {
    const user = await userModel.findOne({ email: req.body.email });
    if (!user) {
      res.status(400).send("wrong name or password");
      return;
    }
    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword) {
      res.status(400).send("wrong name or password");
      return;
    }
    if (!process.env.TOKEN_SECRET) {
      res.status(500).send("Server Error");
      return;
    }
    // generate token
    const tokens = createToken(user._id);
    if (!tokens) {
      res.status(500).send("Server Error");
      return;
    }
    if (!user.refreshToken) {
      user.refreshToken = [];
    }
    user.refreshToken.push(tokens.refreshToken);
    await user.save();
    res.status(200).send({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      _id: user._id,
      fullName: user.fullName,
      profilePicture: user.profilePicture
        ? `http://localhost:3000/${user.profilePicture}`
        : null,
    });
  } catch (err) {
    res.status(400).send(err);
  }
};

//Document is the basic doc mongoose uses, we need to extend it to add the user type
//we should use a library like typegoose
type tUser = Document<unknown, {}, User> &
  User &
  Required<{
    _id: string;
  }> & {
    __v: number;
  };

const verifyRefreshToken = (refreshToken: string | undefined) => {
  return new Promise<tUser>((resolve, reject) => {
    //get refresh token from body
    if (!refreshToken) {
      reject("fail");
      return;
    }
    //verify token
    if (!process.env.TOKEN_SECRET) {
      reject("fail");
      return;
    }
    jwt.verify(
      refreshToken,
      process.env.TOKEN_SECRET,
      async (err: any, payload: any) => {
        if (err) {
          reject("fail");
          return;
        }
        //get the user id fromn token
        const userId = payload._id;
        try {
          //get the user form the db
          const user = await userModel.findById(userId);
          if (!user) {
            reject("fail");
            return;
          }
          if (!user.refreshToken || !user.refreshToken.includes(refreshToken)) {
            user.refreshToken = [];
            await user.save();
            reject("fail");
            return;
          }
          const tokens = user.refreshToken!.filter(
            (token) => token !== refreshToken
          );
          user.refreshToken = tokens;

          resolve(user);
        } catch (err) {
          reject("fail");
          return;
        }
      }
    );
  });
};

const logout = async (req: Request, res: Response) => {
  try {
    const user = await verifyRefreshToken(req.body.refreshToken);

    await user.save();
    res.status(200).send("success");
  } catch (err) {
    res.status(400).send("fail");
  }
};

const refresh = async (req: Request, res: Response) => {
  try {
    const user = await verifyRefreshToken(req.body.refreshToken);
    if (!user) {
      res.status(400).send("fail");
      return;
    }
    const tokens = createToken(user._id);

    if (!tokens) {
      res.status(500).send("Server Error");
      return;
    }
    if (!user.refreshToken) {
      user.refreshToken = [];
    }
    user.refreshToken.push(tokens.refreshToken);
    await user.save();
    res.status(200).send({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      _id: user._id,
    });
    //send new token
  } catch (err) {
    res.status(400).send("fail");
  }
};

type Payload = {
  _id: string;
};

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authorization = req.header("authorization");
  const token = authorization && authorization.split(" ")[1];

  if (!token) {
    res.status(401).send("Access Denied");
    return;
  }
  if (!process.env.TOKEN_SECRET) {
    res.status(500).send("Server Error");
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET) as {
      _id: string;
      random: string;
    };
    req.params.userId = decoded._id;
    next();
  } catch (err) {
    res.status(401).send("Access Denied");
    return;
  }
};

const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    log("Updating profile...");
    const userId = req.params.id;
    const { fullName } = req.body;
    const file = req.file;

    const user = await userModel.findById(userId);
    if (!user) {
      res.status(404).send({ message: "User not found" });
      return;
    }

    if (file) {
      const uploadsDir = path.join(
        __dirname,
        "../../uploads/profile_pictures/"
      );
      if (
        user.profilePicture &&
        user.profilePicture.startsWith("uploads/profile_pictures/")
      ) {
        const oldImagePath = path.join(
          __dirname,
          "../../",
          user.profilePicture
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      user.profilePicture = `uploads/profile_pictures/${file.filename}`;
    }

    if (fullName) user.fullName = fullName;

    await user.save();

    res.status(200).send({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        fullName: user.fullName,
        profilePicture: user.profilePicture
          ? `http://localhost:3000/${user.profilePicture}`
          : null,
      },
    });
  } catch (err) {
    console.error("Profile Update Error:", err);
    res.status(500).send({ message: "Server error" });
  }
};

export default {
  register,
  login,
  refresh,
  logout,
  googleSignin,
  updateProfile,
};
