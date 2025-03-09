import express from "express";
import multer from "multer";
import { getGeminiImageDescription } from "../controllers/gemini_controller";

const router = express.Router();

router.post("/", express.json({ limit: "10mb" }), getGeminiImageDescription);

// router.post("/", async (req, res) => {
//   console.log(" בקשה התקבלה לנתיב /gemini");
//   await getGeminiImageDescription(req, res);
// });
export default router;
