import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-3.8-flash";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";
const MAX_INPUT_CHARS = 120000;

function cleanText(value, limit = 20000) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}

function buildPrompt(body) {
  const task = cleanText(body.task || body.mode || "easy-explanation", 80);
  const query = cleanText(body.query, 500);
  const uploadedText = cleanText(body.uploadedText, 80000);
  const papers = Array.isArray(body.papers) ? body.papers.slice(0, 8).map((paper, index) => {
    return [
      `PAPER ${index + 1}: ${cleanText(paper.title, 500)}`,
      `Authors: ${cleanText((paper.authors || []).join?.(", ") || paper.authors, 500)}`,
      `Year: ${cleanText(paper.year, 30)}`,
      `Journal: ${cleanText(paper.journal, 300)}`,
      `DOI: ${cleanText(paper.doi, 200)}`,
      `Abstract/content: ${cleanText(paper.abstract || paper.content, 12000)}`
    ].join("\n");
  }).join("\n\n") : "";

  const source = [papers, uploadedText ? `UPLOADED DOCUMENT TEXT:\n${uploadedText}` : "", query ? `USER TOPIC / QUESTION: ${query}` : ""]
    .filter(Boolean).join("\n\n").slice(0, MAX_INPUT_CHARS);

  if (!source) return null;

  const instructions = {
    "individual-summary": "Summarize each supplied research paper separately. Include research question, methods (only if stated), key findings, limitations (only if stated), and a short plain-language takeaway. Do not invent missing details.",
    "collective-summary": "Compare and synthesize the supplied papers. Identify shared themes, agreements, differences, and gaps. Clearly distinguish what each paper says. Do not invent findings.",
    "easy-explanation": "Explain the supplied material in simple, beginner-friendly language. Define technical terms and use a small example where helpful. Stay faithful to the source.",
    "quiz": "Create 8 multiple-choice questions based only on the supplied material. Return ONLY valid JSON in this exact shape: {\"questions\":[{\"question\":\"...\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"answer\":\"exact option text\",\"explanation\":\"...\"}]}. Ensure exactly one correct option per question.",
    "flashcards": "Create 10 useful question-answer flashcards based only on the supplied material. Return ONLY valid JSON in this exact shape: {\"cards\":[{\"q\":\"question\",\"a\":\"answer\"}] }.",
    "games": "Create 8 concept-matching game pairs based only on the supplied material. Return ONLY valid JSON in this exact shape: {\"items\":[{\"q\":\"concept or question\",\"a\":\"correct explanation or answer\"}]} ."
  };

  return `You are the research-learning assistant inside RGen Search. Use only the source material below for factual claims. If a detail is absent, say it is not provided. Never fabricate citations, results, methods, statistics, or conclusions.\n\nTASK: ${instructions[task] || instructions["easy-explanation"]}\n\nSOURCE MATERIAL:\n${source}`;
}

function isTemporaryProviderError(error) {
  const status = Number(error?.status || error?.httpStatus || 0);
  const message = String(error?.message || "").toLowerCase();
  return status === 429 || status === 503 || status === 502 || status === 504 ||
    /high demand|overloaded|temporarily unavailable|resource exhausted|rate limit/.test(message);
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Only POST requests are allowed." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ configured: false, error: "GEMINI_API_KEY is missing in Vercel Environment Variables. Add it and redeploy." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const prompt = buildPrompt(body);
    if (!prompt) {
      return res.status(400).json({ configured: true, error: "Select at least one research paper, upload a document, or enter a topic first." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const preferredModel = String(body.model || DEFAULT_MODEL);
    const models = [preferredModel];
    if (preferredModel !== FALLBACK_MODEL) models.push(FALLBACK_MODEL);
    let lastError;

    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { maxOutputTokens: 8192 }
          });
          const answer = response?.text?.trim() || "";
          if (!answer) throw new Error("Gemini returned an empty response. Please try again.");
          return res.status(200).json({ configured: true, model, answer, response: answer, result: answer });
        } catch (error) {
          lastError = error;
          if (!isTemporaryProviderError(error)) break;
          if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 900));
        }
      }
      if (!isTemporaryProviderError(lastError)) break;
    }

    const status = Number(lastError?.status || lastError?.httpStatus || 0);
    if (status === 429 || status === 503 || status === 502 || status === 504 || isTemporaryProviderError(lastError)) {
      return res.status(503).json({ configured: true, error: "Gemini is temporarily busy or rate-limited. Please wait a little and try again. Your API key was found; this is a provider availability issue." });
    }
    if (status === 400 || status === 401 || status === 403 || status === 404) {
      return res.status(status).json({ configured: true, error: `Gemini request failed (${status}). Check the API key, API access, and model availability in Google AI Studio.`, details: cleanText(lastError?.message, 800) });
    }
    return res.status(500).json({ configured: true, error: "Gemini request failed. Please try again.", details: cleanText(lastError?.message, 800) });
  } catch (error) {
    return res.status(400).json({ configured: true, error: "The AI request could not be read.", details: cleanText(error?.message, 500) });
  }
}
