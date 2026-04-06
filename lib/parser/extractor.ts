import { extractMeta } from "./meta-extractor";
import { fetchUrl } from "./fetcher";
import { SiftResult } from "./types";

export async function siftUrl(url: string): Promise<SiftResult> {
  const fetched = await fetchUrl(url);

  // Dynamic imports required: jsdom transitively depends on an ESM-only module
  // (@asamuzakjp/css-color) that uses top-level await, which CJS bundlers can't
  // statically require. Dynamic import() lets Node load it as ESM at runtime.
  const { JSDOM } = await import("jsdom");
  const { Readability } = await import("@mozilla/readability");

  const dom = new JSDOM(fetched.html, { url: fetched.url });
  const doc = dom.window.document;

  // Extract meta before Readability mutates the DOM
  const meta = extractMeta(doc, fetched.url);

  // Clone doc for Readability (it modifies the DOM)
  const readerDom = new JSDOM(fetched.html, { url: fetched.url });
  const reader = new Readability(readerDom.window.document);
  const article = reader.parse();

  if (!article) {
    throw new Error("PARSE_FAILED");
  }

  // Use Readability values where they're better than meta
  if (!meta.title && article.title) meta.title = article.title;
  if (!meta.author && article.byline) meta.author = article.byline;
  if (!meta.description && article.excerpt) meta.description = article.excerpt;
  if (article.siteName) meta.siteName = article.siteName;

  let sourceDomain = "";
  try {
    sourceDomain = new URL(fetched.url).hostname.replace(/^www\./, "");
  } catch {
    sourceDomain = "";
  }

  const wordCount = article.textContent
    ? article.textContent.split(/\s+/).filter((w) => w.length > 0).length
    : 0;

  return {
    meta,
    content: article.content ?? "",
    textContent: article.textContent ?? "",
    excerpt: article.excerpt || meta.description,
    wordCount,
    sourceUrl: fetched.url,
    sourceDomain,
    siftedAt: new Date().toISOString(),
    fetchTimeMs: fetched.fetchTimeMs,
  };
}
