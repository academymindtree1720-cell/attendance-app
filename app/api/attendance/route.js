// app/api/attendance/route.js
// Handles saving and reading attendance records.
//
// POST /api/attendance  → save a clock-in, clock-out, or leave record
// GET  /api/attendance  → return all records (admin only)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { saveAttendance, getAttendanceRecords, addEmployee } from "@/lib/sheets";

// ─── POST: Save an attendance event ──────────────────────────────────────────
export async function POST(request) {
  // Make sure the user is logged in
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, note } = body; // type = "clock-in" | "clock-out" | "leave"

    if (!["clock-in", "clock-out", "leave"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Build record using session info + current time
    const now = new Date();
    const record = {
      date: now.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      email: session.user.email,
      name: session.user.name,
      type,
      time: now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      note: note || "",
    };

    await saveAttendance(record);

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Attendance POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── GET: Fetch all attendance records (admin only) ───────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const records = await getAttendanceRecords();
    return NextResponse.json({ records });
  } catch (error) {
    console.error("Attendance GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}