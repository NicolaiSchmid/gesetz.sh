import { type NextRequest, NextResponse } from "next/server";
import { parse, type HTMLElement } from "node-html-parser";
import flatten from "lodash-es/flatten";

import { env } from "@/env";

type RouteParams = {
  params: Promise<{
    law: string;
    paragraph: string;
  }>;
};

const DOMAIN = "https://www.gesetze-im-internet.de";
const REQUEST_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) GesetzeNext/1.0 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
};

type ParagraphData = {
  law: string;
  paragraph: string;
  headers: string[];
  content: string[];
  footnotes: string[];
  sourceUrl: string;
};

async function fetchParagraphData(
  law: string,
  paragraph: string
): Promise<ParagraphData | null> {
  const sourcePath = `${law.toLowerCase()}/__${paragraph.toLowerCase()}.html`;

  const useProxy = env.GESETZE_PROXY_URL && env.GESETZE_PROXY_API_KEY;
  const fetchUrl = useProxy
    ? `${env.GESETZE_PROXY_URL}/${sourcePath}`
    : `${DOMAIN}/${sourcePath}`;

  const requestHeaders = { ...REQUEST_HEADERS };
  if (useProxy && env.GESETZE_PROXY_API_KEY) {
    requestHeaders["X-API-Key"] = env.GESETZE_PROXY_API_KEY;
  }

  try {
    const response = await fetch(fetchUrl, {
      headers: requestHeaders,
    });

    if (!response.ok) {
      return null;
    }

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder("iso-8859-1");
    const text = decoder.decode(buffer);
    const html = parse(text);

    const parsedHeaders = flatten(
      html
        .querySelectorAll(".jnheader")
        .map((header: HTMLElement) =>
          header
            .querySelectorAll("h1")
            .map((heading: HTMLElement) => heading.textContent ?? "")
        )
    );

    // Get content - exclude elements inside jnfussnote using :not() selector
    const content = html
      .querySelectorAll(".jurAbsatz:not(.jnfussnote .jurAbsatz)")
      .map((element: HTMLElement) => element.textContent ?? "");

    const footnotes = html
      .querySelectorAll(".jnfussnote .jurAbsatz")
      .map((element: HTMLElement) => element.textContent ?? "");

    if (!parsedHeaders.length && !content.length) {
      return null;
    }

    return {
      law,
      paragraph,
      headers: parsedHeaders,
      content,
      footnotes,
      sourceUrl: `${DOMAIN}/${sourcePath}`,
    };
  } catch {
    return null;
  }
}

function toMarkdown(data: ParagraphData): string {
  const lines: string[] = [];
  const lawUpper = data.law.toUpperCase();

  // Title - headers usually contain the law name, so just use them directly
  if (data.headers.length > 0) {
    lines.push(`# ${data.headers.join(" ")}`);
  } else {
    lines.push(`# ${lawUpper} § ${data.paragraph}`);
  }
  lines.push("");

  // Content paragraphs
  for (const paragraph of data.content) {
    lines.push(paragraph.trim());
    lines.push("");
  }

  // Footnotes
  if (data.footnotes.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("**Footnotes**");
    lines.push("");
    for (const footnote of data.footnotes) {
      lines.push(footnote.trim());
      lines.push("");
    }
  }

  // Source link
  lines.push(`[Source](${data.sourceUrl})`);

  return lines.join("\n");
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { law, paragraph } = await params;
  const data = await fetchParagraphData(law, paragraph);

  if (!data) {
    return new NextResponse(
      `# Not Found\n\n${law.toUpperCase()} § ${paragraph} could not be loaded.`,
      {
        status: 404,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
        },
      }
    );
  }

  const markdown = toMarkdown(data);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
