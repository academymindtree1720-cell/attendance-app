"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      justifyContent: "center", 
      alignItems: "center",
      color: "white",
      padding: "20px"
    }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "20px" }}>Attendance App</h1>
      <p style={{ fontSize: "1.2rem", marginBottom: "40px" }}>Welcome to the attendance tracking system</p>
      <nav style={{ display: "flex", gap: "20px" }}>
        <Link href="/login" style={{ textDecoration: "none" }}>
          <button style={{
            padding: "10px 20px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "1rem",
            transition: "background-color 0.3s"
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#2563eb"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "#3b82f6"}
          >
            Login
          </button>
        </Link>
        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          <button style={{
            padding: "10px 20px",
            backgroundColor: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "1rem",
            transition: "background-color 0.3s"
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#059669"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "#10b981"}
          >
            Dashboard
          </button>
        </Link>
      </nav>
    </div>
  );
}
