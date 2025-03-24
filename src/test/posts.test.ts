import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import postModel from "../modules/post_modules";
import jwt from "jsonwebtoken";
import { Express } from "express";
import userModel, { User } from "../modules/user_modules";

var app: Express;
let testUser: any;
let userToken: string;
type newUser = User & { token?: string };
const baseUrl = "/posts";

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
  postModel.deleteMany();
  userModel.deleteMany();
  mongoose.connection.close();
  done();
});

let postId = "";

describe("Posts API Tests", () => {
  //add post
  test("Should create a new post (201)", async () => {
    const response = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        postData: "This is a test post",
        senderId: testUser._id.toString(),
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty("_id");
    postId = response.body._id;
  });

  test("Should return 400 when creating a post without senderId", async () => {
    const response = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ postData: "No sender ID" });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("error", "Sender ID is required");
  });

  test("Should return 500 when database error occurs in addPost", async () => {
    jest.spyOn(postModel.prototype, "save").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        postData: "This is a test post",
        senderId: testUser._id.toString(),
      });

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("error", "Database error");

    jest.restoreAllMocks();
  });

  //get all posts
  test("✅ Should return posts and hasMore", async () => {
    const mockPosts = [
      { _id: "1", title: "Post 1", comments: [] },
      { _id: "2", title: "Post 2", comments: [] },
    ];

    jest.spyOn(postModel, "find").mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(mockPosts),
    } as any);

    jest.spyOn(postModel, "countDocuments").mockResolvedValue(10);

    const response = await request(app).get("/posts?page=1&limit=2");

    expect(response.status).toBe(200);
    expect(response.body.posts).toHaveLength(2);
    expect(response.body.hasMore).toBe(true);
  });

  test("⚠️ Should return 500 if database error occurs", async () => {
    jest.spyOn(postModel, "find").mockImplementation(() => {
      throw new Error("DB Error");
    });

    const response = await request(app).get("/posts");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Internal server error");
  });

  //get post by post id
  test("Should get a post by ID (200)", async () => {
    const response = await request(app).get(`/posts/${postId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("_id", postId);
  });

  //get post by sender ID
  test("Should return 200 when getting an existing post", async () => {
    const newPost = await postModel.create({
      postData: "Test post content",
      senderId: testUser._id,
    });

    const response = await request(app).get(`/posts/${newPost._id}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("_id", newPost._id.toString());
    expect(response.body).toHaveProperty("postData", "Test post content");
  });

  test("Should return 400 for an invalid post ID", async () => {
    const response = await request(app).get("/posts/invalidID");
    expect(response.statusCode).toBe(400);
  });

  test("Should return 404 if post is not found", async () => {
    const response = await request(app).get(
      `/posts/${new mongoose.Types.ObjectId()}`
    );
    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe("Post not found");
  });

  //update post
  test("Should update a post (200)", async () => {
    const response = await request(app)
      .put(`/posts/${postId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ postData: "Updated content" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("postData", "Updated content");
  });

  test("Should return 404 when updating a non-existent post", async () => {
    const response = await request(app)
      .put(`/posts/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ postData: "Updated content" });

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty("error", "Post not found");
  });

  test("Should return 400 if an error occurs while updating a post", async () => {
    const post = await postModel.create({
      postData: "Test post",
      senderId: testUser._id,
    });

    jest.spyOn(postModel, "findByIdAndUpdate").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app)
      .put(`/posts/${post._id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ postData: "Updated post content" });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("error", "Database error");

    jest.restoreAllMocks();
  });

  //like post
  test("Should like a post (200)", async () => {
    const newPost = await postModel.create({
      postData: "Post to like",
      senderId: testUser._id,
    });

    await newPost.save();
    const savedPost = await postModel.findById(newPost._id);
    console.log("✅ Saved Post in DB:", savedPost);

    const response = await request(app)
      .put(`/posts/like/${newPost._id.toString()}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ userId: testUser._id.toString() });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("message", "Post liked");
  });

  test("Should return 400 when liking a post without userId", async () => {
    const response = await request(app)
      .put(`/posts/like/${postId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message", "User ID is required");
  });

  test("Should return 404 when liking a non-existent post", async () => {
    const response = await request(app)
      .put(`/posts/like/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ userId: testUser._id.toString() });

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty("message", "Post not found");
  });

  test("Should return 500 when database error occurs", async () => {
    jest.spyOn(postModel, "findById").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app)
      .put(`/posts/like/${postId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ userId: testUser._id.toString() });

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("message", "Server error");

    jest.restoreAllMocks();
  });

  //unlike post
  test("Should unlike a post (200)", async () => {
    const response = await request(app)
      .put(`/posts/unlike/${postId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ userId: testUser._id.toString() });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("message", "Like removed");
  });

  //delete post by id
  test("Should delete a post by ID (200)", async () => {
    const response = await request(app)
      .delete(`/posts/${postId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Post deleted successfully"
    );
  });

  test("Should return 404 when deleting a non-existent post", async () => {
    const response = await request(app)
      .delete(`/posts/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty("message", "Post not found");
  });

  test("Should return 500 if an internal server error occurs while deleting a post", async () => {
    const post = await postModel.create({
      postData: "Test post",
      senderId: testUser._id,
    });

    jest.spyOn(postModel, "findByIdAndDelete").mockImplementationOnce(() => {
      throw new Error("Internal Server Error");
    });

    const response = await request(app)
      .delete(`/posts/${post._id}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty("error", "Internal Server Error");

    jest.restoreAllMocks();
  });

  //delete posts
  test("Should delete all posts and return 200", async () => {
    await postModel.create({
      postData: "Test post",
      senderId: testUser._id,
    });

    const response = await request(app)
      .delete("/posts")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "All posts and images deleted successfully"
    );
  });

  test("Should return 400 if an error occurs while deleting posts", async () => {
    jest.spyOn(postModel, "deleteMany").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    await postModel.create({
      postData: "Test post",
      senderId: testUser._id,
    });

    const response = await request(app)
      .delete("/posts")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.statusCode).toBe(500);

    jest.restoreAllMocks();
  });
});
