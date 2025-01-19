import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import ChatMessage from '../models/chat_model';

// Define types for our chat events
interface ServerToClientEvents {
  receive_message: (data: {
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: Date;
  }) => void;
}

interface ClientToServerEvents {
  join_chat: (data: { userId: string; receiverId: string }) => void;
  send_message: (data: {
    senderId: string;
    receiverId: string;
    content: string;
  }) => void;
}

export const initializeSocket = (server: HttpServer) => {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log('User connected:', socket.id);

    socket.on('join_chat', (data) => {
      const roomId = [data.userId, data.receiverId].sort().join('-');
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('send_message', async (data) => {
      try {
        const { senderId, receiverId, content } = data;
        const roomId = [senderId, receiverId].sort().join('-');
        
        const message = new ChatMessage({
          senderId,
          receiverId,
          content
        });
        await message.save();

        io.to(roomId).emit('receive_message', {
          senderId,
          receiverId,
          content,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
}; 