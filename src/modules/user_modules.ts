import mongoose from "mongoose";

export interface User {
  email: string;
  fullName: string;
  password: string;
  _id?: string;
  refreshToken?: string[];
}

const userSchema = new mongoose.Schema<User>({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: false,
  },
  refreshToken: {
    type: [String],
    default: [],
  },
});

const userModel = mongoose.model<User>("Users", userSchema);

export default userModel;
