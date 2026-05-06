import { parseHTML } from "linkedom";

export interface EditManifestEntry {
  id: string;
  tag: string;
  label: string;
}

const MAX_LABEL_LEN = 80;
const MAX_ENTRIES = 50;

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function elementLabel(el: Element): string {
  const tag = el.tagName;
  if (tag === "IMG") {
    const alt = el.getAttribute("alt") || "";
    if (alt) return `[image] ${truncate(alt, MAX_LABEL_LEN - 8)}`;
    const src = el.getAttribute("src") || "";
    return src ? `[image] ${truncate(src, MAX_LABEL_LEN - 8)}` : "[image]";
  }
  if (tag === "FIGURE") {
    const cap = el.querySelector("figcaption")?.textContent || "";
    if (cap) return `[figure] ${truncate(cap, MAX_LABEL_LEN - 9)}`;
    const innerImg = el.querySelector("img");
    const alt = innerImg?.getAttribute("alt") || "";
    return alt ? `[figure] ${truncate(alt, MAX_LABEL_LEN - 9)}` : "[figure]";
  }
  if (tag === "VIDEO") return "[video]";
  if (tag === "AUDIO") return "[audio]";
  if (tag === "HR") return "[divider]";
  return truncate(el.textContent || "", MAX_LABEL_LEN);
}

export function buildEditManifest(html: string): EditManifestEntry[] {
  if (!html) return [];
  const { document } = parseHTML(`<div>${html}</div>`);
  const tagged = Array.from(document.querySelectorAll("[data-sift-id]"));
  const entries: EditManifestEntry[] = [];
  for (const el of tagged) {
    const id = el.getAttribute("data-sift-id");
    if (!id) continue;
    entries.push({
      id,
      tag: el.tagName.toLowerCase(),
      label: elementLabel(el),
    });
    if (entries.length >= MAX_ENTRIES) break;
  }
  return entries;
}
