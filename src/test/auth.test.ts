import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import postModel from "../modules/post_modules";
import { Express } from "express";
import userModel, { User } from "../modules/user_modules";
// import { send } from "process";
// import { OAuth2Client } from "google-auth-library";
import authController from "../controllers/auth_controller";
import jwt from "jsonwebtoken";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";

let userToken: string;
var app: Express;
let originalTokenSecret: string | undefined;
let user: any;

beforeAll(async () => {
  app = await initApp();
  originalTokenSecret = process.env.TOKEN_SECRET;
  await userModel.deleteMany();
  await postModel.deleteMany();

  const hashedPassword = await bcrypt.hash("testpassword", 10);

  user = await userModel.create({
    _id: new mongoose.Types.ObjectId(),
    email: "test@user.com",
    fullName: "Aviv",
    password: hashedPassword,
    profilePicture: null,
  });

  userToken = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET!, {
    expiresIn: "1h",
  });

  await user.save();
});

afterAll((done) => {
  mongoose.connection.close();
  userModel.deleteMany();
  postModel.deleteMany();
  process.env.TOKEN_SECRET = originalTokenSecret;
  done();
});

afterEach(() => {
  process.env.TOKEN_SECRET = originalTokenSecret || "testsecret";
});

const baseUrl = "/auth";

// const user: newUser = {
//   email: "test@user.com",
//   fullName: "dog",
//   password: "testpassword",
//   profilePicture: null,
// };

// userToken = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET!, {
//   expiresIn: "1h",
// });

describe("Auth Tests", () => {
  //googleSignin function
  test("Google signin API - credential is missing", async () => {
    const response = await request(app).post("/auth/google").send({});
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("Missing Google credential");
  });

  test("Google login fail - missing token", async () => {
    const response = await request(app).post(`${baseUrl}/google`).send({});
    expect(response.status).toBe(400);
  });

  //register
  test("Register success", async () => {
    const response = await request(app).post(`${baseUrl}/register`).send({
      email: "aviv@gmail.com",
      password: "testpassword",
      fullName: user.fullName,
    });
    expect(response.status).toBe(200);
  });

  test("Register fail - duplicate email", async () => {
    await request(app).post(`${baseUrl}/register`).send({
      email: user.email,
      password: "testpassword",
      fullName: user.fullName,
    });
    const response = await request(app).post(`${baseUrl}/register`).send(user);
    expect(response.status).toBe(400);
  });

  test("Register fail - missing email", async () => {
    const response = await request(app).post(`${baseUrl}/register`).send({
      password: "testpassword",
      fullName: user.fullName,
    });
    expect(response.status).toBe(400);
  });

  test("Register fail - missing password", async () => {
    const response = await request(app).post(`${baseUrl}/register`).send({
      name: "Test User",
      email: "testmissingpass@user.com",
      password: "",
    });
    expect(response.status).toBe(400);
  });

  //generateToken function
  test("should generate access and refresh tokens", async () => {
    const tokens = await authController.generateToken(user);

    expect(tokens).toBeDefined();
    expect(tokens).toHaveProperty("accessToken");
    expect(tokens).toHaveProperty("refreshToken");
    expect(typeof tokens.accessToken).toBe("string");
    expect(typeof tokens.refreshToken).toBe("string");

    userToken = tokens.accessToken;

    const updatedUser = await userModel.findById(user._id);
    expect(updatedUser?.refreshToken).toContain(tokens.refreshToken);
  });

  test("should initialize refreshToken array if it does not exist", async () => {
    user.refreshToken = undefined;
    await authController.generateToken(user);
    expect(user.refreshToken).toHaveLength(1);
    expect(typeof user.refreshToken[0]).toBe("string");
  });

  test("should push refreshToken to existing array", async () => {
    user.refreshToken = ["existing-token"];
    await authController.generateToken(user);
    expect(user.refreshToken.length).toBe(2);
  });

  test("should save the user after adding refreshToken", async () => {
    const saveSpy = jest.spyOn(user, "save");
    await authController.generateToken(user);
    expect(saveSpy).toHaveBeenCalled();
  });

  // create token
  const userId = "userId";

  test("should return null if TOKEN_SECRET is not set", () => {
    delete process.env.TOKEN_SECRET; // מסירים את המשתנה הסביבתי

    const token = authController.createToken(userId);
    expect(token).toBeNull();
  });

  test("should return accessToken and refreshToken if TOKEN_SECRET is set", () => {
    process.env.TOKEN_SECRET = "testsecret"; // מגדירים טוקן זמני

    const token = authController.createToken(userId);
    expect(token).not.toBeNull();
    expect(token).toHaveProperty("accessToken");
    expect(token).toHaveProperty("refreshToken");
    expect(typeof token?.accessToken).toBe("string");
    expect(typeof token?.refreshToken).toBe("string");
  });

  //login
  test("Auth test login", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({ email: user.email, password: "testpassword" });
    expect(response.statusCode).toBe(200);
    const accessToken = response.body.accessToken;
    const refreshToken = response.body.refreshToken;
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();
    expect(response.body._id).toBeDefined();
    user.accessToken = accessToken;
    user.refreshToken = Array.isArray(user.refreshToken)
      ? [...user.refreshToken, response.body.refreshToken]
      : [response.body.refreshToken];

    user._id = response.body._id;
  });

  test("should fail if email is missing", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({ password: "testpassword" });
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("wrong email or password");
  });

  test("should fail if password is missing", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({ email: user.email });
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("wrong email or password");
  });

  test("should fail if user does not exist", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({ email: "nonexistent@user.com", password: "testpassword" });
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("wrong email or password");
  });

  test("should fail if password is incorrect", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({ email: user.email, password: "wrongpassword" });
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("wrong email or password");
  });

  test("should fail if TOKEN_SECRET is missing", async () => {
    const tokenSecret = process.env.TOKEN_SECRET;
    delete process.env.TOKEN_SECRET;
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({
        email: user.email,
        password: "testpassword",
      });
    expect(response.statusCode).toBe(500);
    expect(response.text).toBe("Server Error");
    process.env.TOKEN_SECRET = tokenSecret;
  });

  jest.doMock("../controllers/auth_controller", () => ({
    ...jest.requireActual("../controllers/auth_controller"),
    createToken: jest.fn(() => null),
  }));

  test("Check tokens are not the same", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(user);
    const accessToken = response.body.accessToken;
    const refreshToken = response.body.refreshToken;

    expect(accessToken).not.toBe(user.accessToken);
    expect(refreshToken).not.toBe([user.refreshToken.length - 1]);
  });

  test("Auth test login fail", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({
        email: user.email,
        password: "sdfsd",
      });
    expect(response.statusCode).not.toBe(200);

    const response2 = await request(app)
      .post(baseUrl + "/login")
      .send({
        email: "dsfasd",
        password: "sdfsd",
      });
    expect(response2.statusCode).not.toBe(200);
  });

  //middleware
  test("should return 401 if no token is provided", async () => {
    const response = await request(app).get(baseUrl + "/protected-route");
    expect(response.statusCode).toBe(401);
    expect(response.text).toBe("Access Denied");
  });

  test("should return 401 if token is invalid", async () => {
    const response = await request(app)
      .get(baseUrl + "/protected-route")
      .set("Authorization", "Bearer invalid_token");
    expect(response.statusCode).toBe(401);
    expect(response.text).toBe("Access Denied");
  });

  test("should pass middleware if token is valid", async () => {
    const response = await request(app)
      .get(baseUrl + "/protected-route")
      .set("Authorization", `Bearer ${userToken}`);
    expect(response.statusCode).not.toBe(401);
  });

  test("Auth middleware should return 500 if TOKEN_SECRET is missing", async () => {
    delete process.env.TOKEN_SECRET;

    const response = await request(app)
      .get(baseUrl + "/protected-route")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.statusCode).toBe(500);
    expect(response.text).toBe("Server Error");

    process.env.TOKEN_SECRET = "testsecret";
  });

  //update profile
  test("should return 404 if user is not found", async () => {
    let validNonExistingUserId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .put(baseUrl + `/profile/${validNonExistingUserId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ fullName: "Updated Name" });
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("User not found");
  });

  test("should return 404 if not valid user id", async () => {
    const response = await request(app)
      .put(baseUrl + `/profile/notValid`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ fullName: "Updated Name" });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Invalid user ID");
  });

  test("should update fullName successfully", async () => {
    const response = await request(app)
      .put(`${baseUrl}/profile/${user._id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ fullName: "Updated Name" });
    expect(response.statusCode).toBe(200);
    expect(response.body.user.fullName).toBe("Updated Name");
  });

  test("Should return 500 if an internal server error occurs", async () => {
    jest.spyOn(userModel, "findById").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app)
      .put(baseUrl + `/profile/${user._id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ fullName: "New Name" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toContain("Server error");

    jest.restoreAllMocks();
  });

  test("Auth test me", async () => {
    const response = await request(app).post("/posts").send({
      postData: "Test Post",
      senderId: "123",
    });
    expect(response.statusCode).not.toBe(201);

    const response2 = await request(app)
      .post("/posts")
      .set({ authorization: "JWT " + user.accessToken })
      .send({
        postData: "Test Post",
        senderId: "123",
      });
    expect(response2.statusCode).toBe(201);
  });

  test("Test refresh token", async () => {
    const tempUser = await userModel.findById(user._id);

    if (!tempUser || !tempUser.refreshToken) {
      throw new Error("User not found or refreshToken is missing");
    }

    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: tempUser.refreshToken[tempUser.refreshToken.length - 1],
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();

    user.accessToken = response.body.accessToken;
    user.refreshToken = Array.isArray(user.refreshToken)
      ? [...user.refreshToken, response.body.refreshToken]
      : [response.body.refreshToken];
  });

  test("Double use refresh token", async () => {
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: user.refreshToken[user.refreshToken.length - 1], // שולחים את האחרון במערך
      });

    expect(response.statusCode).toBe(200);
    const refreshTokenNew = response.body.refreshToken;

    const response2 = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: user.refreshToken[user.refreshToken.length - 1], // שוב אותו אחד
      });
    if (response2.text !== "check fail") {
    }

    expect(response2.text).toBe("check fail"); // ✅ וידוא שהתשובה תקינה

    // 🔹 ניסיון להשתמש בטוקן החדש
    const response3 = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: refreshTokenNew, // שולחים את ה-Refresh Token החדש
      });
    expect(response3.statusCode).toBe(200);
  });

  //logout
  test("Test logout", async () => {
    // First login to get valid tokens
    const loginRes = await request(app)
      .post(baseUrl + "/login")
      .send({ email: user.email, password: "testpassword" });
    
    expect(loginRes.statusCode).toBe(200);
    const validRefreshToken = loginRes.body.refreshToken;

    // Then logout using the valid token
    const logoutRes = await request(app)
      .post(baseUrl + "/logout")
      .send({ refreshToken: validRefreshToken });
    
    expect(logoutRes.statusCode).toBe(200);

    // Verify token is invalidated
    const refreshRes = await request(app)
      .post(baseUrl + "/refresh")
      .send({ refreshToken: validRefreshToken });
    
    expect(refreshRes.statusCode).not.toBe(200);
  });

  jest.setTimeout(10000);
  
});
