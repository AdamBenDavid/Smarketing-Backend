/* istanbul ignore file */

import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

function getImageFormat(base64: string): string {
  if (base64.startsWith("data:image/jpeg")) return "jpeg";
  if (base64.startsWith("data:image/png")) return "png";
  return "unknown";
}

function isValidBase64(base64: string): boolean {
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(base64);
}

export async function getGeminiImageDescription(
  req: Request,
  res: Response
): Promise<void> {
  try {
    let { base64Image } = req.body;

    if (!base64Image) {
      res.status(400).json({ error: "לא נבחרה תמונה" });
    }

    // בדיקה אם התמונה בפורמט נתמך
    const format = getImageFormat(base64Image);
    if (!["jpeg", "jpg", "png"].includes(format)) {
      res
        .status(400)
        .json({ error: "יש להעלות תמונה בפורמט JPEG או PNG או JPG" });
    }

    // ניקוי הקידומת של Base64
    base64Image = base64Image.replace(/^data:image\/\w+;base64,/, "");

    if (!isValidBase64(base64Image)) {
      res.status(400).json({ error: "פורמט תמונה שגוי" });
    }

    // שליחת הבקשה ל-Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent([
      { inlineData: { mimeType: `image/${format}`, data: base64Image } },
      {
        text: "אתה כותב פוסטים במדיה החברתית לטובת שיווק העסק. תכתוב תיאור לפוסט בצורה יצירתית ומעניינת ברשת החברתית המיועד לשיווק של העסק ומכיל את התמונה הבאה. תכתוב רק את המלל של הפוסט בעברית. תן אפשרות אחת בלבד.",
      },
    ]);

    const description = (await result.response.text()) || "לא ניתן ליצור תיאור";

    res.json({ response: description });
  } catch (error) {
    res.status(500).json({ error: "שגיאה בשרת" });
  }
}
