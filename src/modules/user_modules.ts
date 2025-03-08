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
    required: true,
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
});

const userModel = mongoose.model<User>("Users", userSchema);

export default userModel;
