import type { MetadataRoute } from "next";
import { loadLawDirectory } from "@/lib/law-directory";

const BASE_URL = "https://gesetz.sh";

export default function sitemap(): MetadataRoute.Sitemap {
  const { laws } = loadLawDirectory();

  // Homepage
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  // All law entry pages (linking to §1 of each law)
  const lawPages: MetadataRoute.Sitemap = laws.map((law) => ({
    url: `${BASE_URL}/${law.code}/1`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...lawPages];
}
