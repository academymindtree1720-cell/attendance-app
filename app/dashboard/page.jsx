// app/dashboard/page.jsx
// Employee view: clock in, clock out, apply for leave
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [message, setMessage] = useState(null); // { text, type: "success"|"error" }
  const [loading, setLoading] = useState(null); // which button is loading
  const [leaveNote, setLeaveNote] = useState("");
  const [showLeaveInput, setShowLeaveInput] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user?.role === "admin") router.push("/admin");
  }, [status, session]);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (status === "loading") return <LoadingScreen />;
  if (!session) return null;

  // ─── Actions ───────────────────────────────────────────────────────────────
  async function punch(type, note = "") {
    setLoading(type);
    setMessage(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, note }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          text: `✓ ${label(type)} recorded at ${data.record.time}`,
          type: "success",
        });
        setShowLeaveInput(false);
        setLeaveNote("");
      } else {
        setMessage({ text: data.error, type: "error" });
      }
    } catch {
      setMessage({ text: "Network error. Please try again.", type: "error" });
    } finally {
      setLoading(null);
    }
  }

  function label(type) {
    return { "clock-in": "Clock In", "clock-out": "Clock Out", leave: "Leave" }[type];
  }

  const today = currentTime.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={s.page}>
      <div style={s.scanlines} />

      <div style={s.container}>
        {/* Top bar */}
        <div style={s.topbar}>
          <span style={s.brand}>▌ATTENDANCE</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={s.logoutBtn}
            onMouseEnter={(e) => (e.target.style.color = "#f59e0b")}
            onMouseLeave={(e) => (e.target.style.color = "#6b7280")}
          >
            SIGN OUT
          </button>
        </div>

        {/* Hero clock */}
        <div style={s.hero}>
          <div style={s.bigClock}>
            {currentTime.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </div>
          <div style={s.date}>{today.toUpperCase()}</div>
        </div>

        {/* Employee info */}
        <div style={s.infoCard}>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>EMPLOYEE</span>
            <span style={s.infoValue}>{session.user.name}</span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>EMAIL</span>
            <span style={s.infoValue}>{session.user.email}</span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>STATUS</span>
            <span style={{ ...s.infoValue, color: "#22c55e" }}>● ACTIVE</span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={s.actions}>
          <ActionButton
            label="CLOCK IN"
            emoji="⏺"
            color="#22c55e"
            disabled={loading !== null}
            loading={loading === "clock-in"}
            onClick={() => punch("clock-in")}
          />
          <ActionButton
            label="CLOCK OUT"
            emoji="⏹"
            color="#ef4444"
            disabled={loading !== null}
            loading={loading === "clock-out"}
            onClick={() => punch("clock-out")}
          />
          <ActionButton
            label="APPLY LEAVE"
            emoji="📋"
            color="#f59e0b"
            disabled={loading !== null}
            loading={loading === "leave"}
            onClick={() => setShowLeaveInput((v) => !v)}
          />
        </div>

        {/* Leave note input */}
        {showLeaveInput && (
          <div style={s.leaveBox}>
            <label style={s.infoLabel}>LEAVE REASON (OPTIONAL)</label>
            <textarea
              value={leaveNote}
              onChange={(e) => setLeaveNote(e.target.value)}
              placeholder="e.g. Medical appointment, personal work..."
              rows={3}
              style={s.textarea}
            />
            <button
              style={s.submitLeaveBtn}
              onClick={() => punch("leave", leaveNote)}
              disabled={loading !== null}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#d97706")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#f59e0b")}
            >
              {loading === "leave" ? "SUBMITTING..." : "SUBMIT LEAVE REQUEST →"}
            </button>
          </div>
        )}

        {/* Feedback message */}
        {message && (
          <div
            style={{
              ...s.message,
              backgroundColor:
                message.type === "success"
                  ? "rgba(34,197,94,0.08)"
                  : "rgba(239,68,68,0.08)",
              borderColor:
                message.type === "success"
                  ? "rgba(34,197,94,0.3)"
                  : "rgba(239,68,68,0.3)",
              color: message.type === "success" ? "#22c55e" : "#ef4444",
            }}
          >
            {message.text}
          </div>
        )}

        <p style={s.hint}>All records are saved directly to Google Sheets.</p>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ActionButton({ label, emoji, color, onClick, disabled, loading }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...s.actionBtn,
        borderColor: hovered && !disabled ? color : "#374151",
        color: hovered && !disabled ? color : "#9ca3af",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span style={{ fontSize: "1.5rem" }}>{loading ? "⏳" : emoji}</span>
      <span style={{ fontSize: "0.7rem", letterSpacing: "0.12em" }}>
        {loading ? "PROCESSING" : label}
      </span>
    </button>
  );
}

function LoadingScreen() {
  return (
    <div style={{ ...s.page, alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#f59e0b", fontFamily: "monospace", letterSpacing: "0.2em" }}>
        LOADING...
      </span>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    fontFamily: "'Courier New', Courier, monospace",
    position: "relative",
  },
  scanlines: {
    position: "fixed",
    inset: 0,
    background:
      "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)",
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "600px",
    margin: "0 auto",
    padding: "1.5rem 1rem",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #1f2937",
    paddingBottom: "1rem",
    marginBottom: "2rem",
  },
  brand: {
    color: "#f59e0b",
    fontWeight: "bold",
    letterSpacing: "0.15em",
    fontSize: "0.85rem",
  },
  logoutBtn: {
    background: "none",
    border: "none",
    color: "#6b7280",
    fontSize: "0.7rem",
    letterSpacing: "0.12em",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "color 0.2s",
  },
  hero: {
    textAlign: "center",
    marginBottom: "2rem",
    padding: "1.5rem 0",
    borderBottom: "1px solid #1f2937",
  },
  bigClock: {
    fontSize: "3.5rem",
    fontWeight: "bold",
    color: "#f59e0b",
    letterSpacing: "0.05em",
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1,
    marginBottom: "0.5rem",
  },
  date: {
    color: "#6b7280",
    fontSize: "0.7rem",
    letterSpacing: "0.12em",
  },
  infoCard: {
    border: "1px solid #1f2937",
    padding: "1rem",
    marginBottom: "2rem",
    backgroundColor: "#111",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0.4rem 0",
    borderBottom: "1px solid #1f2937",
  },
  infoLabel: {
    color: "#6b7280",
    fontSize: "0.65rem",
    letterSpacing: "0.12em",
  },
  infoValue: {
    color: "#d1d5db",
    fontSize: "0.8rem",
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  actionBtn: {
    backgroundColor: "#111",
    border: "1px solid #374151",
    padding: "1.25rem 0.5rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    fontFamily: "inherit",
    transition: "border-color 0.2s, color 0.2s",
  },
  leaveBox: {
    border: "1px solid #374151",
    borderTop: "2px solid #f59e0b",
    padding: "1.25rem",
    backgroundColor: "#111",
    marginBottom: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  textarea: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #374151",
    color: "#d1d5db",
    padding: "0.75rem",
    fontFamily: "inherit",
    fontSize: "0.85rem",
    resize: "vertical",
    outline: "none",
  },
  submitLeaveBtn: {
    backgroundColor: "#f59e0b",
    color: "#000",
    border: "none",
    padding: "0.75rem",
    fontFamily: "inherit",
    fontWeight: "bold",
    fontSize: "0.75rem",
    letterSpacing: "0.12em",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  message: {
    padding: "0.9rem 1rem",
    border: "1px solid",
    fontSize: "0.8rem",
    marginBottom: "1.5rem",
    letterSpacing: "0.05em",
  },
  hint: {
    color: "#374151",
    fontSize: "0.65rem",
    textAlign: "center",
    letterSpacing: "0.08em",
  },
};