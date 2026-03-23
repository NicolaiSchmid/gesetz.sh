import { createFileRoute } from "@tanstack/react-router";

import {
  SOURCE_CDN_CACHE_CONTROL,
  SOURCE_REVALIDATE_SECONDS,
} from "@/lib/source-cache";
import {
  fetchParagraphRecord,
  paragraphRecordToMarkdown,
} from "@/lib/gesetze/paragraph-source";

export const Route = createFileRoute("/api/$law/$paragraph")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const data = await fetchParagraphRecord(params.law, params.paragraph, {
          revalidateSeconds: SOURCE_REVALIDATE_SECONDS,
        });

        if (!data) {
          return new Response(
            `# Not Found\n\n${params.law.toUpperCase()} § ${params.paragraph} could not be loaded.`,
            {
              status: 404,
              headers: {
                "Content-Type": "text/markdown; charset=utf-8",
                "Cache-Control": SOURCE_CDN_CACHE_CONTROL,
                "CDN-Cache-Control": SOURCE_CDN_CACHE_CONTROL,
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
          },
        });
      },
    },
  },
});
