import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const acceptHeader = request.headers.get("accept") ?? "";

  // Check if client accepts markdown
  const wantsMarkdown =
    acceptHeader.includes("text/markdown") ||
    acceptHeader.includes("text/x-markdown");

  if (!wantsMarkdown) {
    return NextResponse.next();
  }

  // Rewrite to API route for markdown response
  const url = request.nextUrl.clone();
  url.pathname = `/api${url.pathname}`;

  return NextResponse.rewrite(url);
}

// Only run middleware on law/paragraph routes (not on /api, /_next, etc.)
export const config = {
  matcher: "/:law/:paragraph",
};
