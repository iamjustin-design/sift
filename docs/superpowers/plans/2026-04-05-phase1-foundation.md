# Sift Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Sift web app where a user pastes a URL, the server fetches and cleans the content via Readability.js, and renders it in a clean light/dark themed result page.

**Architecture:** Next.js 14 App Router with server-side API route that fetches target URLs, extracts article content via @mozilla/readability + jsdom, and returns structured JSON. React frontend renders the clean result with theme toggle. No database, no auth, no AI detection in Phase 1.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, @mozilla/readability, jsdom, Node 20+

**Project root:** `E:\SHARED\PROJECTS\sift`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript config |
| `next.config.ts` | Next.js config |
| `tailwind.config.ts` | Tailwind theme (Sift colors) |
| `app/globals.css` | Tailwind imports + base styles |
| `app/layout.tsx` | Root layout, font, theme provider wrapper |
| `app/page.tsx` | Landing page — logo, URL input, feature cards |
| `app/sift/page.tsx` | Sifted result page (reads `?url=` param, calls API, renders) |
| `app/api/sift/route.ts` | API endpoint — fetch URL, parse, clean, return JSON |
| `lib/parser/fetcher.ts` | Server-side URL fetcher with error handling |
| `lib/parser/extractor.ts` | Readability.js wrapper — HTML in, structured article out |
| `lib/parser/meta-extractor.ts` | Extract og:, meta, JSON-LD from raw HTML |
| `lib/parser/types.ts` | Shared TypeScript types (SiftResult, ArticleMeta, etc.) |
| `components/ThemeProvider.tsx` | Client component — dark/light toggle, system detection, localStorage |
| `components/ThemeToggle.tsx` | Theme switch button |
| `components/landing/UrlInput.tsx` | URL input bar with Sift button |
| `components/landing/FeatureCards.tsx` | Three feature cards (De-clutter, Extract, AI Detect) |
| `components/landing/Logo.tsx` | Sift logo SVG + tagline |
| `components/result/SourceBar.tsx` | "Sifted from: [domain]" bar |
| `components/result/ArticleBody.tsx` | Clean content renderer (sanitized HTML) |
| `public/sift-logo.svg` | Logo SVG file |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `public/sift-logo.svg`, `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd E:\SHARED\PROJECTS\sift
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

When prompted:
- Would you like to use `src/` directory? **No**
- Would you like to customize the import alias? **Yes** → `@/*`

This creates the full Next.js scaffold with TypeScript, Tailwind, ESLint, and App Router.

- [ ] **Step 2: Install parsing dependencies**

```bash
cd E:\SHARED\PROJECTS\sift
npm install @mozilla/readability jsdom
npm install -D @types/jsdom
```

- [ ] **Step 3: Update tailwind.config.ts with Sift theme colors**

Replace the contents of `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        sift: {
          gold: "#b8860b",
          "gold-light": "#d4a017",
          "gold-dark": "#8b6508",
        },
        surface: {
          light: "#faf9f6",
          "light-card": "#ffffff",
          dark: "#141414",
          "dark-card": "#1a1808",
        },
        border: {
          light: "#e0ddd5",
          dark: "#2a2a2a",
        },
      },
      fontFamily: {
        sans: [
          "Segoe UI",
          "-apple-system",
          "BlinkMacSystemFont",
          "Roboto",
          "Oxygen-Sans",
          "Ubuntu",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Set up globals.css**

Replace `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-surface-light text-gray-800 dark:bg-surface-dark dark:text-gray-200;
    font-variant-numeric: tabular-nums;
  }
}
```

- [ ] **Step 5: Create the Sift logo SVG**

Create `public/sift-logo.svg`:

```svg
<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="40" cy="28" rx="30" ry="10" stroke="currentColor" stroke-width="3" fill="none"/>
  <path d="M10 28 L18 60 Q20 65 25 67 L55 67 Q60 65 62 60 L70 28" stroke="currentColor" stroke-width="3" fill="none"/>
  <line x1="62" y1="38" x2="78" y2="32" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  <line x1="22" y1="45" x2="58" y2="45" stroke="currentColor" stroke-width="1" opacity="0.4"/>
  <line x1="24" y1="52" x2="56" y2="52" stroke="currentColor" stroke-width="1" opacity="0.4"/>
  <line x1="27" y1="59" x2="53" y2="59" stroke="currentColor" stroke-width="1" opacity="0.4"/>
  <line x1="30" y1="35" x2="30" y2="65" stroke="currentColor" stroke-width="1" opacity="0.3"/>
  <line x1="40" y1="32" x2="40" y2="67" stroke="currentColor" stroke-width="1" opacity="0.3"/>
  <line x1="50" y1="35" x2="50" y2="65" stroke="currentColor" stroke-width="1" opacity="0.3"/>
  <circle cx="32" cy="72" r="2" fill="currentColor" opacity="0.4"/>
  <circle cx="40" cy="75" r="1.5" fill="currentColor" opacity="0.3"/>
  <circle cx="48" cy="73" r="2.5" fill="currentColor" opacity="0.35"/>
</svg>
```

- [ ] **Step 6: Update app/layout.tsx**

Replace `app/layout.tsx`:

```tsx
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
```

- [ ] **Step 7: Create minimal landing page placeholder**

Replace `app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100">Sift</h1>
        <p className="mt-2 text-gray-500 italic">Sifting bits from bytes</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 8: Update .gitignore**

Make sure `.gitignore` includes:

```
node_modules/
.next/
.env.local
.env
*.tsbuildinfo
```

- [ ] **Step 9: Verify dev server starts**

```bash
cd E:\SHARED\PROJECTS\sift
npm run dev
```

Open `http://localhost:3000` — should see "Sift" centered with tagline. Kill the server.

- [ ] **Step 10: Commit**

```bash
cd E:\SHARED\PROJECTS\sift
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind, Sift theme, and logo"
```

---

## Task 2: Shared Types and Parser Pipeline

**Files:**
- Create: `lib/parser/types.ts`
- Create: `lib/parser/fetcher.ts`
- Create: `lib/parser/meta-extractor.ts`
- Create: `lib/parser/extractor.ts`

- [ ] **Step 1: Create shared types**

Create `lib/parser/types.ts`:

```typescript
export interface ArticleMeta {
  title: string;
  description: string;
  author: string;
  publishedDate: string;
  siteName: string;
  canonicalUrl: string;
  ogImage: string;
  ogType: string;
}

export interface SiftResult {
  meta: ArticleMeta;
  content: string;       // cleaned HTML content
  textContent: string;   // plain text (for AI scoring later)
  excerpt: string;
  wordCount: number;
  sourceUrl: string;
  sourceDomain: string;
  siftedAt: string;      // ISO timestamp
  fetchTimeMs: number;
}

export interface SiftError {
  error: string;
  code: "FETCH_FAILED" | "PARSE_FAILED" | "INVALID_URL" | "TIMEOUT";
}
```

- [ ] **Step 2: Create URL fetcher**

Create `lib/parser/fetcher.ts`:

```typescript
export interface FetchResult {
  html: string;
  url: string;           // final URL after redirects
  contentType: string;
  fetchTimeMs: number;
}

export async function fetchUrl(url: string): Promise<FetchResult> {
  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("INVALID_URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("INVALID_URL");
  }

  const start = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Sift/1.0 (+https://sift.app) Mozilla/5.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("FETCH_FAILED");
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error("FETCH_FAILED");
    }

    const html = await response.text();
    const fetchTimeMs = Date.now() - start;

    return {
      html,
      url: response.url, // final URL after redirects
      contentType,
      fetchTimeMs,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("TIMEOUT");
    }
    if (err instanceof Error && ["INVALID_URL", "FETCH_FAILED", "TIMEOUT"].includes(err.message)) {
      throw err;
    }
    throw new Error("FETCH_FAILED");
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 3: Create meta extractor**

Create `lib/parser/meta-extractor.ts`:

```typescript
import { JSDOM } from "jsdom";
import { ArticleMeta } from "./types";

export function extractMeta(doc: Document, url: string): ArticleMeta {
  const getMeta = (name: string): string => {
    const el =
      doc.querySelector(`meta[property="${name}"]`) ||
      doc.querySelector(`meta[name="${name}"]`);
    return el?.getAttribute("content")?.trim() || "";
  };

  const canonical =
    doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || url;

  let siteName = getMeta("og:site_name");
  if (!siteName) {
    try {
      siteName = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      siteName = "";
    }
  }

  return {
    title: getMeta("og:title") || doc.querySelector("title")?.textContent?.trim() || "",
    description: getMeta("og:description") || getMeta("description"),
    author: getMeta("author") || getMeta("article:author"),
    publishedDate: getMeta("article:published_time") || getMeta("date") || "",
    siteName,
    canonicalUrl: canonical,
    ogImage: getMeta("og:image"),
    ogType: getMeta("og:type"),
  };
}
```

- [ ] **Step 4: Create content extractor (Readability wrapper)**

Create `lib/parser/extractor.ts`:

```typescript
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { extractMeta } from "./meta-extractor";
import { fetchUrl } from "./fetcher";
import { SiftResult } from "./types";

export async function siftUrl(url: string): Promise<SiftResult> {
  const fetched = await fetchUrl(url);

  const dom = new JSDOM(fetched.html, { url: fetched.url });
  const doc = dom.window.document;

  // Extract meta before Readability mutates the DOM
  const meta = extractMeta(doc, fetched.url);

  // Clone doc for Readability (it modifies the DOM)
  const readerDom = new JSDOM(fetched.html, { url: fetched.url });
  const reader = new Readability(readerDom.window.document);
  const article = reader.parse();

  if (!article) {
    throw new Error("PARSE_FAILED");
  }

  // Use Readability values where they're better than meta
  if (!meta.title && article.title) meta.title = article.title;
  if (!meta.author && article.byline) meta.author = article.byline;
  if (!meta.excerpt && article.excerpt) meta.description = article.excerpt;
  if (article.siteName) meta.siteName = article.siteName;

  let sourceDomain = "";
  try {
    sourceDomain = new URL(fetched.url).hostname.replace(/^www\./, "");
  } catch {
    sourceDomain = "";
  }

  // Count words in text content
  const wordCount = article.textContent
    ? article.textContent.split(/\s+/).filter((w) => w.length > 0).length
    : 0;

  return {
    meta,
    content: article.content,        // HTML
    textContent: article.textContent, // plain text
    excerpt: article.excerpt || meta.description,
    wordCount,
    sourceUrl: fetched.url,
    sourceDomain,
    siftedAt: new Date().toISOString(),
    fetchTimeMs: fetched.fetchTimeMs,
  };
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd E:\SHARED\PROJECTS\sift
npx tsc --noEmit
```

Expected: No errors (or only warnings about unused vars which is fine).

- [ ] **Step 6: Commit**

```bash
cd E:\SHARED\PROJECTS\sift
git add lib/
git commit -m "feat: add parsing pipeline — fetcher, meta extractor, Readability wrapper"
```

---

## Task 3: API Route

**Files:**
- Create: `app/api/sift/route.ts`

- [ ] **Step 1: Create the sift API endpoint**

Create `app/api/sift/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { siftUrl } from "@/lib/parser/extractor";
import { SiftError } from "@/lib/parser/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body.url;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required", code: "INVALID_URL" } as SiftError,
        { status: 400 }
      );
    }

    const result = await siftUrl(url);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";

    const statusMap: Record<string, number> = {
      INVALID_URL: 400,
      FETCH_FAILED: 502,
      PARSE_FAILED: 422,
      TIMEOUT: 504,
    };

    const status = statusMap[message] || 500;

    return NextResponse.json(
      { error: message, code: message } as SiftError,
      { status }
    );
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required", code: "INVALID_URL" } as SiftError,
      { status: 400 }
    );
  }

  try {
    const result = await siftUrl(url);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";

    const statusMap: Record<string, number> = {
      INVALID_URL: 400,
      FETCH_FAILED: 502,
      PARSE_FAILED: 422,
      TIMEOUT: 504,
    };

    const status = statusMap[message] || 500;

    return NextResponse.json(
      { error: message, code: message } as SiftError,
      { status }
    );
  }
}
```

- [ ] **Step 2: Test the API**

Start the dev server and test with curl:

```bash
cd E:\SHARED\PROJECTS\sift
npm run dev &

# Wait a few seconds, then test
curl -X POST http://localhost:3000/api/sift \
  -H "Content-Type: application/json" \
  -d '{"url":"https://en.wikipedia.org/wiki/Chocolate_chip_cookie"}' | head -c 500
```

Expected: JSON response with `meta`, `content`, `textContent`, `excerpt`, `wordCount`, etc.

Kill the dev server after testing.

- [ ] **Step 3: Commit**

```bash
cd E:\SHARED\PROJECTS\sift
git add app/api/
git commit -m "feat: add /api/sift endpoint — POST and GET support"
```

---

## Task 4: Theme Provider

**Files:**
- Create: `components/ThemeProvider.tsx`
- Create: `components/ThemeToggle.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create ThemeProvider**

Create `components/ThemeProvider.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("sift-theme") as Theme | null;
    if (stored) setThemeState(stored);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const resolve = () => {
      if (theme === "system") {
        setResolvedTheme(mediaQuery.matches ? "dark" : "light");
      } else {
        setResolvedTheme(theme);
      }
    };

    resolve();
    mediaQuery.addEventListener("change", resolve);
    return () => mediaQuery.removeEventListener("change", resolve);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("sift-theme", t);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

- [ ] **Step 2: Create ThemeToggle**

Create `components/ThemeToggle.tsx`:

```tsx
"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 3: Wire ThemeProvider into layout.tsx**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd E:\SHARED\PROJECTS\sift
git add components/ app/layout.tsx
git commit -m "feat: add theme provider with light/dark/system toggle"
```

---

## Task 5: Landing Page

**Files:**
- Create: `components/landing/Logo.tsx`
- Create: `components/landing/UrlInput.tsx`
- Create: `components/landing/FeatureCards.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create Logo component**

Create `components/landing/Logo.tsx`:

```tsx
import Image from "next/image";

export function Logo() {
  return (
    <div className="text-center mb-10">
      <div className="w-20 h-20 mx-auto mb-4 text-sift-gold">
        <Image src="/sift-logo.svg" alt="Sift" width={80} height={80} priority />
      </div>
      <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
        Sift
      </h1>
      <p className="mt-1 text-base text-gray-400 italic">
        Sifting bits from bytes
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create UrlInput component**

Create `components/landing/UrlInput.tsx`:

```tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export function UrlInput() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }

    setLoading(true);
    router.push(`/sift?url=${encodeURIComponent(cleanUrl)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto mb-6">
      <div className="flex">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a URL to sift..."
          className="flex-1 px-5 py-4 text-base border-2 border-border-light dark:border-border-dark border-r-0 rounded-l-xl bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 outline-none focus:border-sift-gold dark:focus:border-sift-gold-light placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-4 text-base font-semibold bg-gradient-to-br from-sift-gold to-sift-gold-light text-white border-2 border-sift-gold rounded-r-xl hover:from-sift-gold-dark hover:to-sift-gold tracking-wide transition-all disabled:opacity-50 disabled:cursor-wait"
        >
          {loading ? "Sifting..." : "Sift It"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create FeatureCards component**

Create `components/landing/FeatureCards.tsx`:

```tsx
const features = [
  {
    icon: "🧹",
    title: "De-clutter",
    desc: "Strips ads, popups, life stories, and filler content",
  },
  {
    icon: "🔍",
    title: "Extract",
    desc: "Pulls out the actual content, recipes, and media you came for",
  },
  {
    icon: "🤖",
    title: "AI Detect",
    desc: "Scores content for AI-generated patterns with a confidence rating",
  },
];

export function FeatureCards() {
  return (
    <div className="flex gap-8 max-w-2xl mx-auto mt-8">
      {features.map((f) => (
        <div key={f.title} className="flex-1 text-center py-5 px-4">
          <div className="text-3xl mb-2">{f.icon}</div>
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            {f.title}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            {f.desc}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Build the landing page**

Replace `app/page.tsx`:

```tsx
import { Logo } from "@/components/landing/Logo";
import { UrlInput } from "@/components/landing/UrlInput";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-surface-light via-[#f0efe8] to-[#e8e6dd] dark:from-surface-dark dark:via-[#1a1a1a] dark:to-[#111111] px-5 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Logo />
      <UrlInput />
      <FeatureCards />
    </main>
  );
}
```

- [ ] **Step 5: Verify landing page renders**

```bash
cd E:\SHARED\PROJECTS\sift
npm run dev
```

Open `http://localhost:3000` — should see the full landing page with logo, URL input, feature cards, and theme toggle. Test dark mode toggle. Kill the server.

- [ ] **Step 6: Commit**

```bash
cd E:\SHARED\PROJECTS\sift
git add app/page.tsx components/landing/
git commit -m "feat: add landing page with logo, URL input, and feature cards"
```

---

## Task 6: Sifted Result Page

**Files:**
- Create: `components/result/SourceBar.tsx`
- Create: `components/result/ArticleBody.tsx`
- Create: `app/sift/page.tsx`

- [ ] **Step 1: Create SourceBar component**

Create `components/result/SourceBar.tsx`:

```tsx
interface SourceBarProps {
  domain: string;
  url: string;
  siftedAt: string;
  fetchTimeMs: number;
}

export function SourceBar({ domain, url, siftedAt, fetchTimeMs }: SourceBarProps) {
  const timeAgo = () => {
    const diff = Date.now() - new Date(siftedAt).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  };

  return (
    <div className="flex items-center gap-2 py-3 mb-6 border-b border-border-light dark:border-border-dark text-xs text-gray-400 dark:text-gray-500">
      <span>Sifted from:</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sift-gold hover:underline"
      >
        {domain}
      </a>
      <span className="ml-auto text-gray-300 dark:text-gray-600">
        {timeAgo()} &bull; {fetchTimeMs}ms
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Create ArticleBody component**

Create `components/result/ArticleBody.tsx`:

```tsx
interface ArticleBodyProps {
  title: string;
  author: string;
  publishedDate: string;
  ogImage: string;
  content: string;
  wordCount: number;
}

export function ArticleBody({
  title,
  author,
  publishedDate,
  ogImage,
  content,
  wordCount,
}: ArticleBodyProps) {
  const readTime = Math.max(1, Math.ceil(wordCount / 250));

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <article>
      <h1 className="text-4xl font-bold leading-tight text-gray-900 dark:text-gray-100 mb-3">
        {title}
      </h1>

      <div className="text-sm text-gray-400 dark:text-gray-500 mb-8">
        {author && <span>By {author}</span>}
        {author && publishedDate && <span> &bull; </span>}
        {publishedDate && <span>{formatDate(publishedDate)}</span>}
        <span> &bull; {readTime} min read</span>
      </div>

      {ogImage && (
        <div className="w-full mb-8 rounded-xl overflow-hidden">
          <img
            src={ogImage}
            alt={title}
            className="w-full h-auto max-h-80 object-cover"
          />
        </div>
      )}

      <div
        className="prose prose-lg dark:prose-invert max-w-none
          prose-headings:text-gray-900 dark:prose-headings:text-gray-100
          prose-p:text-gray-700 dark:prose-p:text-gray-300
          prose-a:text-sift-gold prose-a:no-underline hover:prose-a:underline
          prose-img:rounded-lg"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </article>
  );
}
```

- [ ] **Step 3: Create the sift result page**

Create `app/sift/page.tsx`:

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { SiftResult, SiftError } from "@/lib/parser/types";
import { SourceBar } from "@/components/result/SourceBar";
import { ArticleBody } from "@/components/result/ArticleBody";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

function SiftContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const [result, setResult] = useState<SiftResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setError("No URL provided");
      setLoading(false);
      return;
    }

    const fetchSift = async () => {
      try {
        const res = await fetch("/api/sift", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!res.ok) {
          const err: SiftError = await res.json();
          setError(err.error || "Failed to sift this page");
          setLoading(false);
          return;
        }

        const data: SiftResult = await res.json();
        setResult(data);
      } catch {
        setError("Network error — please try again");
      } finally {
        setLoading(false);
      }
    };

    fetchSift();
  }, [url]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-light dark:bg-surface-dark">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-sift-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Sifting content...</p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">{url}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-light dark:bg-surface-dark px-5">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">😵</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Couldn&apos;t sift that
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-sift-gold text-white rounded-lg font-medium hover:bg-sift-gold-dark transition-colors"
          >
            Try another URL
          </Link>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      <div className="max-w-3xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="text-sift-gold hover:text-sift-gold-dark font-semibold text-sm flex items-center gap-1"
          >
            <span>&larr;</span> Sift
          </Link>
          <ThemeToggle />
        </div>

        <SourceBar
          domain={result.sourceDomain}
          url={result.sourceUrl}
          siftedAt={result.siftedAt}
          fetchTimeMs={result.fetchTimeMs}
        />

        <ArticleBody
          title={result.meta.title}
          author={result.meta.author}
          publishedDate={result.meta.publishedDate}
          ogImage={result.meta.ogImage}
          content={result.content}
          wordCount={result.wordCount}
        />
      </div>
    </div>
  );
}

export default function SiftPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
        <div className="w-12 h-12 border-4 border-sift-gold border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SiftContent />
    </Suspense>
  );
}
```

- [ ] **Step 4: Install Tailwind typography plugin for prose classes**

```bash
cd E:\SHARED\PROJECTS\sift
npm install @tailwindcss/typography
```

Add the plugin to `tailwind.config.ts`:

```typescript
  plugins: [require("@tailwindcss/typography")],
```

(Replace the empty `plugins: []` array.)

- [ ] **Step 5: End-to-end test**

```bash
cd E:\SHARED\PROJECTS\sift
npm run dev
```

1. Open `http://localhost:3000`
2. Paste `https://en.wikipedia.org/wiki/Chocolate_chip_cookie` into the input
3. Click "Sift It"
4. Should navigate to `/sift?url=...` and show loading spinner, then the clean article
5. Toggle dark mode — article should switch themes
6. Click "← Sift" to go back to landing

- [ ] **Step 6: Commit**

```bash
cd E:\SHARED\PROJECTS\sift
git add app/sift/ components/result/ tailwind.config.ts
git commit -m "feat: add sifted result page with article rendering and theme support"
```

---

## Task 7: Build Verification

- [ ] **Step 1: Production build**

```bash
cd E:\SHARED\PROJECTS\sift
npm run build
```

Expected: Successful build with no errors. Some warnings about `dangerouslySetInnerHTML` are expected and fine.

- [ ] **Step 2: Test production build**

```bash
cd E:\SHARED\PROJECTS\sift
npm start
```

Open `http://localhost:3000`, test the full flow. Kill the server.

- [ ] **Step 3: Commit if any fixes needed**

```bash
cd E:\SHARED\PROJECTS\sift
git add -A
git commit -m "fix: build fixes for production"
```
