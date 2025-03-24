import postModel, { Post } from "../modules/post_modules";
import userModel from "../modules/user_modules";
import multer from "multer";

("../modules/user_modules");
import { Request, Response } from "express";
import commentsModel from "../modules/comments_modules";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";

const addPost = async (req: Request, res: Response) => {
  try {
    const { postData, senderId } = req.body;
    if (!senderId) {
      res.status(400).json({ error: "Sender ID is required" });
      return;
    }

    const image = req.file ? `uploads/post_images/${req.file.filename}` : null;

    const post = new postModel({ postData, senderId, image });
    await post.save();

    res.status(201).json({
      _id: post._id,
      postData: post.postData,
      sender: senderId,
      image: image ? `${process.env.BASE_URL}/${image}` : null,
    });
    return;
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

const getAllPosts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 6;
    const skip = (page - 1) * limit;

    const posts = await postModel
      .find()
      .populate("comments")
      .skip(skip)
      .limit(limit);
    const totalPosts = await postModel.countDocuments();

    res.status(200).json({
      posts,
      hasMore: page * limit < totalPosts,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const getPostById = async (req: Request, res: Response) => {
  const postId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(postId) || !postId) {
    return res.status(400).json({ error: "Invalid post ID" });
  }

  try {
    const post = await postModel.findById(postId).populate("comments");
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    const comments = await commentsModel.find({ postId });

    res.status(200).json({ ...post.toObject(), comments });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const upload = multer({ dest: "uploads/post_images" });

const updatePostById = async (req: Request, res: Response) => {
  const postId = req.params.id;
  const { postData } = req.body;

  try {
    const existingPost = await postModel.findById(postId);
    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    let image = existingPost.image;

    //delete previous image from db
    if (req.file) {
      const newImagePath = `uploads/post_images/${req.file.filename}`;
      const oldImagePath = existingPost.image
        ? path.join(__dirname, "../../", existingPost.image)
        : null;

      if (oldImagePath && fs.existsSync(oldImagePath)) {
        try {
          await fs.promises.unlink(oldImagePath);
        } catch (err) {}
      }

      image = newImagePath;
    }

    const updatedPost = await postModel.findByIdAndUpdate(
      postId,
      { postData, image },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json(updatedPost);
    return;
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// Controller to get posts by sender
//here
const getPostBySenderId = async (req: Request, res: Response) => {
  const { userId } = req.params; // Extract userId from the URL

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const posts = await postModel.find({ senderId: userId }); // Find posts by senderId

    if (posts.length === 0) {
      return res.status(200).json({ message: "No posts found for this user" });
    }

    res.status(200).json(posts);
    return;
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const addLike = async (req: Request, res: Response): Promise<void> => {
  const { postId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ message: "User ID is required" });
    return;
  }

  try {
    const post = await postModel.findById(postId);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    if (!Array.isArray(post.likes)) post.likes = [];

    if (!post.likes.includes(userId)) {
      post.likes.push(userId);
      await post.save();
    }

    res.status(200).json({ message: "Post liked", likes: post.likes.length });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

const removeLike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    const post = await postModel.findById(postId);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    if (!Array.isArray(post.likes)) post.likes = [];

    post.likes = post.likes.filter(
      (like) => like.toString() !== userId.toString()
    );

    await post.save();
    res.status(200).json({ message: "Like removed", likes: post.likes.length });
    return;
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

const deletePosts = async (req: Request, res: Response) => {
  try {
    const allposts = await postModel.find();

    await Promise.all(
      allposts.map((post) => {
        if (post.image) {
          const imagePath = path.join(
            __dirname,
            "../../uploads/post_images",
            post.image.split("/").pop()!
          );

          return new Promise((resolve, reject) => {
            fs.unlink(imagePath, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(true);
              }
            });
          });
        }
      })
    );

    const deletedPosts = await postModel.deleteMany();
    res.status(200).json({
      message: "All posts and images deleted successfully",
      deletedPosts,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error", details: error });
  }
};

export const deletePostById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const postId = req.params.id;

  try {
    const post = await postModel.findById(postId);

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    //delete image from db
    if (post.image) {
      const imagePath = path.join(
        __dirname,
        "../../uploads/post_images",
        post.image.split("/").pop()!
      );

      try {
        await fs.promises.unlink(imagePath);
      } catch (err) {}
    }

    const deletedPost = await postModel.findByIdAndDelete(postId);
    if (!deletedPost) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default {
  addPost,
  getAllPosts,
  getPostById,
  deletePosts,
  updatePostById,
  getPostBySenderId,
  addLike,
  removeLike,
  deletePostById,
};
