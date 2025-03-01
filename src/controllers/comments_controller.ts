import commentsModel,{ Comment }  from "../modules/comments_modules";
import { Request, Response } from "express";

const addComment = async (req:Request, res:Response) => {
  try {
    const comment = new commentsModel(req.body);
    await comment.save();
    res.send(comment);
  } catch (error) {
    res.status(400).send(error);
  }
};

const getAllComments = async (req:Request, res:Response) => {
  try {
    const comments = await commentsModel.find();
    res.send(comments);
  } catch (error) {
        res.status(400).send(error);
  }
};

const getCommentById = async (req:Request, res:Response) => {
  const commentId = req.params.id;
  try {
    const comment = await commentsModel.findById(commentId);
    if (comment != null) res.send(comment);
    else res.status(400).send("comment not found");
  } catch (error) {
      res.status(400).send(error);
  }
};

const updateCommentById = async (req:Request, res:Response) => {
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

const deleteCommentById = async (req:Request, res:Response) => {
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


export default { addComment, getAllComments, getCommentById, updateCommentById, deleteCommentById };