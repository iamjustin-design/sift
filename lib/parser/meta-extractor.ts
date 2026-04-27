import { ArticleMeta } from "./types";

export function extractMeta(doc: Document, url: string): ArticleMeta {
  const getMeta = (name: string): string => {
    const el =
      doc.querySelector(`meta[property="${name}"]`) ||
      doc.querySelector(`meta[name="${name}"]`);
    return el?.getAttribute("content")?.trim() || "";
  };

  const canonical =
    doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || url;

  let siteName = getMeta("og:site_name");
  if (!siteName) {
    try {
      siteName = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      siteName = "";
    }
  }

  return {
    title: doc.querySelector("title")?.textContent?.trim() || getMeta("og:title") || "",
    description: getMeta("og:description") || getMeta("description"),
    author: getMeta("author") || getMeta("article:author"),
    publishedDate: getMeta("article:published_time") || getMeta("date") || "",
    siteName,
    canonicalUrl: canonical,
    ogImage: getMeta("og:image"),
    ogType: getMeta("og:type"),
  };
}
