import { createFileRoute } from "@tanstack/react-router";

import { loadLawDirectory } from "@/lib/law-directory";

export const Route = createFileRoute("/sitemap.xml" as never)({
  server: {
    handlers: {
      GET: async () => {
        const { laws } = loadLawDirectory();
        const now = new Date().toISOString();
        const urls = [
          "<url><loc>https://gesetz.sh</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>",
          ...laws.map(
            (law) =>
              `<url><loc>https://gesetz.sh/${law.code}/1</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`,
          ),
        ].join("");

        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
          {
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
            },
          },
        );
      },
    },
  },
});
