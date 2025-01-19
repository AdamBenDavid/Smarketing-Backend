import express, { Request, Response, Router } from 'express';
import { getChatHistory, createMessage } from '../controllers/chat_controller';

const router: Router = express.Router();

// Get chat history between two users
router.get('/history/:userId/:receiverId', async (req: Request, res: Response) => {
  await getChatHistory(req, res);
});

// Test route for creating messages (will be handled by socket.io later)
router.post('/', async (req: Request, res: Response) => {
  await createMessage(req, res);
});

export default router;  