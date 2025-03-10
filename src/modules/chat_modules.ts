import mongoose from "mongoose";

export interface ChatMessage {
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

const chatMessageSchema = new mongoose.Schema<ChatMessage>({
  senderId: {
    type: String,
    required: true,
    ref: 'Users'
  },
  recipientId: {
    type: String,
    required: true,
    ref: 'Users'
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  }
});

const chatMessageModel = mongoose.model<ChatMessage>("ChatMessages", chatMessageSchema);

export default chatMessageModel; 