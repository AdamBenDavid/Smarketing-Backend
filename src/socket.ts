import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import chatMessageModel from './modules/chat_modules';
import userModel from './modules/user_modules';
import fs from 'fs';

interface ConnectedUser {
  userId: string;
  socketId: string;
}

// Move connectedUsers to module scope but make it a Map for better performance
const connectedUsers = new Map<string, string>(); // userId -> socketId

export const initializeSocket = (server: HTTPServer) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const io = new SocketIOServer(server, {
    cors: {
      origin: isProduction ? 'https://node10.cs.colman.ac.il' : 'http://localhost:5173',
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"]
    },
    transports: ['polling', 'websocket'],
    path: '/socket.io/'
  });

  if (isProduction) {
    const options = {
      key: fs.readFileSync('/home/st111/client-key.pem'),
      cert: fs.readFileSync('/home/st111/client-cert.pem')
    };
    // Use options for production setup
  }

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error - No token'));
    }

    try {
      const cleanToken = token.replace('Bearer ', '');
      const decoded = jwt.verify(cleanToken, process.env.TOKEN_SECRET!) as { _id: string };
      
      // Verify user exists in database
      const user = await userModel.findById(decoded._id);
      if (!user) {
        return next(new Error('Authentication error - User not found'));
      }
      
      socket.data.userId = decoded._id;
      socket.data.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error - Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.userId;
    
    // Add user to connected users
    connectedUsers.set(userId, socket.id);
    
    // Update user's online status in database
    await userModel.findByIdAndUpdate(userId, { 
      online: true,
      lastSeen: new Date()
    });

    // Broadcast updated online users list
    const broadcastOnlineUsers = async () => {
      const onlineUserIds = Array.from(connectedUsers.keys());
      const onlineUsers = await userModel.find(
        { _id: { $in: onlineUserIds } },
        {
          _id: 1,
          email: 1,
          fullName: 1,
          profilePicture: 1,
          role: 1,
          expertise: 1,
          online: 1,
          lastSeen: 1
        }
      );
      
      io.emit('onlineUsers', onlineUsers);
    };

    // Broadcast initial online users list
    await broadcastOnlineUsers();

    // Handle getOnlineUsers request
    socket.on('getOnlineUsers', async () => {
      await broadcastOnlineUsers();
    });

    // Handle chat history request
    socket.on('getChatHistory', async (data: { userId: string, partnerId: string }) => {
      try {
        console.log('[Socket] Fetching chat history for:', data);
        const messages = await chatMessageModel.find({
          $or: [
            { senderId: data.userId, recipientId: data.partnerId },
            { senderId: data.partnerId, recipientId: data.userId }
          ]
        }).sort({ timestamp: 1 });
        
        console.log('[Socket] Found messages:', messages.length);
        socket.emit('chat_history', messages);
      } catch (error) {
        console.error('[Socket] Failed to fetch chat history:', error);
        socket.emit('chat_history_error', { error: 'Failed to fetch chat history' });
      }
    });

    // Handle private messages
    socket.on('private_message', async (data: { recipientId: string, content: string }) => {
      try {
        // Save message to database
        const message = new chatMessageModel({
          senderId: socket.data.userId,
          recipientId: data.recipientId,
          content: data.content,
          timestamp: new Date(),
          read: false
        });
        await message.save();

        // Find recipient's socket if they're online
        const recipientSocket = connectedUsers.get(data.recipientId);
        if (recipientSocket) {
          io.to(recipientSocket).emit('new_message', {
            message,
            sender: socket.data.userId
          });
        }

        // Send confirmation back to sender
        socket.emit('message_sent', message);
      } catch (error) {
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Handle typing status
    socket.on('typing', (data: { recipientId: string }) => {
      const recipientSocket = connectedUsers.get(data.recipientId);
      if (recipientSocket) {
        io.to(recipientSocket).emit('user_typing', {
          userId: socket.data.userId
        });
      }
    });

    // Handle read status
    socket.on('mark_read', async (data: { senderId: string }) => {
      try {
        await chatMessageModel.updateMany(
          {
            senderId: data.senderId,
            recipientId: socket.data.userId,
            read: false
          },
          { $set: { read: true } }
        );

        const senderSocket = connectedUsers.get(data.senderId);
        if (senderSocket) {
          io.to(senderSocket).emit('messages_read', {
            by: socket.data.userId
          });
        }
      } catch (error) {
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      
      // Remove user from connected users
      connectedUsers.delete(userId);
      
      // Update user's online status and last seen
      await userModel.findByIdAndUpdate(userId, {
        online: false,
        lastSeen: new Date()
      });
      
      // Broadcast updated online users list
      await broadcastOnlineUsers();
    });
  });

  io.on('connect_error', (err) => {
  });

  return io;
}; 