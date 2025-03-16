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
    console.log("add post postData " + postData + "senderId " + senderId);
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
      image: image ? `http://localhost:3000/${image}` : null,
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

    const image = req.file
      ? `uploads/post_images/${req.file.filename}`
      : existingPost.image;

    // עדכון הפוסט
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
  console.log("🔹 req.params:", JSON.stringify(req.params, null, 2));

  const { postId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ message: "User ID is required" });
    return;
  }

  console.log("🔹 postId:", postId);
  console.log("🔹 userId:", userId);

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

    // מחיקת כל התמונות
    allposts.forEach((post) => {
      if (post.image) {
        const imagePath = path.join(
          __dirname,
          "../../uploads/post_images",
          post.image.split("/").pop()!
        );
        console.log("Deleting image:", imagePath);

        fs.unlink(imagePath, (err) => {
          if (err) {
            console.error(`Failed to delete image: ${post.image}`, err);
          } else {
            console.log(`Image deleted: ${post.image}`);
          }
        });
      }
    });

    const posts = await postModel.deleteMany();
    res.send(posts);
    return;
  } catch (error) {
    res.status(400).send(error);
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

    // מחיקת התמונה
    if (post.image) {
      const imagePath = path.join(
        __dirname,
        "../../uploads/post_images",
        post.image.split("/").pop()!
      );
      console.log("Deleting image: ", imagePath);
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error("Failed to delete image:", err);
        } else {
          console.log("Image deleted successfully:", post.image);
        }
      });
    }

    const deletedPost = await postModel.findByIdAndDelete(postId);
    if (!deletedPost) {
      res.status(404).json({ message: "Post not found" });
      return;
    }
    res.status(200).json({ message: "Post deleted successfully" });
    return;
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//
export const deletePostImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("delete image backend function");
    const deleteImagePath = req.params.imagePath;

    if (!deleteImagePath) {
      res.status(400).json({ error: "Image path is required" });
      return;
    }

    const imageFullPath = path.join(
      __dirname,
      "../../uploads/post_images",
      deleteImagePath.replace("/uploads/", "")
    );

    console.log("Deleting image after edit:", imageFullPath);

    if (fs.existsSync(imageFullPath)) {
      fs.unlink(imageFullPath, (err) => {
        if (err) {
          console.error("Error deleting image:", err);
          return res.status(500).json({ error: "Failed to delete image" });
        }
        res.status(200).json({ message: "Image deleted successfully" });
      });
    } else {
      res.status(404).json({ error: "Image not found" });
    }
  } catch (error) {
    console.log("Error in deleteImage:", error);
    res.status(500).json({ error: "Internal server error" + error });
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
  deletePostImage,
};
