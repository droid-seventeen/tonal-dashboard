import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Race to 500K",
  description: "Private Tonal Grand Prix dashboard tracking the family race to 500,000 pounds."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
