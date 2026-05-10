// All sensitive logic lives here — the API key and system prompt never reach the client.

const SYSTEM_PROMPT = `You are a professional CV writer with 10 years of experience helping candidates land jobs at top companies.

Given the candidate's background and the job description, write a tailored, confident cover letter.

Rules:
- 3 short paragraphs max
- Natural, human tone — not stiff or corporate
- Open with a strong hook, not "I am writing to apply for..."
- Reference specific things from the job description
- End with a clear call to action
- No filler phrases like "I am passionate about" or "I am a team player"

Return only the cover letter text, nothing else.`;

const MAX_INPUT_LENGTH = 4000; // characters per field
const RATE_LIMIT = 5;          // requests per window per IP
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

// In-memory store: sufficient for single-instance / low-traffic use.
// For multi-region or high-traffic production, swap in Upstash Redis.
const ipWindows = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = ipWindows.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    ipWindows.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT) return true;

  entry.count++;
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (req.headers["content-type"] !== "application/json") {
    return res.status(415).json({ error: "Content-Type must be application/json." });
  }

  // Best-effort IP extraction (works behind Vercel's proxy)
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(ip)) {
    res.setHeader("Retry-After", "3600");
    return res.status(429).json({
      error: "Too many requests. You can generate up to 5 cover letters per hour.",
    });
  }

  const { cvText, jobDescription } = req.body ?? {};

  if (typeof cvText !== "string" || typeof jobDescription !== "string") {
    return res.status(400).json({ error: "Invalid input." });
  }

  const cv = cvText.trim();
  const job = jobDescription.trim();

  if (!cv || !job) {
    return res.status(400).json({ error: "Both fields are required." });
  }

  if (cv.length > MAX_INPUT_LENGTH || job.length > MAX_INPUT_LENGTH) {
    return res
      .status(400)
      .json({ error: `Each field must be under ${MAX_INPUT_LENGTH} characters.` });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "Server configuration error." });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Candidate background:\n${cv}\n\nJob description:\n${job}`,
          },
        ],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error(`Anthropic API ${upstream.status}:`, detail);
      return res.status(502).json({ error: "AI service unavailable. Please try again." });
    }

    const data = await upstream.json();
    const text = data.content?.map((b) => b.text ?? "").join("") ?? "";

    return res.status(200).json({ result: text });
  } catch (err) {
    console.error("generate handler error:", err);
    return res.status(500).json({ error: "Server error. Please try again." });
  }
}
