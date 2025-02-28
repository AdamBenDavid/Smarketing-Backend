import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import postModel from "../modules/post_modules";
import { Express } from "express";
import testposts from "./test_posts.json";
import userModel, { User } from "../modules/user_modules";

var app: Express;

type newUser = User & { token?: string };

const testUser: newUser = {
  email: "test@user.com",
  favPat: "dog",
  password: "testpassword",
}

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

let postId = "";

describe("Posts Tests", () => {
    test("Posts test get all", async () => {
      const response = await request(app).get("/posts");
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(0);
    });

    test("Test Create Post", async () => {
        const response = await request(app).post("/posts")
            .set({ authorization: "JWT " + testUser.token })
            .send(testposts[0]);
        expect(response.statusCode).toBe(200);
        expect(response.body.postData).toBe(testposts[0].postData);
        expect(response.body.senderId).toBe(testposts[0].senderId);
        postId = response.body._id;
    });

    // get all posts
    test("Test Get All Posts", async () => {
        const response = await request(app).get("/posts");
        expect(response.statusCode).toBe(200);
        expect(response.body.length).toBe(1);
    });

    // get a post by senderId
    test("Test get post by senderId", async () => {
        const response = await request(app).get(`/posts/filter?senderId=${testposts[0].senderId}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.length).toBe(1);
        expect(response.body[0].senderId).toBe(testposts[0].senderId);
        expect(response.body[0].postData).toBe(testposts[0].postData);
    });

    // get post by id
    test("Test Get Post", async () => {
        const response = await request(app).get(`/posts/${postId}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.postData).toBe(testposts[0].postData);
        expect(response.body.senderId).toBe(testposts[0].senderId);
    });

    //update post by id
    test("Test Update Post", async () => {
        //if we didnt have the token we would get 401
        const response1 = await request(app).put(`/posts/${postId}`).set({}).send({postData: "Updated Post"});
        expect(response1.statusCode).not.toBe(200);

        //if we had the token we would get 200
        const response2 = await request(app).put(`/posts/${postId}`).set({ authorization: "JWT " + testUser.token }).send({postData: "Updated Post"});
        expect(response2.statusCode).toBe(200);
        expect(response2.body.postData).toBe("Updated Post");
    });

    // delete posts
    test("Test Delete Posts", async () => {
        //if we didnt have the token we would get 401
        const response = await request(app).delete("/posts").set({ });
        expect(response.statusCode).not.toBe(200);

        //if we had the token we would get 200
        const response2 = await request(app).delete("/posts").set({ authorization: "JWT " + testUser.token });
        expect(response2.statusCode).toBe(200);
    });
});