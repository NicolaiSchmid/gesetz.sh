import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt" as never)({
  server: {
    handlers: {
      GET: async () =>
        new Response("User-agent: *\nAllow: /\nSitemap: https://gesetz.sh/sitemap.xml\n", {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        }),
    },
  },
});
