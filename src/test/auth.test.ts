import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import postModel from "../modules/post_modules";
import { Express } from "express";
import userSchema, { User } from "../modules/user_modules";
// import { send } from "process";
// import { OAuth2Client } from "google-auth-library";
import authController from "../controllers/auth_controller";
import jwt from "jsonwebtoken";
import path from "path";

var app: Express;
let originalTokenSecret: string | undefined;
let user: any;
let validToken: string;

beforeAll(async () => {
  app = await initApp();
  originalTokenSecret = process.env.TOKEN_SECRET;
  await userSchema.deleteMany();
  await postModel.deleteMany();

  user = await userSchema.create({
    email: "testt@user.com",
    fullName: "dog",
    password: "testpassword",
  });

  await user.save();
});

afterAll((done) => {
  mongoose.connection.close();
  userSchema.deleteMany();
  process.env.TOKEN_SECRET = originalTokenSecret;
  done();
});

afterEach(() => {
  process.env.TOKEN_SECRET = originalTokenSecret || "testsecret";
});

const baseUrl = "/auth";

type newUser = User & {
  accessToken?: string;
  refreshToken?: string;
};

const testUser: newUser = {
  email: "test@user.com",
  fullName: "dog",
  password: "testpassword",
  profilePicture: null,
};

validToken = jwt.sign({ _id: testUser._id }, process.env.TOKEN_SECRET!, {
  expiresIn: "1h",
});

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

  //generateToken function
  test("should generate access and refresh tokens", async () => {
    console.log("test user:" + user);

    if (!user) {
      return;
    }

    const tokens = await authController.generateToken(user);

    expect(tokens).toHaveProperty("accessToken");
    expect(tokens).toHaveProperty("refreshToken");
    expect(typeof tokens.accessToken).toBe("string");
    expect(typeof tokens.refreshToken).toBe("string");
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
  const userId = "testUserId";

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

  //register
  test("Auth test register", async () => {
    const response = await request(app)
      .post(baseUrl + "/register")
      .send(testUser);
    expect(response.statusCode).toBe(200);
  });

  test("Auth test register fail", async () => {
    const response = await request(app)
      .post(baseUrl + "/register")
      .send(testUser);
    expect(response.statusCode).not.toBe(200);
  });

  test("Auth test register fail", async () => {
    const response = await request(app)
      .post(baseUrl + "/register")
      .send({
        email: "sdsdfsd",
      });
    expect(response.statusCode).not.toBe(200);
    const response2 = await request(app)
      .post(baseUrl + "/register")
      .send({
        email: "",
        password: "sdfsd",
      });
    expect(response2.statusCode).not.toBe(200);
  });

  //login
  test("should fail if email is missing", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({ password: "password123" });
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("wrong name or password");
  });

  test("should fail if password is missing", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({ email: testUser.email });
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("wrong name or password");
  });

  test("should fail if user does not exist", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({ email: "nonexistent@user.com", password: "password123" });
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("wrong name or password");
  });

  test("should fail if password is incorrect", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({ email: testUser.email, password: "wrongpassword" });
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("wrong name or password");
  });

  test("should fail if TOKEN_SECRET is missing", async () => {
    delete process.env.TOKEN_SECRET;
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(response.statusCode).toBe(500);
    expect(response.text).toBe("Server Error");
  });

  test("Refresh token fail - invalid token", async () => {
    const response = await request(app)
      .post(`${baseUrl}/refresh`)
      .set("Cookie", [`refreshToken=invalidtoken`])
      .send({});
    expect(response.status).toBe(400);
  });

  jest.doMock("../controllers/auth_controller", () => ({
    ...jest.requireActual("../controllers/auth_controller"),
    createToken: jest.fn(() => null),
  }));

  test("Auth test login", async () => {
    console.log("test user:" + testUser);
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    console.log("response:" + response.text);
    expect(response.statusCode).toBe(200);
    const accessToken = response.body.accessToken;
    const refreshToken = response.body.refreshToken;
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();
    expect(response.body._id).toBeDefined();
    testUser.accessToken = accessToken;
    testUser.refreshToken = refreshToken;
    testUser._id = response.body._id;
  });

  test("Check tokens are not the same", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    const accessToken = response.body.accessToken;
    const refreshToken = response.body.refreshToken;

    expect(accessToken).not.toBe(testUser.accessToken);
    expect(refreshToken).not.toBe(testUser.refreshToken);
  });

  test("Auth test login fail", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({
        email: testUser.email,
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
      .set("Authorization", `Bearer ${validToken}`);
    expect(response.statusCode).not.toBe(401);
  });

  test("Auth middleware should return 500 if TOKEN_SECRET is missing", async () => {
    delete process.env.TOKEN_SECRET;

    const response = await request(app)
      .get(baseUrl + "/protected-route")
      .set("Authorization", `Bearer ${validToken}`);

    expect(response.statusCode).toBe(500);
    expect(response.text).toBe("Server Error");

    process.env.TOKEN_SECRET = "testsecret";
  });

  //update profile
  test("should return 404 if user is not found", async () => {
    let validNonExistingUserId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .put(baseUrl + `/profile/${validNonExistingUserId}`)
      .set("Authorization", `Bearer ${validToken}`)
      .send({ fullName: "Updated Name" });
    console.log("response update:" + response.text);
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("User not found");
  });

  test("should return 404 if not valid user id", async () => {
    const response = await request(app)
      .put(baseUrl + `/profile/notValid`)
      .set("Authorization", `Bearer ${validToken}`)
      .send({ fullName: "Updated Name" });
    console.log("response update:" + response.text);
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Invalid user ID");
  });

  test("should update fullName successfully", async () => {
    const response = await request(app)
      .put(`${baseUrl}/profile/${testUser._id}`)
      .set("Authorization", `Bearer ${validToken}`)
      .send({ fullName: "Updated Name" });
    expect(response.statusCode).toBe(200);
    expect(response.body.user.fullName).toBe("Updated Name");
  });

  test("Should return 500 if an internal server error occurs", async () => {
    jest.spyOn(userSchema, "findById").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app)
      .put(baseUrl + `/profile/${testUser._id}`)
      .set("Authorization", `Bearer ${validToken}`)
      .send({ fullName: "New Name" });

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toContain("Server error");

    jest.restoreAllMocks();
  });

  //tests
  test("Auth test me", async () => {
    const response = await request(app).post("/posts").send({
      postData: "Test Post",
      senderId: "123",
    });
    expect(response.statusCode).not.toBe(201);

    const response2 = await request(app)
      .post("/posts")
      .set({ authorization: "JWT " + testUser.accessToken })
      .send({
        postData: "Test Post",
        senderId: "123",
      });
    expect(response2.statusCode).toBe(201);
  });

  test("Test refresh token", async () => {
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: testUser.refreshToken,
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    testUser.accessToken = response.body.accessToken;
    testUser.refreshToken = response.body.refreshToken;
  });

  test("Double use refresh token", async () => {
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: testUser.refreshToken,
      });
    expect(response.statusCode).toBe(200);
    const refreshTokenNew = response.body.refreshToken;

    const response2 = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: testUser.refreshToken,
      });
    expect(response2.statusCode).not.toBe(200);

    const response3 = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: refreshTokenNew,
      });
    expect(response3.statusCode).not.toBe(200);
  });

  //logout
  test("Test logout", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(response.statusCode).toBe(200);
    testUser.accessToken = response.body.accessToken;
    testUser.refreshToken = response.body.refreshToken;

    const response2 = await request(app)
      .post(baseUrl + "/logout")
      .send({
        refreshToken: testUser.refreshToken,
      });
    expect(response2.statusCode).toBe(200);

    const response3 = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: testUser.refreshToken,
      });
    expect(response3.statusCode).not.toBe(200);
  });

  test("Logout should return 400 if refreshToken is missing or invalid", async () => {
    const response = await request(app)
      .post(baseUrl + "/logout")
      .send({ refreshToken: "invalid_refresh_token" }); // שולחים טוקן לא תקין

    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("fail"); // לוודא שהשרת מחזיר הודעת שגיאה מתאימה
  });

  jest.setTimeout(10000);
  test("Test timeout token ", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(response.statusCode).toBe(200);
    testUser.accessToken = response.body.accessToken;
    testUser.refreshToken = response.body.refreshToken;

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const response2 = await request(app)
      .post("/posts")
      .set({ authorization: "JWT " + testUser.accessToken })
      .send({
        postData: "Test Post",
        senderId: "123",
      });
    expect(response2.statusCode).not.toBe(200);

    const response3 = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: testUser.refreshToken,
      });
    expect(response3.statusCode).toBe(200);
    testUser.accessToken = response3.body.accessToken;

    const response4 = await request(app)
      .post("/posts")
      .set({ authorization: "JWT " + testUser.accessToken })
      .send({
        postData: "Test Post",
        senderId: "123",
      });
    expect(response4.statusCode).toBe(201);
  });

  test("should return null if user has no profile picture", async () => {
    const response = await request(app)
      .get(`/auth/profile/${testUser._id}`)
      .set("Authorization", `Bearer ${validToken}`);

    expect(response.statusCode).toBe(200);
    console.log("response.fullname:" + response.body.fullName);
    console.log("response.profilePicture:" + response.body.profilePicture);

    expect(response.body.profilePicture).toBeNull();
  });

  //update
  test("should update profile picture successfully", async () => {
    const filePath = path.resolve(
      __dirname,
      "../../images/default-profile.png"
    );

    const response = await request(app)
      .put(`/auth/profile/${testUser._id}`)
      .set("Authorization", `Bearer ${validToken}`)
      .attach("profilePicture", filePath);

    expect(response.statusCode).toBe(200);
    expect(response.body.user.profilePicture).toContain(
      "http://localhost:3000/uploads/profile_pictures"
    );
  });
});
