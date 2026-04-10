# Phase A: BitSift Branding + Bot Shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand from "Sift" to "BitSift" and build the interactive bot shell with all 4 states — no animations or LLM yet, just the UI framework.

**Architecture:** The BitSift Bot is a persistent React component rendered in the root layout via a context provider. It manages 4 states (hidden, expanded-welcome, working, collapsed) based on the current route and user interaction. The landing page is replaced by the bot's welcome state. The result page shows the bot in collapsed state with an expandable chat panel shell.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-04-10-bitsift-bot-rebrand-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `lib/bot/types.ts` | Bot state enum, chat message types, action types |
| `lib/bot/context.tsx` | SiftBotProvider — React context for bot state management |
| `components/bot/BotAvatar.tsx` | Placeholder sieve mascot SVG (swap for Nico's design later) |
| `components/bot/BotGreeting.tsx` | Welcome state — mascot + speech bubble + URL input |
| `components/bot/ChatPanel.tsx` | Expandable chat panel with message thread + quick actions |
| `components/bot/ChatMessage.tsx` | Individual message bubble (bot or user) |
| `components/bot/QuickActions.tsx` | Pill buttons for common post-sift actions |
| `components/bot/SiftBot.tsx` | Main orchestrator — route-aware, renders correct state |

### Modified Files
| File | Changes |
|------|---------|
| `app/layout.tsx` | Update metadata to BitSift, add SiftBotProvider + SiftBot |
| `app/page.tsx` | Replace landing content with BotGreeting via bot context |
| `app/sift/page.tsx` | Add collapsed bot, update back link to BitSift |
| `app/globals.css` | Add bot-specific animations (pulse, slide-up) |
| `components/landing/Logo.tsx` | Rename to BitSift |
| `public/sift-logo.svg` | Keep as-is (placeholder until Nico's design) |

---

### Task 1: Bot Types

**Files:**
- Create: `lib/bot/types.ts`

- [ ] **Step 1: Create bot type definitions**

```typescript
// lib/bot/types.ts

export type BotState = "hidden" | "welcome" | "working" | "collapsed";

export interface ChatMessage {
  id: string;
  role: "bot" | "user";
  content: string;
  timestamp: number;
}

export interface ChatAction {
  type: "filter" | "extract" | "re-sift" | "adjust" | "none";
  params?: Record<string, unknown>;
}

export interface ChatResponse {
  reply: string;
  action?: ChatAction;
}

export interface SiftBotContextType {
  botState: BotState;
  setBotState: (state: BotState) => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  messages: ChatMessage[];
  addMessage: (role: "bot" | "user", content: string) => void;
  currentUrl: string | null;
  setCurrentUrl: (url: string | null) => void;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/bot/types.ts
git commit -m "feat: add BitSift Bot type definitions"
```

---

### Task 2: Bot Context Provider

**Files:**
- Create: `lib/bot/context.tsx`

- [ ] **Step 1: Create the SiftBotProvider**

```typescript
// lib/bot/context.tsx
"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import type { BotState, ChatMessage, SiftBotContextType } from "./types";

const SiftBotContext = createContext<SiftBotContextType>({
  botState: "welcome",
  setBotState: () => {},
  chatOpen: false,
  setChatOpen: () => {},
  messages: [],
  addMessage: () => {},
  currentUrl: null,
  setCurrentUrl: () => {},
});

export function useSiftBot() {
  return useContext(SiftBotContext);
}

const HIDDEN_ROUTES = ["/login", "/signup", "/account"];

export function SiftBotProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [botStateOverride, setBotStateOverride] = useState<BotState | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  const addMessage = useCallback((role: "bot" | "user", content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role,
        content,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  // Derive bot state from route unless explicitly overridden
  let botState: BotState;
  if (botStateOverride) {
    botState = botStateOverride;
  } else if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) {
    botState = "hidden";
  } else if (pathname === "/") {
    botState = "welcome";
  } else if (pathname.startsWith("/sift")) {
    botState = "collapsed";
  } else {
    botState = "hidden";
  }

  const setBotState = useCallback((state: BotState) => {
    setBotStateOverride(state);
  }, []);

  return (
    <SiftBotContext.Provider
      value={{
        botState,
        setBotState,
        chatOpen,
        setChatOpen,
        messages,
        addMessage,
        currentUrl,
        setCurrentUrl,
      }}
    >
      {children}
    </SiftBotContext.Provider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/bot/context.tsx
git commit -m "feat: add SiftBotProvider context"
```

---

### Task 3: Bot Avatar (Placeholder Mascot)

**Files:**
- Create: `components/bot/BotAvatar.tsx`

- [ ] **Step 1: Create the placeholder sieve mascot SVG component**

```typescript
// components/bot/BotAvatar.tsx

interface BotAvatarProps {
  size?: number;
  className?: string;
}

export function BotAvatar({ size = 72, className = "" }: BotAvatarProps) {
  return (
    <div
      className={`rounded-full bg-gradient-to-br from-sift-gold-light to-sift-gold flex items-center justify-center shadow-lg ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sieve bowl */}
        <ellipse cx="60" cy="50" rx="38" ry="22" stroke="currentColor" strokeWidth="5" className="text-surface-dark dark:text-surface-light" />
        <path d="M 22 50 Q 30 85 60 90 Q 90 85 98 50" stroke="currentColor" strokeWidth="5" fill="none" className="text-surface-dark dark:text-surface-light" />
        {/* Sieve holes */}
        <circle cx="45" cy="65" r="2.5" fill="currentColor" className="text-surface-dark dark:text-surface-light" opacity="0.3" />
        <circle cx="55" cy="72" r="2.5" fill="currentColor" className="text-surface-dark dark:text-surface-light" opacity="0.3" />
        <circle cx="65" cy="68" r="2.5" fill="currentColor" className="text-surface-dark dark:text-surface-light" opacity="0.3" />
        <circle cx="75" cy="63" r="2.5" fill="currentColor" className="text-surface-dark dark:text-surface-light" opacity="0.3" />
        {/* Eyes */}
        <circle cx="48" cy="46" r="5" fill="currentColor" className="text-surface-dark dark:text-surface-light" />
        <circle cx="68" cy="46" r="5" fill="currentColor" className="text-surface-dark dark:text-surface-light" />
        <circle cx="50" cy="44" r="1.5" fill="currentColor" className="text-sift-gold" />
        <circle cx="70" cy="44" r="1.5" fill="currentColor" className="text-sift-gold" />
        {/* Smile */}
        <path d="M 50 54 Q 58 62 66 54" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" className="text-surface-dark dark:text-surface-light" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/bot/BotAvatar.tsx
git commit -m "feat: add placeholder BotAvatar sieve mascot"
```

---

### Task 4: Bot Greeting (Landing Page Replacement)

**Files:**
- Create: `components/bot/BotGreeting.tsx`

- [ ] **Step 1: Create the BotGreeting component**

This replaces the current landing page content. Bot mascot centered, speech bubble, URL input, feature hints.

```typescript
// components/bot/BotGreeting.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BotAvatar } from "./BotAvatar";
import { useSiftBot } from "@/lib/bot/context";

export function BotGreeting() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setCurrentUrl, setBotState } = useSiftBot();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }
    setLoading(true);
    setCurrentUrl(cleanUrl);
    setBotState("working");
    router.push(`/sift?url=${encodeURIComponent(cleanUrl)}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-5">
      {/* Mascot + speech bubble */}
      <div className="flex items-end gap-4 mb-8">
        <BotAvatar size={72} />
        <div className="relative bg-surface-light-card dark:bg-surface-dark-card border border-border-light dark:border-border-dark rounded-2xl rounded-bl-sm px-5 py-3 max-w-[280px] shadow-sm">
          <h1 className="text-sift-gold dark:text-sift-gold-light text-lg font-semibold">
            What can I sift for you today?
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Paste a URL and I&apos;ll extract the good stuff.
          </p>
        </div>
      </div>

      {/* URL input */}
      <form onSubmit={handleSubmit} className="w-full max-w-lg mb-6">
        <div className="flex bg-white dark:bg-gray-900 border-2 border-border-light dark:border-border-dark rounded-2xl p-1 focus-within:border-sift-gold dark:focus-within:border-sift-gold-light transition-colors">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a URL to sift..."
            className="flex-1 px-4 py-3 text-base bg-transparent text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 text-base font-bold bg-gradient-to-br from-sift-gold to-sift-gold-light text-white rounded-xl hover:from-sift-gold-dark hover:to-sift-gold tracking-wide transition-all disabled:opacity-50 disabled:cursor-wait cursor-pointer"
          >
            {loading ? "Sifting..." : "Sift It"}
          </button>
        </div>
      </form>

      {/* Feature hints */}
      <div className="flex gap-5 text-xs text-gray-400 dark:text-gray-500">
        <span>🧹 De-clutter</span>
        <span>🔍 Extract</span>
        <span>🤖 AI Detect</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/bot/BotGreeting.tsx
git commit -m "feat: add BotGreeting landing component"
```

---

### Task 5: Chat Message Component

**Files:**
- Create: `components/bot/ChatMessage.tsx`

- [ ] **Step 1: Create the ChatMessage bubble component**

```typescript
// components/bot/ChatMessage.tsx

import { BotAvatar } from "./BotAvatar";
import type { ChatMessage as ChatMessageType } from "@/lib/bot/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isBot = message.role === "bot";

  return (
    <div className={`flex gap-2 ${isBot ? "items-start" : "items-start flex-row-reverse"}`}>
      {isBot && <BotAvatar size={28} className="shrink-0 mt-0.5" />}
      <div
        className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
          isBot
            ? "bg-surface-light dark:bg-surface-dark text-gray-700 dark:text-gray-300 rounded-bl-sm"
            : "bg-sift-gold text-white rounded-br-sm"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/bot/ChatMessage.tsx
git commit -m "feat: add ChatMessage bubble component"
```

---

### Task 6: Quick Actions Component

**Files:**
- Create: `components/bot/QuickActions.tsx`

- [ ] **Step 1: Create the QuickActions pill buttons**

```typescript
// components/bot/QuickActions.tsx

interface QuickActionsProps {
  onAction: (action: string) => void;
}

const ACTIONS = [
  { id: "images", label: "Just images" },
  { id: "links", label: "Extract links" },
  { id: "original", label: "Show original" },
  { id: "re-sift", label: "Re-sift" },
];

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2">
      {ACTIONS.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          className="px-3 py-1 text-xs font-medium rounded-full border border-border-light dark:border-border-dark text-gray-600 dark:text-gray-400 hover:border-sift-gold hover:text-sift-gold dark:hover:border-sift-gold-light dark:hover:text-sift-gold-light transition-colors cursor-pointer"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/bot/QuickActions.tsx
git commit -m "feat: add QuickActions pill buttons"
```

---

### Task 7: Chat Panel

**Files:**
- Create: `components/bot/ChatPanel.tsx`

- [ ] **Step 1: Create the expandable chat panel**

```typescript
// components/bot/ChatPanel.tsx
"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { useSiftBot } from "@/lib/bot/context";
import { BotAvatar } from "./BotAvatar";
import { ChatMessage } from "./ChatMessage";
import { QuickActions } from "./QuickActions";

export function ChatPanel() {
  const { chatOpen, setChatOpen, messages, addMessage, currentUrl } = useSiftBot();
  const [input, setInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!chatOpen) return null;

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    addMessage("user", input.trim());
    // Phase C will wire this to the LLM endpoint
    // For now, echo a placeholder response
    setTimeout(() => {
      addMessage("bot", "Chat is coming soon! For now, I can only sift pages for you.");
    }, 500);
    setInput("");
  };

  const handleQuickAction = (action: string) => {
    addMessage("user", `Quick action: ${action}`);
    setTimeout(() => {
      addMessage("bot", `The "${action}" feature is coming in a future update!`);
    }, 500);
  };

  const domain = currentUrl ? new URL(currentUrl).hostname : null;

  return (
    <div className="fixed bottom-20 right-4 w-[380px] max-h-[500px] bg-surface-light-card dark:bg-surface-dark-card border border-border-light dark:border-border-dark rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 animate-slide-up max-sm:bottom-16 max-sm:right-2 max-sm:left-2 max-sm:w-auto">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-light dark:border-border-dark">
        <BotAvatar size={28} />
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">BitSift Bot</div>
        </div>
        <button
          onClick={() => setChatOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Context bar */}
      {domain && (
        <div className="px-4 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-b border-border-light dark:border-border-dark truncate">
          Sifting: <span className="text-sift-gold font-medium">{domain}</span>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[200px] max-h-[300px]">
        {messages.length === 0 && (
          <div className="flex gap-2 items-start">
            <BotAvatar size={28} className="shrink-0 mt-0.5" />
            <div className="bg-surface-light dark:bg-surface-dark px-3 py-2 rounded-xl rounded-bl-sm text-sm text-gray-700 dark:text-gray-300">
              Here&apos;s your sifted content! Ask me to adjust anything.
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>

      {/* Quick actions */}
      <QuickActions onAction={handleQuickAction} />

      {/* Chat input */}
      {showUrlInput ? (
        <form
          onSubmit={(e) => { e.preventDefault(); setShowUrlInput(false); }}
          className="flex gap-2 px-3 py-2 border-t border-border-light dark:border-border-dark"
        >
          <input
            type="text"
            placeholder="Paste a new URL..."
            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-lg outline-none focus:border-sift-gold"
          />
          <button type="submit" className="px-3 py-2 text-xs font-bold bg-sift-gold text-white rounded-lg cursor-pointer">
            Sift
          </button>
          <button type="button" onClick={() => setShowUrlInput(false)} className="text-xs text-gray-400 cursor-pointer">
            Cancel
          </button>
        </form>
      ) : (
        <form onSubmit={handleSend} className="flex gap-2 px-3 py-2 border-t border-border-light dark:border-border-dark">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the sifted content..."
            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-border-light dark:border-border-dark rounded-lg outline-none focus:border-sift-gold"
          />
          <button type="submit" className="px-3 py-2 text-xs font-bold bg-sift-gold text-white rounded-lg cursor-pointer">
            Send
          </button>
        </form>
      )}

      {/* Sift new URL link */}
      {!showUrlInput && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setShowUrlInput(true)}
            className="text-xs text-sift-gold hover:text-sift-gold-dark dark:hover:text-sift-gold-light cursor-pointer"
          >
            Sift new URL
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/bot/ChatPanel.tsx
git commit -m "feat: add ChatPanel UI shell"
```

---

### Task 8: SiftBot Orchestrator

**Files:**
- Create: `components/bot/SiftBot.tsx`

- [ ] **Step 1: Create the main bot orchestrator**

This is the route-aware component rendered in the root layout. It renders the correct UI for each bot state.

```typescript
// components/bot/SiftBot.tsx
"use client";

import { useSiftBot } from "@/lib/bot/context";
import { BotAvatar } from "./BotAvatar";
import { ChatPanel } from "./ChatPanel";

export function SiftBot() {
  const { botState, setChatOpen, chatOpen } = useSiftBot();

  // Hidden state — don't render anything
  if (botState === "hidden") return null;

  // Welcome state is rendered by the page itself (BotGreeting)
  // SiftBot only handles collapsed + working states as overlays
  if (botState === "welcome") return null;

  // Working state — small overlay showing progress
  if (botState === "working") {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-surface-light-card dark:bg-surface-dark-card border border-border-light dark:border-border-dark rounded-full px-4 py-2 shadow-lg">
        <BotAvatar size={36} className="animate-pulse" />
        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          Sifting...
        </span>
      </div>
    );
  }

  // Collapsed state — gold circle + chat panel
  return (
    <>
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-4 right-4 z-50 cursor-pointer animate-bot-pulse"
        aria-label="Open BitSift Bot chat"
      >
        <BotAvatar size={52} />
      </button>
      <ChatPanel />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/bot/SiftBot.tsx
git commit -m "feat: add SiftBot orchestrator component"
```

---

### Task 9: Add Bot Animations to CSS

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add bot-specific animations and utilities**

Append the following to the end of `app/globals.css`:

```css
/* Bot animations */
@keyframes bot-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(184, 134, 11, 0.4); }
  50% { transform: scale(1.05); box-shadow: 0 0 16px 4px rgba(184, 134, 11, 0.2); }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@utility animate-bot-pulse {
  animation: bot-pulse 3s ease-in-out infinite;
  border-radius: 9999px;
}

@utility animate-slide-up {
  animation: slide-up 0.25s ease-out;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: add bot pulse and slide-up animations"
```

---

### Task 10: Update Root Layout — BitSift Branding + Bot

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update the root layout**

Replace the entire contents of `app/layout.tsx`:

```typescript
// app/layout.tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add SiftBotProvider and SiftBot to root layout, rebrand to BitSift"
```

---

### Task 11: Update Landing Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace landing page with BotGreeting**

Replace the entire contents of `app/page.tsx`:

```typescript
// app/page.tsx
import { BotGreeting } from "@/components/bot/BotGreeting";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-surface-light via-[#f0efe8] to-[#e8e6dd] dark:from-surface-dark dark:via-[#1a1a1a] dark:to-[#111111]">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <UserMenu />
        <ThemeToggle />
      </div>
      <BotGreeting />
      {/* Branding footer */}
      <div className="fixed bottom-4 left-0 right-0 text-center">
        <span className="text-sift-gold font-bold text-lg tracking-wide">BitSift</span>
        <span className="text-gray-500 dark:text-gray-400 text-xs italic ml-2">Sifting bits from bytes</span>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: replace landing page with BotGreeting"
```

---

### Task 12: Update Result Page with Collapsed Bot

**Files:**
- Modify: `app/sift/page.tsx`

- [ ] **Step 1: Update the back link and branding**

In `app/sift/page.tsx`, find the back link inside `SiftContent`:

```typescript
          <Link href="/" className="text-sift-gold hover:text-sift-gold-dark font-semibold text-sm flex items-center gap-1">
            <span>&larr;</span> Sift
          </Link>
```

Replace with:

```typescript
          <Link href="/" className="text-sift-gold hover:text-sift-gold-dark font-semibold text-sm flex items-center gap-1">
            <span>&larr;</span> BitSift
          </Link>
```

- [ ] **Step 2: Add bot state transition on result load**

In `app/sift/page.tsx`, add an import at the top:

```typescript
import { useSiftBot } from "@/lib/bot/context";
```

Inside `SiftContent`, after the existing `const [loading, setLoading] = useState(true);` line, add:

```typescript
  const { setBotState, setCurrentUrl, addMessage, messages } = useSiftBot();
```

Inside the `useEffect` where sift succeeds (`const data: SiftResult = await res.json();` block), after `setResult(data);` add:

```typescript
        setBotState("collapsed");
        setCurrentUrl(url);
        if (messages.length === 0) {
          addMessage("bot", "Here's your sifted content! Ask me to adjust anything.");
        }
```

- [ ] **Step 3: Commit**

```bash
git add app/sift/page.tsx
git commit -m "feat: update result page with BitSift branding and bot state"
```

---

### Task 13: Update Logo Component

**Files:**
- Modify: `components/landing/Logo.tsx`

- [ ] **Step 1: Update Logo text to BitSift**

Replace the entire contents of `components/landing/Logo.tsx`:

```typescript
// components/landing/Logo.tsx
import Image from "next/image";

export function Logo() {
  return (
    <div className="text-center mb-10">
      <div className="w-20 h-20 mx-auto mb-4 text-sift-gold">
        <Image src="/sift-logo.svg" alt="BitSift" width={80} height={80} priority />
      </div>
      <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
        BitSift
      </h1>
      <p className="mt-1 text-base text-gray-400 italic">
        Sifting bits from bytes
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/Logo.tsx
git commit -m "feat: rebrand Logo component to BitSift"
```

---

### Task 14: Verify Build

- [ ] **Step 1: Run the type checker**

```bash
cd E:\SHARED\PROJECTS\sift
npx tsc --noEmit
```

Expected: No errors (or only pre-existing ones)

- [ ] **Step 2: Run the build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Run dev server and verify manually**

```bash
npm run dev
```

Check:
- Landing page (`/`) shows BotGreeting with mascot, speech bubble, URL input
- Submitting a URL navigates to `/sift?url=...` and shows result with collapsed bot circle in bottom-right
- Clicking the gold circle opens the chat panel
- Chat panel shows messages, quick actions, input field
- Back link says "BitSift" not "Sift"
- Tab title says "BitSift"
- `/login` and `/signup` do NOT show the bot
- Light/dark theme still works

- [ ] **Step 4: Commit any fixes, then final commit**

```bash
git add -A
git commit -m "feat: Phase A complete — BitSift branding + bot shell"
```
