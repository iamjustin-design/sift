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
