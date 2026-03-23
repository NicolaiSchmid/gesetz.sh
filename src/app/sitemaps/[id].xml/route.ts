import { buildUrlSetXml, getSitemapChunks } from "@/lib/sitemap";
import {
  SOURCE_CDN_CACHE_CONTROL,
  SOURCE_REVALIDATE_SECONDS,
} from "@/lib/source-cache";

export const revalidate = SOURCE_REVALIDATE_SECONDS;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const index = Number(id);

  if (!Number.isInteger(index) || index < 0) {
    return new Response("Not Found", { status: 404 });
  }

  const chunk = (await getSitemapChunks())[index];
  if (!chunk) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(buildUrlSetXml(chunk), {
    headers: {
      "Cache-Control": SOURCE_CDN_CACHE_CONTROL,
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
