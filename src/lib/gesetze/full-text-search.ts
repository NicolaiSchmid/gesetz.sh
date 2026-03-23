import { parse } from "node-html-parser";

import {
  buildCanonicalUrl,
  buildParagraphCitation,
  normalizeLawCode,
  normalizeParagraphId,
} from "./reference";
import { getLawCanonicalUrl } from "./law-directory";

const DOMAIN = "https://www.gesetze-im-internet.de";
const REQUEST_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) GesetzeNext/1.0 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
};

export type FullTextSearchMethod = "and" | "or";

export interface FullTextSearchResult {
  law?: string;
  paragraph?: string;
  citation?: string;
  title: string;
  snippet: string;
  sourceUrl: string;
  canonicalUrl?: string;
  score: number;
}

export interface FullTextSearchResponse {
  query: string;
  method: FullTextSearchMethod;
  page: number;
  total: number;
  start: number;
  end: number;
  results: FullTextSearchResult[];
}

function getProxyConfig() {
  const url = process.env.GESETZE_PROXY_URL;
  const apiKey = process.env.GESETZE_PROXY_API_KEY;

  if (!url || !apiKey) {
    return null;
  }

  return { url, apiKey };
}

function normalizeText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string): string {
  return parse(`<span>${value}</span>`).textContent;
}

function htmlSnippetToMarkdown(value: string): string {
  const withoutBoilerplate = value
    .replace(/^(\s*zur&uuml;ck\s+weiter\s+)?Nichtamtliches Inhaltsverzeichnis\s*/i, "")
    .replace(/<strong><code>\s*\.\.\.\s*<\/code><\/strong>/gi, "...")
    .replace(/<\/?(code)>/gi, "");

  return normalizeText(
    decodeHtml(
      withoutBoilerplate
        .replace(/<\/?(strong|b)>/gi, "**")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, " "),
    ),
  );
}

function parseResultUrl(value: string): Pick<
  FullTextSearchResult,
  "law" | "paragraph" | "citation" | "canonicalUrl"
> {
  try {
    const url = new URL(value);
    const paragraphMatch = /^\/([a-z0-9_-]+)\/__([a-z0-9_-]+)\.html$/i.exec(url.pathname);
    if (paragraphMatch) {
      const law = normalizeLawCode(paragraphMatch[1] ?? "");
      const paragraph = normalizeParagraphId(paragraphMatch[2] ?? "");
      return {
        law,
        paragraph,
        citation: buildParagraphCitation(law, paragraph),
        canonicalUrl: buildCanonicalUrl(law, paragraph),
      };
    }

    const lawMatch = /^\/([a-z0-9_-]+)\/$/i.exec(url.pathname);
    if (lawMatch) {
      const law = normalizeLawCode(lawMatch[1] ?? "");
      return {
        law,
        canonicalUrl: getLawCanonicalUrl(law),
      };
    }

    return {};
  } catch {
    return {};
  }
}

export function parseFullTextSearchHtml(
  htmlText: string,
  requestedQuery: string,
  method: FullTextSearchMethod,
  page: number,
): FullTextSearchResponse {
  const root = parse(htmlText);
  const padding = root.querySelector("#paddingLR12");

  const noResultsHeading = padding?.querySelector("h2.rot")?.textContent;
  if (noResultsHeading) {
    return {
      query: requestedQuery,
      method,
      page,
      total: 0,
      start: 0,
      end: 0,
      results: [],
    };
  }

  const summaryText = padding?.querySelector("strong")?.textContent ?? "";
  const summaryMatch = /Dokument\s+(\d+)\s*-\s*(\d+)\s+von\s+(\d+)\s+Treffer/i.exec(summaryText);

  const results = (padding?.querySelectorAll("dl") ?? []).flatMap((entry) => {
    const link = entry.querySelector("dt a");
    const snippetNode = entry.querySelector("dd");
    if (!link || !snippetNode) return [];

    const sourceUrl = link.getAttribute("href")?.trim();
    if (!sourceUrl) return [];

    const score = entry
      .querySelectorAll("dt img")
      .filter((image) => (image.getAttribute("src") ?? "").includes("star.gif")).length;

    return [
      {
        ...parseResultUrl(sourceUrl),
        title: normalizeText(decodeHtml(link.textContent ?? "")),
        snippet: htmlSnippetToMarkdown(snippetNode.innerHTML),
        sourceUrl,
        score,
      },
    ];
  });

  return {
    query: requestedQuery,
    method,
    page,
    total: summaryMatch ? Number(summaryMatch[3]) : results.length,
    start: summaryMatch ? Number(summaryMatch[1]) : results.length > 0 ? 1 : 0,
    end: summaryMatch ? Number(summaryMatch[2]) : results.length,
    results,
  };
}

export async function searchFullText(
  query: string,
  options: {
    method?: FullTextSearchMethod;
    page?: number;
  } = {},
): Promise<FullTextSearchResponse> {
  const method = options.method ?? "and";
  const page = options.page ?? 1;
  const proxy = getProxyConfig();

  const params = new URLSearchParams({
    config: "Gesamt_bmjhome2005",
    method,
    words: query,
  });

  if (page > 1) {
    params.set("page", String(page));
  }

  const fetchUrl = proxy
    ? `${proxy.url}/cgi-bin/htsearch?${params.toString()}`
    : `${DOMAIN}/cgi-bin/htsearch?${params.toString()}`;

  const headers = { ...REQUEST_HEADERS };
  if (proxy) {
    headers["X-API-Key"] = proxy.apiKey;
  }

  const response = await fetch(fetchUrl, { headers });
  if (!response.ok) {
    throw new Error(`Full-text search failed with status ${response.status}.`);
  }

  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder("iso-8859-1");
  const htmlText = decoder.decode(buffer);

  return parseFullTextSearchHtml(htmlText, query, method, page);
}
