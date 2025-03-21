import express from "express";
const router = express.Router();
import postsController from "../controllers/posts_controller";
import { authMiddleware } from "../controllers/auth_controller";
import upload from "../multer.config";

/**
 * @swagger
 * tags:
 *   - name: Posts
 *     description: The Posts API
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     Post:
 *       type: object
 *       required:
 *         - postData
 *         - senderId
 *       properties:
 *         postData:
 *           type: string
 *           description: The content of the post
 *         senderId:
 *           type: string
 *           description: The ID of the user who created the post
 *         image:
 *           type: string
 *           format: binary
 *           description: (Optional) Image file associated with the post
 *       example:
 *         postData: "This is a post content"
 *         senderId: "12345"
 *         image: "image.jpg"
 */

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Get all posts
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: List of all posts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       500:
 *         description: Server error.
 */
router.get("/", postsController.getAllPosts);

/**
 * @swagger
 * /posts/user/{userId}:
 *   get:
 *     summary: Get all posts by a specific user
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose posts are retrieved
 *     responses:
 *       200:
 *         description: List of posts by sender ID
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       404:
 *         description: No posts found for the given user.
 *       500:
 *         description: Server error.
 */
router.get("/user/:userId", async (req, res, next) => {
  try {
    await postsController.getPostBySenderId(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/Post'
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       500:
 *         description: Server error.
 */
router.post(
  "/",
  authMiddleware,
  upload.single("image"),
  postsController.addPost
);

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: Get a post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *     responses:
 *       200:
 *         description: Post details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       404:
 *         description: Post not found.
 *       500:
 *         description: Server error.
 */
router.get("/:id", (req, res) => {
  postsController.getPostById(req, res);
});

/**
 * @swagger
 * /posts:
 *   delete:
 *     summary: Delete all posts
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All posts deleted successfully
 *       500:
 *         description: Server error
 */
router.delete("/", authMiddleware, postsController.deletePosts);

/**
 * @swagger
 * /posts/{id}:
 *   delete:
 *     summary: Delete a post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       404:
 *         description: Post not found
 */
router.delete("/:id", authMiddleware, postsController.deletePostById);

/**
 * @swagger
 * /posts/{id}:
 *   put:
 *     summary: Update a post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post to update
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/Post'
 *     responses:
 *       200:
 *         description: Post updated successfully.
 *       404:
 *         description: Post not found.
 *       500:
 *         description: Server error.
 */
router.put("/:id", authMiddleware, upload.single("image"), (req, res) => {
  postsController.updatePostById(req, res);
});

/**
 * @swagger
 * /posts/like/{postId}:
 *   put:
 *     summary: Like a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post to like
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user liking the post
 *             example:
 *               userId: "123456789abcdef"
 *     responses:
 *       200:
 *         description: Post liked successfully.
 *       404:
 *         description: Post not found.
 *       500:
 *         description: Server error.
 */
router.put("/like/:postId", postsController.addLike);

/**
 * @swagger
 * /posts/unlike/{postId}:
 *   put:
 *     summary: Unlike a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post to unlike
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user unliking the post
 *             example:
 *               userId: "123456789abcdef"
 *     responses:
 *       200:
 *         description: Post unliked successfully.
 *       404:
 *         description: Post not found.
 *       500:
 *         description: Server error.
 */
router.put("/unlike/:postId", postsController.removeLike);

export default router;
