import { parseHTML } from "linkedom";

const TRANSPARENT_GIF_PREFIX = "data:image/gif;base64,R0lGOD";

function resolveUrl(value: string, baseUrl: string): string {
  if (!value) return value;
  if (value.startsWith("data:") || value.startsWith("blob:") || value.startsWith("javascript:")) return value;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function resolveSrcset(value: string, baseUrl: string): string {
  return value
    .split(",")
    .map((entry) => {
      const trimmed = entry.trim();
      if (!trimmed) return "";
      const match = trimmed.match(/^(\S+)(\s+.*)?$/);
      if (!match) return trimmed;
      const url = resolveUrl(match[1], baseUrl);
      return match[2] ? `${url}${match[2]}` : url;
    })
    .filter(Boolean)
    .join(", ");
}

function pickLargestFromSrcset(srcset: string): string {
  let bestUrl = "";
  let bestWidth = -1;
  for (const entry of srcset.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\S+)(?:\s+(\d+(?:\.\d+)?)([wx]))?/);
    if (!match) continue;
    const url = match[1];
    const num = match[2] ? parseFloat(match[2]) : 1;
    const unit = match[3] || "x";
    const width = unit === "w" ? num : num * 1000;
    if (width > bestWidth) {
      bestWidth = width;
      bestUrl = url;
    }
  }
  return bestUrl;
}

export function cleanupContent(html: string, baseUrl: string, title: string): string {
  if (!html) return html;

  const { document } = parseHTML(`<!DOCTYPE html><html><body>${html}</body></html>`);
  const body = document.body;

  // 1. Replace <picture> with a single <img> using the largest srcset source.
  const pictures = Array.from(body.querySelectorAll("picture"));
  for (const picture of pictures) {
    const sources = Array.from(picture.querySelectorAll("source"));
    let bestUrl = "";
    for (const src of sources) {
      const srcset = src.getAttribute("srcset") || "";
      const candidate = pickLargestFromSrcset(srcset);
      if (candidate) {
        bestUrl = candidate;
        break;
      }
    }
    if (!bestUrl) {
      const innerImg = picture.querySelector("img");
      const innerSrc = innerImg?.getAttribute("src") || "";
      if (innerSrc && !innerSrc.startsWith(TRANSPARENT_GIF_PREFIX)) {
        bestUrl = innerSrc;
      }
    }
    if (bestUrl) {
      const innerImg = picture.querySelector("img");
      const alt = innerImg?.getAttribute("alt") || "";
      const replacement = document.createElement("img");
      replacement.setAttribute("src", resolveUrl(bestUrl, baseUrl));
      if (alt) replacement.setAttribute("alt", alt);
      picture.replaceWith(replacement);
    } else {
      picture.remove();
    }
  }

  // 2. Resolve relative URLs on remaining elements + drop placeholder images.
  for (const el of Array.from(body.querySelectorAll("a[href]"))) {
    const href = el.getAttribute("href") || "";
    el.setAttribute("href", resolveUrl(href, baseUrl));
  }
  for (const el of Array.from(body.querySelectorAll("img"))) {
    const src = el.getAttribute("src") || "";
    if (src.startsWith(TRANSPARENT_GIF_PREFIX)) {
      const srcset = el.getAttribute("srcset") || "";
      const candidate = pickLargestFromSrcset(srcset);
      if (candidate) {
        el.setAttribute("src", resolveUrl(candidate, baseUrl));
      } else {
        el.remove();
        continue;
      }
    } else if (src) {
      el.setAttribute("src", resolveUrl(src, baseUrl));
    }
    const srcset = el.getAttribute("srcset");
    if (srcset) el.setAttribute("srcset", resolveSrcset(srcset, baseUrl));
  }
  for (const el of Array.from(body.querySelectorAll("source[srcset]"))) {
    const srcset = el.getAttribute("srcset") || "";
    el.setAttribute("srcset", resolveSrcset(srcset, baseUrl));
  }

  // 3. Strip a leading paragraph whose text matches the article title (duplicate H1).
  const normalized = title.trim().toLowerCase();
  if (normalized) {
    const wrapper =
      body.querySelector("#readability-page-1 [role='main']") ||
      body.querySelector("#readability-page-1") ||
      body;
    const firstBlock = wrapper.firstElementChild;
    if (firstBlock) {
      const textTitle = (firstBlock.textContent || "").trim().toLowerCase();
      if (textTitle && textTitle === normalized && (firstBlock.tagName === "P" || firstBlock.tagName === "H1")) {
        firstBlock.remove();
      }
    }
  }

  // 4. Unwrap empty wrapper divs (no meaningful text, no useful attributes).
  let mutated = true;
  let safety = 0;
  while (mutated && safety++ < 10) {
    mutated = false;
    const divs = Array.from(body.querySelectorAll("div"));
    for (const div of divs) {
      if (div.id === "readability-page-1") continue;
      const hasText = (div.textContent || "").trim().length > 0;
      const hasMedia = div.querySelector("img,video,iframe,picture,figure");
      if (hasText || hasMedia) continue;
      div.remove();
      mutated = true;
    }
  }

  return body.innerHTML;
}
