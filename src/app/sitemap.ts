import type { MetadataRoute } from "next";

import { getSitemapChunks } from "@/lib/sitemap";

export async function generateSitemaps() {
  const chunks = await getSitemapChunks();
  return chunks.map((_, index) => ({ id: index }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<number>;
}): Promise<MetadataRoute.Sitemap> {
  const sitemapId = await id;
  const chunks = await getSitemapChunks();
  return chunks[sitemapId] ?? [];
}
