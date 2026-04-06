# Sift — Auth & User Accounts Design

## Overview

Add user authentication and accounts to Sift. Three sign-in methods: Google OAuth, Apple OAuth, and email/password. Database-backed sessions via Neon PostgreSQL + Prisma. Account dashboard for profile and future bookmarks.

## Stack

- **Auth:** NextAuth.js v5 (Auth.js)
- **ORM:** Prisma
- **Database:** Neon (serverless PostgreSQL)
- **Password hashing:** bcrypt

## Auth Providers

| Provider | Type | Notes |
|----------|------|-------|
| Google | OAuth 2.0 | Auto-creates account on first sign-in |
| Apple | OAuth 2.0 | Auto-creates account on first sign-in |
| Credentials | Email + password | Requires explicit signup, bcrypt hashed |

## Database Schema (Prisma)

NextAuth's Prisma adapter provides the standard tables. We extend `User` with a password field for credentials auth.

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
  password      String?   // bcrypt hash, null for OAuth-only users
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

## Pages

### `/login`

- Google sign-in button (full-width, branded)
- Apple sign-in button (full-width, branded)
- Horizontal divider with "or" text
- Email input + password input + "Sign In" button
- "Don't have an account? Sign up" link → `/signup`
- Matches Sift light/dark theme
- Redirect to previous page (or `/`) after successful login

### `/signup`

- Google sign-up button (full-width)
- Apple sign-up button (full-width)
- Horizontal divider with "or" text
- Name input + email input + password input + confirm password input + "Create Account" button
- Password validation: minimum 8 characters
- "Already have an account? Sign in" link → `/login`
- On success: auto sign in and redirect to `/`

### `/account`

- Profile section: avatar (from OAuth or default), name, email, linked providers
- Bookmarks section: "Coming soon" placeholder (will be built in Phase 4)
- Theme preference: light/dark/system selector (saves to DB when logged in, replacing localStorage)
- Sign out button

## Navigation Integration

Update the landing page and result page header:
- **Signed out:** "Sign in" text link in top-right (next to theme toggle)
- **Signed in:** User avatar (small circle) + dropdown with "Account" and "Sign out"

## Auth Flow

### OAuth (Google/Apple)
```
User clicks "Sign in with Google"
  → NextAuth redirects to Google consent screen
  → User authorizes
  → Google redirects back with code
  → NextAuth exchanges code for tokens
  → Checks if user exists (by email)
    → Yes: links account, creates session
    → No: creates user + account + session
  → Redirects to callbackUrl (previous page or /)
```

### Email/Password Signup
```
User fills name, email, password, confirm
  → POST /api/auth/signup (custom route)
  → Validates: email unique, passwords match, min 8 chars
  → Hash password with bcrypt (10 rounds)
  → Create user in DB
  → Auto sign in via NextAuth
  → Redirect to /
```

### Email/Password Login
```
User fills email, password
  → NextAuth credentials provider
  → Lookup user by email
  → Compare password with bcrypt
  → If match: create session, redirect
  → If no match: show error
```

## Environment Variables

```
DATABASE_URL=           # Neon PostgreSQL connection string
NEXTAUTH_URL=           # Site URL (https://sift.pages.dev or custom domain)
NEXTAUTH_SECRET=        # Random secret for JWT signing
GOOGLE_CLIENT_ID=       # Google OAuth client ID
GOOGLE_CLIENT_SECRET=   # Google OAuth client secret
APPLE_ID=               # Apple Services ID
APPLE_SECRET=           # Apple private key
```

## Files

### New Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema |
| `lib/db.ts` | Prisma client singleton |
| `lib/auth.ts` | NextAuth configuration (providers, adapter, callbacks) |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth API route handler |
| `app/api/auth/signup/route.ts` | Custom signup endpoint for credentials |
| `app/login/page.tsx` | Login page |
| `app/signup/page.tsx` | Signup page |
| `app/account/page.tsx` | Account dashboard |
| `components/auth/AuthButtons.tsx` | Google/Apple OAuth buttons (shared between login/signup) |
| `components/auth/LoginForm.tsx` | Email/password login form |
| `components/auth/SignupForm.tsx` | Email/password signup form with validation |
| `components/auth/UserMenu.tsx` | Signed-in user avatar + dropdown |

### Modified Files

| File | Change |
|------|--------|
| `app/page.tsx` | Add UserMenu / "Sign in" link to header |
| `app/sift/page.tsx` | Add UserMenu / "Sign in" link to header |
| `app/layout.tsx` | Wrap with NextAuth SessionProvider |

## Security

- Passwords: bcrypt, 10 salt rounds
- Sessions: DB-stored (not JWT), HttpOnly cookies
- CSRF: NextAuth handles automatically
- OAuth state: NextAuth handles automatically
- Rate limiting: defer to Phase 5 (not critical for v1 with small user base)

## Non-Goals

- Email verification (defer — OAuth users are pre-verified, credentials can add later)
- Password reset flow (defer — can add later)
- Profile picture upload (use OAuth avatar or default)
- Bookmarks CRUD (separate phase, just show placeholder)
- Admin panel / user management
