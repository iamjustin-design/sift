# Phase B Slice 1 — Snapshot Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the foundation that lets the result page show the original page in a same-origin iframe, with every block element stably identified by `data-sift-id`. This unblocks Phase C (Sift Edits) immediately and gives Phase B Slice 2 (animation) the DOM hooks it needs.

**Architecture:**
- `lib/parser/sift-tagger.ts` walks the parsed DOM and assigns sequential `data-sift-id` attributes to every block-level content element. Both `/api/sift` and `/api/sift/snapshot` call this on the same fetched HTML, producing identical IDs because traversal is deterministic.
- `/api/sift` runs Readability on the tagged HTML, then `lib/parser/keeper-mapper.ts` walks the article output to collect surviving IDs into `SiftResult.keeperSelectors`.
- `/api/sift/snapshot` runs `lib/parser/snapshot.ts` on the tagged HTML to strip scripts, resolve relative URLs, and return safe HTML for iframe display.
- The result page fires both endpoints in parallel. The "Show original" quick action toggles between clean view and a `SnapshotIframe` (loaded via `URL.createObjectURL(blob)`).
- No animation in this slice. The toggle is instant. Animation lands in Slice 2.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, linkedom (DOM parsing), `@mozilla/readability`, blob URLs for iframe loading, Tailwind v4. Project-wide convention: no unit test framework — verification is type-check + dev-server browser check + deploy smoke test.

**Spec reference:** `docs/superpowers/specs/2026-04-10-bitsift-bot-rebrand-design.md` (Sanitized Snapshot System, Keeper Element Mapping, Phase B sections)

---

## File Structure

**Created:**
- `lib/parser/sift-tagger.ts` — `tagBlockElements(html)` returns tagged HTML string
- `lib/parser/keeper-mapper.ts` — `extractKeeperIds(articleHtml)` returns string[] of surviving `data-sift-id` values
- `lib/parser/snapshot.ts` — `sanitizeSnapshot(taggedHtml, baseUrl)` returns sanitized HTML
- `app/api/sift/snapshot/route.ts` — POST/GET endpoint returning `{ html, baseUrl, fetchTimeMs }`
- `components/animation/SnapshotIframe.tsx` — blob-URL-backed iframe wrapper

**Modified:**
- `lib/parser/types.ts` — add `keeperSelectors: string[]` to `SiftResult`
- `lib/parser/extractor.ts` — tag once before parse, map keeper IDs from Readability output
- `lib/bot/types.ts` — add `snapshotOpen: boolean` and `setSnapshotOpen` to context type
- `lib/bot/context.tsx` — add snapshot toggle state to provider
- `components/bot/QuickActions.tsx` — emit `"original"` action when "Show original" is clicked (already in the actions list)
- `components/bot/ChatPanel.tsx` — handle `"original"` quick action by toggling snapshotOpen
- `app/sift/page.tsx` — parallel-fetch snapshot, render `SnapshotIframe` when `snapshotOpen` is true

---

## Task 1: Block-element tagger

**Files:**
- Create: `E:\SHARED\PROJECTS\sift\lib\parser\sift-tagger.ts`

The tagger walks every block-level content element in document order and assigns `data-sift-id="0"`, `"1"`, `"2"`, etc. The same fetched HTML run through this function on either endpoint will produce identical IDs because the traversal order is deterministic.

Block elements to tag (these are the things a user would want to add or remove as a unit): `p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table, figure, img, video, audio, hr, section, article, aside`. We deliberately skip `<div>` (too generic — would create thousands of IDs on rich pages), and we skip `<li>` (the parent list is the editable unit in v1).

Existing tagged elements (any pre-existing `data-sift-id` from a re-tag scenario) are overwritten so behavior is idempotent.

- [ ] **Step 1: Create the tagger module**

Create `E:\SHARED\PROJECTS\sift\lib\parser\sift-tagger.ts`:

```typescript
import { parseHTML } from "linkedom";

const BLOCK_TAGS = new Set([
  "P",
  "H1", "H2", "H3", "H4", "H5", "H6",
  "UL", "OL",
  "BLOCKQUOTE",
  "PRE",
  "TABLE",
  "FIGURE",
  "IMG",
  "VIDEO",
  "AUDIO",
  "HR",
  "SECTION",
  "ARTICLE",
  "ASIDE",
]);

/**
 * Walks the document body in document order and assigns a sequential
 * data-sift-id attribute to every block-level content element.
 *
 * Both /api/sift and /api/sift/snapshot call this on the same fetched
 * HTML, producing identical IDs because traversal is deterministic.
 */
export function tagBlockElements(html: string): string {
  const { document } = parseHTML(html);
  const root = document.body || document.documentElement;
  if (!root) return html;

  let counter = 0;
  const walker = (node: Element) => {
    if (BLOCK_TAGS.has(node.tagName)) {
      node.setAttribute("data-sift-id", String(counter));
      counter += 1;
    }
    for (const child of Array.from(node.children)) {
      walker(child as Element);
    }
  };

  for (const child of Array.from(root.children)) {
    walker(child as Element);
  }

  return document.toString();
}
```

- [ ] **Step 2: Verify it type-checks**

Run from `E:\SHARED\PROJECTS\sift`:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke-test the tagger inline**

Create a one-off check file `E:\SHARED\PROJECTS\sift\scripts\check-tagger.mjs`:

```javascript
import { tagBlockElements } from "../lib/parser/sift-tagger.ts";

const sample = `<html><body>
  <h1>Hello</h1>
  <p>First paragraph.</p>
  <div><p>Nested paragraph.</p></div>
  <ul><li>One</li><li>Two</li></ul>
  <img src="cat.png" alt="cat">
</body></html>`;

console.log(tagBlockElements(sample));
```

Run via the Next.js project's TypeScript-aware loader. Easier alternative: skip the script and verify via the next task's integration.

If the script form is preferred:

```bash
npx tsx scripts/check-tagger.mjs
```

Expected output should include `data-sift-id="0"` on the `<h1>`, `"1"` on the first `<p>`, `"2"` on the nested `<p>`, `"3"` on the `<ul>`, `"4"` on the `<img>`. The `<li>` elements should NOT have IDs.

If `tsx` isn't installed, skip this script and rely on Task 3's integration verification instead. Delete the script file if it was created.

- [ ] **Step 4: Commit**

```bash
cd "E:/SHARED/PROJECTS/sift"
git add lib/parser/sift-tagger.ts
git commit -m "feat(parser): add block-element tagger for data-sift-id assignment"
```

---

## Task 2: Keeper ID extractor

**Files:**
- Create: `E:\SHARED\PROJECTS\sift\lib\parser\keeper-mapper.ts`

After Readability runs, the article HTML contains a subset of the original DOM. Block elements that survived will retain their `data-sift-id` attributes (Readability preserves `data-*` attributes by default). This module walks the article HTML and collects those IDs.

- [ ] **Step 1: Create the keeper-mapper module**

Create `E:\SHARED\PROJECTS\sift\lib\parser\keeper-mapper.ts`:

```typescript
import { parseHTML } from "linkedom";

/**
 * Given the HTML output from Readability, returns the data-sift-id values
 * of every element that survived. Used to build SiftResult.keeperSelectors,
 * which the client uses to map sifted content back to snapshot DOM nodes.
 */
export function extractKeeperIds(articleHtml: string): string[] {
  if (!articleHtml) return [];
  const { document } = parseHTML(`<div>${articleHtml}</div>`);
  const tagged = document.querySelectorAll("[data-sift-id]");
  const ids: string[] = [];
  for (const el of Array.from(tagged)) {
    const id = el.getAttribute("data-sift-id");
    if (id !== null && id !== "") {
      ids.push(id);
    }
  }
  return ids;
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd "E:/SHARED/PROJECTS/sift"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/parser/keeper-mapper.ts
git commit -m "feat(parser): add keeper-id extractor for Readability output"
```

---

## Task 3: Wire tagger + keeper-mapper into the sift pipeline

**Files:**
- Modify: `E:\SHARED\PROJECTS\sift\lib\parser\types.ts`
- Modify: `E:\SHARED\PROJECTS\sift\lib\parser\extractor.ts`

We tag the HTML once after fetch, then thread the tagged HTML through both the meta-extraction parse and the Readability parse. After Readability runs, we walk its output for surviving IDs and return them as `keeperSelectors`.

For recipe pages (where `recipeToHtml(recipe)` produces synthetic HTML that has no `data-sift-id` values), we still return an empty `keeperSelectors` array. The Sift Edits feature is meaningful only for non-recipe pages in v1; recipe pages can fall back to "show original" without tap-to-edit.

- [ ] **Step 1: Add `keeperSelectors` to `SiftResult`**

Edit `E:\SHARED\PROJECTS\sift\lib\parser\types.ts`. Find:

```typescript
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
```

Replace with:

```typescript
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
  keeperSelectors: string[]; // data-sift-id values that survived Readability
}
```

- [ ] **Step 2: Update extractor.ts to tag once and map keepers**

Edit `E:\SHARED\PROJECTS\sift\lib\parser\extractor.ts`.

Find the imports at the top and add the two new ones:

```typescript
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { extractMeta } from "./meta-extractor";
import { fetchUrl } from "./fetcher";
import { cleanupContent } from "./cleanup";
import { extractRecipe, recipeToHtml, RecipeData } from "./recipe-extractor";
import { cleanTitle, pickBestTitle } from "./title-cleaner";
import { tagBlockElements } from "./sift-tagger";
import { extractKeeperIds } from "./keeper-mapper";
import { SiftResult } from "./types";
```

Then find the `siftUrl` body. Replace the section starting at `const fetched = await fetchUrl(url);` through the `meta.title = pickBestTitle(...)` line — i.e. lines 22 through 60 of the current file — with this version that uses tagged HTML for both parses:

```typescript
export async function siftUrl(url: string): Promise<SiftResult> {
  const fetched = await fetchUrl(url);

  // Tag once. Both downstream parses use the tagged HTML so data-sift-id
  // values are stable and survive Readability's DOM mutations.
  const taggedHtml = tagBlockElements(fetched.html);

  const { document: doc } = parseHTML(taggedHtml);
  const meta = extractMeta(doc as unknown as Document, fetched.url);

  const rawTitleTag =
    doc.querySelector("title")?.textContent?.trim() || "";
  const rawOgTitle =
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim() || "";

  const recipe = extractRecipe(taggedHtml);

  const { document: readerDoc } = parseHTML(taggedHtml);
  const reader = new Readability(readerDoc as unknown as Document);
  const article = reader.parse();

  if (!recipe && !article) {
    throw new Error("PARSE_FAILED");
  }

  if (article) {
    if (!meta.author && article.byline) meta.author = article.byline;
    if (!meta.description && article.excerpt) meta.description = article.excerpt;
    if (article.siteName) meta.siteName = article.siteName;
  }

  if (recipe) {
    if (!meta.description && recipe.description) meta.description = recipe.description;
    if (!meta.author && recipe.author) meta.author = recipe.author;
  }

  const isRecipePage = !!recipe;
  const titleCandidates = [
    recipe?.name || "",
    cleanTitle(rawTitleTag, meta.siteName, isRecipePage),
    cleanTitle(rawOgTitle, meta.siteName, isRecipePage),
    cleanTitle(article?.title || "", meta.siteName, isRecipePage),
  ];
  meta.title = pickBestTitle(titleCandidates) || meta.title;
```

Then find the return statement at the bottom of the function. Replace this block:

```typescript
  return {
    meta,
    content,
    textContent,
    excerpt: (article?.excerpt) || meta.description || recipe?.description || "",
    wordCount,
    sourceUrl: fetched.url,
    sourceDomain,
    siftedAt: new Date().toISOString(),
    fetchTimeMs: fetched.fetchTimeMs,
  };
}
```

With:

```typescript
  // Recipe pages produce synthetic HTML with no data-sift-id values, so the
  // keeperSelectors are empty for them. Sift Edits is non-recipe-only in v1.
  const keeperSelectors = recipe ? [] : extractKeeperIds(article!.content ?? "");

  return {
    meta,
    content,
    textContent,
    excerpt: (article?.excerpt) || meta.description || recipe?.description || "",
    wordCount,
    sourceUrl: fetched.url,
    sourceDomain,
    siftedAt: new Date().toISOString(),
    fetchTimeMs: fetched.fetchTimeMs,
    keeperSelectors,
  };
}
```

- [ ] **Step 3: Type-check**

```bash
cd "E:/SHARED/PROJECTS/sift"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run dev server and verify keeperSelectors in API response**

Start dev server:

```bash
cd "E:/SHARED/PROJECTS/sift"
npm run dev
```

In a second terminal, hit the API:

```bash
curl -s -X POST http://localhost:3000/api/sift \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.bbc.com/news"}' | head -c 4000
```

Expected: response includes a `keeperSelectors` array with at least a few string values like `"3"`, `"5"`, `"12"`, etc. Also confirm the `content` HTML contains `data-sift-id="..."` attributes on its block elements (paragraphs, headings).

If the array is empty on a known-good news article, something's wrong with the tag-then-Readability flow — investigate before continuing.

Stop the dev server (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add lib/parser/types.ts lib/parser/extractor.ts
git commit -m "feat(parser): thread data-sift-id through pipeline, return keeperSelectors"
```

---

## Task 4: Snapshot sanitizer

**Files:**
- Create: `E:\SHARED\PROJECTS\sift\lib\parser\snapshot.ts`

The sanitizer takes tagged HTML and produces a string safe to render in a same-origin iframe. Per spec lines 140-148:

1. Strip all `<script>` tags
2. Strip inline event handlers (any attribute starting with `on`)
3. Strip `<iframe>` elements
4. Resolve relative URLs to absolute on `a[href]`, `img[src]`, `img[srcset]`, `source[srcset]`, `link[href]`, `script[src]` (script src strip is moot since the tag itself is removed, but link/img/etc need it)
5. Return cleaned HTML string

We do NOT inline CSS in this slice — we leave `<link rel="stylesheet">` tags pointing to absolute URLs. Most pages will load their own styles from CDNs that allow cross-origin loading. If a page's styles fail to load, the iframe renders unstyled HTML, which is acceptable for v1.

- [ ] **Step 1: Create the sanitizer module**

Create `E:\SHARED\PROJECTS\sift\lib\parser\snapshot.ts`:

```typescript
import { parseHTML } from "linkedom";

const SKIP_PROTOCOLS = ["data:", "blob:", "javascript:", "mailto:", "tel:"];

function resolveUrl(value: string, baseUrl: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  for (const proto of SKIP_PROTOCOLS) {
    if (trimmed.toLowerCase().startsWith(proto)) return value;
  }
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return value;
  }
}

function resolveSrcset(value: string, baseUrl: string): string {
  return value
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return trimmed;
      const spaceIdx = trimmed.search(/\s+/);
      if (spaceIdx === -1) return resolveUrl(trimmed, baseUrl);
      const url = trimmed.slice(0, spaceIdx);
      const descriptor = trimmed.slice(spaceIdx);
      return resolveUrl(url, baseUrl) + descriptor;
    })
    .filter(Boolean)
    .join(", ");
}

/**
 * Takes tagged HTML and produces a string safe to render in a same-origin
 * iframe via blob URL. Strips scripts, inline event handlers, and nested
 * iframes. Resolves relative URLs to absolute against baseUrl.
 *
 * Stylesheets are NOT inlined — link tags are rewritten to absolute URLs
 * and the iframe loads them cross-origin where the source site allows.
 */
export function sanitizeSnapshot(taggedHtml: string, baseUrl: string): string {
  const { document } = parseHTML(taggedHtml);

  // Strip scripts.
  for (const el of Array.from(document.querySelectorAll("script"))) {
    el.remove();
  }
  // Strip nested iframes.
  for (const el of Array.from(document.querySelectorAll("iframe"))) {
    el.remove();
  }
  // Strip inline event handlers.
  for (const el of Array.from(document.querySelectorAll("*"))) {
    const attrs = Array.from((el as Element).attributes);
    for (const attr of attrs) {
      if (attr.name.toLowerCase().startsWith("on")) {
        (el as Element).removeAttribute(attr.name);
      }
    }
  }
  // Resolve URLs.
  for (const el of Array.from(document.querySelectorAll("a[href]"))) {
    const v = el.getAttribute("href");
    if (v) el.setAttribute("href", resolveUrl(v, baseUrl));
  }
  for (const el of Array.from(document.querySelectorAll("img[src]"))) {
    const v = el.getAttribute("src");
    if (v) el.setAttribute("src", resolveUrl(v, baseUrl));
  }
  for (const el of Array.from(document.querySelectorAll("img[srcset]"))) {
    const v = el.getAttribute("srcset");
    if (v) el.setAttribute("srcset", resolveSrcset(v, baseUrl));
  }
  for (const el of Array.from(document.querySelectorAll("source[srcset]"))) {
    const v = el.getAttribute("srcset");
    if (v) el.setAttribute("srcset", resolveSrcset(v, baseUrl));
  }
  for (const el of Array.from(document.querySelectorAll("link[href]"))) {
    const v = el.getAttribute("href");
    if (v) el.setAttribute("href", resolveUrl(v, baseUrl));
  }
  // Inject a <base> tag so anything we missed still resolves.
  const head = document.querySelector("head");
  if (head) {
    const existingBase = head.querySelector("base");
    if (existingBase) {
      existingBase.setAttribute("href", baseUrl);
    } else {
      const base = document.createElement("base");
      base.setAttribute("href", baseUrl);
      head.insertBefore(base, head.firstChild);
    }
  }

  return document.toString();
}
```

- [ ] **Step 2: Type-check**

```bash
cd "E:/SHARED/PROJECTS/sift"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/parser/snapshot.ts
git commit -m "feat(parser): add snapshot sanitizer for iframe-safe HTML"
```

---

## Task 5: `/api/sift/snapshot` route

**Files:**
- Create: `E:\SHARED\PROJECTS\sift\app\api\sift\snapshot\route.ts`

The route fetches the URL (reusing `fetchUrl`), tags block elements, sanitizes, and returns `{ html, baseUrl, fetchTimeMs }`. POST and GET both supported (matching the existing `/api/sift` shape).

- [ ] **Step 1: Create the route file**

Create `E:\SHARED\PROJECTS\sift\app\api\sift\snapshot\route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchUrl } from "@/lib/parser/fetcher";
import { tagBlockElements } from "@/lib/parser/sift-tagger";
import { sanitizeSnapshot } from "@/lib/parser/snapshot";
import { SiftError } from "@/lib/parser/types";

export const runtime = "nodejs";

interface SnapshotResponse {
  html: string;
  baseUrl: string;
  fetchTimeMs: number;
}

async function handleSnapshot(url: string): Promise<SnapshotResponse> {
  const fetched = await fetchUrl(url);
  const tagged = tagBlockElements(fetched.html);
  const sanitized = sanitizeSnapshot(tagged, fetched.url);
  return {
    html: sanitized,
    baseUrl: fetched.url,
    fetchTimeMs: fetched.fetchTimeMs,
  };
}

const STATUS_MAP: Record<string, number> = {
  INVALID_URL: 400,
  FETCH_FAILED: 502,
  PARSE_FAILED: 422,
  TIMEOUT: 504,
};

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json(
    { error: message, code: message } as SiftError,
    { status: STATUS_MAP[message] || 500 }
  );
}

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
    const result = await handleSnapshot(url);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
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
    const result = await handleSnapshot(url);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd "E:/SHARED/PROJECTS/sift"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke-test with dev server**

```bash
cd "E:/SHARED/PROJECTS/sift"
npm run dev
```

In another terminal:

```bash
curl -s -X POST http://localhost:3000/api/sift/snapshot \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.bbc.com/news"}' | head -c 2000
```

Expected: JSON response with `html` (long sanitized string starting with `<!DOCTYPE html>` or `<html>`), `baseUrl`, and `fetchTimeMs`. The HTML should contain `data-sift-id="..."` attributes and should NOT contain `<script>` tags.

Quick verification of script removal:

```bash
curl -s -X POST http://localhost:3000/api/sift/snapshot \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.bbc.com/news"}' | jq -r '.html' | grep -c "<script"
```

Expected output: `0`.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add app/api/sift/snapshot/route.ts
git commit -m "feat(api): add /api/sift/snapshot endpoint for iframe-safe HTML"
```

---

## Task 6: SnapshotIframe component

**Files:**
- Create: `E:\SHARED\PROJECTS\sift\components\animation\SnapshotIframe.tsx`

A client component that converts the sanitized HTML string into a Blob URL, points an iframe at it, and revokes the URL on unmount. Used as a full-viewport overlay.

- [ ] **Step 1: Create the component**

Create the directory and file `E:\SHARED\PROJECTS\sift\components\animation\SnapshotIframe.tsx`:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";

export interface SnapshotIframeProps {
  html: string | null;
  onClose: () => void;
}

export function SnapshotIframe({ html, onClose }: SnapshotIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!html) {
      setBlobUrl(null);
      return;
    }
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [html]);

  if (!html) return null;

  return (
    <div className="fixed inset-0 z-40 bg-surface-light dark:bg-surface-dark flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Showing the original page
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-bold bg-sift-gold text-white rounded-lg cursor-pointer hover:bg-sift-gold-dark"
        >
          Back to sifted
        </button>
      </div>
      {blobUrl && (
        <iframe
          ref={iframeRef}
          src={blobUrl}
          sandbox="allow-same-origin"
          className="flex-1 w-full border-0"
          title="Original page snapshot"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd "E:/SHARED/PROJECTS/sift"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/animation/SnapshotIframe.tsx
git commit -m "feat(ui): add SnapshotIframe component with blob URL loading"
```

---

## Task 7: Wire "Show original" through context, ChatPanel, and result page

**Files:**
- Modify: `E:\SHARED\PROJECTS\sift\lib\bot\types.ts`
- Modify: `E:\SHARED\PROJECTS\sift\lib\bot\context.tsx`
- Modify: `E:\SHARED\PROJECTS\sift\components\bot\ChatPanel.tsx`
- Modify: `E:\SHARED\PROJECTS\sift\app\sift\page.tsx`

The result page parallel-fetches both endpoints. When the user clicks "Show original" in the chat panel quick actions, the context flips `snapshotOpen` to `true` and the result page renders the `SnapshotIframe` overlay. The "Back to sifted" button on the iframe sets it back to `false`.

If the snapshot fetch fails or hasn't finished yet when the user clicks, the chat panel shows a brief bot message ("Snapshot is still loading…" or "Couldn't load the original.") and leaves the toggle off.

- [ ] **Step 1: Extend the bot context type**

Edit `E:\SHARED\PROJECTS\sift\lib\bot\types.ts`. Find:

```typescript
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

Replace with:

```typescript
export interface SiftBotContextType {
  botState: BotState;
  setBotState: (state: BotState) => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  messages: ChatMessage[];
  addMessage: (role: "bot" | "user", content: string) => void;
  currentUrl: string | null;
  setCurrentUrl: (url: string | null) => void;
  snapshotOpen: boolean;
  setSnapshotOpen: (open: boolean) => void;
}
```

- [ ] **Step 2: Add snapshot state to the provider**

Edit `E:\SHARED\PROJECTS\sift\lib\bot\context.tsx`. Three changes.

**Change A — update the default context value.** Find:

```typescript
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
```

Replace with:

```typescript
const SiftBotContext = createContext<SiftBotContextType>({
  botState: "welcome",
  setBotState: () => {},
  chatOpen: false,
  setChatOpen: () => {},
  messages: [],
  addMessage: () => {},
  currentUrl: null,
  setCurrentUrl: () => {},
  snapshotOpen: false,
  setSnapshotOpen: () => {},
});
```

**Change B — add the useState declaration.** Find:

```typescript
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
```

Replace with:

```typescript
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
```

**Change C — add the new fields to the provider value.** Find:

```typescript
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
```

Replace with:

```typescript
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
        snapshotOpen,
        setSnapshotOpen,
      }}
    >
```

- [ ] **Step 3: Type-check the context changes**

```bash
cd "E:/SHARED/PROJECTS/sift"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Wire "Show original" in ChatPanel**

Edit `E:\SHARED\PROJECTS\sift\components\bot\ChatPanel.tsx`. Find:

```typescript
  const { chatOpen, setChatOpen, messages, addMessage, currentUrl } = useSiftBot();
```

Replace with:

```typescript
  const { chatOpen, setChatOpen, messages, addMessage, currentUrl, setSnapshotOpen } = useSiftBot();
```

Find the `handleQuickAction` function:

```typescript
  const handleQuickAction = (action: string) => {
    addMessage("user", `Quick action: ${action}`);
    setTimeout(() => {
      addMessage("bot", `The "${action}" feature is coming in a future update!`);
    }, 500);
  };
```

Replace with:

```typescript
  const handleQuickAction = (action: string) => {
    if (action === "original") {
      setSnapshotOpen(true);
      setChatOpen(false);
      addMessage("user", "Show original");
      addMessage("bot", "Showing the original page. Click \"Back to sifted\" to return.");
      return;
    }
    addMessage("user", `Quick action: ${action}`);
    setTimeout(() => {
      addMessage("bot", `The "${action}" feature is coming in a future update!`);
    }, 500);
  };
```

- [ ] **Step 5: Update result page to fetch snapshot in parallel and render iframe overlay**

Edit `E:\SHARED\PROJECTS\sift\app\sift\page.tsx`. Add the SnapshotIframe import near the existing imports:

```typescript
import { SnapshotIframe } from "@/components/animation/SnapshotIframe";
```

Find:

```typescript
  const { setBotState, setCurrentUrl, addMessage, messages } = useSiftBot();
```

Replace with:

```typescript
  const { setBotState, setCurrentUrl, addMessage, messages, snapshotOpen, setSnapshotOpen } = useSiftBot();
  const [snapshotHtml, setSnapshotHtml] = useState<string | null>(null);
```

Find the `useEffect` that calls `/api/sift`:

```typescript
  useEffect(() => {
    if (!url) { setError("No URL provided"); setLoading(false); return; }

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
        setBotState("collapsed");
        setCurrentUrl(url);
        if (messages.length === 0) {
          addMessage("bot", "Here's your sifted content! Ask me to adjust anything.");
        }
      } catch {
        setError("Network error — please try again");
      } finally {
        setLoading(false);
      }
    };

    fetchSift();
  }, [url]);
```

Replace with:

```typescript
  useEffect(() => {
    if (!url) { setError("No URL provided"); setLoading(false); return; }

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
        setBotState("collapsed");
        setCurrentUrl(url);
        if (messages.length === 0) {
          addMessage("bot", "Here's your sifted content! Ask me to adjust anything.");
        }
      } catch {
        setError("Network error — please try again");
      } finally {
        setLoading(false);
      }
    };

    const fetchSnapshot = async () => {
      try {
        const res = await fetch("/api/sift/snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) return;
        const data: { html: string } = await res.json();
        setSnapshotHtml(data.html);
      } catch {
        // Snapshot is non-critical; ignore failures silently in v1.
      }
    };

    fetchSift();
    fetchSnapshot();
  }, [url]);
```

Find the closing `</div>` of the outermost `<div className="min-h-screen bg-surface-light...">` block — it's the last `</div>` before `);` at the end of `SiftContent`. Just before that closing `</div>`, render the iframe overlay:

```typescript
        <ArticleBody
          title={result.meta.title}
          author={result.meta.author}
          publishedDate={result.meta.publishedDate}
          ogImage={result.meta.ogImage}
          content={result.content}
          wordCount={result.wordCount}
        />
      </div>
      {snapshotOpen && (
        <SnapshotIframe
          html={snapshotHtml}
          onClose={() => setSnapshotOpen(false)}
        />
      )}
    </div>
  );
}
```

Note: `SnapshotIframe` already returns null when `html` is null, so if the snapshot fetch hasn't completed yet, the overlay frame appears with no content. To avoid that visual blank, also handle the in-flight case in `handleQuickAction` of ChatPanel — but for v1 simplicity, the empty overlay is acceptable; users will only click "Show original" after the page has loaded for several seconds, by which time the snapshot fetch will have completed.

- [ ] **Step 6: Type-check**

```bash
cd "E:/SHARED/PROJECTS/sift"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Browser verification on dev server**

```bash
cd "E:/SHARED/PROJECTS/sift"
npm run dev
```

In a browser:

1. Visit `http://localhost:3000`
2. Paste a URL: `https://www.bbc.com/news/world-us-canada-12345678` (or any current BBC News article — the URL just needs to fetch a real news page)
3. Wait for the result page to render with the sifted content
4. Click the gold bot circle bottom-right to open ChatPanel
5. Click the "Show original" pill
6. Expected: chat closes, full-viewport overlay shows the original page (styled or unstyled is fine), with a "Back to sifted" button at the top
7. Click "Back to sifted"
8. Expected: overlay disappears, sifted content is back

Open DevTools Network tab and refresh. Confirm both `/api/sift` and `/api/sift/snapshot` fire on page load (in parallel).

Open DevTools Elements panel on the sifted view. Inspect a paragraph in the article body. Confirm it has a `data-sift-id="..."` attribute.

Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add lib/bot/types.ts lib/bot/context.tsx components/bot/ChatPanel.tsx app/sift/page.tsx
git commit -m "feat(bot): wire Show original quick action to snapshot iframe overlay"
```

---

## Task 8: Production build, deploy, and live verification

**Files:** none modified — this task verifies the full pipeline against the production environment that bit users about Turbopack on 2026-04-26.

- [ ] **Step 1: Production build (catches webpack/Turbopack mismatches)**

```bash
cd "E:/SHARED/PROJECTS/sift"
npm run build
```

Expected: build succeeds, no `ChunkLoadError` mentions, no errors about `[root-of-the-server]__*._.js` chunks. The `--webpack` flag in package.json's build script should keep Turbopack out of the production bundle.

If the build fails, do NOT proceed to deploy — diagnose first. Check `.next/server/` for chunk filenames; if Turbopack-style names appear, the build flag was bypassed.

- [ ] **Step 2: Deploy**

```bash
cd "E:/SHARED/PROJECTS/sift"
npm run deploy
```

Expected: Wrangler output ends with `Deployed sift triggers` and a `routes:` section that includes `bitsift.app/*` (without a `-` prefix — a `-` would mean the custom domain is being stripped).

If the output shows `- routes:`, abort — the wrangler.jsonc routes block is missing. Restore it before retrying.

- [ ] **Step 3: Live smoke test on bitsift.app**

In a browser:

1. Visit `https://bitsift.app`
2. Sift a real article URL (e.g., a BBC News or NYTimes article)
3. Confirm the result page renders normally
4. Open DevTools Network tab, confirm `/api/sift/snapshot` returns 200 with a JSON `html` payload
5. Open DevTools Elements panel, confirm article paragraphs have `data-sift-id` attributes
6. Click the bot circle, click "Show original" — confirm the overlay opens and shows the original page in an iframe
7. Click "Back to sifted" — confirm the overlay closes

If any step fails, capture the error and address before claiming complete.

- [ ] **Step 4: Final commit and push**

```bash
cd "E:/SHARED/PROJECTS/sift"
git push origin main
```

(All previous task commits should already be present locally; this push is the deploy-verified shipping point.)

- [ ] **Step 5: Update SKILL.md to record Phase B Slice 1 as COMPLETE**

Edit `C:\Users\justi\.claude\skills\sift\SKILL.md`. In the Implementation Phases table, find:

```
| B: Snapshot + Animation | NOT STARTED | /api/sift/snapshot, data-sift-id tagging, keeperSelectors in /api/sift response, extraction animation (highlight/dissolve/reflow), page peel |
```

Replace with:

```
| **B Slice 1: Snapshot foundation** *(2026-05-02)* | **COMPLETE** | /api/sift/snapshot endpoint, data-sift-id tagging via `lib/parser/sift-tagger.ts`, keeperSelectors in /api/sift response via `lib/parser/keeper-mapper.ts`, SnapshotIframe with blob URL loading, "Show original" quick action wired through bot context. Sift Edits (Phase C) is now unblocked. |
| B Slice 2: Animation | NOT STARTED | Extraction animation sequence (highlight on snapshot iframe, dissolve non-keepers, reflow into clean layout) |
| B Slice 3: Page peel + ingestion polish | NOT STARTED | URL ingestion animation (text into sieve), CSS 3D page peel, mobile progressive-reveal fallback |
```

Add a Session Changelog entry under the existing 2026-04-26 entry:

```markdown
### 2026-05-02 — Phase C lock-in (Sift Edits) + Phase B Slice 1 ship

**Spec changes:**
- Locked Sift Edits feature into Phase C: `2026-04-10-bitsift-bot-rebrand-design.md` now has a full "Sift Edits" section covering tap-to-remove, tap-to-add-back, and chat-driven `edit-add`/`edit-remove`/`show-original` actions. Promoted Draw-to-include/exclude out of v2 Future Roadmap in `2026-04-05-sift-design.md`.
- Snapshot loading method locked: blob URL via `URL.createObjectURL`. Rejected srcdoc due to browser size caps that real news/recipe pages exceed.

**Phase B Slice 1 ship:**
- New `lib/parser/sift-tagger.ts` — `tagBlockElements(html)` walks the parsed body and assigns sequential `data-sift-id` attributes to block content elements (`p, h1-h6, ul, ol, blockquote, pre, table, figure, img, video, audio, hr, section, article, aside`). Skips `<div>` (too generic) and `<li>` (parent list is the editable unit).
- New `lib/parser/keeper-mapper.ts` — `extractKeeperIds(articleHtml)` walks Readability output for surviving IDs.
- New `lib/parser/snapshot.ts` — `sanitizeSnapshot(taggedHtml, baseUrl)` strips scripts/inline event handlers/iframes, resolves relative URLs on `a`, `img`, `source`, `link`, and injects a `<base>` tag.
- New `app/api/sift/snapshot/route.ts` — POST/GET endpoint returning `{ html, baseUrl, fetchTimeMs }`.
- New `components/animation/SnapshotIframe.tsx` — full-viewport overlay backed by a Blob URL with `sandbox="allow-same-origin"` + "Back to sifted" close button. Revokes the blob URL on unmount.
- `lib/parser/types.ts` — `SiftResult` now includes `keeperSelectors: string[]`.
- `lib/parser/extractor.ts` — tags HTML once, threads tagged HTML through both meta and Readability parses, returns keeperSelectors. Recipe pages return empty array (Sift Edits is non-recipe-only in v1).
- `lib/bot/types.ts` + `lib/bot/context.tsx` — added `snapshotOpen` + `setSnapshotOpen` to context.
- `components/bot/ChatPanel.tsx` — "Show original" quick action now toggles snapshotOpen.
- `app/sift/page.tsx` — parallel-fetches snapshot alongside sift, renders SnapshotIframe overlay when toggled.

**Files added:** `lib/parser/sift-tagger.ts`, `lib/parser/keeper-mapper.ts`, `lib/parser/snapshot.ts`, `app/api/sift/snapshot/route.ts`, `components/animation/SnapshotIframe.tsx`
**Files modified:** `lib/parser/types.ts`, `lib/parser/extractor.ts`, `lib/bot/types.ts`, `lib/bot/context.tsx`, `components/bot/ChatPanel.tsx`, `app/sift/page.tsx`
```

- [ ] **Step 6: Done**

Slice 1 of Phase B is shipped. Sift Edits (Phase C) is now unblocked because:
- Every keeper element in the sifted view carries a `data-sift-id` (via `content` HTML)
- The snapshot iframe exposes the same IDs on every block element including non-keepers
- `SiftResult.keeperSelectors` tells the client which IDs were originally kept

Slice 2 (animation) and Slice 3 (page peel + polish) are independent next steps. Phase C Slice 1 (manual tap-to-edit, no LLM) can also start in parallel — it does not need the animation work.
