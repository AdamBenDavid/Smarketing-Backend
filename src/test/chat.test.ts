import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import chatMessageModel from "../modules/chat_modules";
import userModel from "../modules/user_modules";
import { Express } from "express";
import jwt from "jsonwebtoken";

let app: Express;
let sender: any, recipient: any, recipientToken: string, senderToken: string;

beforeAll(async () => {
  app = await initApp();

  await chatMessageModel.deleteMany();
  await userModel.deleteMany();

  sender = await userModel.create({
    _id: new mongoose.Types.ObjectId(),
    email: "test1@user.com",
    fullName: "dog",
    password: "testpassword",
    profilePicture: null,
  });

  recipient = await userModel.create({
    _id: new mongoose.Types.ObjectId(),
    email: "test2@user.com",
    fullName: "dog",
    password: "testpassword",
    profilePicture: null,
  });

  console.log("Created sender:", sender._id.toString());
  console.log("Created recipient:", recipient._id.toString());

  senderToken = jwt.sign({ _id: sender._id }, process.env.TOKEN_SECRET!, {
    expiresIn: "1h",
  });

  recipientToken = jwt.sign({ _id: recipient._id }, process.env.TOKEN_SECRET!, {
    expiresIn: "1h",
  });
});

afterAll(async () => {
  chatMessageModel.deleteMany();
  userModel.deleteMany();

  await mongoose.connection.close();
});

describe("Chat API Tests", () => {
  let messageId: string;

  test("Return 404 if conversations not found", async () => {
    const response = await request(app)
      .get(`/chat/conversations/wrongid`)
      .set("Authorization", `Bearer ${recipientToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("Return 400 if an error occurs while retrieving conversations", async () => {
    jest
      .spyOn(chatMessageModel, "aggregate")
      .mockRejectedValueOnce(new Error("Database error"));

    const response = await request(app)
      .get(`/chat/conversations/${sender._id}`)
      .set("Authorization", `Bearer ${senderToken}`);

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("error", "Database error");

    // מנקים את ה-spy
    jest.restoreAllMocks();
  });

  //new message
  test("Send a new chat message", async () => {
    const response = await request(app)
      .post("/chat/send")
      .set("Authorization", `Bearer ${senderToken}`)
      .send({
        senderId: sender._id.toString(),
        recipientId: recipient._id.toString(),
        content: "Hello, this is a test message!",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty("_id");
    expect(response.body.content).toBe("Hello, this is a test message!");
    messageId = response.body._id;
  });

  test("Fail to send message (missing content)", async () => {
    const response = await request(app)
      .post("/chat/send")
      .set("Authorization", `Bearer ${senderToken}`)
      .send({
        senderId: sender._id.toString(),
        recipientId: recipient._id.toString(),
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  test("Fail to send message to non-existent user", async () => {
    const response = await request(app)
      .post("/chat/send")
      .set("Authorization", `Bearer ${senderToken}`)
      .send({
        senderId: sender._id.toString(),
        recipientId: "654321abcdefabcdefabcdef", // מזהה לא תקין
        content: "This message should fail",
      });

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty("error");
  });

  test("Handle internal server error", async () => {
    jest
      .spyOn(chatMessageModel.prototype, "save")
      .mockImplementationOnce(() => {
        throw new Error("Database error");
      });

    const response = await request(app)
      .post("/chat/send")
      .set("Authorization", `Bearer ${senderToken}`)
      .send({
        senderId: sender._id.toString(),
        recipientId: recipient._id.toString(),
        content: "This should trigger an error",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("error", "Database error");
  });

  test("Get chat history between two users", async () => {
    const response = await request(app)
      .get(`/chat/history/${sender._id}/${recipient._id}`)
      .set("Authorization", `Bearer ${senderToken}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty("content");
  });

  test("Get all conversations for a user", async () => {
    const response = await request(app)
      .get(`/chat/conversations/${sender._id}`)
      .set("Authorization", `Bearer ${senderToken}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty("lastMessage");
  });

  test("Mark messages as read", async () => {
    const response = await request(app)
      .put(`/chat/read/${recipient._id}/${sender._id}`)
      .set("Authorization", `Bearer ${recipientToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Messages marked as read");

    // בדיקה שההודעות סומנו כנקראו
    const updatedMessages = await chatMessageModel.find({
      senderId: sender._id,
      recipientId: recipient._id,
    });

    expect(updatedMessages.every((msg) => msg.read === true)).toBeTruthy();
  });

  test("Return 400 if an error occurs while marking messages as read", async () => {
    jest
      .spyOn(chatMessageModel, "updateMany")
      .mockRejectedValueOnce(new Error("Database error"));

    const response = await request(app)
      .put(`/chat/read/${recipient._id}/${sender._id}`)
      .set("Authorization", `Bearer ${recipientToken}`);

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("error", "Database error");

    jest.restoreAllMocks(); // מחזירים את ההתנהגות המקורית
  });

  test("Return null if chat history not found", async () => {
    const response = await request(app)
      .get(`/chat/history/${sender._id}/wrongid`)
      .set("Authorization", `Bearer ${recipientToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("Return 400 if trying to send a message without content", async () => {
    const response = await request(app)
      .post("/chat/send")
      .set("Authorization", `Bearer ${senderToken}`)
      .send({
        senderId: sender._id.toString(),
        recipientId: recipient._id.toString(),
      });

    expect(response.statusCode).toBe(400);
  });
});
