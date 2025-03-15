import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import postModel from "../modules/user_modules";
import jwt from "jsonwebtoken";
import { Express } from "express";
import testUsers from "./test_users.json";
import userModel, { User } from "../modules/user_modules";

var app: Express;
let testUser: any;
let userToken: string;

beforeAll(async () => {
  app = await initApp();
  await postModel.deleteMany();

  await userModel.deleteMany();

  testUser = await userModel.create({
    _id: new mongoose.Types.ObjectId(),
    email: "test1@user.com",
    fullName: "dog",
    password: "testpassword",
    profilePicture: null,
  });

  userToken = jwt.sign({ _id: testUser._id }, process.env.TOKEN_SECRET!, {
    expiresIn: "1h",
  });

  console.log("✅ User created:", testUser._id.toString());
  console.log("✅ User token:", userToken);
});

afterAll((done) => {
  mongoose.connection.close();
  done();
});

let userId = "";

describe("User Tests", () => {
  //create a user
  test("Test Create User", async () => {
    const response = await request(app).post("/users").send(testUsers[0]);
    expect(response.statusCode).toBe(200);
    expect(response.body.email).toBe(testUsers[0].email);
    expect(response.body.fullName).toBe(testUsers[0].fullName);
    expect(response.body.password).toBe(testUsers[0].password);
    userId = response.body._id;
  });

  test("Should return 400 when creating a user with missing data", async () => {
    const response = await request(app).post("/users").send({}); // שליחת גוף ריק
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  // get all users
  test("User test get all", async () => {
    const response = await request(app).get("/users");
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(2);
  });

  test("Should return 400 when an error occurs while fetching users", async () => {
    jest.spyOn(userModel, "find").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app)
      .get("/users")
      .set({ authorization: "JWT " + testUser.token });

    expect(response.statusCode).toBe(400);

    jest.restoreAllMocks();
  });

  // add function- get user by id
  test("Test Get User by Id", async () => {
    const response = await request(app).get(`/users/${userId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body._id).toBe(userId);
    expect(response.body.email).toBe(testUsers[0].email);
    expect(response.body.fullName).toBe(testUsers[0].fullName);
    expect(response.body.password).toBe(testUsers[0].password);
  });

  test("Should return 400 when getting a user with an invalid ID", async () => {
    const response = await request(app).get("/users/invalidID");
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("Should return 400 when an error occurs while getting a user", async () => {
    jest.spyOn(userModel, "findById").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app).get(
      `/users/${new mongoose.Types.ObjectId()}`
    );

    expect(response.statusCode).toBe(400);

    jest.restoreAllMocks();
  });

  // delete user by id
  test("Test Delete User", async () => {
    const response = await request(app)
      .delete(`/users/${userId}`)
      .set({ authorization: "JWT " + userToken });
    expect(response.statusCode).toBe(200);
    expect(response.body._id).toBe(userId);
  });

  test("Should return 404 when deleting a non-existent user", async () => {
    const response = await request(app)
      .delete(`/users/${new mongoose.Types.ObjectId()}`)
      .set({ authorization: "JWT " + userToken });

    expect(response.statusCode).toBe(404);
    expect(response.text).toBe("User not found");
  });

  test("Should return 400 when an error occurs while deleting a user", async () => {
    jest.spyOn(userModel, "findOneAndDelete").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app)
      .delete(`/users/${new mongoose.Types.ObjectId()}`)
      .set({ authorization: "JWT " + userToken });

    expect(response.statusCode).toBe(400);

    jest.restoreAllMocks();
  });
});
