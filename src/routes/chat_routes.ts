import express from "express";
import chatController from "../controllers/chat_controller";
import { authMiddleware } from "../controllers/auth_controller";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Chat
 *     description: Chat API for messaging between users
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

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
 *                 description: The ID of the sender
 *               recipientId:
 *                 type: string
 *                 description: The ID of the recipient
 *               content:
 *                 type: string
 *                 description: The message content
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Recipient not found
 *       500:
 *         description: Server error
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
 *         description: The first user's ID
 *       - in: path
 *         name: userId2
 *         required: true
 *         schema:
 *           type: string
 *         description: The second user's ID
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: No messages found between users
 *       500:
 *         description: Server error
 */
router.get(
  "/history/:userId1/:userId2",
  authMiddleware,
  async (req, res, next) => {
    try {
      await chatController.getChatHistory(req, res);
    } catch (error) {
      next(error);
    }
  }
);

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
 *         description: The user ID whose conversations are being retrieved
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: No conversations found
 *       500:
 *         description: Server error
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
 *         description: The ID of the recipient who reads the messages
 *       - in: path
 *         name: senderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the sender whose messages are being marked as read
 *     responses:
 *       200:
 *         description: Messages marked as read
 *       400:
 *         description: Invalid request
 *       404:
 *         description: No messages found to mark as read
 *       500:
 *         description: Server error
 */
router.put(
  "/read/:recipientId/:senderId",
  authMiddleware,
  async (req, res, next) => {
    try {
      await chatController.markMessagesAsRead(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
