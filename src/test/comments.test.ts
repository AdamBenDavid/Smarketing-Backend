import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import commentsModel from "../modules/comments_modules";
import { Express } from "express";
import userModel, { User } from "../modules/user_modules";
import postModel from "../modules/post_modules";

var app: Express;

type newUser = User & { token?: string };

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
  app = await initApp();
  await commentsModel.deleteMany();
  await userModel.deleteMany();
  await postModel.deleteMany();

  await request(app).post("/auth/register").send(testUser);
  const loginRes = await request(app).post("/auth/login").send(testUser);
  testUser.token = loginRes.body.accessToken;
  testUser._id = loginRes.body._id;
  expect(testUser.token).toBeDefined();

  if (testUser._id) {
    testPost.senderId = testUser._id;
  } else {
    throw new Error("User ID is undefined");
  }
  const postRes = await request(app)
    .post("/posts")
    .set({ authorization: "JWT " + testUser.token })
    .send(testPost);
  postId = postRes.body._id;
});

afterAll((done) => {
  userModel.deleteMany();
  postModel.deleteMany();
  commentsModel.deleteMany();
  mongoose.connection.close();
  done();
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
      .set({ authorization: "JWT " + testUser.token })
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
      .set({ authorization: "JWT " + testUser.token })
      .send(updatedComment);

    expect(response.statusCode).toBe(200);
    expect(response.body.commentData).toBe(updatedComment.commentData);
  });

  test("POST /comments - Should return 400 if missing fields", async () => {
    const response = await request(app)
      .post("/comments")
      .set({ authorization: "JWT " + testUser.token })
      .send({ userId: testUser._id, commentData: "Missing postId" });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe("Missing required fields");
  });

  test("POST /comments - Should return 404 if user not found", async () => {
    const response = await request(app)
      .post("/comments")
      .set({ authorization: "JWT " + testUser.token })
      .send({
        userId: "60d21b4667d0d8992e610c85",
        postId,
        commentData: "Test",
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe("User not found");
  });

  test("POST /comments - Should return 404 if post not found", async () => {
    const response = await request(app)
      .post("/comments")
      .set({ authorization: "JWT " + testUser.token })
      .send({
        userId: testUser._id,
        postId: "60d21b4667d0d8992e610c85",
        commentData: "Test",
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe("Post not found");
  });

  test("GET /comments/:id - Should return 404 if comment does not exist", async () => {
    const response = await request(app).get(
      "/comments/60d21b4667d0d8992e610c85"
    );
    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe("comment not found");
  });

  test("PUT /comments/:id - Should return 404 if comment not found", async () => {
    const response = await request(app)
      .put("/comments/60d21b4667d0d8992e610c85")
      .set({ authorization: "JWT " + testUser.token })
      .send({ commentData: "Updated" });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe("Comment not found");
  });

  test("DELETE /comments/:id - Should return 404 if comment not found", async () => {
    const response = await request(app)
      .delete("/comments/60d21b4667d0d8992e610c85")
      .set({ authorization: "JWT " + testUser.token });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe("Comment not found");
  });

  test("DELETE /comments/:id - Should delete a comment", async () => {
    const response = await request(app)
      .delete(`/comments/${commentId}`)
      .set({ authorization: "JWT " + testUser.token });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Comment deleted successfully");
  });
});
