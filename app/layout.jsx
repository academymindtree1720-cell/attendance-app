// app/layout.jsx
// Root layout — wraps everything with the NextAuth session provider

import SessionWrapper from "./providers";

export const metadata = {
  title: "Attendance System",
  description: "Employee attendance tracking with Google Sheets",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { background-color: #0a0a0a; }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: #111; }
          ::-webkit-scrollbar-thumb { background: #374151; }
          ::-webkit-scrollbar-thumb:hover { background: #f59e0b; }
        `}</style>
      </head>
      <body>
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}