import postModel, { Post } from "../modules/post_modules";
import userModel from "../modules/user_modules";

("../modules/user_modules");
import { Request, Response } from "express";

const addPost = async (req: Request, res: Response) => {
  try {
    const { postData, senderId } = req.body;
    if (!senderId) {
      res.status(400).json({ error: "Sender ID is required" });
    }

    const image = req.file ? `uploads/post_images/${req.file.filename}` : null;

    const post = new postModel({ postData, senderId, image });
    await post.save();

    const user = await userModel
      .findById(senderId)
      .select("fullName profilePicture");

    res.status(201).json({
      _id: post._id,
      postData: post.postData,
      user: {
        _id: user?._id,
        fullName: user?.fullName || "משתמש אנונימי",
        profilePicture: user?.profilePicture || "https://placehold.co/150x150",
      },
      image: image ? `http://localhost:3000/${image}` : null, // ✅ Fixed
      comments: [],
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

const getAllPosts = async (req: Request, res: Response) => {
  try {
    console.log("get all posts");
    const posts = await postModel.find();
    console.log("posts " + posts);
    res.send(posts);
  } catch (error) {
    res.status(400).send(error);
  }
};

const getPostById = async (req: Request, res: Response) => {
  const postId = req.params.id;
  try {
    const post = await postModel.findById(postId);
    if (post != null) {
      res.status(200).json(post);
    } else {
      res.status(400).send("post not found");
    }
  } catch (error) {
    res.status(400).send(error);
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

const updatePostById = async (req: Request, res: Response) => {
  const postId = req.params.id;
  const { postData, image } = req.body;

  try {
    const updatedPost = await postModel.findByIdAndUpdate(
      postId,
      { postData, image },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).send("Post not found");
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
      return res.status(404).json({ message: "No posts found for this user" });
    }

    res.status(200).json(posts);
  } catch (err) {
    console.error(" Error fetching user posts:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const addLike = async (req: Request, res: Response) => {
  const postId = req.params.id;
  try {
    const updatedPost = await postModel.findByIdAndUpdate(
      postId,
      { $inc: { likes: 1 } },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
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
};
