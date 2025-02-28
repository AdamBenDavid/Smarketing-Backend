import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import postModel from "../modules/user_modules";
import { Express } from "express";
import testUsers from "./test_users.json";
import userModel, { User } from "../modules/user_modules";

var app: Express;

type newUser = User & { token?: string };

const testUser: newUser = {
  email: "test@user.com",
  favPat: "dog",
  password: "testpassword",
};

beforeAll(async () => {
  console.log("beforeAll");
  app = await initApp();
  await postModel.deleteMany();

  await userModel.deleteMany();
  const response = await request(app).post("/auth/register").send(testUser);
  const res = await request(app).post("/auth/login").send(testUser);

  testUser.token = res.body.accessToken; //not as eliav did
  testUser._id = res.body._id;
  expect(testUser.token).toBeDefined();
});

afterAll((done) => {
  console.log("afterAll");
  mongoose.connection.close();
  done();
});

let userId = "";

describe("User Tests", () => {
  //create a user
  test("Test Create User", async () => {
    console.log(testUsers[0]);
    const response = await request(app).post("/users").send(testUsers[0]);
    console.log("response email: " + response.body.email);
    expect(response.statusCode).toBe(200);
    expect(response.body.email).toBe(testUsers[0].email);
    expect(response.body.favPat).toBe(testUsers[0].favPat);
    expect(response.body.password).toBe(testUsers[0].password);
    userId = response.body._id;
    console.log("userId: " + userId);
  });

  test("User test get all", async () => {
    const response = await request(app).get("/users");
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(2);
  });

  // add function- get user by id
  test("Test Get User by Id", async () => {
    console.log("tests userId: " + userId);

    const response = await request(app).get(`/users/${userId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body._id).toBe(userId);
    expect(response.body.email).toBe(testUsers[0].email);
    expect(response.body.favPat).toBe(testUsers[0].favPat);
    expect(response.body.password).toBe(testUsers[0].password);
  });

  // update password by id
  test("Test Update Password", async () => {
    const response = await request(app)
      .put(`/users/${userId}`)
      .set({ authorization: "JWT " + testUser.token })
      .send({ password: "Updated Password" });
    expect(response.statusCode).toBe(200);
    expect(response.body.password).toBe("Updated Password");
  });

  // update fav' pat by id
  test("Test Update Fav' Pat", async () => {
    const response = await request(app)
      .put(`/users/${userId}`)
      .set({ authorization: "JWT " + testUser.token })
      .send({ favPat: "Updated Fav' Pat" });
    expect(response.statusCode).toBe(200);
    expect(response.body.favPat).toBe("Updated Fav' Pat");
  });

  // delete user by id
  test("Test Delete User", async () => {
    const response = await request(app)
      .delete(`/users/${userId}`)
      .set({ authorization: "JWT " + testUser.token });
    expect(response.statusCode).toBe(200);
    expect(response.body.email).toBe(testUsers[0].email);
    expect(response.body.favPat).toBe("Updated Fav' Pat");
    expect(response.body._id).toBe(userId);
    expect(response.body.password).toBe("Updated Password");
  });
});
