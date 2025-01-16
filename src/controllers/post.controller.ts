import { Request, Response } from 'express';
import Post from '../models/Post';

interface AuthRequest extends Request {
  params: {
    userId: string;
  }
}

export const createPost = async (req: AuthRequest, res: Response) => {
  const { text } = req.body;
  const userId = req.params.userId; // Getting userId from auth middleware

  try {
    const post = await Post.create({
      text,
      userId,
      imageUrl: req.file?.path
    });
    
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create post' });
  }
}; 