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
import mongoose from "mongoose";

import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const saveGoogleProfileImage = async (
  googleImageUrl: string,
  userId: string
) => {
  try {
    const response = await axios.get(googleImageUrl, {
      responseType: "arraybuffer",
    });
    const imagePath = `uploads/profile_pictures/${userId}.jpg`;
    const fullPath = path.join(__dirname, "../../", imagePath);

    fs.writeFileSync(fullPath, response.data);
    console.log("Google profile image saved:", fullPath);
    return imagePath;
  } catch (error) {
    console.error("Failed to save Google profile image:", error);
    return null;
  }
};

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
        profilePicture: "",
      });

      //save image from google
      if (payload.picture) {
        const savedImage = await saveGoogleProfileImage(
          payload.picture,
          user._id.toString()
        );
        if (savedImage) {
          user.profilePicture = savedImage;
          await user.save();
        }
      }
    } else {
      //save image from google
      if (
        !user.profilePicture ||
        user.profilePicture.includes("googleusercontent.com")
      ) {
        if (payload.picture) {
          const savedImage = await saveGoogleProfileImage(
            payload.picture,
            user._id.toString()
          );
          if (savedImage) {
            user.profilePicture = savedImage;
            await user.save();
          }
        }
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
          ? `http://localhost:3000/${user.profilePicture}`
          : null,
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
    const { email, password, fullName } = req.body;
    console.log("registering user:", email, password, fullName);

    if (!email || !password || !fullName) {
      res.status(400).send("Missing required fields");
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await userModel.create({
      email: email,
      fullName: fullName,
      password: hashedPassword,
      profilePicture: null,
    });
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
    if (!req.body.email) {
      res.status(400).send("wrong email or password");
      return;
    }
    const user = await userModel.findOne({ email: req.body.email });
    if (!user) {
      res.status(400).send("wrong email or password");
      return;
    }

    if (!req.body.password) {
      res.status(400).send("wrong email or password");
      return;
    }

    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword) {
      res.status(400).send("wrong email or password");
      return;
    }

    if (!process.env.TOKEN_SECRET) {
      res.status(500).send("Server Error");
      return;
    }
    // generate token
    const tokens = createToken(user._id);
    if (!tokens) {
      res.status(500).send("Server Error: Failed to generate tokens");
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
    res.status(400).send("Server Error: Unexpected error occurred");
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

// const verifyRefreshToken = (refreshToken: string | undefined) => {
//   return new Promise<tUser>((resolve, reject) => {
//     if (!refreshToken) {
//       reject("fail");
//       return;
//     }
//     if (!process.env.TOKEN_SECRET) {
//       reject("fail");
//       return;
//     }

//     jwt.verify(
//       refreshToken,
//       process.env.TOKEN_SECRET,
//       async (err: any, payload: any) => {
//         if (err) {
//           reject("fail");
//           return;
//         }

//         const userId = payload._id;
//         try {
//           const user = await userModel.findById(userId);
//           if (!user) {
//             reject("fail");
//             return;
//           }

//           console.log(
//             "🔹 Before removing old refreshToken:",
//             user.refreshToken
//           );

//           // **🔥 מחיקת הישן ושמירת הרשימה המעודכנת 🔥**
//           user.refreshToken = user.refreshToken?.filter(
//             (token) => token !== refreshToken
//           );
//           await user.save();

//           console.log("✅ After removing old refreshToken:", user.refreshToken);

//           resolve(user);
//         } catch (err) {
//           reject("fail");
//           return;
//         }
//       }
//     );
//   });
// };

const verifyRefreshToken = (refreshToken: string | undefined) => {
  return new Promise<tUser>(async (resolve, reject) => {
    console.log("Verifying refresh token:", refreshToken);

    if (!refreshToken) {
      console.log("No refresh token provided");
      reject("fail");
      return;
    }

    if (!process.env.TOKEN_SECRET) {
      console.log("Missing TOKEN_SECRET");
      reject("fail");
      return;
    }

    jwt.verify(
      refreshToken,
      process.env.TOKEN_SECRET,
      async (err: any, payload: any) => {
        if (err) {
          console.error("Invalid refresh token:", err);
          reject("fail");
          return;
        }

        console.log("Refresh token decoded, user ID:", payload._id);
        const userId = payload._id;

        try {
          const user = await userModel.findById(userId);
          if (!user) {
            console.log("User not found for refresh token");
            reject("fail");
            return;
          }

          console.log("User found:", user.email);
          console.log(
            "🔹 Stored refresh tokens before check:",
            user.refreshToken
          );

          if (!user.refreshToken || !user.refreshToken.includes(refreshToken)) {
            console.log("Refresh token not found in user record!");
            reject("check fail");
            return;
          }

          console.log("Refresh token found in user record.");

          user.refreshToken = user.refreshToken.filter(
            (token) => token !== refreshToken
          );
          await user.save();

          console.log(
            "Old refresh token removed, remaining tokens:",
            user.refreshToken
          );

          resolve(user);
        } catch (err) {
          console.error("Database error:", err);
          reject("fail");
        }
      }
    );
  });
};

const logout = async (req: Request, res: Response) => {
  try {
    console.log("logout " + req.body.refreshToken);
    const user = await verifyRefreshToken(req.body.refreshToken);

    console.log("logout user:", user);

    await user.save();
    res.status(200).send("success");
  } catch (err) {
    res.status(400).send("fail");
  }
};

const refresh = async (req: Request, res: Response) => {
  try {
    console.log(
      "🔹 Received refresh request with token:",
      req.body.refreshToken
    );

    console.log("refresh" + req.body.refreshToken);
    const user = await verifyRefreshToken(req.body.refreshToken).catch(
      (err) => {
        if (err === "check fail") {
          console.log("Double use of refresh token detected!");
          res.status(400).send("check fail");
          return null;
        }
        throw err;
      }
    );

    if (!user) return;

    console.log("Valid refresh token - Generating new tokens...");

    const tokens = createToken(user._id);
    if (!tokens) {
      console.log("Failed to generate tokens");
      res.status(500).send("Server Error");
      return;
    }

    console.log("Adding new refresh token to user's list...");
    if (!user.refreshToken) {
      user.refreshToken = [];
    }
    user.refreshToken.push(tokens.refreshToken);
    await user.save();

    console.log("Successfully issued new tokens:", tokens);

    res.status(200).send({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      _id: user._id,
    });
  } catch (err) {
    console.error("Error in refresh route:", err);
    res.status(500).send("Internal Server Error");
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

  console.log("🔹 Authorization token:", token);

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
    console.log("update profile userId:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).send({ message: "Invalid user ID" });
      return;
    }

    const user = await userModel.findById(userId);
    console.log("update profile user:", user);

    if (!user) {
      res.status(404).send({ message: "User not found" });
      return;
    }

    const { fullName } = req.body;
    const file = req.file;

    //delete previous image from db
    if (file) {
      const uploadsDir = path.join(
        __dirname,
        "../../uploads/profile_pictures/"
      );
      if (user.profilePicture) {
        const oldImagePath = path.join(
          __dirname,
          "../../",
          user.profilePicture
        );

        if (oldImagePath && fs.existsSync(oldImagePath)) {
          try {
            await fs.promises.unlink(oldImagePath);
            console.log("Old profile image deleted:", oldImagePath);
          } catch (err) {
            console.error("Error deleting old profile image:", err);
          }
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
    res.status(500).send({ message: "Server error" + err });
  }
};

const getUserById = async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.id;

  try {
    const user = await userModel.findById(userId).select("-password");
    if (!user) {
      res.status(404).send({ message: "User not found" });
      return;
    }

    res.status(200).send(user);
  } catch (error) {
    console.error(" Error fetching user:", error);
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
  generateToken,
  getUserById,
  createToken,
};
