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
      profilePicture: user.profilePicture || "https://i.pravatar.cc/50",
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
    console.error("Error adding comment:", error);
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
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getCommentById = async (req: Request, res: Response) => {
  const commentId = req.params.id;
  try {
    const comment = await commentsModel.findById(commentId);
    if (comment != null) res.send(comment);
    else res.status(400).send("comment not found");
  } catch (error) {
    res.status(400).send(error);
  }
};

const updateCommentById = async (req: Request, res: Response) => {
  const commentId = req.params.id;
  const updatedData = req.body;

  try {
    const updatedPost = await commentsModel.findByIdAndUpdate(
      commentId,
      updatedData,
      {
        new: true,
      }
    );
    if (!updatedPost) {
      return res.status(404).send("Post not found");
    }
    res.status(200).send(updatedPost);
  } catch (error) {
    res.status(400).send(error);
  }
};

const deleteCommentById = async (req: Request, res: Response) => {
  console.log("Delete request received for ID:", req.params.id);

  try {
    const commentId = req.params.id;
    const comment = await commentsModel.findByIdAndDelete(commentId);
    if (!comment) {
      return res.status(404).send("Comment not found");
    }
    res.status(200).json({ message: "Comment deleted successfully", comment });
  } catch (error) {
    console.error("Error deleting comment:", error);
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
