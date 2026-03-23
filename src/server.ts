import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import {
  SOURCE_CDN_CACHE_CONTROL,
  SOURCE_REVALIDATE_SECONDS,
} from "@/lib/source-cache";
import {
  fetchParagraphRecord,
  paragraphRecordToMarkdown,
} from "@/lib/gesetze/paragraph-source";

const lawPathPattern = /^\/([^/]+)\/([^/]+)$/;

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
          "Vercel-CDN-Cache-Control": SOURCE_CDN_CACHE_CONTROL,
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
      "Vercel-CDN-Cache-Control": SOURCE_CDN_CACHE_CONTROL,
    },
  });
}

export default createServerEntry({
  async fetch(request, requestOptions) {
    if (request.method === "GET" && requestWantsMarkdown(request)) {
      const markdownResponse = await handleMarkdownCompatibility(request);
      if (markdownResponse) {
        return markdownResponse;
      }
    }

    return await handler.fetch(request, requestOptions);
  },
});
