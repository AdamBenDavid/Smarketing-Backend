"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const comments_controller_1 = __importDefault(require("../controllers/comments_controller"));
const auth_controller_1 = require("../controllers/auth_controller");
/**
 * @swagger
 * tags:
 *   - name: Comments
 *     description: The Comments API
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     Comment:
 *       type: object
 *       required:
 *         - userId
 *         - commentData
 *         - postId
 *       properties:
 *         userId:
 *           type: string
 *           description: The user ID of the commenter
 *         commentData:
 *           type: string
 *           description: The content of the comment
 *         postId:
 *           type: string
 *           description: The ID of the post associated with the comment
 *       example:
 *         userId: "12345"
 *         commentData: "This is a comment"
 *         postId: "67890"
 */
/**
 * @swagger
 * /comments:
 *   post:
 *     summary: Add a new comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Comment'
 *     responses:
 *       201:
 *         description: The created comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Bad request. Missing or invalid data.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       500:
 *         description: Internal server error.
 */
router.post("/", auth_controller_1.authMiddleware, comments_controller_1.default.addComment);
/**
 * @swagger
 * /comments:
 *   get:
 *     summary: Get all comments
 *     tags: [Comments]
 *     responses:
 *       200:
 *         description: List of all comments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 *       500:
 *         description: Internal server error.
 */
router.get("/", comments_controller_1.default.getAllComments);
/**
 * @swagger
 * /comments/{id}:
 *   put:
 *     summary: Update a comment by ID
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the comment to update
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Comment'
 *     responses:
 *       200:
 *         description: The updated comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Bad request. Missing required parameters or invalid data.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       404:
 *         description: Comment not found.
 *       500:
 *         description: Internal server error.
 */
router.put("/:id", auth_controller_1.authMiddleware, (req, res) => {
    comments_controller_1.default.updateCommentById(req, res);
});
/**
 * @swagger
 * /comments/{id}:
 *   get:
 *     summary: Get a comment by ID
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the comment to retrieve
 *     responses:
 *       200:
 *         description: The requested comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       404:
 *         description: Comment not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/:id", comments_controller_1.default.getCommentById);
/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Delete a comment by ID
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the comment to delete
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully deleted the comment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                   example: "Comment deleted successfully"
 *       400:
 *         description: Bad request. The provided ID is invalid or missing.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       404:
 *         description: Comment not found.
 *       500:
 *         description: Internal server error.
 */
router.delete("/:commentId", auth_controller_1.authMiddleware, (req, res) => {
    comments_controller_1.default.deleteCommentById(req, res);
});
exports.default = router;
//# sourceMappingURL=comments_routes.js.map