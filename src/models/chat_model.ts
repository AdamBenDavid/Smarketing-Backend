import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index for efficient querying of conversations
chatMessageSchema.index({ senderId: 1, receiverId: 1 });

export default mongoose.model('ChatMessage', chatMessageSchema); 