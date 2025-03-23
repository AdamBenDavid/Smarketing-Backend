import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import  UseuserModel   from "../modules/user_modules";

// Define the type for the decoded token
interface TokenPayload {
    _id: string;
}

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const authenticateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : null;
        
        if (!token) {
            res.status(401).json({ message: "No token provided" });
            return;
        }

        if (!process.env.JWT_SECRET) {
            res.status(500).json({ message: "Server configuration error" });
            return;
        }

        
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as TokenPayload;
        
        const user = await UseuserModel.findById(decoded._id);
        
        if (!user) {
            res.status(401).json({ message: "User not found" });
            return;
        }

        
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
}; 