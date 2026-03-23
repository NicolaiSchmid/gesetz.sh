import { parse } from "node-html-parser";

import { loadLawDirectory } from "@/lib/law-directory";

export const BASE_URL = "https://gesetz.sh";
const SOURCE_BASE_URL = "https://www.gesetze-im-internet.de";
const SOURCE_FETCH_TIMEOUT_MS = 10_000;
const SITEMAP_FETCH_CONCURRENCY = 8;
const SITEMAP_MAX_URLS = 50_000;
const SITEMAP_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const REQUEST_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Gesetz.sh Sitemap/1.0 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
};
const paragraphHrefPattern = /^_{2,}(.+)\.html$/;

export interface SitemapEntry {
  url: string;
  lastModified?: string | Date;
  changeFrequency?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
}

let cachedSitemapChunks:
  | {
      expiresAt: number;
      chunks: SitemapEntry[][];
    }
  | null = null;
let sitemapChunksPromise: Promise<SitemapEntry[][]> | null = null;

function extractParagraphSlugs(htmlText: string): string[] {
  const root = parse(htmlText);
  const links = root.querySelectorAll('#paddingLR12 a[href$=".html"]');
  const slugs = new Set<string>();

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
    const response = await fetch(
      `${SOURCE_BASE_URL}/${law.toLowerCase()}/index.html`,
      {
        headers: REQUEST_HEADERS,
        signal: controller.signal,
      },
    );

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

function chunkSitemapEntries(entries: SitemapEntry[]): SitemapEntry[][] {
  const chunks: SitemapEntry[][] = [];

  for (let index = 0; index < entries.length; index += SITEMAP_MAX_URLS) {
    chunks.push(entries.slice(index, index + SITEMAP_MAX_URLS));
  }

  return chunks.length > 0 ? chunks : [[]];
}

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const { laws } = loadLawDirectory();
  const now = new Date();

  const staticPages: SitemapEntry[] = [
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

  const lawPages: SitemapEntry[] = paragraphSlugsByLaw.flatMap(
    ({ law, paragraphs }) =>
      paragraphs.map((paragraph) => ({
        url: `${BASE_URL}/${law}/${paragraph}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: paragraph === "1" ? 0.8 : 0.7,
      })),
  );

  return [...staticPages, ...lawPages];
}

export async function getSitemapChunks(): Promise<SitemapEntry[][]> {
  const now = Date.now();

  if (cachedSitemapChunks && cachedSitemapChunks.expiresAt > now) {
    return cachedSitemapChunks.chunks;
  }

  if (sitemapChunksPromise) {
    return sitemapChunksPromise;
  }

  sitemapChunksPromise = getSitemapEntries()
    .then((entries) => {
      const chunks = chunkSitemapEntries(entries);
      cachedSitemapChunks = {
        expiresAt: now + SITEMAP_CACHE_TTL_MS,
        chunks,
      };
      return chunks;
    })
    .finally(() => {
      sitemapChunksPromise = null;
    });

  return sitemapChunksPromise;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderLastModified(value: string | Date | undefined): string {
  if (!value) return "";
  const formatted = value instanceof Date ? value.toISOString() : value;
  return `<lastmod>${escapeXml(formatted)}</lastmod>`;
}

export function buildUrlSetXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const changeFrequency = entry.changeFrequency
        ? `<changefreq>${escapeXml(entry.changeFrequency)}</changefreq>`
        : "";
      const priority =
        typeof entry.priority === "number"
          ? `<priority>${entry.priority.toFixed(1)}</priority>`
          : "";

      return [
        "<url>",
        `<loc>${escapeXml(entry.url)}</loc>`,
        renderLastModified(entry.lastModified),
        changeFrequency,
        priority,
        "</url>",
      ].join("");
    })
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
  ].join("");
}

export function buildSitemapIndexXml(chunkCount: number): string {
  const now = new Date().toISOString();
  const sitemaps = Array.from({ length: chunkCount }, (_, index) =>
    [
      "<sitemap>",
      `<loc>${escapeXml(`${BASE_URL}/sitemaps/${index}.xml`)}</loc>`,
      `<lastmod>${escapeXml(now)}</lastmod>`,
      "</sitemap>",
    ].join(""),
  ).join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    sitemaps,
    "</sitemapindex>",
  ].join("");
}
