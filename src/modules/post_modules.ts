import mongoose from "mongoose";

export interface Post {
  postData: string;
  senderId: string;
}

const postSchema = new mongoose.Schema<Post>({
  postData: {
    type: String,
    required: true,
  },
  senderId: {
    type: String,
    required: true,
  },
});

const postModel = mongoose.model<Post>("Posts", postSchema);

export default postModel;