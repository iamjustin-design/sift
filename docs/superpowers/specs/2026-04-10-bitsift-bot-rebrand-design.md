# BitSift Bot — Rebrand & Interactive Bot Experience

**Date:** 2026-04-10
**Status:** Design
**Domain:** bitsift.app (pending setup)

## Overview

Rebrand from "Sift" to **BitSift**. Transform the static URL-in/article-out tool into an interactive bot-driven experience. The **BitSift Bot** is a friendly mascot companion that greets users, ingests URLs with a visual animation, shows the extraction process live, and remains available as a collapsible chat assistant for follow-up sifting commands.

**Tagline:** "Sifting bits from bytes" (carries over — it's even more on-brand now)

## Branding

- **Product name:** BitSift (one word, camelCase in display: BitSift)
- **Bot name:** BitSift Bot (the mascot/assistant personality)
- **Domain:** bitsift.app
- **Public-facing:** All UI, meta tags, tab titles, logos, and copy display "BitSift" — never "Sift" alone
- **Mascot:** Placeholder sieve/strainer character for now (Nico will design the real character, converted to SVG)
- **Color palette:** Unchanged — sift-gold (#b8860b), surface-light (#faf9f6), surface-dark (#141414), etc.

## Architecture Overview

```
Landing (/)
  BitSift Bot centered, large mascot + speech bubble + URL input
    |
    v  User pastes URL, hits "Sift It"
    |
Two parallel API calls:
  /api/sift          → real Readability extraction (existing pipeline)
  /api/sift/snapshot → sanitized HTML snapshot for animation
    |
    v
Animation Sequence (on /sift?url=...)
  1. URL ingestion animation (text pours into sifter mascot)
  2. Page peel (landing peels away, snapshot iframe revealed)
  3. Highlight & dissolve (gold borders on keepers, junk fades)
  4. Pick & place (keeper elements animate into clean layout)
  5. Clean layout renders (SiftResult already ready from parallel call)
  6. Bot collapses to gold circle (bottom-right corner)
    |
    v
Post-Sift Chat
  Click collapsed bot → chat panel expands
  Quick actions + free-form text → LLM interprets → structured actions
  Can re-sift, filter content, adjust layout, sift new URL
```

## Bot Component — States & Behavior

The BitSift Bot is a persistent React component in the root layout. It has four states:

### State 1: Hidden
- Only on auth pages (`/login`, `/signup`, `/account`)
- Bot is not rendered

### State 2: Expanded Welcome (Landing Page)
- Bot IS the landing page — mascot centered, large (72px gold circle)
- Speech bubble: "What can I sift for you today?"
- Subtitle: "Paste a URL and I'll extract the good stuff."
- Big URL input bar centered below (max-w-lg, prominent)
- "Sift It" button with gold gradient
- Subtle feature hints below: 🧹 De-clutter · 🔍 Extract · 🤖 AI Detect
- Nav bar (top-right): Sign in + theme toggle
- Branding anchored at bottom: "BitSift — Sifting bits from bytes"

### State 3: Working (Animation Sequence)
- Bot transitions from centered to overlay position
- Manages the 5-step animation sequence (see Animation Sequence section)
- Shows progress checklist: "Fetching page... Extracting content... Reflowing layout..."
- Coordinates with the snapshot iframe and clean layout renderer

### State 4: Collapsed (Post-Sift)
- Small gold circle (48-56px) anchored bottom-right
- Shows mascot face
- Subtle idle animation (gentle pulse or float)
- Click to expand chat panel
- Persists across the result page

## Animation Sequence

### Step 1: URL Ingestion
- User pastes URL, hits "Sift It"
- URL text breaks apart into characters/particles
- Characters stream into the mascot's sieve bowl and dissolve
- Both `/api/sift` and `/api/sift/snapshot` fire in parallel
- Duration: ~1.5s

### Step 2: Page Peel
- Bot grabs a corner of the landing page
- CSS 3D transform peels the landing page away like turning a page
- Underneath: the sanitized HTML snapshot loading in a full-viewport iframe
- The snapshot is served from our domain (same-origin, full DOM access)
- Duration: ~1s

### Step 3: Highlight (on snapshot iframe)
- Bot scans down the page (visual indicator)
- Content elements that Readability identified as "keeper" get gold borders + subtle gold glow
- This requires mapping Readability's extracted content back to DOM nodes in the snapshot
- Duration: ~1.5-2s, staggered top-to-bottom

### Step 4: Dissolve + Pick & Place
- Non-keeper elements (ads, nav, sidebar, footer) fade to opacity 0 and collapse
- Keeper elements lift out of their positions (subtle scale + shadow)
- They animate toward their positions in the clean Sift layout
- This is the transition from snapshot iframe to the actual SiftResult rendering
- Duration: ~2s

### Step 5: Clean Layout & Collapse
- Clean layout fully renders (the SiftResult was already ready from the parallel API call)
- Snapshot iframe is removed from DOM
- Bot slides to bottom-right corner and collapses to the gold circle
- Duration: ~0.5s

**Total animation: ~6-7 seconds**

### Timing Coordination
- The real `/api/sift` extraction is fast (Readability runs in <1s typically)
- The animation is theatrical — it plays while results are already in memory
- If results arrive before animation completes: hold and let animation finish
- If animation somehow finishes first: bot shows "Finishing up..." until results land

### Fallback Paths
If Approach B (sanitized snapshot iframe) doesn't work well for a given site:

1. **Approach C-lite (screenshot overlay):** Capture a screenshot via external service, show as static image, overlay highlight/dissolve animations on top. Less interactive but visually similar.
2. **Progressive reveal:** Skip the original page entirely. Bot narrates the extraction with a progress sequence, clean content builds up piece by piece (title appears, then image, then body text). Simplest fallback.
3. **Approach A (direct iframe):** Load the original site in a cross-origin iframe. We won't have DOM access for highlight animations, but the page peel and transition to clean layout can still work. Limited to sites that allow iframe embedding (many block it via X-Frame-Options). Documented here for potential future revisit if cross-origin restrictions loosen.

## Sanitized Snapshot System

### New Endpoint: `/api/sift/snapshot`

**Method:** POST
**Body:** `{ url: string }`
**Response:** Sanitized HTML string
**Runtime:** `"nodejs"` (same as existing sift endpoint)

**Sanitization pipeline:**
1. Fetch page (reuse existing `fetcher.ts`)
2. Parse with JSDOM
3. Strip all `<script>` tags
4. Strip all inline event handlers (`onclick`, `onerror`, etc.)
5. Resolve relative URLs to absolute (images, CSS, links)
6. Inline critical CSS or resolve `<link>` stylesheets to absolute URLs
7. Remove `<iframe>` elements (prevent nested iframe issues)
8. Return clean HTML string

**Client usage:**
```typescript
// Load snapshot in a same-origin iframe via blob URL.
// srcdoc was considered but rejected: browsers cap srcdoc at ~64KB-2MB and real
// news/recipe pages routinely exceed that. Blob URLs handle any size cleanly.
const blob = new Blob([sanitizedHtml], { type: 'text/html' });
const url = URL.createObjectURL(blob);
const iframe = document.createElement('iframe');
iframe.src = url;
// Same-origin, full DOM access. Revoke URL with URL.revokeObjectURL() on unmount.
```

### Keeper Element Mapping

The existing `/api/sift` endpoint returns extracted content HTML from Readability. To highlight the right elements in the snapshot, we need to map extracted content back to snapshot DOM nodes.

**Approach:** Return element selectors/xpaths alongside the SiftResult:
```typescript
interface SiftResult {
  // ... existing fields ...
  keeperSelectors?: string[];  // CSS selectors or xpaths of extracted elements
}
```

The extraction pipeline tags keeper elements during the Readability pass:
1. Before Readability runs, assign `data-sift-id` attributes to all block-level elements in the JSDOM document
2. Run Readability on a clone (as it does today)
3. Compare: for each element in the Readability output, find the matching `data-sift-id` in the original DOM
4. Return those IDs as `keeperSelectors: ["[data-sift-id='123']", ...]`
5. The snapshot endpoint also preserves these `data-sift-id` attributes, so the client can query them directly in the iframe DOM

## Chat Panel

### Layout
- Anchored bottom-right, slides up from the collapsed bot circle
- Width: 360-400px, max-height: 500px
- Rounded corners, subtle border, shadow/glow matching the bot's gold theme

### Structure (top to bottom)
1. **Header:** BitSift Bot mascot (small) + "BitSift Bot" label + minimize button
2. **Context bar:** "Sifting: cnn.com/article-title" — shows current page
3. **Chat history:** Scrollable message thread. Starts with: "Here's your sifted content! Ask me to adjust anything."
4. **Quick actions:** Row of pill buttons for common tasks:
   - "Just images"
   - "Extract links"
   - "Show original"
   - "Re-sift"
5. **Chat input:** Text field + send button for free-form requests
6. **Secondary action:** "Sift new URL" link (opens URL input in the panel)

### Quick Actions Behavior
| Action | What it does |
|--------|-------------|
| Just images | Filters display to only show extracted images |
| Extract links | Shows a list of all links found in the content |
| Show original | Toggles the sifted view to the snapshot iframe (entry point to Sift Edits — see below) |
| Edit | Enables tap-to-remove on sifted view + tap-to-add-back on original view |
| Re-sift | Re-runs the extraction with fresh fetch |

## LLM Chat Integration

### Endpoint: `/api/sift/chat`

**Method:** POST
**Body:**
```typescript
{
  message: string;
  siftedContent: SiftResult;
  conversationHistory: ChatMessage[];
}
```

**Response:**
```typescript
{
  reply: string;          // Human-readable bot response
  action?: string;        // "filter" | "extract" | "re-sift" | "adjust" | "edit-add" | "edit-remove" | "show-original" | "none"
  params?: Record<string, any>;  // Action-specific parameters (see Sift Edits below for edit-* shapes)
}
```

### LLM Configuration

**Provider:** Agnostic — designed with a provider interface so any model can be swapped in:
```typescript
interface SiftChatProvider {
  chat(systemPrompt: string, messages: ChatMessage[]): Promise<ChatResponse>;
}
```

Candidate models (pick during implementation based on cost/quality/speed):
- Claude Haiku (fast, cheap, good instruction following)
- GPT-4o-mini (fast, cheap)
- Local model via Ollama (self-hosted, no API costs)

**System prompt (locked tight):**
> You are BitSift Bot, a content extraction assistant. You help users work with web content that has been sifted (cleaned and extracted) from a webpage.
>
> You can ONLY help with tasks related to the currently sifted webpage:
> - Extract specific sections (e.g., "just the ingredients," "show the pricing table")
> - Filter by content type (images, links, tables, headings)
> - Adjust the display layout
> - Explain what was extracted and what was removed
> - Edit the sifted result: add removed sections back, or remove sections that the sifter kept
> - Re-sift with different parameters
>
> You CANNOT:
> - Answer general knowledge questions
> - Give opinions on the content's topic
> - Help with anything unrelated to sifting
>
> If asked something off-topic, respond: "I'm built for sifting! Ask me to extract, filter, or adjust the current page."
>
> When the user asks to add or remove a section, you will be given a manifest of available section IDs with brief labels (the "edit manifest"). Pick the matching IDs and return them in the `params.ids` array on an `edit-add` or `edit-remove` action.
>
> Respond concisely. Return a structured action when the user's request maps to one.

### Response Handling

The client interprets the LLM's structured response:
- `action: "filter"` → re-render content showing only the specified type
- `action: "extract"` → pull specific section from siftedContent and display
- `action: "re-sift"` → call `/api/sift` again with modified parameters
- `action: "adjust"` → change layout/display options
- `action: "edit-add"` → apply additions to the editSet, re-render (see Sift Edits below)
- `action: "edit-remove"` → apply removals to the editSet, re-render (see Sift Edits below)
- `action: "show-original"` → toggle the result page into snapshot view
- `action: "none"` → just display the reply text (informational response)

## Sift Edits

The sifter is good but not perfect. Sometimes Readability drops a paragraph the user wanted, or keeps a "related stories" block the user didn't. **Sift Edits** lets the user fix the result without a full re-sift, either by tapping directly on the page or by asking the chat.

### User-facing behavior

Two surfaces, one underlying state:

**1. Tap-to-edit on the sifted view**
- A small "Edit" toggle in the chat panel quick actions (or in the result page header) puts the sifted view into edit mode
- Hovering any block element (paragraph, image, list, blockquote, heading) shows a thin red dashed outline + a "Remove" tooltip
- Click → element fades out and is added to the user's edit set as a removal
- An undo pill appears bottom-center for ~5s ("Removed paragraph. Undo?")

**2. Tap-to-add-back on the original view**
- "Show original" quick action (or the chat command) toggles the result page from clean layout to the snapshot iframe
- In edit mode, the snapshot is rendered with kept elements outlined in gold (already produced by Phase B's keeperSelectors), and **non-kept elements** ghosted (50% opacity) with a thin gray dashed outline
- Hovering a ghosted element shows a "+ Add back" tooltip
- Click → element gets a gold outline (now a keeper) and is added to the edit set as an addition
- "Done editing" button toggles back to clean layout, now showing the result with the user's edits applied

**3. Chat-driven edits (same edit set)**
- "remove the byline" → LLM picks the matching `data-sift-id` from the edit manifest, returns `edit-remove` with that ID
- "put the comments section back" → LLM picks the matching ID, returns `edit-add`
- The bot replies in plain language: "Removed the byline." / "Added the comments section back."

All three surfaces mutate the same `editSet`. The clean layout is re-rendered from `keeperSelectors ∪ editSet.adds − editSet.removes` whenever the set changes.

### Edit Manifest (for the LLM)

When the user opens the chat, the client constructs an **edit manifest** from the snapshot DOM:

```typescript
interface EditManifestEntry {
  id: string;             // data-sift-id
  kept: boolean;          // is it currently in the sifted result?
  tag: string;            // p, h2, ul, img, blockquote, etc.
  label: string;          // first ~80 chars of textContent (or alt text for images)
}

interface EditManifest {
  entries: EditManifestEntry[];
}
```

The manifest is sent on each `/api/sift/chat` call as part of `siftedContent` (or as a sibling field). It gives the LLM the vocabulary it needs to map free-form requests ("remove the byline", "add the comments back") to specific `data-sift-id` values.

**Token-cost mitigation:** for long pages (1000+ block elements), the manifest is truncated to the kept elements + the first N non-kept elements with high textContent length. Full manifest is available on demand via a follow-up tool call (future).

### Edit Set State

The edit set lives in `SiftBotProvider` context:

```typescript
interface EditSet {
  adds: string[];     // data-sift-ids of non-keepers the user wants included
  removes: string[];  // data-sift-ids of keepers the user wants excluded
}
```

It's per-sift-session in v1 (resets on new URL). Future: persist to the DB as part of the bookmarks table for logged-in users so a curated sift can be saved and re-opened.

### Action Param Shapes

```typescript
// edit-add
{ action: "edit-add", params: { ids: string[] } }

// edit-remove
{ action: "edit-remove", params: { ids: string[] } }

// show-original (no params, just toggles the view)
{ action: "show-original" }
```

### Re-render Pipeline

When `editSet` changes, the result page re-renders:
1. Start from `keeperSelectors` (the original sift)
2. Subtract `editSet.removes`
3. Add `editSet.adds`, sourced from the snapshot iframe DOM by `data-sift-id`
4. Run the same cleanup pass (`cleanup.ts`) on the new HTML — handles relative URLs, picture fallbacks, etc.
5. Update `ArticleBody` content via React state

### Dependencies

This feature depends entirely on Phase B:
- The snapshot iframe (so we have the original DOM in-process and same-origin)
- The `data-sift-id` attribute scheme (so adds/removes have stable identifiers)
- The `keeperSelectors` array (so we know what was originally kept)

It can ship as part of Phase C (LLM Chat) or as a Phase B+ slice immediately after the snapshot work, since the tap-to-edit surfaces don't strictly need an LLM — they're DOM event handlers. Recommended order:
1. Phase B builds snapshot + keeperSelectors + cleanup of the snapshot loader
2. **Sift Edits Slice 1 (no LLM):** edit set state, tap-to-remove, tap-to-add-back, undo pill, re-render pipeline
3. **Sift Edits Slice 2 (with LLM):** edit manifest construction, chat-driven `edit-add`/`edit-remove`, plain-language replies

This way users get the manual editing UX shipped before the LLM piece is wired up.

## Page Structure & Routing

### Updated Routes

| Route | Content | Bot State |
|-------|---------|-----------|
| `/` | BitSift Bot centered, URL input, greeting | Expanded Welcome |
| `/sift?url=...` | Animation sequence → clean article layout | Working → Collapsed |
| `/login` | Login form (OAuth + email/password) | Hidden |
| `/signup` | Registration form | Hidden |
| `/account` | Account dashboard | Hidden |

### Root Layout Changes
- `SiftBot` component rendered in root layout (persists across navigations)
- Bot reads current route to determine its state
- Bot state managed via React context (`SiftBotProvider`)

### New Components

| Component | Purpose |
|-----------|---------|
| `SiftBot.tsx` | Main orchestrator — manages all 4 states, route-aware |
| `BotAvatar.tsx` | Mascot renderer (placeholder SVG now, swap for Nico's design later) |
| `BotGreeting.tsx` | Welcome state — mascot + speech bubble + URL input |
| `ChatPanel.tsx` | Expandable chat interface with message thread + quick actions |
| `ExtractionAnimation.tsx` | Coordinates snapshot iframe + highlight/dissolve/reflow |
| `PagePeel.tsx` | CSS 3D corner-peel transition effect |
| `SnapshotIframe.tsx` | Loads and manages the sanitized HTML snapshot |

### Modified Components

| Component | Changes |
|-----------|---------|
| `app/layout.tsx` | Add `SiftBotProvider` + `SiftBot` component |
| `app/page.tsx` | Simplify — bot handles the landing experience now |
| `app/sift/page.tsx` | Integrate with animation sequence instead of direct render |
| `landing/Logo.tsx` | Update to "BitSift" branding |
| `landing/UrlInput.tsx` | May be absorbed into `BotGreeting.tsx` or reused |

## File Map (New & Modified)

```
app/
  layout.tsx                    ← add SiftBotProvider + SiftBot
  page.tsx                      ← simplify, bot handles landing
  sift/page.tsx                 ← integrate animation sequence
  api/
    sift/
      route.ts                  ← existing, add keeperSelectors to response
      snapshot/route.ts         ← NEW: sanitized HTML snapshot endpoint
      chat/route.ts             ← NEW: LLM chat endpoint
components/
  bot/
    SiftBot.tsx                 ← NEW: main bot orchestrator
    BotAvatar.tsx               ← NEW: mascot renderer (placeholder)
    BotGreeting.tsx             ← NEW: welcome state UI
    ChatPanel.tsx               ← NEW: expandable chat interface
    ChatMessage.tsx             ← NEW: individual message bubble
    QuickActions.tsx            ← NEW: pill buttons for common actions
  animation/
    ExtractionAnimation.tsx     ← NEW: animation coordinator
    PagePeel.tsx                ← NEW: corner-peel CSS 3D effect
    SnapshotIframe.tsx          ← NEW: sanitized iframe manager
    HighlightOverlay.tsx        ← NEW: gold border + dissolve effects
    ContentReflow.tsx           ← NEW: pick & place into clean layout
lib/
  bot/
    types.ts                    ← NEW: bot state, chat message, action types, EditSet, EditManifest
    context.ts                  ← NEW: SiftBotProvider React context (now also holds editSet)
    chat-provider.ts            ← NEW: LLM provider interface
    edit-state.ts               ← NEW (Phase C): editSet reducer, manifest builder, re-render helpers
  parser/
    snapshot.ts                 ← NEW: HTML sanitization pipeline
    keeper-mapper.ts            ← NEW: map Readability output to DOM selectors
components/
  edit/
    EditModeToggle.tsx          ← NEW (Phase C): toggle button for tap-to-edit surfaces
    RemoveOverlay.tsx           ← NEW (Phase C): hover/click handlers on sifted view
    AddBackOverlay.tsx          ← NEW (Phase C): hover/click handlers on snapshot view
    UndoPill.tsx                ← NEW (Phase C): bottom-center undo for last edit
```

## Technical Considerations

### Animation Performance
- Use CSS transforms and opacity for all animations (GPU-accelerated)
- `will-change` on animated elements
- `requestAnimationFrame` for coordinated multi-element sequences
- Keep DOM manipulation minimal during animation — batch reads/writes

### Snapshot Iframe Security
- All scripts stripped server-side (no JS execution in snapshot)
- No form elements or interactive elements needed
- `sandbox` attribute on iframe as additional protection
- Remove iframe from DOM after animation completes

### LLM Guardrails
- System prompt is hardcoded, not user-modifiable
- Max token limit on responses (keep it concise)
- Input sanitization — strip anything that looks like prompt injection
- Rate limiting on `/api/sift/chat` endpoint
- The LLM only receives the already-extracted SiftResult, never raw HTML

### Mobile Considerations
- Bot greeting scales down but stays centered on mobile
- Chat panel goes full-width on screens < 640px
- Animation sequence simplified on mobile (skip page peel, use progressive reveal)
- Collapsed bot circle stays in bottom-right corner

## Implementation Phases

This rebrand is a large change. Recommended build order:

### Phase A: Branding + Bot Shell
- Rename everything to BitSift
- Build `SiftBot` component with 4 states (no animation yet)
- Build `BotGreeting` landing page
- Build `ChatPanel` UI (no LLM yet, just UI shell)
- Collapsed bot circle on result page

### Phase B: Snapshot + Animation
- Build `/api/sift/snapshot` endpoint
- Build `SnapshotIframe` component
- Build extraction animation sequence (highlight, dissolve, reflow)
- Build `PagePeel` transition
- URL ingestion animation

### Phase C: LLM Chat + Sift Edits
- Build `/api/sift/chat` endpoint
- Integrate LLM provider
- Wire chat panel to endpoint
- Quick actions → structured commands
- Guardrails and rate limiting
- **Sift Edits Slice 1 (no LLM):** edit set state, tap-to-remove on sifted view, tap-to-add-back on original view, undo pill, edit-aware re-render pipeline
- **Sift Edits Slice 2 (with LLM):** edit manifest construction, `edit-add`/`edit-remove`/`show-original` action handling, plain-language replies

### Phase D: Polish
- Swap in Nico's mascot design
- Idle animations on collapsed bot
- Mobile optimizations
- Animation fallback paths
- Performance tuning
