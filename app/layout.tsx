import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionWrapper } from "@/components/auth/SessionWrapper";
import { SiftBotProvider } from "@/lib/bot/context";
import { SiftBot } from "@/components/bot/SiftBot";
import "./globals.css";

export const metadata: Metadata = {
  title: "BitSift — Sifting bits from bytes",
  description: "Strip the clutter from any webpage. Get clean, readable content with AI detection.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('sift-theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <SessionWrapper>
          <ThemeProvider>
            <SiftBotProvider>
              {children}
              <SiftBot />
            </SiftBotProvider>
          </ThemeProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
