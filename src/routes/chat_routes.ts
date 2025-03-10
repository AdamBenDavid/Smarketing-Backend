import express from "express";
import chatController from "../controllers/chat_controller";
import { authMiddleware } from "../controllers/auth_controller";

const router = express.Router();

/**
 * @swagger
 * /chat/send:
 *   post:
 *     summary: Send a new chat message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senderId
 *               - recipientId
 *               - content
 *             properties:
 *               senderId:
 *                 type: string
 *               recipientId:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid request
 */
router.post("/send", authMiddleware, async (req, res, next) => {
  try {
    await chatController.sendMessage(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /chat/history/{userId1}/{userId2}:
 *   get:
 *     summary: Get chat history between two users
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId1
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId2
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 *       400:
 *         description: Invalid request
 */
router.get("/history/:userId1/:userId2", authMiddleware, async (req, res, next) => {
  try {
    await chatController.getChatHistory(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /chat/conversations/{userId}:
 *   get:
 *     summary: Get all conversations for a user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *       400:
 *         description: Invalid request
 */
router.get("/conversations/:userId", authMiddleware, async (req, res, next) => {
  try {
    await chatController.getUserConversations(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /chat/read/{recipientId}/{senderId}:
 *   put:
 *     summary: Mark messages as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: senderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages marked as read
 *       400:
 *         description: Invalid request
 */
router.put("/read/:recipientId/:senderId", authMiddleware, async (req, res, next) => {
  try {
    await chatController.markMessagesAsRead(req, res);
  } catch (error) {
    next(error);
  }
});

export default router; 