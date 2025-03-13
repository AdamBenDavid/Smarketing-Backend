import postModel, { Post } from "../modules/post_modules";
import userModel from "../modules/user_modules";
import multer from "multer";

("../modules/user_modules");
import { Request, Response } from "express";
import commentsModel from "../modules/comments_modules";

const addPost = async (req: Request, res: Response) => {
  try {
    const { postData, senderId } = req.body;
    console.log("backend postData " + postData);
    console.log("backend senderId " + senderId);
    if (!senderId) {
      res.status(400).json({ error: "Sender ID is required" });
    }

    const image = req.file ? `uploads/post_images/${req.file.filename}` : null;

    const post = new postModel({ postData, senderId, image });
    await post.save();

    res.status(201).json({
      _id: post._id,
      postData: post.postData,
      sender: senderId,
      image: image ? `http://localhost:3000/${image}` : null,
    });
  } catch (error) {
    console.log("error " + error);
    res.status(400).json({ error: (error as Error).message });
  }
};

const getAllPosts = async (req: Request, res: Response) => {
  try {
    const posts = await postModel.find().populate("comments");

    // Fetch comments for each post safely
    const postsWithComments = await Promise.all(
      posts.map(async (post) => {
        if (!post) return {};

        const comments = await commentsModel.find({ postId: post._id });
        return { ...post.toObject(), comments };
      })
    );

    res
      .status(200)
      .json(postsWithComments.filter((p) => Object.keys(p).length > 0));
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const getPostById = async (req: Request, res: Response) => {
  const postId = req.params.id;

  try {
    const post = await postModel.findById(postId).populate("comments");
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    const comments = await commentsModel.find({ postId });

    res.status(200).json({ ...post.toObject(), comments });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const deletePosts = async (req: Request, res: Response) => {
  try {
    const posts = await postModel.deleteMany();
    res.send(posts);
  } catch (error) {
    res.status(400).send(error);
  }
};

const deletePostById = async (req: Request, res: Response) => {
  console.log("delete post by id");
  const postId = req.params.id;
  try {
    const deletedPost = await postModel.findByIdAndDelete(postId);
    if (!deletedPost) {
      res.status(404).json({ message: "Post not found" });
    }
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const upload = multer({ dest: "uploads/post_images" });

const updatePostById = async (req: Request, res: Response) => {
  const postId = req.params.id;
  console.log("postId " + postId);

  const { postData } = req.body;
  console.log("backend postData " + postData);

  try {
    // קבלת הפוסט מה-DB כדי לבדוק אם יש תמונה קיימת
    const existingPost = await postModel.findById(postId);
    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    // שמירת הנתיב הקיים של התמונה אם לא הועלה קובץ חדש
    const image = req.file
      ? `uploads/post_images/${req.file.filename}`
      : existingPost.image;
    console.log("backend image " + image);

    // עדכון הפוסט
    const updatedPost = await postModel.findByIdAndUpdate(
      postId,
      { postData, image },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// Controller to get posts by sender
//here
const getPostBySenderId = async (req: Request, res: Response) => {
  const { userId } = req.params; // Extract userId from the URL

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const posts = await postModel.find({ senderId: userId }); // Find posts by senderId

    if (posts.length === 0) {
      return res.status(200).json({ message: "No posts found for this user" });
    }

    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const addLike = async (req: Request, res: Response): Promise<void> => {
  console.log("🔹 req.params:", JSON.stringify(req.params, null, 2));

  const { postId } = req.params;
  const { userId } = req.body;

  console.log("🔹 postId:", postId);
  console.log("🔹 userId:", userId);

  try {
    const post = await postModel.findById(postId);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    if (!Array.isArray(post.likes)) post.likes = [];

    if (!post.likes.includes(userId)) {
      post.likes.push(userId);
      await post.save();
    }

    res.status(200).json({ message: "Post liked", likes: post.likes.length });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

const removeLike = async (req: Request, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    const post = await postModel.findById(postId);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    if (!Array.isArray(post.likes)) post.likes = [];

    post.likes = post.likes.filter(
      (like) => like.toString() !== userId.toString()
    );

    await post.save();
    res.status(200).json({ message: "Like removed", likes: post.likes.length });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export default {
  addPost,
  getAllPosts,
  getPostById,
  deletePosts,
  updatePostById,
  getPostBySenderId,
  addLike,
  removeLike,
  deletePostById,
};
