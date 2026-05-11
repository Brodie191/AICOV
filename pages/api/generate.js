// All sensitive logic lives here — the API key and system prompt never reach the client.

// The {background} and {jd} placeholders are filled at request time before being sent to the API.
const SYSTEM_PROMPT = `Act as a technical practitioner writing to a peer. Write a cover letter using the candidate's background and the job description below.

Style Guidelines:
- Adopt an "Operational Realist" tone. Focus on the mechanics of the work (e.g., "getting the data right") rather than feelings about the work.
- Use the "Show, Don't Tell" principle. Use specific tools and technical artifacts from the background as evidence of skill.
- Write with high "Burstiness"—mix short, punchy sentences with slightly longer, descriptive ones. 

Constraints:
- 3 short paragraphs, approx. 250 words.
- Sentence Limit: Maximum 25 words per sentence.
- No em dashes.
- Opening: Start with a technical observation or a "truth" about the role's specific challenges.
- Closing: One direct sentence regarding availability or next steps.

Avoid:
- Corporate cliches (e.g., "passionate," "proven track record," "synergy," "leverage").
- Softening/Hedging (e.g., "I believe," "I feel," "I think").
- Intent statements (e.g., "I am writing to apply").
- Academic or "nominal" phrasing (e.g., instead of "The utilization of SIEM for the purpose of detection," use "Using a SIEM to find threats").

Candidate background: {background}
Job description: {jd}`;

const MAX_INPUT_LENGTH = 4000; // characters per field
const RATE_LIMIT = 5;          // requests per window per IP
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

// In-memory rate limit store — works for a single server instance.
// For multi-region or high-traffic production, swap in Upstash Redis.
const ipWindows = new Map();

// Returns true if the IP has exceeded RATE_LIMIT requests within the current window.
function isRateLimited(ip) {
  const now = Date.now();
  const entry = ipWindows.get(ip);

  // Start a fresh window if none exists or the previous one has expired.
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    ipWindows.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT) return true;

  entry.count++;
  return false;
}

export default async function handler(req, res) {
  // Only accept POST requests.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  // Reject requests that aren't JSON to avoid unexpected body parsing.
  if (req.headers["content-type"] !== "application/json") {
    return res.status(415).json({ error: "Content-Type must be application/json." });
  }

  // Best-effort IP extraction — x-forwarded-for is set by Vercel's proxy.
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

  // Validate that both fields are present and are strings.
  if (typeof cvText !== "string" || typeof jobDescription !== "string") {
    return res.status(400).json({ error: "Invalid input." });
  }

  const cv = cvText.trim();
  const job = jobDescription.trim();

  if (!cv || !job) {
    return res.status(400).json({ error: "Both fields are required." });
  }

  // Cap input length to control token usage and prompt injection risk.
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
    // Substitute user input into the system prompt and call the Anthropic API.
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
        system: SYSTEM_PROMPT.replace("{background}", cv).replace("{jd}", job),
        messages: [{ role: "user", content: "Write the cover letter." }],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error(`Anthropic API ${upstream.status}:`, detail);
      return res.status(502).json({ error: "AI service unavailable. Please try again." });
    }

    // Extract the text content blocks from the response and join them.
    const data = await upstream.json();
    const text = data.content?.map((b) => b.text ?? "").join("") ?? "";

    return res.status(200).json({ result: text });
  } catch (err) {
    console.error("generate handler error:", err);
    return res.status(500).json({ error: "Server error. Please try again." });
  }
}
