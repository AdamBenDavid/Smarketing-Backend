import mongoose from "mongoose";
import { Schema } from "mongoose";
import { Interface } from "readline";

export interface Comment {
  userId: string;
  fullName: string;
  commentData: string;
  postId: string;

  profilePicture?: string;
}

const commentSchema = new Schema<Comment>({
  userId: { type: String, required: true },
  fullName: { type: String, required: true },
  profilePicture: { type: String, default: "" },
  commentData: { type: String, required: true },
  postId: { type: String, required: true },
});

const commentsModel = mongoose.model<Comment>("Comments", commentSchema);

export default commentsModel;
