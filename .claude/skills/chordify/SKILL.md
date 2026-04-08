---
name: chordify
description: Project spec and build context for Chordify — a tool that ingests an MP3 of a song, detects chord changes via audio analysis, pulls matching lyrics, and renders chords above the correct words (Ultimate Guitar style) along with hand-placement thumbnails. Use this skill when the user wants to design, scaffold, or implement any part of the Chordify project.
---

# Chordify — v1 Spec

> Status: **v1 draft** — intentionally incomplete. Expect this to expand. Do NOT over-engineer past what's written here without confirming with the user.

## One-liner

Upload an MP3, get back a clean, readable chord sheet: chords placed above the correct lyric words, with small hand-placement diagrams above each chord.

## Core user flow (v1)

1. User uploads an MP3 of a song.
2. Backend analyzes the audio and detects **every chord change** with timestamps.
3. Backend obtains the song's lyrics (scraped / fetched from an existing lyrics source).
4. Backend aligns chord-change timestamps to lyric words (force-align audio ↔ lyrics).
5. Frontend renders an Ultimate Guitar–style chord sheet:
   - Chord symbol placed directly **above the lyric word** where that chord starts.
   - Monospace-style layout preserved so columns align.
6. Above each chord symbol, show a **hand-placement thumbnail** (chord diagram).
   - When adjacent chords are too close horizontally for their thumbnails to fit, use **leader lines** pointing from each thumbnail down to its chord.

Reference for visual target: <https://www.ultimate-guitar.com> (chords-over-lyrics layout).

## Feature breakdown

### 1. Audio → chords

- Input: MP3 file (also consider: WAV, M4A later; v1 = MP3).
- Output: ordered list of `{ startTime, endTime, chord }` events.
- Needs a chord-recognition model / library. Candidates to investigate when building:
  - `chord-extractor` (Python, wraps Chordino/Sonic Annotator/Vamp plugins).
  - `librosa` + custom chroma → chord template matching.
  - `madmom` (deep-learning chord recognition).
  - Hosted APIs (only if local is too heavy for the deploy target).
- Open question: run analysis server-side (Node? Python worker?) or in-browser (WebAssembly)?
  - Decision deferred. Likely server-side Python worker for v1 due to library maturity.

### 2. Lyrics retrieval

- Input: song metadata (ideally derived from MP3 ID3 tags; fallback: user-entered title/artist).
- Output: raw lyrics text, line-broken.
- Strategy: scrape or pull from an existing lyrics source. Open question: which source is license-safe enough for v1?
  - Candidates to vet: Genius API, Musixmatch API, LRCLIB (timestamped, open), LyricsOVH.
  - **LRCLIB is particularly interesting** because it returns LRC-format synced lyrics (line-level timestamps) — could short-circuit some of the alignment work.
- Edge cases to handle later (NOT v1): instrumentals, remixes, covers, mismatched lyric versions.

### 3. Chord ↔ lyric alignment

- Goal: each chord change lands above the correct word.
- If we have synced lyrics (LRC) we already have line-level timing; we then only need to map within-line word timing.
- If we have plain lyrics, we need forced alignment. Candidates:
  - `whisper` + word-level timestamps (run on the same MP3, compare against scraped lyrics).
  - Aeneas, Montreal Forced Aligner.
- Output: enriched lyric structure, e.g.
  ```ts
  type AlignedLine = {
    words: Array<{
      text: string;
      startTime: number;
      endTime: number;
      chordAbove?: string; // chord symbol if a chord change falls on this word
    }>;
  };
  ```

### 4. Chord sheet rendering (frontend)

- Ultimate Guitar–style layout: chords on their own "row" above each lyric line, aligned horizontally to the word where the chord starts.
- Must tolerate chord changes that fall between words (attach to the next upcoming word, or insert a non-breaking spacer).
- Must handle very long chord names (`C#m7b5`) without breaking alignment — monospace font or CSS grid per character.

### 5. Hand-placement thumbnails

- Above each chord symbol, show a small chord diagram (fingering).
- Source strategy: download a fixed library of chord diagram images once (finite set — basic chords, barre chords, common extensions) and serve them locally.
  - Candidates for source images / data: the `react-chords` project, VexChords, or programmatically render from a chord-fingering dataset (e.g. `chord-fingering` on npm, or JGuitar data).
  - Preference: render programmatically from a fingering dataset so we can style them and avoid image licensing issues. Fall back to pre-downloaded images only if rendering is too heavy.
- Collision handling: when two adjacent chords are so close horizontally that their thumbnails would overlap, stagger the thumbnails vertically and draw **leader lines** (thin lines / small arrows) from each thumbnail down to its chord symbol.

## Explicit non-goals for v1

- No audio playback / karaoke-style scroll.
- No transposition / capo controls.
- No editing of detected chords by the user.
- No accounts, saving, or history.
- No mobile-specific layout work beyond "it doesn't break".
- No multi-instrument tabs (just chord names).
- No chord-diagram customization (left-handed, alt tunings).

## Known open questions (flag these when we resume)

1. Deploy target for the audio-analysis worker? (Cloudflare Workers can't run heavy native libs — likely need a separate Python service or a serverless container.)
2. Which lyrics source for v1, and its legal / ToS implications?
3. Is LRCLIB enough to skip forced alignment for v1?
4. Render chord diagrams from data vs. ship a pre-made image set?
5. Is Chordify a standalone app/repo, or does it live alongside Sift?

## Starting-point suggestions (only when user asks to build)

Minimal v1 architecture to discuss before coding:

```
[ Browser ]
   | upload MP3 + (optional) title/artist
   v
[ Next.js API route / Node backend ]
   |-- ID3 tag read  -------> title, artist
   |-- POST audio to --------> [ Python chord worker ]  -> chord events JSON
   |-- fetch lyrics  --------> [ LRCLIB (or chosen source) ] -> lyrics (+ timings if LRC)
   |-- align (if needed) ---> [ aligner ] -> word-level timings
   |-- merge ----------------> AlignedLine[] + chord-per-word
   v
[ Chord sheet renderer ] — React, monospace/grid layout, chord-diagram components
```

## When this skill is invoked

1. Re-read this spec in full. Do NOT assume anything beyond what's written.
2. Confirm with the user which section they want to work on (audio analysis, lyrics, alignment, rendering, diagrams, or repo scaffolding).
3. Treat every "Open question" as a real question — ask the user, don't decide silently.
4. If the user asks to expand the spec, update this file in place and keep the same structure.
