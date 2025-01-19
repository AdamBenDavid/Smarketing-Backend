import postModel, { Post } from "../models/post_model";
import { Request, Response } from "express";

const addPost = async (req: Request, res: Response): Promise<void> => {
  console.log("add post");
  try {
    const post = new postModel(req.body);
    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: "Failed to create post" });
  }
};

const getAllPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const posts = await postModel.find();
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

const getPostById = async (req: Request, res: Response): Promise<void> => {
  try {
    const post = await postModel.findById(req.params.id);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch post" });
  }
};

const deletePosts = async (req: Request, res: Response): Promise<void> => {
  try {
    await postModel.deleteMany({});
    res.status(200).json({ message: "All posts deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete posts" });
  }
};

const updatePostById = async (req: Request, res: Response): Promise<void> => {
  try {
    const post = await postModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: "Failed to update post" });
  }
};

// Controller to get posts by sender
//here
const getPostBySenderId = async (req: Request, res: Response): Promise<void> => {
  try {
    const senderId = req.query.senderId as string;
    const posts = await postModel.find({ senderId });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

export default {
  addPost,
  getAllPosts,
  getPostById,
  deletePosts,
  updatePostById,
  getPostBySenderId
};