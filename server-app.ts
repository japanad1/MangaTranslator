import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load local environment variables from .env if present
dotenv.config();

// Helper to query Gemini with retry on quota exceeded (429) / rate limit errors and automatic model fallback
export async function generateContentWithRetry(aiClient: any, originalParams: any, maxRetries = 2, initialDelay = 3000) {
  const params = { ...originalParams };
  
  // Sequence of free-tier models to try if one is exhausted
  const candidateModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  
  // Re-order based on requested model if provided
  let modelsToTry = [...candidateModels];
  if (params.model && candidateModels.includes(params.model)) {
    modelsToTry = [params.model, ...candidateModels.filter(m => m !== params.model)];
  } else if (params.model) {
    modelsToTry = [params.model, ...candidateModels];
  }

  let lastError: any = null;

  for (const model of modelsToTry) {
    params.model = model;
    let delay = initialDelay;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] Querying model: ${model} (Attempt ${attempt + 1}/${maxRetries})`);
        return await aiClient.models.generateContent(params);
      } catch (error: any) {
        lastError = error;
        const errorMsg = error.message || "";
        const isRateLimit = error.status === 429 || 
                            error.code === 429 || 
                            errorMsg.includes("429") || 
                            errorMsg.includes("RESOURCE_EXHAUSTED") || 
                            errorMsg.includes("Quota") ||
                            errorMsg.includes("quota");
        
        if (isRateLimit) {
          // Check if it is a daily limit or hard account quota block where sleeping won't help
          const isDailyOrAccountExceeded = errorMsg.includes("PerDay") || 
                                           errorMsg.includes("daily") || 
                                           errorMsg.includes("daily limit") || 
                                           errorMsg.includes("Billing") ||
                                           errorMsg.includes("billing") ||
                                           errorMsg.includes("exceeded your current quota") ||
                                           errorMsg.includes("Quota exceeded");
          
          if (isDailyOrAccountExceeded) {
            console.warn(`[Gemini API] Account/Daily quota limit reached for ${model}. Switching to alternative model...`);
            break; // Break the retry loop for this model, fallback to next model
          }

          if (attempt < maxRetries - 1) {
            console.warn(`[Gemini API] Rate limit (429) hit on ${model}. Retrying in ${delay / 1000}s... (Attempt ${attempt + 1}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2; // exponential backoff
          } else {
            console.warn(`[Gemini API] Retries depleted for ${model}. Falling back to next available candidate...`);
          }
        } else {
          // Non-rate-limit error (e.g. syntax, parsing, configuration) should be thrown immediately
          throw error;
        }
      }
    }
  }

  // If all tried candidates failed, propagate the last error
  throw lastError;
}

const app = express();

// Set high limits for uploading manga images (base64)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini client with standard telemetry User-Agent
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || "MOCK_KEY",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API endpoint for health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API endpoint for full-page OCR translation (automatic detection)
app.post("/api/ocr-translate", async (req, res) => {
  try {
    const { image, sourceLang = "Auto", targetLang = "Vietnamese", translationStyle = "Casual" } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image payload provided" });
    }

    if (!apiKey) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY is not configured. Please set your key." 
      });
    }

    // Extract base64 header if it exists
    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    const mimeType = image.includes(";") ? image.split(";")[0].split(":")[1] : "image/jpeg";

    const prompt = `Identify all speech boxes, narrative blocks, or prominent text areas in this manga or comic book image.
For each text box found:
1. Detect its precise bounding coordinates [ymin, xmin, ymax, xmax] normalized on a grid of 0 to 1000 (0,0 is top-left, 1000,1000 is bottom-right). Return them as integers.
2. Transcribe the original text. The original language is likely ${sourceLang} (if set to Auto, detect it).
3. Translate the transcribed text to ${targetLang}. Ensure the translation is natural, flowy, and adapted for manga/comic reading.

CRITICAL: Format the translated text using the requested Translation Style / Tone: "${translationStyle}".
Style guides:
- "Casual": Natural, flowy, and realistic daily conversation tone in ${targetLang}.
- "Action": Intense, energetic, bold, dramatic, with appropriate exclamations and strong verbs fit for combat or active shonen manga in ${targetLang}.
- "Humorous": Comic, funny, playful, witty, incorporating humorous expressions or funny slangs in ${targetLang}.
- "Cute": Sweet, soft, emotional, girlish shoujo tone in ${targetLang}.
- "Formal": Polite, elegant, formal vocabulary, high-status, or classic translation style in ${targetLang}.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        bubbles: {
          type: Type.ARRAY,
          description: "A list of speech bubbles with coordinates and translations.",
          items: {
            type: Type.OBJECT,
            properties: {
              ymin: { type: Type.INTEGER, description: "Top coordinate of bounding box (0-1000)" },
              xmin: { type: Type.INTEGER, description: "Left coordinate of bounding box (0-1000)" },
              ymax: { type: Type.INTEGER, description: "Bottom coordinate of bounding box (0-1000)" },
              xmax: { type: Type.INTEGER, description: "Right coordinate of bounding box (0-1000)" },
              originalText: { type: Type.STRING, description: "The transcript of the text inside the bubble." },
              translatedText: { type: Type.STRING, description: "The translated text inside the bubble." }
            },
            required: ["ymin", "xmin", "ymax", "xmax", "originalText", "translatedText"]
          }
        }
      },
      required: ["bubbles"]
    };

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2, // Lower temperature for more accurate localization & transcription
      }
    });

    if (!response || !response.text) {
      throw new Error("No response received from Gemini.");
    }

    const results = JSON.parse(response.text.trim());
    res.json(results);
  } catch (error: any) {
    console.error("OCR Translation error:", error);
    const errorMsg = error.message || "";
    const isRateLimit = error.status === 429 || 
                        error.code === 429 || 
                        errorMsg.includes("429") || 
                        errorMsg.includes("RESOURCE_EXHAUSTED") || 
                        errorMsg.includes("Quota");
    if (isRateLimit) {
      return res.status(429).json({
        error: "Hạn mức dùng thử miễn phí (Gemini API Free Tier Quota) đã tạm thời cạn kiệt. Hệ thống sẽ tự động xếp hàng và thử lại sau ít giây...",
        code: 429
      });
    }
    res.status(500).json({ error: errorMsg || "An error occurred during OCR translation." });
  }
});

// API endpoint to translate a manually drawn crop zone
app.post("/api/translate-zone", async (req, res) => {
  try {
    const { image, text, sourceLang = "Auto", targetLang = "Vietnamese", translationStyle = "Casual" } = req.body;

    if (!apiKey) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY is not configured. Please set your key." 
      });
    }

    // If text is provided, translate directly without running multimodal OCR on image
    if (text) {
      const textPrompt = `Translate this manga speech text from ${sourceLang} to ${targetLang}. 
Keep the translation natural, organic, and adapted for manga/comic reading.

CRITICAL: Format the translated text using the requested Translation Style / Tone: "${translationStyle}".
Style guides:
- "Casual": Natural, flowy, and realistic daily conversation tone in ${targetLang}.
- "Action": Intense, energetic, bold, dramatic, with appropriate exclamations and strong verbs fit for combat or active shonen manga in ${targetLang}.
- "Humorous": Comic, funny, playful, witty, incorporating humorous expressions or funny slangs in ${targetLang}.
- "Cute": Sweet, soft, emotional, girlish shoujo tone in ${targetLang}.
- "Formal": Polite, elegant, formal vocabulary, high-status, or classic translation style in ${targetLang}.

Text to translate: "${text}"
Return the result strictly as a JSON object matching this schema:
{
  "originalText": "the original input text",
  "translatedText": "translated text"
}`;

      const textResponseSchema = {
        type: Type.OBJECT,
        properties: {
          originalText: { type: Type.STRING },
          translatedText: { type: Type.STRING }
        },
        required: ["originalText", "translatedText"]
      };

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: textPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: textResponseSchema,
          temperature: 0.3
        }
      });

      if (!response || !response.text) {
        throw new Error("No response received from Gemini.");
      }

      return res.json(JSON.parse(response.text.trim()));
    }

    if (!image) {
      return res.status(400).json({ error: "No image or text payload provided" });
    }

    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    const mimeType = image.includes(";") ? image.split(";")[0].split(":")[1] : "image/jpeg";

    const prompt = `This is a cropped speech bubble from a manga/comic.
1. Transcribe the original text (likely ${sourceLang}).
2. Translate the original text into ${targetLang}. Keep the translation natural and flowy for a comic reader.

CRITICAL: Format the translated text using the requested Translation Style / Tone: "${translationStyle}".
Style guides:
- "Casual": Natural, flowy, and realistic daily conversation tone in ${targetLang}.
- "Action": Intense, energetic, bold, dramatic, with appropriate exclamations and strong verbs fit for combat or active shonen manga in ${targetLang}.
- "Humorous": Comic, funny, playful, witty, incorporating humorous expressions or funny slangs in ${targetLang}.
- "Cute": Sweet, soft, emotional, girlish shoujo tone in ${targetLang}.
- "Formal": Polite, elegant, formal vocabulary, high-status, or classic translation style in ${targetLang}.

Return the result strictly as a JSON object matching this schema:
{
  "originalText": "transcribed original text",
  "translatedText": "translated text"
}`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        originalText: { type: Type.STRING, description: "Transcribed text in the bubble" },
        translatedText: { type: Type.STRING, description: "Translated text in the bubble" }
      },
      required: ["originalText", "translatedText"]
    };

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.3
      }
    });

    if (!response || !response.text) {
      throw new Error("No response received from Gemini.");
    }

    const results = JSON.parse(response.text.trim());
    res.json(results);
  } catch (error: any) {
    console.error("Zone translation error:", error);
    const errorMsg = error.message || "";
    const isRateLimit = error.status === 429 || 
                        error.code === 429 || 
                        errorMsg.includes("429") || 
                        errorMsg.includes("RESOURCE_EXHAUSTED") || 
                        errorMsg.includes("Quota");
    if (isRateLimit) {
      return res.status(429).json({
        error: "Hạn mức dùng thử miễn phí (Gemini API Free Tier Quota) đã tạm thời cạn kiệt. Vui lòng đợi trong giây lát và thử lại...",
        code: 429
      });
    }
    res.status(500).json({ error: errorMsg || "An error occurred during zone translation." });
  }
});

export default app;
