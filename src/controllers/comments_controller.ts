import commentsModel, { Comment } from "../modules/comments_modules";
import { Request, Response } from "express";
import postModel from "../modules/post_modules";
import userModel from "../modules/user_modules";
import mongoose from "mongoose";

const addComment = async (req: Request, res: Response) => {
  try {
    const { userId, commentData, postId } = req.body;

    if (!userId || !commentData || !postId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: "Invalid userId format" });
      return;
    }

    const user = await userModel.findById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const comment = new commentsModel({
      userId: user._id,
      fullName: user.fullName,
      profilePicture:
        user.profilePicture ||
        `${process.env.BASE_URL}/images/default-profile.png`,
      commentData,
      postId,
    });

    await comment.save();

    const updatedPost = await postModel.findByIdAndUpdate(
      postId,
      { $push: { comments: comment._id } },
      { new: true }
    );

    if (!updatedPost) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getAllComments = async (req: Request, res: Response) => {
  try {
    const { postId } = req.query;
    const filter = postId ? { postId } : {};

    const comments = await commentsModel.find(filter).lean();

    const commentsWithUserData = await Promise.all(
      comments.map(async (comment) => {
        const user = await userModel.findById(comment.userId).lean();
        return {
          ...comment,
          fullName: user?.fullName || "Unknown User",
          profilePicture: user?.profilePicture || "",
        };
      })
    );

    res.status(200).json(commentsWithUserData);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getCommentById = async (req: Request, res: Response) => {
  const commentId = req.params.id;
  try {
    const comment = await commentsModel.findById(commentId);
    if (comment != null) res.send(comment);
    else res.status(404).json({ error: "comment not found" });
  } catch (error) {
    res.status(400).json(error);
  }
};

const updateCommentById = async (req: Request, res: Response) => {
  const commentId = req.params.id;
  const updatedData = req.body;

  try {
    const updatedComment = await commentsModel.findByIdAndUpdate(
      commentId,
      updatedData,
      {
        new: true,
      }
    );
    if (!updatedComment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    res.status(200).json(updatedComment);
    return;
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
};

import jwt from "jsonwebtoken";

const deleteCommentById = async (req: Request, res: Response) => {
  try {
    const commentId = req.params.commentId;

    // ✅ שלב 1: חילוץ הטוקן מהכותרת
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // "JWT <token>"

    if (!token || !process.env.TOKEN_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // ✅ שלב 2: פענוח הטוקן
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET) as {
      _id: string;
    };

    const userIdFromToken = decoded._id;

    // ✅ שלב 3: המשך כמו קודם
    const comment = await commentsModel.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.userId.toString() !== userIdFromToken) {
      return res.status(403).json({
        error: "Forbidden: You can only delete your own comments",
      });
    }

    await postModel.findOneAndUpdate(
      { _id: comment.postId },
      { $pull: { comments: commentId } },
      { new: true }
    );

    await commentsModel.findByIdAndDelete(commentId);
    return res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default {
  addComment,
  getAllComments,
  getCommentById,
  updateCommentById,
  deleteCommentById,
};
