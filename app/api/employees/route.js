// app/api/employees/route.js
// POST /api/employees → add a new employee (admin only)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { addEmployee } from "@/lib/sheets";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    await addEmployee({ name, email, password });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add employee error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}