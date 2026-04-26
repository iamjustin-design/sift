import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { extractMeta } from "./meta-extractor";
import { fetchUrl } from "./fetcher";
import { SiftResult } from "./types";

export async function siftUrl(url: string): Promise<SiftResult> {
  const fetched = await fetchUrl(url);

  const { document: doc } = parseHTML(fetched.html);

  // Extract meta before Readability mutates the DOM
  const meta = extractMeta(doc as unknown as Document, fetched.url);

  // Clone for Readability (it modifies the DOM)
  const { document: readerDoc } = parseHTML(fetched.html);
  const reader = new Readability(readerDoc as unknown as Document);
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
