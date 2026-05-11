import { useState } from "react";

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

export default function CoverLetterGen() {
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!cvText.trim() || !jobDescription.trim()) {
      setError("Fill in both fields first.");
      return;
    }
    setError("");
    setResult("");
    setLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Candidate background:\n${cvText}\n\nJob description:\n${jobDescription}`,
            },
          ],
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content.map((b) => b.text || "").join("");
      setResult(text);
    } catch (err) {
      setError("Something went wrong: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #c8ff00; color: #0a0a0a; }
        textarea:focus { outline: none; border-color: #c8ff00 !important; }
        textarea { resize: vertical; }
        button:hover:not(:disabled) { filter: brightness(1.1); }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(10,10,10,0.2);
          border-top-color: #0a0a0a;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        .result-box { animation: fadeIn 0.4s ease; }
        .label-tag {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #888;
          margin-bottom: 8px;
          display: block;
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.badge}>AI-POWERED</div>
        <h1 style={styles.title}>Cover Letter<br />Generator</h1>
        <p style={styles.subtitle}>Paste your background + the job. Get a letter that doesn't sound like everyone else's.</p>
      </div>

      {/* Inputs */}
      <div style={styles.grid}>
        <div style={styles.field}>
          <span className="label-tag">Your background / CV summary</span>
          <textarea
            style={styles.textarea}
            rows={8}
            placeholder="Add your background/qualifications here..."
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <span className="label-tag">Job description</span>
          <textarea
            style={styles.textarea}
            rows={8}
            placeholder="Paste the full job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.error}>{error}</div>
      )}

      {/* Generate button */}
      <button
        style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}
        onClick={generate}
        disabled={loading}
      >
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="spinner" /> Generating...
          </span>
        ) : (
          "Generate cover letter →"
        )}
      </button>

      {/* Result */}
      {result && (
        <div className="result-box" style={styles.resultWrap}>
          <div style={styles.resultHeader}>
            <span className="label-tag" style={{ marginBottom: 0 }}>Your cover letter</span>
            <button style={styles.copyBtn} onClick={copy}>
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <div style={styles.resultText}>
            {result.split("\n").map((line, i) =>
              line.trim() ? <p key={i} style={{ marginBottom: 14 }}>{line}</p> : null
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        Built with Claude API · Ship yours in 3 days
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#f0f0f0",
    fontFamily: "'Syne', sans-serif",
    padding: "48px 24px",
    maxWidth: 860,
    margin: "0 auto",
  },
  header: {
    marginBottom: 48,
  },
  badge: {
    display: "inline-block",
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: "0.15em",
    background: "#c8ff00",
    color: "#0a0a0a",
    padding: "4px 10px",
    borderRadius: 2,
    marginBottom: 20,
    fontWeight: 500,
  },
  title: {
    fontSize: "clamp(36px, 7vw, 64px)",
    fontWeight: 800,
    lineHeight: 1.05,
    letterSpacing: "-0.02em",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    fontWeight: 400,
    maxWidth: 480,
    lineHeight: 1.6,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginBottom: 24,
  },
  field: {
    display: "flex",
    flexDirection: "column",
  },
  textarea: {
    background: "#141414",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    color: "#f0f0f0",
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    lineHeight: 1.7,
    padding: "14px 16px",
    transition: "border-color 0.2s",
    width: "100%",
  },
  btn: {
    background: "#c8ff00",
    color: "#0a0a0a",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "'Syne', sans-serif",
    fontSize: 16,
    fontWeight: 700,
    padding: "16px 32px",
    width: "100%",
    transition: "filter 0.15s",
    marginBottom: 32,
  },
  btnDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  error: {
    background: "#1a0a0a",
    border: "1px solid #ff4444",
    borderRadius: 8,
    color: "#ff8888",
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    padding: "12px 16px",
    marginBottom: 20,
  },
  resultWrap: {
    background: "#141414",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    padding: "24px",
    marginBottom: 48,
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: "1px solid #2a2a2a",
  },
  copyBtn: {
    background: "transparent",
    border: "1px solid #2a2a2a",
    borderRadius: 6,
    color: "#888",
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    padding: "6px 14px",
    transition: "all 0.15s",
  },
  resultText: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 14,
    lineHeight: 1.8,
    color: "#d0d0d0",
  },
  footer: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: "#444",
    textAlign: "center",
    letterSpacing: "0.08em",
  },
};
