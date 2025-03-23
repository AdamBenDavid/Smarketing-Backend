import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import commentsModel from "../modules/comments_modules";
import { Express } from "express";
import userModel, { User } from "../modules/user_modules";
import postModel from "../modules/post_modules";

var app: Express;

type newUser = User & { _id?: string };

const testUser: newUser = {
  email: "test@user.com",
  fullName: "Test User",
  password: "testpassword",
};

const testPost = {
  senderId: "",
  postData: "Test post",
};

let commentId = "";
let postId = "";

beforeAll(async () => {
  try {
    app = await initApp();
    await commentsModel.deleteMany();
    await userModel.deleteMany();
    await postModel.deleteMany();

    // Create test user directly in DB
    const user = await userModel.create(testUser);
    testUser._id = user._id.toString();
    
    // Create test post directly in DB
    testPost.senderId = testUser._id;
    const post = await postModel.create(testPost);
    postId = post._id.toString();
  } catch (error) {
    throw error;
  }
});

afterAll(async () => {
  await userModel.deleteMany();
  await postModel.deleteMany();
  await commentsModel.deleteMany();
  await mongoose.connection.close();
});

describe("Comments API Tests", () => {
  test("GET /comments - Should return empty array initially", async () => {
    const response = await request(app).get("/comments");
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(0);
  });

  test("POST /comments - Should create a new comment", async () => {
    const commentData = {
      userId: testUser._id,
      postId,
      commentData: "This is a test comment",
    };

    const response = await request(app)
      .post("/comments")
      .send(commentData);

    expect(response.statusCode).toBe(201);
    expect(response.body.userId).toBe(commentData.userId);
    expect(response.body.postId).toBe(commentData.postId);
    expect(response.body.commentData).toBe(commentData.commentData);

    commentId = response.body._id;
  });

  test("GET /comments/:id - Should return the created comment", async () => {
    const response = await request(app).get(`/comments/${commentId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body._id).toBe(commentId);
  });

  test("GET /comments - Should return all comments", async () => {
    const response = await request(app).get("/comments");
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(1);
  });

  test("PUT /comments/:id - Should update a comment", async () => {
    const updatedComment = { commentData: "Updated Comment" };
    const response = await request(app)
      .put(`/comments/${commentId}`)
      .send(updatedComment);

    expect(response.statusCode).toBe(200);
    expect(response.body.commentData).toBe(updatedComment.commentData);
  });

  test("POST /comments - Should return 400 if required fields are missing", async () => {
    const response = await request(app)
      .post("/comments")
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe("Missing required fields");
  });

  test("POST /comments - Should return 404 if user not found", async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const response = await request(app)
      .post("/comments")
      .send({
        userId: nonExistentId,
        postId,
        commentData: "Test",
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe("User not found");
  });

  test("POST /comments - Should return 404 if post not found", async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const response = await request(app)
      .post("/comments")
      .send({
        userId: testUser._id,
        postId: nonExistentId,
        commentData: "Test",
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe("Post not found");
  });

  


 
});
