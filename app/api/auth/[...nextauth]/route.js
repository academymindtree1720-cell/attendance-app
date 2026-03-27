// app/api/auth/[...nextauth]/route.js
// Authenticates employees against the "Employees" sheet in Google Sheets.
// Uses the CredentialsProvider so employees log in with email + password.

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getEmployees } from "@/lib/sheets";

export const authOptions = {
  // Use JWT sessions (no database needed)
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login", // redirect here when not logged in
  },

  providers: [
    CredentialsProvider({
      name: "Employee Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      // This runs on every login attempt
      async authorize(credentials) {
        try {
          // Fetch employee list from Google Sheets
          const employees = await getEmployees();

          // Find matching employee by email (case-insensitive)
          const employee = employees.find(
            (emp) =>
              emp.email?.toLowerCase() === credentials.email?.toLowerCase()
          );

          if (!employee) return null; // email not found

          // Simple plain-text password check
          // ⚠️  In production, store hashed passwords and use bcrypt.compare()
          if (employee.password !== credentials.password) return null;

          // Return the user object — this becomes the JWT payload
          return {
            id: employee.email,
            name: employee.name,
            email: employee.email,
            // Mark admins by checking an env variable list of admin emails
            role: process.env.ADMIN_EMAILS?.split(",").includes(employee.email)
              ? "admin"
              : "employee",
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    // Store role inside the JWT token
    async jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    // Expose role on the session object accessible in components
    async session({ session, token }) {
      session.user.role = token.role;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export const GET = handler;
export const POST = handler;