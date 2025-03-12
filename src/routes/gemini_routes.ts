import express from "express";
import multer from "multer";
import { getGeminiImageDescription } from "../controllers/gemini_controller";

const router = express.Router();

/**
 * @swagger
 * /gemini:
 *   post:
 *     summary: יצירת תיאור תמונה באמצעות Gemini AI
 *     description: שולח תמונה בפורמט Base64 ל-Gemini ומקבל תיאור יצירתי לפרסום ברשתות חברתיות.
 *     tags:
 *       - Gemini AI
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - base64Image
 *             properties:
 *               base64Image:
 *                 type: string
 *                 format: base64
 *                 example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
 *                 description: קובץ תמונה בפורמט Base64 (JPEG/PNG)
 *     responses:
 *       200:
 *         description: הצלחה - תיאור נוצר בהצלחה
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   example: "שיווק העסק שלך בעזרת תמונה מושכת! 🚀"
 *       400:
 *         description: שגיאת קלט - חוסר בתמונה או פורמט שגוי
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "לא נבחרה תמונה"
 *       500:
 *         description: שגיאת שרת - כשל בפנייה ל-Gemini AI
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "שגיאה בשרת"
 */
router.post("/", express.json({ limit: "10mb" }), getGeminiImageDescription);

export default router;
