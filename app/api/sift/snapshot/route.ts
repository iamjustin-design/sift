import { NextRequest, NextResponse } from "next/server";
import { fetchUrl } from "@/lib/parser/fetcher";
import { tagBlockElements } from "@/lib/parser/sift-tagger";
import { sanitizeSnapshot } from "@/lib/parser/snapshot";
import { SiftError } from "@/lib/parser/types";

export const runtime = "nodejs";

interface SnapshotResponse {
  html: string;
  baseUrl: string;
  fetchTimeMs: number;
}

async function handleSnapshot(url: string): Promise<SnapshotResponse> {
  const fetched = await fetchUrl(url);
  const tagged = tagBlockElements(fetched.html);
  const sanitized = sanitizeSnapshot(tagged, fetched.url);
  return {
    html: sanitized,
    baseUrl: fetched.url,
    fetchTimeMs: fetched.fetchTimeMs,
  };
}

const STATUS_MAP: Record<string, number> = {
  INVALID_URL: 400,
  FETCH_FAILED: 502,
  PARSE_FAILED: 422,
  TIMEOUT: 504,
};

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json(
    { error: message, code: message } as SiftError,
    { status: STATUS_MAP[message] || 500 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body.url;
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required", code: "INVALID_URL" } as SiftError,
        { status: 400 }
      );
    }
    const result = await handleSnapshot(url);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required", code: "INVALID_URL" } as SiftError,
      { status: 400 }
    );
  }
  try {
    const result = await handleSnapshot(url);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
