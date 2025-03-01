import postModel,{ Post }  from "../modules/post_modules";
import { Request, Response } from "express";

const addPost = async (req:Request, res:Response) => {
  console.log("add post");
  try {
    const post = new postModel(req.body);
    await post.save();
    res.send(post);
  } catch (error) {
    res.status(400).send
  }
}

const getAllPosts = async (req:Request, res:Response) => {
  try {
    console.log("get all posts");
    const posts = await postModel.find();
    console.log("posts " + posts);
    res.send(posts);
  } catch (error) {
    res.status(400).send(error);
  }
};

const getPostById = async (req:Request, res:Response) => {
  const postId = req.params.id;
  try {
    const post = await postModel.findById(postId);
    if (post != null) 
    {
      res.status(200).json(post);
    }
    else 
    {
      res.status(400).send("post not found");
    }
  } catch (error) {
    res.status(400).send(error);
  }
};

const deletePosts = async (req:Request, res:Response) => {
  try {
    const posts = await postModel.deleteMany();
    res.send(posts);
  } catch (error) {
    res.status(400).send(error);
  }
};

const updatePostById = async (req:Request, res:Response) => {
  const postId = req.params.id;
  const updatedData = req.body;

  try {
    const updatedPost = await postModel.findByIdAndUpdate(postId, updatedData, {
      new: true,
    });
    if (!updatedPost) {
      return res.status(404).send("Post not found");
    }
    res.status(200).send(updatedPost);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Controller to get posts by sender
//here
const getPostBySenderId = async (req:Request, res:Response) => {
  const senderId = req.query.senderId; // senderId מגיע מה-Query
  if (!senderId) {
    return res.status(400).json({ error: "Sender ID is required" });
  }

  try {
    const posts = await postModel.find({ senderId }); // חיפוש לפי senderId
    
    if (posts.length === 0) {
      return res.status(404).json({ message: "No posts found for the given sender" });
    }

    res.status(200).json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export default { addPost, getAllPosts, getPostById, deletePosts, updatePostById, getPostBySenderId };