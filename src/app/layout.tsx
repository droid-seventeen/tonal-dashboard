import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tonal Dashboard",
  description: "Private Tonal strength, readiness, and workout dashboard for family sharing."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
