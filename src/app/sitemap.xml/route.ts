import {
  buildSitemapIndexXml,
  buildUrlSetXml,
  getSitemapChunks,
} from "@/lib/sitemap";
import {
  SOURCE_CDN_CACHE_CONTROL,
} from "@/lib/source-cache";

export const revalidate = 60 * 60 * 24 * 30;

export async function GET() {
  const chunks = await getSitemapChunks();
  const body =
    chunks.length <= 1
      ? buildUrlSetXml(chunks[0] ?? [])
      : buildSitemapIndexXml(chunks.length);

  return new Response(body, {
    headers: {
      "Cache-Control": SOURCE_CDN_CACHE_CONTROL,
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
