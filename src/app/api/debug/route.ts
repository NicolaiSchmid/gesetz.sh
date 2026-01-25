import { NextResponse } from "next/server";

const TEST_URL = "https://www.gesetze-im-internet.de/hgb/__1.html";

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    testUrl: TEST_URL,
  };

  // Test 1: Basic fetch with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const start = Date.now();
    const response = await fetch(TEST_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
        "Accept-Language": "de-DE,de;q=0.9",
      },
      cache: "no-store",
    });
    clearTimeout(timeout);

    results.fetchDuration = Date.now() - start;
    results.status = response.status;
    results.statusText = response.statusText;
    results.headers = Object.fromEntries(response.headers.entries());

    const text = await response.text();
    results.bodyLength = text.length;
    results.bodyPreview = text.slice(0, 500);
    results.success = true;
  } catch (error) {
    clearTimeout(timeout);
    results.success = false;
    results.error =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            cause: error.cause
              ? JSON.stringify(
                  error.cause,
                  Object.getOwnPropertyNames(error.cause),
                )
              : undefined,
          }
        : String(error);
  }

  // Add environment info
  results.env = {
    nodeVersion: process.version,
    vercelRegion: process.env.VERCEL_REGION ?? "unknown",
    vercelEnv: process.env.VERCEL_ENV ?? "unknown",
  };

  return NextResponse.json(results, { status: 200 });
}
