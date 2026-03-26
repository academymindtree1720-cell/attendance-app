// app/admin/page.jsx
// Admin view: see all attendance records, add new employees
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [filter, setFilter] = useState(""); // search/filter text

  // Add employee form state
  const [newEmployee, setNewEmployee] = useState({ name: "", email: "", password: "" });
  const [addStatus, setAddStatus] = useState(null);
  const [addLoading, setAddLoading] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session?.user?.role !== "admin")
      router.push("/dashboard");
  }, [status, session]);

  // Load attendance records on mount
  useEffect(() => {
    if (session?.user?.role === "admin") fetchRecords();
  }, [session]);

  async function fetchRecords() {
    setLoadingRecords(true);
    try {
      const res = await fetch("/api/attendance");
      const data = await res.json();
      setRecords(data.records || []);
    } catch {
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }

  async function handleAddEmployee(e) {
    e.preventDefault();
    setAddStatus(null);
    setAddLoading(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmployee),
      });
      const data = await res.json();
      if (res.ok) {
        setAddStatus({ text: `✓ Employee "${newEmployee.name}" added.`, type: "success" });
        setNewEmployee({ name: "", email: "", password: "" });
      } else {
        setAddStatus({ text: data.error, type: "error" });
      }
    } catch {
      setAddStatus({ text: "Network error.", type: "error" });
    } finally {
      setAddLoading(false);
    }
  }

  if (status === "loading") return <LoadingScreen />;
  if (!session || session.user.role !== "admin") return null;

  // Filter records by name or email
  const filtered = records.filter(
    (r) =>
      r.name?.toLowerCase().includes(filter.toLowerCase()) ||
      r.email?.toLowerCase().includes(filter.toLowerCase()) ||
      r.type?.toLowerCase().includes(filter.toLowerCase())
  );

  const typeColor = {
    "clock-in": "#22c55e",
    "clock-out": "#ef4444",
    leave: "#f59e0b",
  };

  return (
    <div style={s.page}>
      <div style={s.scanlines} />
      <div style={s.container}>

        {/* Top bar */}
        <div style={s.topbar}>
          <div>
            <span style={s.brand}>▌ADMIN PANEL</span>
            <span style={s.adminBadge}>ADMIN</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={s.logoutBtn}
            onMouseEnter={(e) => (e.target.style.color = "#f59e0b")}
            onMouseLeave={(e) => (e.target.style.color = "#6b7280")}
          >
            SIGN OUT
          </button>
        </div>

        {/* Stats row */}
        <div style={s.statsRow}>
          <StatCard label="TOTAL RECORDS" value={records.length} />
          <StatCard
            label="CLOCK-INS"
            value={records.filter((r) => r.type === "clock-in").length}
            color="#22c55e"
          />
          <StatCard
            label="CLOCK-OUTS"
            value={records.filter((r) => r.type === "clock-out").length}
            color="#ef4444"
          />
          <StatCard
            label="LEAVES"
            value={records.filter((r) => r.type === "leave").length}
            color="#f59e0b"
          />
        </div>

        {/* ── Attendance Table ── */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}>ATTENDANCE RECORDS</span>
            <button onClick={fetchRecords} style={s.refreshBtn}>↻ REFRESH</button>
          </div>

          {/* Search filter */}
          <input
            type="text"
            placeholder="Filter by name, email, or type..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={s.filterInput}
          />

          {loadingRecords ? (
            <p style={s.loadingText}>LOADING RECORDS...</p>
          ) : filtered.length === 0 ? (
            <p style={s.loadingText}>NO RECORDS FOUND.</p>
          ) : (
            <div style={s.tableWrapper}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["DATE", "NAME", "EMAIL", "TYPE", "TIME", "NOTE"].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr
                      key={i}
                      style={{
                        ...s.tr,
                        backgroundColor: i % 2 === 0 ? "#111" : "#0f0f0f",
                      }}
                    >
                      <td style={s.td}>{r.date}</td>
                      <td style={s.td}>{r.name}</td>
                      <td style={{ ...s.td, color: "#6b7280" }}>{r.email}</td>
                      <td style={s.td}>
                        <span
                          style={{
                            ...s.typeBadge,
                            color: typeColor[r.type] || "#9ca3af",
                            borderColor: typeColor[r.type] || "#374151",
                          }}
                        >
                          {r.type?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ ...s.td, fontVariantNumeric: "tabular-nums" }}>{r.time}</td>
                      <td style={{ ...s.td, color: "#6b7280" }}>{r.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Add Employee ── */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}>ADD EMPLOYEE</span>
          </div>

          <div style={s.addForm}>
            <FormField
              label="FULL NAME"
              value={newEmployee.name}
              onChange={(v) => setNewEmployee((p) => ({ ...p, name: v }))}
              placeholder="Jane Doe"
            />
            <FormField
              label="EMAIL"
              type="email"
              value={newEmployee.email}
              onChange={(v) => setNewEmployee((p) => ({ ...p, email: v }))}
              placeholder="jane@company.com"
            />
            <FormField
              label="PASSWORD"
              type="password"
              value={newEmployee.password}
              onChange={(v) => setNewEmployee((p) => ({ ...p, password: v }))}
              placeholder="••••••••"
            />

            <button
              onClick={handleAddEmployee}
              disabled={addLoading}
              style={{ ...s.addBtn, opacity: addLoading ? 0.6 : 1 }}
              onMouseEnter={(e) => !addLoading && (e.target.style.backgroundColor = "#d97706")}
              onMouseLeave={(e) => !addLoading && (e.target.style.backgroundColor = "#f59e0b")}
            >
              {addLoading ? "ADDING..." : "+ ADD EMPLOYEE"}
            </button>

            {addStatus && (
              <div
                style={{
                  ...s.statusMsg,
                  color: addStatus.type === "success" ? "#22c55e" : "#ef4444",
                  borderColor:
                    addStatus.type === "success"
                      ? "rgba(34,197,94,0.3)"
                      : "rgba(239,68,68,0.3)",
                  backgroundColor:
                    addStatus.type === "success"
                      ? "rgba(34,197,94,0.05)"
                      : "rgba(239,68,68,0.05)",
                }}
              >
                {addStatus.text}
              </div>
            )}
          </div>
        </div>

        <p style={s.hint}>All data is synced with Google Sheets in real-time.</p>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, color = "#f9fafb" }) {
  return (
    <div style={s.statCard}>
      <div style={{ ...s.statValue, color }}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label style={s.fieldLabel}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={s.input}
        onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
        onBlur={(e) => (e.target.style.borderColor = "#374151")}
      />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
    background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)",
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1100px",
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
    marginRight: "0.75rem",
  },
  adminBadge: {
    backgroundColor: "rgba(245,158,11,0.1)",
    border: "1px solid rgba(245,158,11,0.3)",
    color: "#f59e0b",
    fontSize: "0.6rem",
    padding: "0.15rem 0.5rem",
    letterSpacing: "0.15em",
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
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "1rem",
    marginBottom: "2rem",
  },
  statCard: {
    border: "1px solid #1f2937",
    backgroundColor: "#111",
    padding: "1rem",
    textAlign: "center",
  },
  statValue: {
    fontSize: "1.75rem",
    fontWeight: "bold",
    fontVariantNumeric: "tabular-nums",
  },
  statLabel: {
    color: "#6b7280",
    fontSize: "0.6rem",
    letterSpacing: "0.12em",
    marginTop: "0.25rem",
  },
  section: {
    border: "1px solid #1f2937",
    borderTop: "2px solid #374151",
    marginBottom: "2rem",
    backgroundColor: "#0d0d0d",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem 1rem",
    borderBottom: "1px solid #1f2937",
    backgroundColor: "#111",
  },
  sectionTitle: {
    color: "#9ca3af",
    fontSize: "0.7rem",
    letterSpacing: "0.15em",
  },
  refreshBtn: {
    background: "none",
    border: "1px solid #374151",
    color: "#6b7280",
    fontSize: "0.65rem",
    padding: "0.3rem 0.75rem",
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "0.1em",
  },
  filterInput: {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#111",
    border: "none",
    borderBottom: "1px solid #1f2937",
    padding: "0.75rem 1rem",
    color: "#d1d5db",
    fontFamily: "inherit",
    fontSize: "0.8rem",
    outline: "none",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.78rem",
  },
  th: {
    color: "#6b7280",
    fontSize: "0.6rem",
    letterSpacing: "0.12em",
    padding: "0.6rem 1rem",
    textAlign: "left",
    borderBottom: "1px solid #1f2937",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #1a1a1a",
  },
  td: {
    padding: "0.6rem 1rem",
    color: "#d1d5db",
    whiteSpace: "nowrap",
  },
  typeBadge: {
    border: "1px solid",
    padding: "0.15rem 0.5rem",
    fontSize: "0.6rem",
    letterSpacing: "0.1em",
  },
  addForm: {
    padding: "1.5rem 1rem",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1rem",
    alignItems: "end",
  },
  fieldLabel: {
    color: "#6b7280",
    fontSize: "0.6rem",
    letterSpacing: "0.12em",
  },
  input: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #374151",
    color: "#f9fafb",
    padding: "0.65rem 0.75rem",
    fontFamily: "inherit",
    fontSize: "0.85rem",
    outline: "none",
    transition: "border-color 0.2s",
    width: "100%",
    boxSizing: "border-box",
  },
  addBtn: {
    backgroundColor: "#f59e0b",
    color: "#000",
    border: "none",
    padding: "0.65rem",
    fontFamily: "inherit",
    fontWeight: "bold",
    fontSize: "0.72rem",
    letterSpacing: "0.1em",
    cursor: "pointer",
    transition: "background-color 0.2s",
    height: "fit-content",
    gridColumn: "1 / -1",
  },
  statusMsg: {
    padding: "0.7rem 0.75rem",
    border: "1px solid",
    fontSize: "0.78rem",
    gridColumn: "1 / -1",
  },
  loadingText: {
    color: "#374151",
    padding: "2rem",
    textAlign: "center",
    fontSize: "0.8rem",
    letterSpacing: "0.1em",
  },
  hint: {
    color: "#374151",
    fontSize: "0.65rem",
    textAlign: "center",
    letterSpacing: "0.08em",
  },
};