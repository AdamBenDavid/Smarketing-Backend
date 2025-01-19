import express from 'express';
import { getChatHistory, createMessage } from '../controllers/chat_controller';

const router = express.Router();

// Get chat history between two users
router.get('/history/:userId/:receiverId', getChatHistory);

// Test route for creating messages (will be handled by socket.io later)
router.post('/', createMessage);

export default router;  