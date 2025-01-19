import { Request, Response } from 'express';
import ChatMessage from '../models/chat_model';

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { userId, receiverId } = req.params;
    
    const messages = await ChatMessage.find({
      $or: [
        { senderId: userId, receiverId: receiverId },
        { senderId: receiverId, receiverId: userId }
      ]
    })
    .populate('senderId', 'fullName profilePicture')
    .populate('receiverId', 'fullName profilePicture')
    .sort({ timestamp: 1 });
    
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

// Test endpoint for creating messages
export const createMessage = async (req: Request, res: Response) => {
  try {
    const { senderId, receiverId, content } = req.body;
    
    const message = new ChatMessage({
      senderId,
      receiverId,
      content
    });
    
    const savedMessage = await message.save();
    
    // Populate user details after saving
    const populatedMessage = await ChatMessage.findById(savedMessage._id)
      .populate('senderId', 'fullName profilePicture')
      .populate('receiverId', 'fullName profilePicture');
      
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
}; 