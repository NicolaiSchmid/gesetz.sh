import { createFileRoute } from "@tanstack/react-router";

import { buildSitemapIndexXml, getSitemapChunks } from "@/lib/sitemap";

const SITEMAP_CACHE_CONTROL =
  "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400";

export const Route = createFileRoute("/sitemap.xml" as never)({
  server: {
    handlers: {
      GET: async () => {
        const chunks = await getSitemapChunks();

        return new Response(buildSitemapIndexXml(chunks.length), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": SITEMAP_CACHE_CONTROL,
            "CDN-Cache-Control": SITEMAP_CACHE_CONTROL,
          },
        });
      },
    },
  },
});
