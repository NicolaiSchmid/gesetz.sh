import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isPrerenderedRoute } from "@/lib/gesetze/prerender-routes";

const CLAUDE_BOT_PATTERN = /(claudebot|anthropic-ai)/i;

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  const isClaudeBot = CLAUDE_BOT_PATTERN.test(userAgent);
  const acceptHeader = request.headers.get("accept") ?? "";

  if (isClaudeBot) {
    const routeMatch = /^\/([^/]+)\/([^/]+)$/.exec(request.nextUrl.pathname);
    const law = routeMatch?.[1]?.toLowerCase() ?? "";
    const paragraph = routeMatch?.[2]?.toLowerCase() ?? "";

    if (law && paragraph && !isPrerenderedRoute(law, paragraph)) {
      return new NextResponse("Not prerendered for crawler access.", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex",
        },
      });
    }
  }

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
