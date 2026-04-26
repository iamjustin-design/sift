import { NextRequest, NextResponse } from "next/server";
import { siftUrl } from "@/lib/parser/extractor";
import { SiftError } from "@/lib/parser/types";

export const runtime = "nodejs";

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

    const result = await siftUrl(url);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : "";
    const statusMap: Record<string, number> = {
      INVALID_URL: 400,
      FETCH_FAILED: 502,
      PARSE_FAILED: 422,
      TIMEOUT: 504,
    };
    return NextResponse.json(
      { error: message, code: message, stack } as SiftError & { stack?: string },
      { status: statusMap[message] || 500 }
    );
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
    const result = await siftUrl(url);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : "";
    const statusMap: Record<string, number> = {
      INVALID_URL: 400,
      FETCH_FAILED: 502,
      PARSE_FAILED: 422,
      TIMEOUT: 504,
    };
    return NextResponse.json(
      { error: message, code: message, stack } as SiftError & { stack?: string },
      { status: statusMap[message] || 500 }
    );
  }
}
