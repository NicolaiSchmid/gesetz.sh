import fs from "node:fs";
import path from "node:path";

const GENERATED_DIR = path.resolve("src/generated");
const LAW_INDEX_FILE = path.join(GENERATED_DIR, "law-index.json");
const OUTPUT_FILE = path.join(GENERATED_DIR, "law-prerender-manifest.json");

const PROXY_URL = process.env.GESETZE_PROXY_URL;
const PROXY_API_KEY = process.env.GESETZE_PROXY_API_KEY;
const BASE_URL = "https://www.gesetze-im-internet.de";
const FETCH_CONCURRENCY = 8;

function readLawIndex() {
  if (!fs.existsSync(LAW_INDEX_FILE)) {
    throw new Error(
      `Missing ${LAW_INDEX_FILE}. Run build-law-index before generating the prerender manifest.`,
    );
  }

  return JSON.parse(fs.readFileSync(LAW_INDEX_FILE, "utf8"));
}

function buildFetchUrl(lawCode) {
  const lawIndexPath = `${lawCode}/index.html`;
  if (PROXY_URL && PROXY_API_KEY) {
    return `${PROXY_URL}/${lawIndexPath}`;
  }

  return `${BASE_URL}/${lawIndexPath}`;
}

async function fetchLawIndexHtml(lawCode) {
  const headers = {};
  if (PROXY_URL && PROXY_API_KEY) {
    headers["X-API-Key"] = PROXY_API_KEY;
  }

  const response = await fetch(buildFetchUrl(lawCode), { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${lawCode}/index.html: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return new TextDecoder("iso-8859-1").decode(buffer);
}

function parseParagraphs(html) {
  const paragraphIds = new Set();

  for (const match of html.matchAll(/href="(__[^"#?]+\.html)"/g)) {
    const href = match[1];
    if (!href) continue;

    const paragraphId = href.replace(/^__/, "").replace(/\.html$/, "").toLowerCase();
    if (!paragraphId) continue;

    paragraphIds.add(paragraphId);
  }

  return [...paragraphIds];
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function buildManifest() {
  const lawIndex = readLawIndex();
  const laws = Array.isArray(lawIndex.laws) ? lawIndex.laws : [];

  console.log(`[build-law-prerender-manifest] Generating manifest for ${laws.length} laws`);

  const lawEntries = await mapWithConcurrency(
    laws,
    FETCH_CONCURRENCY,
    async (law, index) => {
      try {
        const html = await fetchLawIndexHtml(law.code);
        const paragraphs = parseParagraphs(html);

        if ((index + 1) % 100 === 0 || index === laws.length - 1) {
          console.log(
            `[build-law-prerender-manifest] Processed ${index + 1}/${laws.length} laws`,
          );
        }

        return {
          code: law.code,
          paragraphs,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[build-law-prerender-manifest] Skipping ${law.code}: ${message}`,
        );
        return {
          code: law.code,
          paragraphs: [],
        };
      }
    },
  );

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceLawIndexGeneratedAt:
      typeof lawIndex.generatedAt === "string" ? lawIndex.generatedAt : null,
    lawCount: lawEntries.length,
    routeCount: lawEntries.reduce((sum, law) => sum + law.paragraphs.length, 0),
    laws: lawEntries.filter((law) => law.paragraphs.length > 0),
  };

  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2), "utf8");

  console.log(
    `[build-law-prerender-manifest] Wrote ${manifest.routeCount} routes across ${manifest.laws.length} laws -> ${OUTPUT_FILE}`,
  );
}

await buildManifest();
