import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";

const OUTPUT_DIR = path.resolve("src/generated");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "law-index.json");
const LAW_CODES = [
  ...Array.from({ length: 9 }, (_, i) => String(i + 1)), // 1-9
  ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)), // A-Z
];

const PROXY_URL = process.env.GESETZE_PROXY_URL;
const PROXY_API_KEY = process.env.GESETZE_PROXY_API_KEY;
const BASE_URL = "https://www.gesetze-im-internet.de";

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

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), laws: [...unique.values()] },
      null,
      2,
    ),
    "utf-8",
  );

  console.log(
    `Law index generated with ${unique.size} entries -> ${OUTPUT_FILE}`,
  );
}

await buildIndex();
