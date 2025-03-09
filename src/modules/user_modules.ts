import mongoose from "mongoose";

export interface User {
  email: string;
  fullName: string;
  password: string;
  _id?: string;
  profilePicture?: string;
  refreshToken?: string[];
  role?: string;
}

const userSchema = new mongoose.Schema<User>({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true, //GENERATE RANDOM PASSWORD FOR GOOGLE SIGN IN
  },
  fullName: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    default: 'user',
    enum: ['user', 'expert', 'admin']
  },
  refreshToken: {
    type: [String],
    default: [],
  },
  profilePicture: {
    type: String,
    required: false,
  },
});

const userModel = mongoose.model<User>("Users", userSchema);

export default userModel;
