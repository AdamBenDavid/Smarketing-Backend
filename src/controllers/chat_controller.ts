import chatMessageModel, { ChatMessage } from "../modules/chat_modules";
import { Request, Response } from "express";
import userModel from "../modules/user_modules";
import mongoose from "mongoose";

// Send a new message
const sendMessage = async (req: Request, res: Response) => {
  try {
    const { senderId, recipientId, content } = req.body;


    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ error: "Invalid recipient ID" });
    }

    const recipientExists = await userModel.findById(recipientId);
    if (!recipientExists) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    const message = new chatMessageModel({
      senderId,
      recipientId,
      content,
      timestamp: new Date(),
      read: false,
    });

    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// Get chat history between two users
const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { userId1, userId2 } = req.params;

    const messages = await chatMessageModel
      .find({
        $or: [
          { senderId: userId1, recipientId: userId2 },
          { senderId: userId2, recipientId: userId1 },
        ],
      })
      .sort({ timestamp: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// Get all conversations for a user
const getUserConversations = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const conversations = await chatMessageModel.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { recipientId: userId }],
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", userId] },
              "$recipientId",
              "$senderId",
            ],
          },
          lastMessage: { $first: "$content" },
          lastMessageTime: { $first: "$timestamp" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$recipientId", userId] },
                    { $eq: ["$read", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    res.status(200).json(conversations);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// Mark messages as read
const markMessagesAsRead = async (req: Request, res: Response) => {
  try {
    const { recipientId, senderId } = req.params;

    await chatMessageModel.updateMany(
      {
        recipientId,
        senderId,
        read: false,
      },
      { $set: { read: true } }
    );

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export default {
  sendMessage,
  getChatHistory,
  getUserConversations,
  markMessagesAsRead,
};
