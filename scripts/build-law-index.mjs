import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";

const OUTPUT_DIR = path.resolve(".next/cache");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "law-index.json");
const LAW_CODES = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i),
);

const BASE_URL = "https://www.gesetze-im-internet.de";
const LIST_PATH = (token) => `${BASE_URL}/Teilliste_${token}.html`;

async function fetchList(token) {
  const url = LIST_PATH(token);
  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`Failed to fetch ${url}: ${response.status}`);
    return [];
  }
  const html = await response.text();
  const entries = parseLawEntries(html);
  return entries;
}

function parseLawEntries(html) {
  const root = parse(html);
  const nodes = root.querySelectorAll("#paddingLR12 p");
  const entries = [];

  for (const node of nodes) {
    const link = node.querySelector("a");
    const description = node.querySelector("span");
    if (!link) continue;

    const href = link.getAttribute("href") ?? "";
    const slugMatch = href.match(/\.\/(.*?)\/index\.html/);
    if (!slugMatch) continue;
    const code = slugMatch[1]?.toLowerCase();
    if (!code) continue;

    const titleText = link.text?.replace(/\s+/g, " ").trim() ?? "";
    const descriptionText = description
      ? (description.text?.replace(/\s+/g, " ").trim() ?? "")
      : "";

    entries.push({
      code,
      title: titleText,
      description: descriptionText,
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
