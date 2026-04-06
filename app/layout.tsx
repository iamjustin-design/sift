import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sift — Sifting bits from bytes",
  description: "Strip the clutter from any webpage. Get clean, readable content with AI detection.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
