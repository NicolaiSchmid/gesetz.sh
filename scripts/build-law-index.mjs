import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";

const OUTPUT_DIR = path.resolve("src/generated");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "law-index.json");
const PUBLIC_DIR = path.resolve("public");
const SITEMAP_DIR = path.join(PUBLIC_DIR, "sitemaps");
const LAW_CODES = [
  ...Array.from({ length: 9 }, (_, i) => String(i + 1)), // 1-9
  ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)), // A-Z
];
const APP_BASE_URL = "https://gesetz.sh";
const SITEMAP_MAX_URLS = 50_000;
const SITEMAP_FETCH_CONCURRENCY = 8;
const SOURCE_FETCH_TIMEOUT_MS = 10_000;
const LAW_INDEX_HREF_PATTERN = /^_{2,}(.+)\.html$/;
const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Gesetz.sh Sitemap/1.0 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
};

const PROXY_URL = process.env.GESETZE_PROXY_URL;
const PROXY_API_KEY = process.env.GESETZE_PROXY_API_KEY;
const BASE_URL = "https://www.gesetze-im-internet.de";

console.log(`[build-law-index] PROXY_URL: ${PROXY_URL ? "set" : "NOT SET"}`);
console.log(
  `[build-law-index] PROXY_API_KEY: ${PROXY_API_KEY ? "set" : "NOT SET"}`,
);

function buildFetchUrl(token) {
  const teillistePath = `Teilliste_${token}.html`;
  if (PROXY_URL && PROXY_API_KEY) {
    return `${PROXY_URL}/${teillistePath}`;
  }
  return `${BASE_URL}/${teillistePath}`;
}

async function fetchList(token) {
  const url = buildFetchUrl(token);
  const headers = {};
  if (PROXY_URL && PROXY_API_KEY) {
    headers["X-API-Key"] = PROXY_API_KEY;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    console.warn(`Failed to fetch ${url}: ${response.status}`);
    return [];
  }
  // Upstream uses ISO-8859-1 encoding
  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder("iso-8859-1");
  const html = decoder.decode(buffer);
  const entries = parseLawEntries(html);
  return entries;
}

function buildLawIndexUrl(law) {
  const indexPath = `${law.toLowerCase()}/index.html`;
  if (PROXY_URL && PROXY_API_KEY) {
    return `${PROXY_URL}/${indexPath}`;
  }
  return `${BASE_URL}/${indexPath}`;
}

function buildRequestHeaders() {
  if (PROXY_URL && PROXY_API_KEY) {
    return {
      ...REQUEST_HEADERS,
      "X-API-Key": PROXY_API_KEY,
    };
  }

  return REQUEST_HEADERS;
}

function parseLawEntries(html) {
  const root = parse(html);
  const nodes = root.querySelectorAll("#paddingLR12 p");
  const entries = [];

  for (const node of nodes) {
    const link = node.querySelector("a");
    if (!link) continue;

    const href = link.getAttribute("href") ?? "";
    const slugMatch = href.match(/\.\/(.*?)\/index\.html/);
    if (!slugMatch) continue;
    const code = slugMatch[1]?.toLowerCase();
    if (!code) continue;

    // Get short title from link text
    const shortTitle = link.text?.replace(/\s+/g, " ").trim() ?? "";

    // Get full title from abbr title attribute
    const abbr = link.querySelector("abbr");
    const fullTitle = abbr?.getAttribute("title")?.trim() ?? "";

    // Get description from remaining text in the <p> (after the link, before PDF link)
    const nodeText = node.text ?? "";
    const descriptionMatch = nodeText
      .replace(shortTitle, "")
      .replace(/PDF\s*$/, "")
      .trim();
    const description = descriptionMatch || fullTitle;

    entries.push({
      code,
      title: shortTitle,
      fullTitle: fullTitle || shortTitle,
      description,
    });
  }

  return entries;
}

function extractParagraphSlugs(html) {
  const root = parse(html);
  const links = root.querySelectorAll('#paddingLR12 a[href$=".html"]');
  const slugs = new Set();

  for (const link of links) {
    const href = link.getAttribute("href")?.trim();
    if (!href) continue;

    const match = LAW_INDEX_HREF_PATTERN.exec(href);
    if (!match?.[1]) continue;

    slugs.add(match[1].toLowerCase());
  }

  return [...slugs];
}

async function fetchLawParagraphSlugs(law) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SOURCE_FETCH_TIMEOUT_MS);
  const fallback = ["1"];

  try {
    const response = await fetch(buildLawIndexUrl(law), {
      headers: buildRequestHeaders(),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(
        `[build-law-index] Failed to fetch paragraphs for ${law}: ${response.status}`,
      );
      return fallback;
    }

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder("iso-8859-1");
    const slugs = extractParagraphSlugs(decoder.decode(buffer));
    return slugs.length > 0 ? slugs : fallback;
  } catch (error) {
    console.warn(`[build-law-index] Failed to load paragraphs for ${law}:`, error);
    return fallback;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function mapWithConcurrencyLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

function chunkEntries(entries, chunkSize) {
  const chunks = [];

  for (let index = 0; index < entries.length; index += chunkSize) {
    chunks.push(entries.slice(index, index + chunkSize));
  }

  return chunks.length > 0 ? chunks : [[]];
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderLastModified(value) {
  return `<lastmod>${escapeXml(value)}</lastmod>`;
}

function buildUrlSetXml(entries) {
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

function buildSitemapIndexXml(chunks, generatedAt) {
  const sitemaps = chunks
    .map((_, index) =>
      [
        "<sitemap>",
        `<loc>${escapeXml(`${APP_BASE_URL}/sitemaps/${index}.xml`)}</loc>`,
        renderLastModified(generatedAt),
        "</sitemap>",
      ].join(""),
    )
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    sitemaps,
    "</sitemapindex>",
  ].join("");
}

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function clearDirectory(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

async function buildSitemaps(laws, generatedAt) {
  const staticPages = [
    {
      url: APP_BASE_URL,
      lastModified: generatedAt,
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

  const lawPages = paragraphSlugsByLaw.flatMap(({ law, paragraphs }) =>
    paragraphs.map((paragraph) => ({
      url: `${APP_BASE_URL}/${law}/${paragraph}`,
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: paragraph === "1" ? 0.8 : 0.7,
    })),
  );

  const chunks = chunkEntries([...staticPages, ...lawPages], SITEMAP_MAX_URLS);

  ensureDirectory(PUBLIC_DIR);
  clearDirectory(SITEMAP_DIR);

  fs.writeFileSync(
    path.join(PUBLIC_DIR, "sitemap.xml"),
    buildSitemapIndexXml(chunks, generatedAt),
    "utf-8",
  );

  chunks.forEach((chunk, index) => {
    fs.writeFileSync(
      path.join(SITEMAP_DIR, `${index}.xml`),
      buildUrlSetXml(chunk),
      "utf-8",
    );
  });

  console.log(
    `[build-law-index] Generated ${chunks.length} sitemap file(s) with ${staticPages.length + lawPages.length} URL(s)`,
  );
}

async function buildIndex() {
  const allEntries = [];

  for (const token of LAW_CODES) {
    try {
      const entries = await fetchList(token);
      allEntries.push(...entries);
    } catch (error) {
      console.warn(`Failed to process token ${token}:`, error);
    }
  }

  const unique = new Map();
  for (const entry of allEntries) {
    if (!unique.has(entry.code)) {
      unique.set(entry.code, entry);
    }
  }

  ensureDirectory(OUTPUT_DIR);

  const generatedAt = new Date().toISOString();
  const laws = [...unique.values()];

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      { generatedAt, laws },
      null,
      2,
    ),
    "utf-8",
  );

  const sampleEntry = laws[0];
  console.log(
    `Law index generated with ${unique.size} entries -> ${OUTPUT_FILE}`,
  );
  console.log(`[build-law-index] Sample entry title: "${sampleEntry?.title}"`);
  console.log(
    `[build-law-index] Sample entry fullTitle: "${sampleEntry?.fullTitle}"`,
  );

  await buildSitemaps(laws, generatedAt);
}

await buildIndex();
