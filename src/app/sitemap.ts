import type { MetadataRoute } from "next";
import { parse } from "node-html-parser";

import { loadLawDirectory } from "@/lib/law-directory";
import { SOURCE_REVALIDATE_SECONDS } from "@/lib/source-cache";

const BASE_URL = "https://gesetz.sh";
const SOURCE_BASE_URL = "https://www.gesetze-im-internet.de";
const SOURCE_FETCH_TIMEOUT_MS = 10_000;
const SITEMAP_FETCH_CONCURRENCY = 8;
const REQUEST_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Gesetz.sh Sitemap/1.0 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
};

function getProxyConfig() {
  const url = process.env.GESETZE_PROXY_URL;
  const apiKey = process.env.GESETZE_PROXY_API_KEY;

  if (!url || !apiKey) {
    return null;
  }

  return { url, apiKey };
}

function buildLawIndexUrl(law: string) {
  const proxy = getProxyConfig();
  const path = `${law.toLowerCase()}/index.html`;
  return proxy ? `${proxy.url}/${path}` : `${SOURCE_BASE_URL}/${path}`;
}

function getRequestHeaders() {
  const proxy = getProxyConfig();
  return proxy
    ? {
        ...REQUEST_HEADERS,
        "X-API-Key": proxy.apiKey,
      }
    : REQUEST_HEADERS;
}

function extractParagraphSlugs(htmlText: string): string[] {
  const root = parse(htmlText);
  const links = root.querySelectorAll('#paddingLR12 a[href$=".html"]');
  const slugs = new Set<string>();
  const paragraphHrefPattern = /^_{2,}(.+)\.html$/;

  for (const link of links) {
    const href = link.getAttribute("href")?.trim();
    if (!href) continue;

    const match = paragraphHrefPattern.exec(href);
    if (!match?.[1]) continue;

    slugs.add(match[1].toLowerCase());
  }

  return [...slugs];
}

async function fetchLawParagraphSlugs(law: string): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SOURCE_FETCH_TIMEOUT_MS);
  const fallback = ["1"];

  try {
    const response = await fetch(buildLawIndexUrl(law), {
      headers: getRequestHeaders(),
      next: { revalidate: SOURCE_REVALIDATE_SECONDS },
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallback;
    }

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder("iso-8859-1");
    const slugs = extractParagraphSlugs(decoder.decode(buffer));
    return slugs.length > 0 ? slugs : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function mapWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex] as T);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { laws } = loadLawDirectory();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  const paragraphSlugsByLaw = await mapWithConcurrencyLimit(
    laws,
    SITEMAP_FETCH_CONCURRENCY,
    async (law) => ({
      law: law.code.toLowerCase(),
      paragraphs: await fetchLawParagraphSlugs(law.code),
    }),
  );

  const lawPages: MetadataRoute.Sitemap = paragraphSlugsByLaw.flatMap(
    ({ law, paragraphs }) =>
      paragraphs.map((paragraph) => ({
        url: `${BASE_URL}/${law}/${paragraph}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: paragraph === "1" ? 0.8 : 0.7,
      })),
  );

  return [...staticPages, ...lawPages];
}
