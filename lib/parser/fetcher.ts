export interface FetchResult {
  html: string;
  url: string;
  contentType: string;
  fetchTimeMs: number;
}

export async function fetchUrl(url: string): Promise<FetchResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("INVALID_URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("INVALID_URL");
  }

  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Sift/1.0 (+https://sift.app) Mozilla/5.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("FETCH_FAILED");
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error("FETCH_FAILED");
    }

    const html = await response.text();
    return { html, url: response.url, contentType, fetchTimeMs: Date.now() - start };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") throw new Error("TIMEOUT");
    if (err instanceof Error && ["INVALID_URL", "FETCH_FAILED", "TIMEOUT"].includes(err.message)) throw err;
    throw new Error("FETCH_FAILED");
  } finally {
    clearTimeout(timeout);
  }
}
