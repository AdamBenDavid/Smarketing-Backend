import request from "supertest";
import { initApp } from "../server";
import mongoose from "mongoose";
import ChatMessage from "../models/chat_model";
import userModel, { User } from "../models/user_model";
import { Express } from "express";

let app: Express;

type TestUser = User & { token?: string; _id?: string };

const testUser1: TestUser = {
  email: "chattest1@test.com",
  password: "1234",
  favPat: "Dog"
};

const testUser2: TestUser = {
  email: "chattest2@test.com",
  password: "1234",
  favPat: "Cat"
};

beforeAll(async () => {
  app = await initApp();
  await ChatMessage.deleteMany({});
  await userModel.deleteMany({});

  // Register and login test users
  const register1 = await request(app).post("/auth/register").send(testUser1);
  const login1 = await request(app).post("/auth/login").send(testUser1);
  testUser1._id = login1.body._id;
  testUser1.token = login1.body.accessToken;

  const register2 = await request(app).post("/auth/register").send(testUser2);
  const login2 = await request(app).post("/auth/login").send(testUser2);
  testUser2._id = login2.body._id;
  testUser2.token = login2.body.accessToken;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Chat API Tests", () => {
  let messageId: string;

  test("Should create a new message", async () => {
    const response = await request(app)
      .post("/chat")
      .send({
        senderId: testUser1._id,
        receiverId: testUser2._id,
        content: "Hello, this is a test message!"
      });

    expect(response.status).toBe(201);
    expect(response.body.content).toBe("Hello, this is a test message!");
    expect(response.body.senderId.email).toBe(testUser1.email);
    expect(response.body.receiverId.email).toBe(testUser2.email);
    messageId = response.body._id;
  });

  test("Should get chat history between users", async () => {
    const response = await request(app)
      .get(`/chat/history/${testUser1._id}/${testUser2._id}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0].content).toBe("Hello, this is a test message!");
  });

  test("Should fail to create message with invalid user ID", async () => {
    const response = await request(app)
      .post("/chat")
      .send({
        senderId: "invalid_id",
        receiverId: testUser2._id,
        content: "This should fail"
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid user ID format");
  });

  test("Should fail to get history with invalid user ID", async () => {
    const response = await request(app)
      .get(`/chat/history/invalid_id/${testUser2._id}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid user ID format");
  });
}); 