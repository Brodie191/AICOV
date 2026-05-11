// Main UI component — handles all user input, calls the API, and renders the result.
import { useState } from "react";

// Must match MAX_INPUT_LENGTH in pages/api/generate.js.
const MAX_LENGTH = 4000;

export default function CoverLetterGen() {
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Copied state resets after 2 seconds to give the user visual feedback.
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    // Client-side validation mirrors the server — catches obvious errors before a network round-trip.
    if (!cvText.trim() || !jobDescription.trim()) {
      setError("Fill in both fields first.");
      return;
    }
    if (cvText.length > MAX_LENGTH || jobDescription.length > MAX_LENGTH) {
      setError(`Each field must be under ${MAX_LENGTH} characters.`);
      return;
    }

    setError("");
    setResult("");
    setLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText, jobDescription }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setResult(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Used to show red borders and disable the button when the user exceeds the limit.
  const cvOver = cvText.length > MAX_LENGTH;
  const jobOver = jobDescription.length > MAX_LENGTH;

  return (
    <div style={styles.root}>
      {/* Global styles and font imports — scoped here since there's no separate CSS file. */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');
        html, body { margin: 0; padding: 0; background: #1a1a1a; }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #f5f0e8; color: #1a1a1a; }
        textarea { resize: vertical; }
        textarea:focus { outline: none; border-color: #f5f0e8 !important; box-shadow: 0 0 0 3px rgba(200,255,0,0.1); }
        button:hover:not(:disabled) { filter: brightness(1.1); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(10,10,10,0.25);
          border-top-color: #1a1a1a;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
          flex-shrink: 0;
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
          text-align: center;
        }
        .char-count {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          text-align: right;
          margin-top: 6px;
          transition: color 0.2s;
        }
        /* Stack inputs vertically on small screens. */
        @media (max-width: 600px) {
          .input-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.badge}>AI-POWERED</div>
        <h1 style={styles.title}>
          Cover Letter<br />Generator
        </h1>
        <p style={styles.subtitle}>
          Paste your background + the job. Get a letter that doesn&apos;t sound like everyone else&apos;s.
        </p>
      </div>

      {/* Input grid — switches to single column on mobile via .input-grid media query. */}
      <div className="input-grid" style={styles.grid}>
        <div style={styles.field}>
          <span className="label-tag">Your background / CV summary</span>
          <textarea
            style={{ ...styles.textarea, ...(cvOver ? styles.textareaError : {}) }}
            rows={8}
            placeholder="e.g. CS graduate, dissertation on RF security and replay attacks, built hardware testbed with Arduino + LimeSDR, Python for signal analysis, looking for security/embedded roles..."
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            maxLength={MAX_LENGTH + 100}
            aria-label="Your background or CV summary"
          />
          <span className="char-count" style={{ color: cvOver ? "#ff6b6b" : "#444" }}>
            {cvText.length} / {MAX_LENGTH}
          </span>
        </div>

        <div style={styles.field}>
          <span className="label-tag">Job description</span>
          <textarea
            style={{ ...styles.textarea, ...(jobOver ? styles.textareaError : {}) }}
            rows={8}
            placeholder="Paste the full job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            maxLength={MAX_LENGTH + 100}
            aria-label="Job description"
          />
          <span className="char-count" style={{ color: jobOver ? "#ff6b6b" : "#444" }}>
            {jobDescription.length} / {MAX_LENGTH}
          </span>
        </div>
      </div>

      {/* Error message — only rendered when there is one. */}
      {error && <div style={styles.error} role="alert">{error}</div>}

      {/* Generate button — disabled while loading or if either field is over the limit. */}
      <button
        style={{ ...styles.btn, ...(loading || cvOver || jobOver ? styles.btnDisabled : {}) }}
        onClick={generate}
        disabled={loading || cvOver || jobOver}
        aria-busy={loading}
      >
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span className="spinner" aria-hidden="true" /> Generating...
          </span>
        ) : (
          "Generate cover letter →"
        )}
      </button>

      {/* Result — fades in when the API returns. aria-live announces it to screen readers. */}
      {result && (
        <div className="result-box" style={styles.resultWrap} aria-live="polite">
          <div style={styles.resultHeader}>
            <span className="label-tag" style={{ marginBottom: 0 }}>Your cover letter</span>
            <button style={styles.copyBtn} onClick={copy} aria-label="Copy cover letter">
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          {/* Split on newlines so paragraphs render correctly from the plain-text API response. */}
          <div style={styles.resultText}>
            {result.split("\n").map((line, i) =>
              line.trim() ? <p key={i} style={{ marginBottom: 14 }}>{line}</p> : null
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>Built with Claude API</div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#1a1a1a",
    color: "#f0f0f0",
    fontFamily: "'Outfit', sans-serif",
    // clamp() makes horizontal padding scale with viewport — no fixed max-width whitespace.
    padding: "48px clamp(24px, 8vw, 120px)",
    maxWidth: 1100,
    margin: "0 auto",
  },
  header: { marginBottom: 48, textAlign: "center" },
  badge: {
    display: "inline-block",
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: "0.15em",
    background: "#f5f0e8",
    color: "#1a1a1a",
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
    margin: "0 auto",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginBottom: 8,
  },
  field: { display: "flex", flexDirection: "column" },
  textarea: {
    background: "#141414",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    color: "#f0f0f0",
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    lineHeight: 1.7,
    padding: "14px 16px",
    transition: "border-color 0.2s, box-shadow 0.2s",
    width: "100%",
  },
  textareaError: {
    borderColor: "#ff4444",
  },
  btn: {
    background: "#f5f0e8",
    color: "#1a1a1a",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
    fontSize: 16,
    fontWeight: 700,
    padding: "16px 32px",
    width: "100%",
    transition: "filter 0.15s",
    marginTop: 24,
    marginBottom: 32,
  },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  error: {
    background: "#1a0a0a",
    border: "1px solid #ff4444",
    borderRadius: 8,
    color: "#ff8888",
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    padding: "12px 16px",
    marginBottom: 20,
    marginTop: 16,
  },
  resultWrap: {
    background: "#141414",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    padding: "24px",
    marginBottom: 48,
    // overflow: hidden clips text selection highlights at the box boundary.
    overflow: "hidden",
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
    // Prevents long unbroken words from overflowing the container.
    overflowWrap: "break-word",
  },
  footer: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: "#444",
    textAlign: "center",
    letterSpacing: "0.08em",
  },
};
