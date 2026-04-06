export interface ArticleMeta {
  title: string;
  description: string;
  author: string;
  publishedDate: string;
  siteName: string;
  canonicalUrl: string;
  ogImage: string;
  ogType: string;
}

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

export interface SiftError {
  error: string;
  code: "FETCH_FAILED" | "PARSE_FAILED" | "INVALID_URL" | "TIMEOUT";
}
