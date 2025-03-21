//adam ben david 208298257
//aviv menahem 212292197
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bodyParser from "body-parser";
import express, { Express } from "express";
import http from "http";
import postsRoutes from "./routes/posts_routes";
import commentsRoutes from "./routes/comments_routes";
import usersRoutes from "./routes/users_routes";
import authRoutes from "./routes/auth_routes";
import chatRoutes from "./routes/chat_routes";
import geminiRoutes from "./routes/gemini_routes";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import { initializeSocket } from "./socket";

console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("DB_CONNECT:", process.env.DB_CONNECT);

const app = express();
const httpServer = http.createServer(app);

const initApp = (): Promise<Express> => {
  const isProduction = process.env.NODE_ENV?.trim().toLowerCase() === 'production';
  console.log(`Server initializing in ${isProduction ? 'production' : 'development'} mode`);

  // CORS configuration
  app.use(cors({
    origin: isProduction ? 'https://node10.cs.colman.ac.il' : 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  //הגדלת הגודל שאפשר להעביר בבקשות (עשינו בשביל העברת התמונות לגימיני)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use("/posts", postsRoutes);
  app.use("/comments", commentsRoutes);
  app.use("/users", usersRoutes);
  app.use("/auth", authRoutes);
  app.use("/gemini", geminiRoutes);

  app.use(
    "/uploads/profile_pictures",
    express.static(path.join(__dirname, "../uploads/profile_pictures"))
  );
  app.use(
    "/uploads/post_images",
    express.static(path.join(__dirname, "../uploads/post_images"))
  );

  app.use("/images", express.static(path.join(__dirname, "../images")));

  // example for a photo location:
  app.use("/chat", chatRoutes);
  app.use("/uploads", express.static("uploads"));
  app.use("/test", express.static("."));

  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Web Dev 2025 REST API",
        version: "1.0.0",
        description: "REST server including authentication using JWT",
      },
      servers: [{ url: process.env.BASE_URL }],
    },
    apis: ["./src/routes/*.ts"],
  };
  const specs = swaggerJsDoc(options);
  app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

  return new Promise<Express>((resolve, reject) => {
    if (!process.env.DB_CONNECT) {
      reject(new Error("DB_CONNECT is not defined in .env file"));
    } else {
      mongoose
        .connect(process.env.DB_CONNECT)
        .then(() => {
          // Initialize Socket.IO after DB connection
          const io = initializeSocket(httpServer);
          console.log('Socket.IO initialized');
          resolve(app);
        })
        .catch((error) => {
          console.error('MongoDB connection error:', error);
          reject(error);
        });
    }
  });
};

export { app, httpServer };
export default initApp;
