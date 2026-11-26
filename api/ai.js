import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      configured: false,
      error: "AI is not configured yet. Add the API key in Vercel Environment Variables."
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const prompt = body.prompt || body.query || body.text || body.input || body.topic;
    const mode = body.mode || body.feature || body.action || "";

    if (!prompt) {
      return res.status(400).json({
        configured: true,
        error: "Prompt or input text is required."
      });
    }

    const systemInstruction = mode
      ? `Feature mode requested: ${mode}. Provide a clear, accurate, and well-structured response tailored to this feature.`
      : undefined;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: body.model || "gemini-2.5-flash",
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });

    const answer = response?.text || "";

    return res.status(200).json({
      configured: true,
      answer,
      response: answer,
      result: answer,
    });
  } catch (err) {
    return res.status(500).json({
      configured: true,
      error: err?.message || "Failed to connect to AI provider."
    });
  }
}
