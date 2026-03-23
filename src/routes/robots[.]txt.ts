import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt" as never)({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;

        return new Response(
          `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
          {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control":
              "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
          },
          },
        );
      },
    },
  },
});
