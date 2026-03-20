import { type NextRequest, NextResponse } from "next/server";

import {
  SOURCE_CDN_CACHE_CONTROL,
  SOURCE_REVALIDATE_SECONDS,
} from "@/lib/source-cache";
import {
  fetchParagraphRecord,
  paragraphRecordToMarkdown,
} from "@/lib/gesetze/paragraph-source";

export const dynamic = "force-static";

type RouteParams = {
  params: Promise<{
    law: string;
    paragraph: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { law, paragraph } = await params;
  const data = await fetchParagraphRecord(law, paragraph, {
    revalidateSeconds: SOURCE_REVALIDATE_SECONDS,
  });

  if (!data) {
    return new NextResponse(
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

  const markdown = paragraphRecordToMarkdown(data);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": SOURCE_CDN_CACHE_CONTROL,
      "CDN-Cache-Control": SOURCE_CDN_CACHE_CONTROL,
      "Vercel-CDN-Cache-Control": SOURCE_CDN_CACHE_CONTROL,
    },
  });
}
