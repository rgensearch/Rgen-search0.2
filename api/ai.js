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

  // AI provider integration will be added after the
  // project structure and secure API configuration are ready.
  return res.status(501).json({
    configured: true,
    error: "AI provider connection is not enabled yet."
  });
}
