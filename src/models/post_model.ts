import mongoose from "mongoose";

export interface Post {
  postData: string;
  senderId: string;
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const postSchema = new mongoose.Schema<Post>({
  postData: {
    type: String,
    required: true,
  },
  senderId: {
    type: String,
    required: true,
    ref: 'User'
  },
  imageUrl: {
    type: String,
    required: false,
  }
}, { timestamps: true });

const postModel = mongoose.model<Post>("Posts", postSchema);

export default postModel;