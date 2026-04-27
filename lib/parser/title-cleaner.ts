const CLICKBAIT_PATTERNS: RegExp[] = [
  /^You Need To (?:Make|Try|Know|See|Read|Add|Have|Eat|Cook|Bake|Buy)\s+/i,
  /^Why You Should (?:Make|Try|Read|Watch|Avoid|Eat|Cook|Bake)\s+/i,
  /^Here's (?:How|Why)(?:\s+To)?\s+/i,
  /^I (?:Tried|Made|Tested|Baked|Cooked)\s+/i,
  /^We (?:Tried|Made|Tested|Baked|Cooked)\s+/i,
  /^Have You (?:Tried|Made|Seen|Eaten)\s+/i,
  /^This Is (?:The|My) (?:Best|Easiest|Perfect|Ultimate|Favorite)\s+/i,
  /^The (?:Absolute|Single)?\s*(?:Best|Easiest|Perfect|Ultimate) Way To\s+/i,
  /^How To Make (?:The )?(?:Best|Easiest|Perfect|Ultimate)\s+/i,
];

// Two or more capitalized words ending in 's — covers "Dorie Greenspan's",
// "Mary Berry's", "Ina Garten's". Single-word possessives like "Reese's" or
// "Grandma's" stay (they're often product names or generic kin-references).
const POSSESSIVE_PATTERN = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)'s\s+/;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function cleanTitle(title: string, siteName: string, isRecipePage: boolean): string {
  if (!title) return "";
  let cleaned = title.trim();

  // Strip trailing site-name suffix: " - Site Name", " | Site Name", " — Site Name", " : Site Name"
  if (siteName) {
    const escaped = escapeRegex(siteName);
    cleaned = cleaned.replace(new RegExp(`\\s*[-|:—–]\\s*${escaped}\\s*$`, "i"), "").trim();
  }

  // Strip trailing " Recipe" (with or without trailing parenthetical) on recipe pages.
  // Preserve parentheticals: "X Recipe (New York Style)" → "X (New York Style)"
  if (isRecipePage) {
    cleaned = cleaned.replace(/\s+Recipe(?=\s*[(]|\s*$)/i, "").trim();
  }

  // Try clickbait + possessive stripping. Revert if the result is too short
  // (under 2 words = lost too much information).
  let stripped = cleaned;
  for (const pattern of CLICKBAIT_PATTERNS) {
    stripped = stripped.replace(pattern, "");
  }
  stripped = stripped.replace(POSSESSIVE_PATTERN, "");
  stripped = stripped.trim();

  if (wordCount(stripped) >= 2) {
    cleaned = stripped;
  }

  return cleaned.trim();
}

// Pick the most informative title from a list of cleaned candidates.
// Strategy: find the canonical "core" words (from the shortest candidate),
// keep candidates that contain all of them, prefer non-parenthetical, then
// prefer the highest word count (most descriptive).
export function pickBestTitle(candidates: string[]): string {
  const valid = candidates.map((c) => (c || "").trim()).filter(Boolean);
  if (!valid.length) return "";
  if (valid.length === 1) return valid[0];

  const normalize = (s: string): string[] =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const shortest = valid.reduce((a, b) => (a.length <= b.length ? a : b));
  const canonical = normalize(shortest);

  if (!canonical.length) return shortest;

  const matching = valid.filter((c) => {
    const words = new Set(normalize(c));
    return canonical.every((w) => words.has(w));
  });

  if (!matching.length) return shortest;

  const noParens = matching.filter((c) => !/[()[\]]/.test(c));
  const pool = noParens.length ? noParens : matching;

  return pool.reduce((best, c) => {
    const bestWords = wordCount(best);
    const cWords = wordCount(c);
    if (cWords > bestWords) return c;
    if (cWords === bestWords && c.length < best.length) return c;
    return best;
  });
}
