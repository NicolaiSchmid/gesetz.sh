import { buildUrlSetXml, getSitemapChunks } from "@/lib/sitemap";
import {
  SOURCE_CDN_CACHE_CONTROL,
} from "@/lib/source-cache";

export const revalidate = 2592000;
export const dynamicParams = false;

export async function generateStaticParams() {
  const chunks = await getSitemapChunks();
  return chunks.map((_, index) => ({ id: String(index) }));
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> } = {
    params: Promise.resolve({ id: "" }),
  },
) {
  const { id } = await context.params;
  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

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
