// app/login/page.jsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(
        result.error === "CredentialsSignin"
          ? "Invalid email or password. Please try again."
          : result.error
      );
    } else {
      // NextAuth doesn't expose role here, so redirect to dashboard
      // dashboard will re-route admins to /admin
      router.push("/dashboard");
    }
  }

  return (
    <div style={styles.page}>
      {/* Scanline overlay */}
      <div style={styles.scanlines} />

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.dot} />
          <span style={styles.brand}>ATTENDANCE SYSTEM</span>
          <div style={styles.dot} />
        </div>

        <div style={styles.clock}>
          <ClockDisplay />
        </div>

        <h1 style={styles.title}>EMPLOYEE LOGIN</h1>
        <p style={styles.subtitle}>Enter your credentials to punch in</p>

        {/* Form */}
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>EMAIL ADDRESS</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
              onBlur={(e) => (e.target.style.borderColor = "#374151")}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
              onBlur={(e) => (e.target.style.borderColor = "#374151")}
            />
          </div>

          {error && <p style={styles.error}>⚠ {error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.button, opacity: loading ? 0.6 : 1 }}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = "#d97706")}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = "#f59e0b")}
          >
            {loading ? "VERIFYING..." : "CLOCK IN →"}
          </button>
        </form>

        <p style={styles.footer}>Powered by Google Sheets + Next.js</p>
      </div>
    </div>
  );
}

// Live clock widget
function ClockDisplay() {
  const [time, setTime] = useState(new Date());

  if (typeof window !== "undefined") {
    // Simple interval — fine for a clock display
    setTimeout(() => setTime(new Date()), 1000);
  }

  return (
    <div style={styles.clockText}>
      {time.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Courier New', Courier, monospace",
    position: "relative",
    overflow: "hidden",
  },
  scanlines: {
    position: "fixed",
    inset: 0,
    background:
      "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
    pointerEvents: "none",
    zIndex: 0,
  },
  card: {
    position: "relative",
    zIndex: 1,
    backgroundColor: "#111111",
    border: "1px solid #374151",
    borderTop: "3px solid #f59e0b",
    padding: "2.5rem 2rem",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 0 60px rgba(245, 158, 11, 0.08)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1.5rem",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#f59e0b",
  },
  brand: {
    color: "#6b7280",
    fontSize: "0.65rem",
    letterSpacing: "0.2em",
  },
  clock: {
    textAlign: "center",
    marginBottom: "1.5rem",
  },
  clockText: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    color: "#f59e0b",
    letterSpacing: "0.1em",
    fontVariantNumeric: "tabular-nums",
  },
  title: {
    color: "#f9fafb",
    fontSize: "1.1rem",
    letterSpacing: "0.15em",
    marginBottom: "0.25rem",
    textAlign: "center",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: "0.75rem",
    textAlign: "center",
    marginBottom: "2rem",
    letterSpacing: "0.05em",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  label: {
    color: "#9ca3af",
    fontSize: "0.65rem",
    letterSpacing: "0.15em",
  },
  input: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #374151",
    borderRadius: "2px",
    padding: "0.75rem 1rem",
    color: "#f9fafb",
    fontSize: "0.9rem",
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.2s",
  },
  error: {
    color: "#ef4444",
    fontSize: "0.8rem",
    padding: "0.5rem 0.75rem",
    border: "1px solid rgba(239,68,68,0.3)",
    backgroundColor: "rgba(239,68,68,0.05)",
  },
  button: {
    backgroundColor: "#f59e0b",
    color: "#000000",
    border: "none",
    padding: "0.9rem",
    fontSize: "0.85rem",
    fontWeight: "bold",
    letterSpacing: "0.15em",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background-color 0.2s",
    marginTop: "0.5rem",
  },
  footer: {
    color: "#374151",
    fontSize: "0.65rem",
    textAlign: "center",
    marginTop: "2rem",
    letterSpacing: "0.08em",
  },
};