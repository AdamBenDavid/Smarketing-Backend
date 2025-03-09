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
  console.log("getGeminiImageDescription התחיל...");

  try {
    let { base64Image } = req.body;
    console.log("קלט מהפרונט:", base64Image ? "יש תמונה" : "אין תמונה");

    if (!base64Image) {
      console.log("לא נבחרה תמונה");
      res.status(400).json({ error: "לא נבחרה תמונה" });
    }

    // בדיקה אם התמונה בפורמט נתמך
    const format = getImageFormat(base64Image);
    if (!["jpeg", "jpg", "png"].includes(format)) {
      console.error("פורמט לא נתמך:", format);
      res
        .status(400)
        .json({ error: "יש להעלות תמונה בפורמט JPEG או PNG או JPG" });
    }

    // ניקוי הקידומת של Base64
    base64Image = base64Image.replace(/^data:image\/\w+;base64,/, "");

    if (!isValidBase64(base64Image)) {
      console.error("קובץ Base64 אינו תקין");
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
    console.log("תיאור התמונה:", description);
  } catch (error) {
    console.error("שגיאה בשליחת תמונה ל-Gemini:", error);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
}

// import { Request, Response } from "express";
// import axios from "axios";
// import dotenv from "dotenv";

// dotenv.config();

// const API_KEY = process.env.GEMINI_API_KEY;
// const GEMINI_API_URL =
//   "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent";

// if (!API_KEY) {
//   throw new Error("Missing GEMINI_API_KEY in environment variables");
// }

// export async function getGeminiImageDescription(
//   req: Request,
//   res: Response
// ): Promise<void> {
//   console.log("getGeminiImageDescription");
//   try {
//     const { image } = req.body;
//     if (!image) {
//       res.status(400).json({ error: "לא נבחרה תמונה" });
//       return;
//     }

//     const response = await axios.post(`${GEMINI_API_URL}?key=${API_KEY}`, {
//       contents: [
//         {
//           parts: [
//             {
//               text: "אתה כותב פוסטים במדיה החברתית בנושא שיווק. תתאר את התמונה הבאה בצורה יצירתית ומעניינת כאילו זה פוסט ברשת חברתית שמיועד לשיווק של העסק. תכתוב רק את המלל של הפוסט ותן אפשרות אחת בלבד.",
//             },
//             {
//               inlineData: {
//                 mimeType: "image/jpeg",
//                 data: image, // התמונה ב-Base64
//               },
//             },
//           ],
//         },
//       ],
//     });

//     const description =
//       response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
//       "לא ניתן ליצור תיאור";

//     res.json({ response: description });
//     console.log("response: ", description);
//   } catch (error) {
//     console.log("controller catch");

//     console.error("שגיאה בשליחת תמונה ל-Gemini:", error);
//     res.status(500).json({ error: "שגיאה בשרת" });
//   }
// }

// import axios from "axios";
// import fs from "fs"; // משמש לקריאת הקובץ
// import dotenv from "dotenv";

// dotenv.config();

// const API_KEY = process.env.GEMINI_API_KEY;
// const GEMINI_API_URL =
//   "https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent";

// if (!API_KEY) {
//   throw new Error("Missing GEMINI_API_KEY in environment variables");
// }

// // /** ממיר תמונה לפורמט Base64 **/
// // const encodeImageToBase64 = (imagePath: string): string | null => {
// //   try {
// //     const imageBuffer = fs.readFileSync(imagePath);
// //     return imageBuffer.toString("base64");
// //   } catch (error) {
// //     console.error("שגיאה בהמרת התמונה ל-Base64:", error);
// //     return null;
// //   }
// // };
// export const handleImageRequest = async (req: Request, res: Response) => {
//   try {
//     const { image } = req.body;
//     if (!image) return res.status(400).json({ error: "לא נבחרה תמונה" });

//     const response = await getGeminiImageDescription(image);
//     res.json({ response });
//   } catch (error) {
//     console.error("שגיאה בשליחת תמונה ל-Gemini:", error);
//     res.status(500).json({ error: "שגיאה בשרת" });
//   }
// };

// const getGeminiImageDescription = async (
//   imagePath: string
// ): Promise<string | null> => {
//   //   const base64Image = encodeImageToBase64(imagePath);
//   //   if (!base64Image) return null;

//   try {
//     const response = await axios.post(`${GEMINI_API_URL}?key=${API_KEY}`, {
//       contents: [
//         {
//           parts: [
//             {
//               inlineData: {
//                 mimeType: "image/jpeg",
//                 data: imagePath,
//                 //data: base64Image,
//               },
//             },
//           ],
//         },
//       ],
//     });

//     return (
//       response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
//       "לא ניתן ליצור תיאור"
//     );
//   } catch (error) {
//     console.error("שגיאה בקריאה ל-Gemini:", error);
//     return null;
//   }
// };

// export default { getGeminiImageDescription };
