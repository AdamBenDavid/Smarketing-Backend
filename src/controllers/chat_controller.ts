import { Request, Response } from 'express';
import ChatMessage from '../models/chat_model';
import mongoose from 'mongoose';
import User from '../models/user_model';

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { userId, receiverId } = req.params;
    
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ 
        error: 'Invalid user ID format',
        userId,
        receiverId
      });
    }

    // Verify that both users exist
    const [user1, user2] = await Promise.all([
      User.findById(userId),
      User.findById(receiverId)
    ]);

    if (!user1 || !user2) {
      return res.status(404).json({
        error: 'User not found',
        details: !user1 ? 'First user not found' : 'Second user not found'
      });
    }

    const messages = await ChatMessage.find({
      $or: [
        { senderId: new mongoose.Types.ObjectId(userId), receiverId: new mongoose.Types.ObjectId(receiverId) },
        { senderId: new mongoose.Types.ObjectId(receiverId), receiverId: new mongoose.Types.ObjectId(userId) }
      ]
    })
    .populate('senderId', 'email')
    .populate('receiverId', 'email')
    .sort({ timestamp: 1 });
    
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chat history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Test endpoint for creating messages
export const createMessage = async (req: Request, res: Response) => {
  try {
    const { senderId, receiverId, content } = req.body;
    
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ 
        error: 'Invalid user ID format',
        senderId,
        receiverId
      });
    }

    // First verify that both users exist
    const [sender, receiver] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId)
    ]);

    if (!sender || !receiver) {
      return res.status(404).json({
        error: 'User not found',
        details: !sender ? 'Sender not found' : 'Receiver not found'
      });
    }

    const message = new ChatMessage({
      senderId: new mongoose.Types.ObjectId(senderId),
      receiverId: new mongoose.Types.ObjectId(receiverId),
      content
    });
    
    const savedMessage = await message.save();
    
    // Populate user details after saving
    const populatedMessage = await ChatMessage.findById(savedMessage._id)
      .populate('senderId', 'email')
      .populate('receiverId', 'email');
      
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Detailed error:', error);
    res.status(500).json({ 
      error: 'Failed to create message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 