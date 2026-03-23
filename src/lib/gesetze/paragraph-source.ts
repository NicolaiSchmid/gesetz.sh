import { parse, type HTMLElement } from "node-html-parser";

import {
  buildCanonicalUrl,
  buildParagraphCitation,
  normalizeLawCode,
  normalizeParagraphId,
} from "./reference";
import { SOURCE_REVALIDATE_SECONDS } from "../source-cache";

const DOMAIN = "https://www.gesetze-im-internet.de";
const REQUEST_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) GesetzeNext/1.0 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
};
const paragraphSourceHrefPattern = /^_{2,}(.+)\.html$/;

const paragraphReferenceRegex = /(§{1,2}|&#167;)\s*(\d+[a-zA-Z]*)/g;
const namedHtmlEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  auml: "ä",
  Auml: "Ä",
  copy: "©",
  euro: "€",
  gt: ">",
  hellip: "…",
  lt: "<",
  mdash: "—",
  nbsp: "\u00a0",
  ndash: "–",
  Ouml: "Ö",
  ouml: "ö",
  para: "§",
  quot: '"',
  sect: "§",
  szlig: "ß",
  Uuml: "Ü",
  uuml: "ü",
};

export interface ParagraphFragment {
  html: string;
  text: string;
  markdown: string;
}

export interface ParsedParagraphRecord {
  law: string;
  paragraph: string;
  citation: string;
  title: string;
  headers: ParagraphFragment[];
  content: ParagraphFragment[];
  footnotes: ParagraphFragment[];
  navigation: {
    previous?: string;
    next?: string;
  };
  sourcePath: string;
  sourceUrl: string;
  canonicalUrl: string;
}

export interface ParagraphFetchOptions {
  revalidateSeconds?: number;
}

export function buildParagraphSourcePath(law: string, paragraph: string): string {
  const normalizedLaw = normalizeLawCode(law);
  const normalizedParagraph = normalizeParagraphId(paragraph);
  const prefix = normalizedParagraph.includes("_") ? "___" : "__";
  return `${normalizedLaw}/${prefix}${normalizedParagraph}.html`;
}

export function buildParagraphSourceUrl(law: string, paragraph: string): string {
  return `${DOMAIN}/${buildParagraphSourcePath(law, paragraph)}`;
}

function normalizeText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g,
    (entity: string, body: string) => {
      if (body.startsWith("#x")) {
        const codePoint = Number.parseInt(body.slice(2), 16);
        return Number.isNaN(codePoint)
          ? entity
          : String.fromCodePoint(codePoint);
      }

      if (body.startsWith("#")) {
        const codePoint = Number.parseInt(body.slice(1), 10);
        return Number.isNaN(codePoint)
          ? entity
          : String.fromCodePoint(codePoint);
      }

      return namedHtmlEntities[body] ?? entity;
    },
  );
}

function htmlFragmentToMarkdown(html: string): string {
  return normalizeText(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(
        /<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi,
        (_match: string, href: string, label: string) =>
          `[${normalizeText(label)}](${decodeHtmlEntities(href)})`,
      )
      .replace(/<\/?(strong|b)>/gi, "**")
      .replace(/<\/?(em|i)>/gi, "_")
      .replace(/<[^>]+>/g, ""),
  );
}

function linkifyParagraphReferences(htmlContent: string, law: string): string {
  return htmlContent.replace(
    paragraphReferenceRegex,
    (match: string, symbol: string, paragraph: string) => {
      if (!paragraph) return match;
      const slug = paragraph.toLowerCase();
      const displaySymbol = symbol === "&#167;" ? "§" : symbol;
      const label = `${displaySymbol} ${paragraph}`.trim();
      return `<a href="/${law}/${slug}" class="text-blue-600 underline hover:text-blue-800">${label}</a>`;
    },
  );
}

function getLinkHref(element: HTMLElement | null): string | undefined {
  if (!element) return undefined;

  const originalLink = element.getAttribute("href");
  return paragraphSourceHrefPattern.exec(originalLink ?? "")?.[1]?.toLowerCase();
}

function isInsideFootnote(element: HTMLElement): boolean {
  return element.closest(".jnfussnote") !== null;
}

function toFragment(element: HTMLElement, law: string): ParagraphFragment {
  const html = linkifyParagraphReferences(element.innerHTML ?? "", law);
  return {
    html,
    text: normalizeText(element.textContent ?? ""),
    markdown: htmlFragmentToMarkdown(html),
  };
}

export function parseParagraphHtml(
  htmlText: string,
  law: string,
  paragraph: string,
): ParsedParagraphRecord | null {
  const normalizedLaw = normalizeLawCode(law);
  const normalizedParagraph = normalizeParagraphId(paragraph);
  const html = parse(htmlText);

  const headers = html
    .querySelectorAll(".jnheader")
    .flatMap((header: HTMLElement) =>
      header.querySelectorAll("h1").map((heading: HTMLElement) => ({
        html: heading.innerHTML ?? "",
        text: normalizeText(heading.textContent ?? ""),
        markdown: htmlFragmentToMarkdown(heading.innerHTML ?? ""),
      })),
    )
    .filter((header) => header.html || header.text);

  const content: ParagraphFragment[] = [];
  const footnotes: ParagraphFragment[] = [];

  for (const element of html.querySelectorAll(".jurAbsatz")) {
    const fragment = toFragment(element, normalizedLaw);
    if (!fragment.html && !fragment.text) continue;

    if (isInsideFootnote(element)) {
      footnotes.push(fragment);
    } else {
      content.push(fragment);
    }
  }

  if (!headers.length && !content.length) {
    return null;
  }

  const title =
    headers.map((header) => header.text).filter(Boolean).at(-1) ??
    buildParagraphCitation(normalizedLaw, normalizedParagraph);

  return {
    law: normalizedLaw,
    paragraph: normalizedParagraph,
    citation: buildParagraphCitation(normalizedLaw, normalizedParagraph),
    title,
    headers,
    content,
    footnotes,
    navigation: {
      previous: getLinkHref(
        (html.querySelector("#blaettern_zurueck")
          ?.firstChild as HTMLElement | null) ?? null,
      ),
      next: getLinkHref(
        (html.querySelector("#blaettern_weiter")
          ?.firstChild as HTMLElement | null) ?? null,
      ),
    },
    sourcePath: buildParagraphSourcePath(normalizedLaw, normalizedParagraph),
    sourceUrl: buildParagraphSourceUrl(normalizedLaw, normalizedParagraph),
    canonicalUrl: buildCanonicalUrl(normalizedLaw, normalizedParagraph),
  };
}

export async function fetchParagraphRecord(
  law: string,
  paragraph: string,
  options: ParagraphFetchOptions = {},
): Promise<ParsedParagraphRecord | null> {
  const sourcePath = buildParagraphSourcePath(law, paragraph);
  const fetchUrl = `${DOMAIN}/${sourcePath}`;

  const requestInit: RequestInit & {
    next?: { revalidate: number };
  } = {
    headers: REQUEST_HEADERS,
  };

  requestInit.next = {
    revalidate: options.revalidateSeconds ?? SOURCE_REVALIDATE_SECONDS,
  };

  try {
    const response = await fetch(fetchUrl, requestInit);

    if (!response.ok) {
      return null;
    }

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder("iso-8859-1");
    const htmlText = decoder.decode(buffer);

    return parseParagraphHtml(htmlText, law, paragraph);
  } catch {
    return null;
  }
}

export function paragraphRecordToMarkdown(
  record: ParsedParagraphRecord,
): string {
  const lines: string[] = [];

  if (record.headers.length > 0) {
    lines.push(`# ${record.headers.map((header) => header.text).join(" ")}`);
  } else {
    lines.push(`# ${record.citation}`);
  }
  lines.push("");

  for (const paragraph of record.content) {
    lines.push(paragraph.text);
    lines.push("");
  }

  if (record.footnotes.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("**Footnotes**");
    lines.push("");
    for (const footnote of record.footnotes) {
      lines.push(footnote.text);
      lines.push("");
    }
  }

  lines.push(`[Source](${record.sourceUrl})`);

  return lines.join("\n");
}
