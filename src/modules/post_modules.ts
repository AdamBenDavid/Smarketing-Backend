import mongoose, { Schema } from "mongoose";
import { User } from "./user_modules";

export interface Post {
  senderId: String;
  postData: string;
  comments?: mongoose.Types.ObjectId[];
  image?: string;
  likes?: Array<User>;
}

const postSchema = new mongoose.Schema<Post>({
  senderId: {
    type: String,
    required: true,
  },
  postData: {
    type: String,
    required: true,
  },
  comments: [
    {
      type: Schema.Types.ObjectId,
      ref: "Comments",
    },
  ],
  image: {
    type: String,
    required: false,
  },
  likes: {
    type: Array,
    required: false,
  },
});

const postModel = mongoose.model<Post>("Posts", postSchema);

export default postModel;
