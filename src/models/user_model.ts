import mongoose from "mongoose";

export interface User {
  _id?: string;
  email: string;
  password: string;
  fullName: string;
  role: string;
  expertise: string[];
  profilePicture?: string;
  online?: boolean;
  lastSeen?: Date;
  refreshToken?: string[];
  favPat?: string;
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
    required: true,
  },
  role: {
    type: String,
    required: true,
    default: 'user'
  },
  expertise: {
    type: [String],
    default: []
  },
  profilePicture: {
    type: String,
  },
  online: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
  },
  refreshToken: {
    type: [String],
    default: []
  },
  favPat: {
    type: String,
  }
}, { timestamps: true });

const userModel = mongoose.model<User>("Users", userSchema);

export default userModel;