import commentsModel, { Comment } from "../modules/comments_modules";
import { Request, Response } from "express";
import postModel from "../modules/post_modules";

const addComment = async (req: Request, res: Response) => {
  try {
    const { userId, commentData, postId } = req.body;

    if (!userId || !commentData || !postId) {
      res.status(400).json({ error: "Missing required fields" });
    }

    // Create the new comment
    const comment = new commentsModel({ userId, commentData, postId });
    await comment.save();

    // Add comment ID to the post's comments array
    const post = await postModel.findByIdAndUpdate(
      postId,
      { $push: { comments: comment._id } }, // ✅ Push new comment ID to post.comments
      { new: true }
    );

    if (!post) {
      res.status(404).json({ error: "Post not found" });
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
    const comments = await commentsModel.find(filter);

    res.send(comments);
  } catch (error) {
    res.status(400).send(error);
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
  const commentId = req.params.id;

  try {
    const comment = await commentsModel.findByIdAndDelete(commentId);
    if (!comment) {
      return res.status(404).send("Comment not found");
    }
    res.status(200).send(comment);
  } catch (error) {
    res.status(400).send(error);
  }
};

export default {
  addComment,
  getAllComments,
  getCommentById,
  updateCommentById,
  deleteCommentById,
};
