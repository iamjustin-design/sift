# Sift — Project Blueprint

A web content de-cluttering tool that strips ads, filler, and noise from any webpage, then re-presents the core content in a clean, readable layout with AI-generated content detection.

**Tagline:** "Sifting bits from bytes"

## Quick Reference

- **Repo:** `E:\SHARED\PROJECTS\sift`
- **GitHub:** `github.com/iamjustin-design/sift`
- **Live:** `sift.justin-853.workers.dev` (Cloudflare Pages)
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind v4 (CSS-based config, NOT tailwind.config.ts)
- **Database:** Neon PostgreSQL (serverless)
- **ORM:** Prisma 7 (requires adapter-based client construction)
- **Auth:** NextAuth v5 (Auth.js) — Google, Apple, email/password
- **Content Parsing:** @mozilla/readability + jsdom v24
- **Deployment:** Cloudflare Pages (auto-deploy on git push)

## Build & Dev

```bash
cd E:\SHARED\PROJECTS\sift
npm run dev          # dev server (port 3000 or next available)
npm run build        # production build
npx prisma db push   # push schema changes to Neon
npx prisma generate  # regenerate Prisma client
npx tsc --noEmit     # type check
```

## Deploy

Just push to GitHub — Cloudflare Pages auto-builds:
```bash
git push
```

Cloudflare build settings:
- Framework preset: Next.js
- Build command: `npm run build`
- Node.js version: 18+

**Important:** Cloudflare edge runtime does NOT support jsdom (uses eval). API routes that use jsdom MUST have `export const runtime = "nodejs"`.

## Architecture

```
User pastes URL (web) or clicks extension (future)
    |
    v
+------------------------------------------+
|  /api/sift (POST)                        |
|  runtime = "nodejs"                      |
|                                          |
|  1. fetchUrl() -- server-side fetch      |
|  2. extractMeta() -- og:, JSON-LD, meta  |
|  3. Readability.js -- article extraction |
|  4. Return SiftResult JSON              |
+------------------------------------------+
    |
    v
+------------------------------------------+
|  /sift?url=... (client page)             |
|  Renders clean article with:             |
|  - SourceBar (domain, timing)            |
|  - ArticleBody (title, author, content)  |
|  - ThemeToggle (light/dark/system)       |
|  - UserMenu (auth state)                 |
+------------------------------------------+
```

## File Map

### App Pages (app/)

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout -- SessionWrapper + ThemeProvider + dark mode inline script |
| `app/globals.css` | Tailwind v4 config -- @theme colors, @custom-variant dark, @plugin typography |
| `app/page.tsx` | Landing page -- Logo, UrlInput, FeatureCards, ThemeToggle, UserMenu |
| `app/sift/page.tsx` | Sifted result page -- calls /api/sift, renders clean content |
| `app/login/page.tsx` | Login -- OAuth buttons + email/password form |
| `app/signup/page.tsx` | Signup -- OAuth buttons + registration form |
| `app/account/page.tsx` | Account dashboard -- profile, preferences, bookmarks placeholder |

### API Routes (app/api/)

| File | Purpose |
|------|---------|
| `app/api/sift/route.ts` | Main sift endpoint -- POST {url} -> SiftResult. runtime="nodejs" |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth catch-all handler |
| `app/api/auth/signup/route.ts` | Custom signup for email/password. runtime="nodejs" |

### Parser Pipeline (lib/parser/)

| File | Purpose |
|------|---------|
| `lib/parser/types.ts` | SiftResult, ArticleMeta, SiftError interfaces |
| `lib/parser/fetcher.ts` | URL fetcher -- validation, timeout, redirect handling |
| `lib/parser/meta-extractor.ts` | Extract og:, meta, canonical from DOM |
| `lib/parser/extractor.ts` | Main pipeline -- fetch -> JSDOM -> Readability -> SiftResult |

### Auth (lib/)

| File | Purpose |
|------|---------|
| `lib/auth.ts` | NextAuth config -- providers (Google/Apple/Credentials), Prisma adapter, JWT callbacks |
| `lib/db.ts` | Prisma client singleton with PrismaNeon adapter |

### Components

| File | Purpose |
|------|---------|
| `components/ThemeProvider.tsx` | Dark/light/system theme context, localStorage persistence |
| `components/ThemeToggle.tsx` | Sun/moon toggle button |
| `components/landing/Logo.tsx` | Sift logo SVG + tagline |
| `components/landing/UrlInput.tsx` | URL input bar + "Sift It" button |
| `components/landing/FeatureCards.tsx` | Three feature cards (De-clutter, Extract, AI Detect) |
| `components/result/SourceBar.tsx` | "Sifted from: [domain]" + timing |
| `components/result/ArticleBody.tsx` | Clean article renderer with prose typography |
| `components/auth/SessionWrapper.tsx` | NextAuth SessionProvider wrapper |
| `components/auth/AuthButtons.tsx` | Google + Apple OAuth buttons |
| `components/auth/LoginForm.tsx` | Email/password login form |
| `components/auth/SignupForm.tsx` | Registration form with validation |
| `components/auth/UserMenu.tsx` | Avatar dropdown (Account, Sign out) or "Sign in" link |

### Database (prisma/)

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | User, Account, Session, VerificationToken models |
| `prisma/prisma.config.ts` | Prisma 7 config (datasource URL via dotenv) |

## Database Schema

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| User | id, name, email, password (nullable), image, createdAt | User accounts |
| Account | userId, provider, providerAccountId, access_token | OAuth provider links |
| Session | sessionToken, userId, expires | Active sessions |
| VerificationToken | identifier, token, expires | Email verification (future) |

## Environment Variables (.env.local)

| Var | Purpose |
|-----|---------|
| DATABASE_URL | Neon PostgreSQL connection string |
| NEXTAUTH_URL | Site URL |
| NEXTAUTH_SECRET | JWT signing secret |
| GOOGLE_CLIENT_ID | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret |
| APPLE_ID | Apple Services ID |
| APPLE_SECRET | Apple private key |

## Tailwind v4 Notes

Tailwind v4 is CSS-based, NOT config-file based:
- Theme colors defined in `app/globals.css` via `@theme {}` block
- Dark mode: `@custom-variant dark (&:where(.dark, .dark *));` (class-based, not media query)
- Typography plugin: `@plugin "@tailwindcss/typography";`
- No `tailwind.config.ts` file

## Prisma 7 Notes

Prisma 7 has breaking changes from v6:
- `datasource db` block no longer accepts `url` -- connection string goes in `prisma.config.ts`
- `PrismaClient` must be constructed with an adapter (PrismaNeon for Neon)
- Uses `dotenv` to load `.env.local` in `prisma.config.ts` since Prisma CLI doesn't read Next.js env files

## Cloudflare Pages Notes

- Edge runtime blocks `eval()` -- jsdom uses eval internally
- Any API route using jsdom MUST have `export const runtime = "nodejs"`
- JS/CSS cached aggressively by Cloudflare
- Auto-deploys on every `git push` to master

## Color Palette

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| surface-light | #faf9f6 | -- | Page background |
| surface-dark | -- | #141414 | Page background (dark) |
| sift-gold | #b8860b | #b8860b | Primary accent, buttons |
| sift-gold-light | #d4a017 | #d4a017 | Gradient end, hover |
| sift-gold-dark | #8b6508 | #8b6508 | Hover states |
| border-light | #e0ddd5 | -- | Card/input borders |
| border-dark | -- | #2a2a2a | Card/input borders (dark) |

## Phases

| Phase | Status | What |
|-------|--------|------|
| 1: Foundation | COMPLETE | Next.js scaffold, parser pipeline, landing page, result page, light/dark themes |
| Auth | COMPLETE | NextAuth v5, Google/Apple/email, login/signup/account pages, UserMenu |
| 2: Smart Parsing | IN PROGRESS | Page type classification, specialized parsers, custom layouts per type |
| 3: AI Detection | NOT STARTED | Heuristic engine, scoring, AI overlay, deep scan integration |
| 4: Bookmarks | NOT STARTED | Bookmark CRUD, sift history, preferences sync |
| 5: Browser Extension | NOT STARTED | Manifest V3, DOM capture, popup UI |

## Future Roadmap

- Custom theming on sifted results (beyond light/dark)
- Draw-to-include / draw-to-exclude (user draws shapes to manually add/remove content)
- Toggle to temporarily show original un-sifted view
- AI detection for images, audio, video
- Custom trained AI detection model
- Multi-page sifting (paginated articles)
- Reading mode features (read time, TTS, font size)
- Public API for developers

## Design Docs

| Document | Location |
|----------|----------|
| Main design spec | docs/superpowers/specs/2026-04-05-sift-design.md |
| Auth design spec | docs/superpowers/specs/2026-04-06-auth-accounts-design.md |
| Phase 1 plan | docs/superpowers/plans/2026-04-05-phase1-foundation.md |
| Auth plan | docs/superpowers/plans/2026-04-06-auth-accounts.md |
