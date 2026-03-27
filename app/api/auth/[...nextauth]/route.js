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
          if (!credentials?.email || !credentials?.password) {
            console.warn("Credentials missing in authorize()", credentials);
            return null;
          }

          // Fetch employee list from Google Sheets
          const employeesRaw = await getEmployees();
          const employees = employeesRaw
            .filter((emp) => emp?.email && emp?.password)
            .map((emp) => ({
              name: String(emp.name || "").trim(),
              email: String(emp.email || "").trim(),
              password: String(emp.password || "").trim(),
            }));

          const loginEmail = credentials.email.trim().toLowerCase();
          const loginPassword = credentials.password.trim();

          const employee = employees.find(
            (emp) => emp.email.toLowerCase() === loginEmail
          );

          if (!employee) {
            console.warn(`Login failed: email not found (${loginEmail})`);
            return null;
          }

          if (employee.password !== loginPassword) {
            console.warn(`Login failed: password mismatch for ${loginEmail}`);
            return null;
          }

          const adminEmails = (process.env.ADMIN_EMAILS || "")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);

          return {
            id: employee.email,
            name: employee.name,
            email: employee.email,
            role: adminEmails.includes(employee.email.toLowerCase())
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