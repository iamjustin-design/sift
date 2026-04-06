# Sift — Design Specification

## Overview

Sift is a web content de-cluttering tool that takes a URL, strips out ads, popups, filler content, personal anecdotes, newsletter prompts, and other noise, then re-presents the core content in a clean, readable layout. It also scores content for AI-generated patterns.

**Tagline:** "Sifting bits from bytes"

**Origin:** The frustration of searching for a recipe and having to wade through life stories, ads, and unrelated anecdotes before finding the actual recipe. Expanded to work on any article-based content.

## Platforms

1. **Web app** (primary) — standalone Next.js app. User pastes a URL, gets the clean version.
2. **Browser extension** — user clicks a button on any page, sends the current page DOM to the Sift API, gets a clean overlay or new tab. Solves pagination issues since it has access to the live DOM.

Both share the same backend API and rendering engine.

## Tech Stack

- **Framework:** Next.js (full-stack) — React frontend + API routes
- **Styling:** Tailwind CSS (or CSS modules)
- **Database:** PostgreSQL (via Prisma ORM) for user accounts, bookmarks, preferences
- **Auth:** NextAuth.js (email/password + OAuth providers)
- **Content parsing:** Readability.js (Mozilla's article extractor) as the base, with custom post-processing layers
- **AI detection:** Heuristic engine (v1) + external API deep scan (opt-in)
- **Browser extension:** Manifest V3, thin wrapper that calls the Sift API
- **Deployment:** Vercel (Next.js native) or Cloudflare Pages

## Architecture

```
User pastes URL (web) or clicks extension button (browser)
    │
    ▼
┌──────────────────────────────────────────────┐
│  Sift API (Next.js API Routes)               │
│                                              │
│  1. Fetch: Server-side fetch of target URL   │
│     - Respects robots.txt                    │
│     - User-agent: Sift/1.0                   │
│     - Handles redirects, encoding            │
│                                              │
│  2. Parse: Extract content structure          │
│     a. Read <meta> tags (og:, schema.org)    │
│     b. Run Readability.js for main content   │
│     c. Detect content type (recipe, article, │
│        news, tutorial, listicle)             │
│     d. Extract structured data (JSON-LD,     │
│        microdata) for recipes, products      │
│                                              │
│  3. Clean: Remove noise                      │
│     a. Strip: ads, popups, newsletter forms, │
│        cookie banners, social widgets        │
│     b. Filter: irrelevant paragraphs         │
│        (personal anecdotes before recipes,   │
│         SEO filler, affiliate disclaimers)   │
│     c. Preserve: images, videos, embeds      │
│        that are content-relevant             │
│     d. Count what was removed (for the       │
│        "Sift removed" indicator)             │
│                                              │
│  4. Score: AI detection                      │
│     a. Heuristic scan (instant, free)        │
│     b. Optional API deep scan (on request)   │
│                                              │
│  5. Render: Return structured result          │
│     - Title, author, date, source            │
│     - Hero image                             │
│     - Clean body content                     │
│     - Structured data (recipe card, etc.)    │
│     - AI score + breakdown                   │
│     - Removal stats                          │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│  Sift Frontend (Next.js React)               │
│                                              │
│  - Landing page: URL input                   │
│  - Result page: clean rendered content       │
│  - Light/dark theme toggle                   │
│  - AI detection overlay (sticky top)         │
│  - Bookmark button (requires account)        │
│  - "View original" toggle                    │
└──────────────────────────────────────────────┘
```

## Content Parsing Pipeline

### Stage 1: Meta Extraction

Read machine-readable metadata first — it's curated and reliable:
- `<meta property="og:title">`, `og:description`, `og:image`, `og:type`
- `<meta name="author">`, `<meta name="description">`
- JSON-LD structured data (`@type: Recipe`, `Article`, `NewsArticle`, etc.)
- Schema.org microdata
- `<link rel="canonical">`

### Stage 2: Article Extraction (Readability.js)

Mozilla's Readability algorithm identifies the main content area and strips navigation, sidebars, footers, ads. This gives us:
- Title
- Content HTML (cleaned)
- Text content (plain)
- Excerpt
- Site name
- Byline (author)

### Stage 3: Content Type Detection

Based on meta + content analysis, classify the page:

| Type | Detection Signals | Special Handling |
|------|------------------|-----------------|
| **Recipe** | JSON-LD `@type: Recipe`, presence of ingredient lists + instruction lists, "recipe" in URL/title | Extract into structured recipe card (prep/cook/yield, ingredients, instructions) |
| **News/Article** | JSON-LD `@type: NewsArticle` or `Article`, dateline, byline | Standard clean article view |
| **Tutorial/How-To** | Numbered steps, "how to" in title, JSON-LD `HowTo` | Preserve step structure |
| **Listicle** | Numbered headings, "X best/top" patterns | Preserve list structure |
| **General** | Everything else | Clean article view |

### Stage 4: Noise Filtering

After Readability gives us the main content, apply additional filtering:

**Always remove:**
- Cookie consent banners, GDPR notices
- Newsletter signup forms / email capture
- Social sharing widgets
- "Related articles" / "You might also like" sections
- Affiliate disclaimers and sponsored content notices
- Print/share/save buttons
- Comment sections
- Pagination navigation (except "next page" for multi-page articles)

**Intelligent removal (recipe-specific):**
- Long narrative paragraphs before the recipe (the "life story" problem)
- Detection heuristic: paragraphs before the first `<h2>` or ingredient list that don't contain recipe-relevant keywords (temperatures, measurements, ingredients, cooking verbs)
- Keep short intros (1-2 paragraphs) that describe the dish
- Keep tips/variations after the recipe

**Counting:** Track everything removed and report it in the "Sift removed" indicator (e.g., "2 popups, 8 ad blocks, 1,200 words of filler, 3 newsletter prompts").

### Stage 5: Media Preservation

- **Images:** Keep images within the main content area. Proxy through Sift to avoid mixed content and tracking. Lazy-load with blur placeholders.
- **Videos:** Preserve YouTube/Vimeo embeds. Convert to responsive containers.
- **Embedded content:** Keep relevant embeds (tweets, Instagram posts in articles about them). Strip irrelevant embeds (ad-related, tracking pixels).

## AI Detection System

### Heuristic Engine (v1, instant, free)

Analyze the text for patterns typical of LLM-generated content:

**Lexical signals:**
- Overuse of hedging language ("It's important to note", "It's worth mentioning")
- LLM-favorite words: "delve", "tapestry", "multifaceted", "comprehensive", "landscape", "navigate", "leverage", "utilize"
- Uniform sentence length (low variance)
- Excessive use of transitional phrases
- List-heavy structure with parallel construction
- Overly formal register inconsistent with the site's voice

**Structural signals:**
- Repetitive paragraph patterns (claim → elaboration → conclusion)
- Lack of specific personal details, anecdotes, or opinions
- Generic examples instead of specific ones
- Perfect grammar with no colloquialisms
- Consistent tone throughout (no personality shifts)

**Scoring:**
- Each signal contributes a weighted score
- Final score: 0-100% probability of AI generation
- Buckets: 0-25% (Likely human), 26-50% (Mostly human), 51-75% (Mixed/uncertain), 76-100% (Likely AI)
- Color coding: green (0-25), yellow (26-50), orange (51-75), red (76-100)

### Deep Scan (opt-in, API-powered)

- Button in the AI overlay: "Deep Scan"
- Sends text chunks to an external API (GPTZero, Originality.ai, or Claude)
- Returns a more detailed breakdown: per-paragraph scores, highlighted suspect passages
- Requires user account (to manage API costs)

### Future: Custom Model (v2+)

- Train/fine-tune a classifier on human vs AI text
- Run locally or on our infrastructure
- No external API dependency
- Image/audio/video AI detection

## UI Design

### Landing Page

- Clean, minimal, warm tones
- Sift logo: sifter/strainer icon with bits falling through the mesh
- Tagline: "Sifting bits from bytes"
- URL input bar (full-width, prominent) with golden "Sift It" button
- Three feature cards below: De-clutter, Extract, AI Detect
- Login/signup link in top right
- Follows system color preference (prefers-color-scheme)

### Sifted Result Page

- **AI Detection Overlay** (sticky top bar):
  - Score label, progress bar (color-coded), percentage, verdict text
  - "Deep Scan" button (if logged in)
  - Dismissible (X button), minimizable (collapses to just the score)
  - Stays visible while scrolling

- **Source Bar:** "Sifted from: [domain]" with link to original, timestamp

- **"Sift Removed" Indicator:** Shows what was stripped, styled as a subtle left-bordered callout

- **Clean Content:** Title, author, date, hero image, body text with preserved headings and structure

- **Recipe Card** (when recipe detected): Structured card with prep/cook/yield, ingredients list, numbered instructions. Highlighted with brand gold accent border.

- **Bookmark Button:** Floating or in the source bar. Requires account. Saves the sifted version.

- **"View Original" Toggle:** Button to temporarily show the original un-sifted page content in a side panel or overlay. Useful for seeing what was removed.

### Themes

**v1:** Light and dark themes.

- **Light:** Warm parchment (#faf9f6), dark text, golden accents (#b8860b / #d4a017)
- **Dark:** Deep charcoal (#141414), warm off-white text (#c8c4ba), same golden accents
- Default follows system preference. User can toggle. Saved in localStorage (or account preferences if logged in).

**Future versions:** Custom theming — user-configurable colors, fonts, spacing on sifted results.

### Color Palette

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| Background | #faf9f6 | #141414 | Page background |
| Surface | #ffffff | #1a1808 | Cards, recipe card |
| Text primary | #1a1a1a | #e8e6dd | Headings |
| Text body | #333333 | #c8c4ba | Body text |
| Text secondary | #999999 | #666666 | Meta, labels |
| Brand gold | #b8860b | #d4a017 | Accents, buttons, recipe headers |
| Border | #e0ddd5 | #2a2a2a | Dividers, card borders |
| AI green | #4caf50 | #4caf50 | Low AI score |
| AI yellow | #ff9800 | #ff9800 | Medium AI score |
| AI red | #f44336 | #f44336 | High AI score |

## User Accounts

### v1 Scope

- **Sign up / Log in:** Email + password, Google OAuth, GitHub OAuth (via NextAuth.js)
- **Profile:** Display name, email, theme preference
- **Bookmarks:** Save sifted results for later. List view in account dashboard. Delete bookmarks.
- **Preferences:** Default theme (light/dark/system), default AI scan level (heuristic only / auto deep scan)

### Storage

| Table | Columns |
|-------|---------|
| `users` | id, email, name, password_hash, avatar_url, theme_pref, created_at |
| `bookmarks` | id, user_id, url, title, sifted_content (JSON), ai_score, created_at |
| `preferences` | user_id, key, value |

### Future Account Features

- Sift history (auto-saved, browsable)
- Custom themes (saved per account)
- Extension sync (bookmarks + preferences across devices)
- Usage analytics (how many pages sifted, time saved)

## Browser Extension

### Manifest V3

- **Popup:** Small UI with "Sift this page" button + recent sifts
- **Content script:** Extracts current page DOM and sends to Sift API
- **Background service worker:** Handles API communication
- **Permissions:** `activeTab`, `storage`

### Extension Flow

1. User clicks extension icon on any page
2. Content script captures the current DOM (solves pagination — gets whatever the user sees)
3. Sends to Sift API as raw HTML (not a URL fetch — extension already has the content)
4. API runs parsing pipeline (skips fetch stage)
5. Result displayed in: new tab (default), side panel, or overlay (user preference)

### Extension-Specific Features

- Badge icon shows AI score for current page (quick glance)
- Right-click context menu: "Sift this page"
- Keyboard shortcut (configurable, default: Ctrl+Shift+S)
- Syncs with web account for bookmarks/preferences

## Future Roadmap (v2+)

- **Custom theming:** User-configurable colors, fonts, spacing for sifted results
- **Draw-to-include / Draw-to-exclude:** User draws a box or shape on the original page to manually include or exclude content from the sifted result. Requires a toggle to temporarily show the un-sifted original.
- **AI detection for media:** Image AI detection (GAN artifacts, metadata analysis), audio deepfake detection, video synthesis detection
- **Custom AI model:** Train/fine-tune a purpose-built classifier for better accuracy without external API costs
- **Multi-page sifting:** Handle paginated articles (fetch all pages, combine)
- **Reading mode features:** Estimated read time, text-to-speech, font size adjustment
- **API access:** Public API for developers to integrate Sift into their own tools
- **Mobile app:** Native iOS/Android wrapper around the web app

## Non-Goals (v1)

- No user-generated content (comments, ratings, reviews)
- No social features (sharing, following)
- No monetization features (ads, subscriptions) — figure this out later
- No offline support
- No PDF/document parsing (URLs only)
- No translation

## File Structure (Next.js)

```
sift/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout, theme provider, auth
│   ├── page.tsx                  # Landing page (URL input)
│   ├── sift/[id]/page.tsx        # Sifted result page
│   ├── account/                  # Account pages
│   │   ├── page.tsx              # Dashboard (bookmarks, history)
│   │   ├── login/page.tsx        # Login
│   │   └── signup/page.tsx       # Sign up
│   └── api/                      # API routes
│       ├── sift/route.ts         # Main sift endpoint
│       ├── ai-score/route.ts     # AI detection endpoint
│       ├── deep-scan/route.ts    # Deep scan endpoint
│       ├── bookmarks/route.ts    # Bookmark CRUD
│       └── auth/[...nextauth]/   # NextAuth
├── lib/                          # Shared logic
│   ├── parser/                   # Content parsing pipeline
│   │   ├── fetcher.ts            # URL fetcher (server-side)
│   │   ├── meta-extractor.ts     # Meta tag extraction
│   │   ├── readability.ts        # Readability.js wrapper
│   │   ├── content-classifier.ts # Detect recipe/article/tutorial
│   │   ├── noise-filter.ts       # Strip junk content
│   │   ├── recipe-extractor.ts   # Structured recipe extraction
│   │   └── media-handler.ts      # Image/video preservation
│   ├── ai-detect/                # AI detection
│   │   ├── heuristics.ts         # Pattern matching engine
│   │   ├── deep-scan.ts          # External API integration
│   │   └── scoring.ts            # Score aggregation
│   ├── db.ts                     # Prisma client
│   └── auth.ts                   # NextAuth config
├── components/                   # React components
│   ├── landing/                  # Landing page components
│   ├── result/                   # Sifted result components
│   │   ├── AiOverlay.tsx         # AI detection bar
│   │   ├── SourceBar.tsx         # Source attribution
│   │   ├── RemovedIndicator.tsx  # "Sift removed" callout
│   │   ├── RecipeCard.tsx        # Structured recipe display
│   │   ├── ArticleBody.tsx       # Clean content renderer
│   │   └── ThemeToggle.tsx       # Light/dark switch
│   ├── account/                  # Account UI
│   └── shared/                   # Buttons, inputs, layout
├── extension/                    # Browser extension (separate build)
│   ├── manifest.json
│   ├── popup/                    # Extension popup UI
│   ├── content/                  # Content script (DOM capture)
│   ├── background/               # Service worker
│   └── icons/
├── prisma/
│   └── schema.prisma             # Database schema
├── public/
│   └── sift-logo.svg
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```
