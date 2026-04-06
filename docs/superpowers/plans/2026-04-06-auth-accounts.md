# Auth & User Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user authentication (Google OAuth, Apple OAuth, email/password) with login, signup, and account pages to the Sift web app.

**Architecture:** NextAuth.js v5 (Auth.js) with Prisma adapter connecting to Neon PostgreSQL. Database-backed sessions. Custom signup endpoint for credentials auth. SessionProvider wrapper for client-side session access.

**Tech Stack:** Next.js 16, NextAuth.js v5, Prisma, Neon PostgreSQL, bcrypt, TypeScript

**Project root:** `E:\SHARED\PROJECTS\sift`

**Env file:** `.env.local` already exists with DATABASE_URL, NEXTAUTH_SECRET, and placeholder OAuth vars.

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `prisma/schema.prisma` | Database schema — User, Account, Session, VerificationToken |
| `lib/db.ts` | Prisma client singleton (prevents hot-reload connection leaks) |
| `lib/auth.ts` | NextAuth config — providers, adapter, callbacks, session strategy |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth catch-all API handler |
| `app/api/auth/signup/route.ts` | Custom signup endpoint for email/password |
| `app/login/page.tsx` | Login page |
| `app/signup/page.tsx` | Signup page |
| `app/account/page.tsx` | Account dashboard |
| `components/auth/AuthButtons.tsx` | Google + Apple OAuth sign-in buttons |
| `components/auth/LoginForm.tsx` | Email/password login form |
| `components/auth/SignupForm.tsx` | Signup form with validation |
| `components/auth/UserMenu.tsx` | Signed-in avatar + dropdown |
| `components/auth/SessionWrapper.tsx` | Client-side SessionProvider wrapper |

### Modified Files

| File | Change |
|------|--------|
| `app/layout.tsx` | Add SessionWrapper around ThemeProvider |
| `app/page.tsx` | Replace ThemeToggle with nav bar (UserMenu + ThemeToggle) |
| `app/sift/page.tsx` | Same nav bar update |

---

## Task 1: Prisma + Database Setup

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd E:\SHARED\PROJECTS\sift
npm install @prisma/client @auth/prisma-adapter
npm install -D prisma
```

- [ ] **Step 2: Create prisma/schema.prisma**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

- [ ] **Step 3: Create lib/db.ts**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Push schema to database**

```bash
cd E:\SHARED\PROJECTS\sift
npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 5: Generate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 6: Commit**

```bash
cd E:\SHARED\PROJECTS\sift
git add prisma/ lib/db.ts
git commit -m "feat: add Prisma schema and push to Neon PostgreSQL"
```

---

## Task 2: NextAuth Configuration

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `components/auth/SessionWrapper.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install auth dependencies**

```bash
cd E:\SHARED\PROJECTS\sift
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
```

Note: NextAuth v5 is installed via the `beta` tag.

- [ ] **Step 2: Create lib/auth.ts**

```typescript
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Apple({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
```

- [ ] **Step 3: Create API route handler**

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 4: Create SessionWrapper**

Create `components/auth/SessionWrapper.tsx`:

```tsx
"use client";

import { SessionProvider } from "next-auth/react";

export function SessionWrapper({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 5: Update app/layout.tsx**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionWrapper } from "@/components/auth/SessionWrapper";
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
          <ThemeProvider>{children}</ThemeProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Commit**

```bash
cd E:\SHARED\PROJECTS\sift
git add lib/auth.ts app/api/auth/ components/auth/SessionWrapper.tsx app/layout.tsx
git commit -m "feat: add NextAuth v5 config with Google, Apple, and credentials providers"
```

---

## Task 3: Signup Endpoint

**Files:**
- Create: `app/api/auth/signup/route.ts`

- [ ] **Step 1: Create signup API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd E:\SHARED\PROJECTS\sift
git add app/api/auth/signup/
git commit -m "feat: add /api/auth/signup endpoint for email/password registration"
```

---

## Task 4: Auth UI Components

**Files:**
- Create: `components/auth/AuthButtons.tsx`
- Create: `components/auth/LoginForm.tsx`
- Create: `components/auth/SignupForm.tsx`
- Create: `components/auth/UserMenu.tsx`

- [ ] **Step 1: Create AuthButtons (OAuth)**

Create `components/auth/AuthButtons.tsx`:

```tsx
"use client";

import { signIn } from "next-auth/react";

export function AuthButtons({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const label = mode === "signup" ? "Sign up" : "Sign in";

  return (
    <div className="space-y-3">
      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {label} with Google
      </button>

      <button
        onClick={() => signIn("apple", { callbackUrl: "/" })}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-border-light dark:border-border-dark bg-black text-white hover:bg-gray-900 transition-colors cursor-pointer"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
        {label} with Apple
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create LoginForm**

Create `components/auth/LoginForm.tsx`:

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 outline-none focus:border-sift-gold transition-colors"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 outline-none focus:border-sift-gold transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-sift-gold text-white font-semibold hover:bg-sift-gold-dark transition-colors disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create SignupForm**

Create `components/auth/SignupForm.tsx`:

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      // Auto sign in after successful signup
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Account created but sign-in failed. Please try signing in.");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 outline-none focus:border-sift-gold transition-colors"
        />
      </div>
      <div>
        <label htmlFor="signup-email" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 outline-none focus:border-sift-gold transition-colors"
        />
      </div>
      <div>
        <label htmlFor="signup-password" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-4 py-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 outline-none focus:border-sift-gold transition-colors"
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          Confirm Password
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 outline-none focus:border-sift-gold transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-sift-gold text-white font-semibold hover:bg-sift-gold-dark transition-colors disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Create UserMenu**

Create `components/auth/UserMenu.tsx`:

```tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-sift-gold dark:hover:text-sift-gold-light transition-colors"
      >
        Sign in
      </Link>
    );
  }

  const initials = session.user.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : session.user.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 cursor-pointer"
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt=""
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-sift-gold text-white flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 py-1 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-gray-900 shadow-lg z-50">
          <div className="px-4 py-2 border-b border-border-light dark:border-border-dark">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
              {session.user.name || "User"}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {session.user.email}
            </div>
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Account
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full text-left px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd E:\SHARED\PROJECTS\sift
git add components/auth/
git commit -m "feat: add auth UI components — OAuth buttons, login/signup forms, user menu"
```

---

## Task 5: Login and Signup Pages

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/signup/page.tsx`

- [ ] **Step 1: Create login page**

Create `app/login/page.tsx`:

```tsx
import { AuthButtons } from "@/components/auth/AuthButtons";
import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Sift
          </Link>
          <p className="mt-1 text-sm text-gray-400">Sign in to your account</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-border-light dark:border-border-dark p-6">
          <AuthButtons mode="signin" />

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
          </div>

          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-sift-gold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create signup page**

Create `app/signup/page.tsx`:

```tsx
import { AuthButtons } from "@/components/auth/AuthButtons";
import { SignupForm } from "@/components/auth/SignupForm";
import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Sift
          </Link>
          <p className="mt-1 text-sm text-gray-400">Create your account</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-border-light dark:border-border-dark p-6">
          <AuthButtons mode="signup" />

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
          </div>

          <SignupForm />
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-sift-gold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd E:\SHARED\PROJECTS\sift
git add app/login/ app/signup/
git commit -m "feat: add login and signup pages"
```

---

## Task 6: Account Page

**Files:**
- Create: `app/account/page.tsx`

- [ ] **Step 1: Create account dashboard**

Create `app/account/page.tsx`:

```tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { signOut } from "next-auth/react";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
        <div className="w-12 h-12 border-4 border-sift-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) return null;

  const initials = session.user.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : session.user.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sift-gold hover:text-sift-gold-dark font-semibold text-sm">
            &larr; Sift
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Account</h1>

        {/* Profile section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-border-light dark:border-border-dark p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Profile</h2>
          <div className="flex items-center gap-4">
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-sift-gold text-white flex items-center justify-center text-xl font-semibold">
                {initials}
              </div>
            )}
            <div>
              <div className="text-lg font-medium text-gray-800 dark:text-gray-200">
                {session.user.name || "User"}
              </div>
              <div className="text-sm text-gray-400">{session.user.email}</div>
            </div>
          </div>
        </div>

        {/* Theme preference */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-border-light dark:border-border-dark p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Preferences</h2>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Theme</span>
            <ThemeToggle />
          </div>
        </div>

        {/* Bookmarks placeholder */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-border-light dark:border-border-dark p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Bookmarks</h2>
          <p className="text-gray-400 text-sm">Coming soon — save your sifted articles for later.</p>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full py-3 rounded-lg border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd E:\SHARED\PROJECTS\sift
git add app/account/
git commit -m "feat: add account dashboard page with profile, preferences, and bookmarks placeholder"
```

---

## Task 7: Nav Bar Integration

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/sift/page.tsx`

- [ ] **Step 1: Update landing page with UserMenu**

Replace `app/page.tsx`:

```tsx
import { Logo } from "@/components/landing/Logo";
import { UrlInput } from "@/components/landing/UrlInput";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-surface-light via-[#f0efe8] to-[#e8e6dd] dark:from-surface-dark dark:via-[#1a1a1a] dark:to-[#111111] px-5 py-10">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <ThemeToggle />
        <UserMenu />
      </div>
      <Logo />
      <UrlInput />
      <FeatureCards />
    </main>
  );
}
```

- [ ] **Step 2: Update sift result page with UserMenu**

In `app/sift/page.tsx`, find the nav bar section inside `SiftContent` that has the "← Sift" link and ThemeToggle. Update it to include UserMenu:

Find:
```tsx
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="text-sift-gold hover:text-sift-gold-dark font-semibold text-sm flex items-center gap-1"
          >
            <span>&larr;</span> Sift
          </Link>
          <ThemeToggle />
        </div>
```

Replace with:
```tsx
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="text-sift-gold hover:text-sift-gold-dark font-semibold text-sm flex items-center gap-1"
          >
            <span>&larr;</span> Sift
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
```

Add the import at the top of the file:
```tsx
import { UserMenu } from "@/components/auth/UserMenu";
```

- [ ] **Step 3: Commit and push**

```bash
cd E:\SHARED\PROJECTS\sift
git add app/page.tsx app/sift/page.tsx
git commit -m "feat: add UserMenu to landing and result page nav bars"
git push
```
