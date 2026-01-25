interface Env {
  API_KEY: string;
  ALLOWED_ORIGIN: string;
}

const UPSTREAM_BASE = "https://www.gesetze-im-internet.de";

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const isAllowedOrigin =
      origin === env.ALLOWED_ORIGIN ||
      origin.endsWith(".vercel.app") ||
      origin === "http://localhost:3000";

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(isAllowedOrigin ? origin : env.ALLOWED_ORIGIN),
      });
    }

    // Only allow GET requests
    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate API key
    const apiKey = request.headers.get("X-API-Key");
    if (!apiKey || apiKey !== env.API_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract path from URL
    const url = new URL(request.url);
    const path = url.pathname.slice(1); // Remove leading slash

    if (!path) {
      return new Response(JSON.stringify({ error: "Missing path" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate path format to prevent abuse (only allow law paths)
    const pathPattern = /^[a-z0-9_-]+\/__[a-z0-9_-]+\.html$/i;
    if (!pathPattern.test(path)) {
      return new Response(JSON.stringify({ error: "Invalid path format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const targetUrl = `${UPSTREAM_BASE}/${path}`;
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
        },
      });

      const html = await response.text();

      return new Response(html, {
        status: response.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
          ...corsHeaders(isAllowedOrigin ? origin : env.ALLOWED_ORIGIN),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return new Response(
        JSON.stringify({ error: "Upstream fetch failed", details: message }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(isAllowedOrigin ? origin : env.ALLOWED_ORIGIN),
          },
        },
      );
    }
  },
};
