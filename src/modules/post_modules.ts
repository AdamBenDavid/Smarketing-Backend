import mongoose from "mongoose";

export interface Post {
  postData: string;
  senderId: string; // This is the user id of the sender

  image?: string;
  likes?: number;
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
  image: {
    type: String,
    required: false,
  },
  likes: {
    type: Number,
    required: false,
  },
});

const postModel = mongoose.model<Post>("Posts", postSchema);

export default postModel;
