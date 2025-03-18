import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import chatMessageModel from './modules/chat_modules';
import userModel from './modules/user_modules';

interface ConnectedUser {
  userId: string;
  socketId: string;
}

let connectedUsers: ConnectedUser[] = [];

export const initializeSocket = (server: HTTPServer) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"]
    },
    transports: ['websocket', 'polling']
  });

  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error - No token'));
    }

    try {
      // Verify token without Bearer prefix
      const decoded = jwt.verify(token, process.env.TOKEN_SECRET!) as { _id: string, random: string };
      if (!decoded._id) {
        return next(new Error('Authentication error - Invalid token payload'));
      }
      
      socket.data.userId = decoded._id;
      next();
    } catch (err) {
      console.error('[Socket] Auth error:', err);
      next(new Error('Authentication error - Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    
    // Add user to connected users list
    connectedUsers.push({
      userId: socket.data.userId,
      socketId: socket.id
    });

    // Broadcast updated online users list to all clients
    const onlineUserIds = connectedUsers.map(user => user.userId);
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

    // Handle getOnlineUsers request
    socket.on('getOnlineUsers', async () => {
      const onlineUserIds = connectedUsers.map(user => user.userId);
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
      socket.emit('onlineUsers', onlineUsers);
    });

    // Handle chat history request
    socket.on('getChatHistory', async (data: { userId: string, partnerId: string }) => {
      try {
        const messages = await chatMessageModel.find({
          $or: [
            { senderId: data.userId, recipientId: data.partnerId },
            { senderId: data.partnerId, recipientId: data.userId }
          ]
        }).sort({ timestamp: 1 });
        
        socket.emit('chat_history', messages);
      } catch (error) {
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
        const recipientSocket = connectedUsers.find(user => user.userId === data.recipientId);
        if (recipientSocket) {
          io.to(recipientSocket.socketId).emit('new_message', {
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
      const recipientSocket = connectedUsers.find(user => user.userId === data.recipientId);
      if (recipientSocket) {
        io.to(recipientSocket.socketId).emit('user_typing', {
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

        const senderSocket = connectedUsers.find(user => user.userId === data.senderId);
        if (senderSocket) {
          io.to(senderSocket.socketId).emit('messages_read', {
            by: socket.data.userId
          });
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      connectedUsers = connectedUsers.filter(user => user.socketId !== socket.id);
      
      // Broadcast updated online users list
      const onlineUserIds = connectedUsers.map(user => user.userId);
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
    });
  });

  return io;
}; 