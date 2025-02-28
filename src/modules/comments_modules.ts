import mongoose from "mongoose";
import { Schema } from "mongoose";
import { Interface } from "readline";

export interface Comment {
  userId: string;
  commentData: string;
  postId: string;
}

const commentSchema = new mongoose.Schema<Comment>({
  userId: {
    type: String,
    required: true,
  },
  commentData: {
    type: String,
    required: true,
  },
  postId: {
    type: String,
    required: true,
  },
});


const commentsModel = mongoose.model<Comment>("Comments", commentSchema);

export default commentsModel;