import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hiring Ops",
  description: "Score candidates and build a diverse slate of 5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-[rgb(var(--bg))]">
          {children}
        </div>
      </body>
    </html>
  );
}
