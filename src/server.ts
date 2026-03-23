import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import {
  SOURCE_CDN_CACHE_CONTROL,
  SOURCE_REVALIDATE_SECONDS,
} from "@/lib/source-cache";
import { buildUrlSetXml, getSitemapChunks } from "@/lib/sitemap";
import {
  fetchParagraphRecord,
  paragraphRecordToMarkdown,
} from "@/lib/gesetze/paragraph-source";

const lawPathPattern = /^\/([^/]+)\/([^/]+)$/;
const sitemapChunkPattern = /^\/sitemaps\/(\d+)\.xml$/;
const SITEMAP_CACHE_CONTROL =
  "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400";

function requestWantsMarkdown(request: Request) {
  const acceptHeader = request.headers.get("accept") ?? "";

  return (
    acceptHeader.includes("text/markdown") ||
    acceptHeader.includes("text/x-markdown")
  );
}

async function handleMarkdownCompatibility(request: Request) {
  const url = new URL(request.url);
  const match = lawPathPattern.exec(url.pathname);

  if (!match) {
    return null;
  }

  const [, law, paragraph] = match;
  if (!law || !paragraph) {
    return null;
  }

  const data = await fetchParagraphRecord(law, paragraph, {
    revalidateSeconds: SOURCE_REVALIDATE_SECONDS,
  });

  if (!data) {
    return new Response(
      `# Not Found\n\n${law.toUpperCase()} § ${paragraph} could not be loaded.`,
      {
        status: 404,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Cache-Control": SOURCE_CDN_CACHE_CONTROL,
          "CDN-Cache-Control": SOURCE_CDN_CACHE_CONTROL,
          Vary: "Accept",
        },
      },
    );
  }

  return new Response(paragraphRecordToMarkdown(data), {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": SOURCE_CDN_CACHE_CONTROL,
      "CDN-Cache-Control": SOURCE_CDN_CACHE_CONTROL,
      Vary: "Accept",
    },
  });
}

async function handleSitemapChunk(request: Request) {
  const url = new URL(request.url);
  const match = sitemapChunkPattern.exec(url.pathname);
  if (!match?.[1]) {
    return null;
  }

  const sitemapId = Number.parseInt(match[1], 10);
  if (Number.isNaN(sitemapId) || sitemapId < 0) {
    return new Response("Not Found", { status: 404 });
  }

  const chunks = await getSitemapChunks();
  const chunk = chunks[sitemapId];
  if (!chunk) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(buildUrlSetXml(chunk), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": SITEMAP_CACHE_CONTROL,
      "CDN-Cache-Control": SITEMAP_CACHE_CONTROL,
    },
  });
}

export default createServerEntry({
  async fetch(request, requestOptions) {
    if (request.method === "GET") {
      const sitemapResponse = await handleSitemapChunk(request);
      if (sitemapResponse) {
        return sitemapResponse;
      }
    }

    if (request.method === "GET" && requestWantsMarkdown(request)) {
      const markdownResponse = await handleMarkdownCompatibility(request);
      if (markdownResponse) {
        return markdownResponse;
      }
    }

    return await handler.fetch(request, requestOptions);
  },
});
