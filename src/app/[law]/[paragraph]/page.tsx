import type { Metadata } from "next";
import flatten from "lodash-es/flatten";
import Link from "next/link";
import { parse, type HTMLElement } from "node-html-parser";

import KeyboardNavigation from "./KeyboardNavigation";
import { Button } from "@/components/ui/button";
import { env } from "@/env";

type PageParams = {
  law: string;
  paragraph: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { law, paragraph } = await params;
  const title = `${law.toUpperCase()} § ${paragraph}`;

  return {
    title: `${title} | Gesetze 2.0`,
  };
}

const DOMAIN = "https://www.gesetze-im-internet.de";
const REQUEST_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) GesetzeNext/1.0 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
};

const paragraphReferenceRegex = /(§{1,2}|&#167;)\s*(\d+[a-zA-Z]*)/g;

function linkifyParagraphReferences(htmlContent: string, law: string) {
  return htmlContent.replace(
    paragraphReferenceRegex,
    (match: string, symbol: string, paragraph: string) => {
      if (!paragraph) return match;
      const slug = paragraph.toLowerCase();
      // Normalize symbol to § for display
      const displaySymbol = symbol === "&#167;" ? "§" : symbol;
      const label = `${displaySymbol} ${paragraph}`.trim();
      return `<a href="/${law}/${slug}" class="text-blue-600 underline hover:text-blue-800">${label}</a>`;
    },
  );
}

type ParagraphData = {
  headers: string[];
  content: string[];
  footnotes: string[];
  backward?: string;
  forward?: string;
};

const SOURCE_REVALIDATE_SECONDS = 60 * 60; // 1 hour

function buildSourceUrl(law: string, paragraph: string) {
  return `${DOMAIN}/${law.toLowerCase()}/__${paragraph.toLowerCase()}.html`;
}

async function fetchParagraphData(
  law: string,
  paragraph: string,
): Promise<ParagraphData | null> {
  const sourcePath = `${law.toLowerCase()}/__${paragraph.toLowerCase()}.html`;

  // Use proxy if configured, otherwise fall back to direct fetch
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
      next: { revalidate: SOURCE_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${fetchUrl}: ${response.status}`);
      return null;
    }

    // Upstream uses ISO-8859-1 encoding
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
            .map((heading: HTMLElement) => heading.innerHTML ?? ""),
        ),
    );

    const content = html
      .querySelectorAll(".jurAbsatz")
      .map((element: HTMLElement) =>
        linkifyParagraphReferences(element.innerHTML ?? "", law),
      );

    const footnotes = html
      .querySelectorAll(".jnfussnote")
      .map((element: HTMLElement) =>
        linkifyParagraphReferences(element.innerHTML ?? "", law),
      );

    const backward = getLinkHref(
      (html.querySelector("#blaettern_zurueck")
        ?.firstChild as HTMLElement | null) ?? null,
    );
    const forward = getLinkHref(
      (html.querySelector("#blaettern_weiter")
        ?.firstChild as HTMLElement | null) ?? null,
    );

    if (!parsedHeaders.length && !content.length) {
      console.error(
        `Source HTML for ${fetchUrl} did not contain recognizable content.`,
      );
      return null;
    }

    return { headers: parsedHeaders, content, footnotes, backward, forward };
  } catch (error) {
    console.error(`Unexpected error while fetching ${fetchUrl}`, error);
    return null;
  }
}

function getLinkHref(element: HTMLElement | null): string | undefined {
  if (!element) return undefined;

  const originalLink = element.getAttribute("href");
  return originalLink?.match(/__(.+)\.html/)?.[1] ?? undefined;
}

export default async function Display({
  params,
}: {
  params: Promise<{
    law: string;
    paragraph: string;
  }>;
}) {
  const { law, paragraph } = await params;
  const paragraphData = await fetchParagraphData(law, paragraph);
  const sourceUrl = buildSourceUrl(law, paragraph);
  const hasHeaders = Boolean(paragraphData?.headers?.length);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <KeyboardNavigation
        law={law}
        backward={paragraphData?.backward}
        forward={paragraphData?.forward}
      />

      {/* Breadcrumb */}
      <nav className="mb-10 flex items-center gap-2 text-sm">
        <Link href="/" className="text-gray-400 hover:text-gray-900">
          Gesetze
        </Link>
        <span className="text-gray-300">/</span>
        <Link href={`/${law}/1`} className="text-gray-400 hover:text-gray-900">
          {law.toUpperCase()}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-900">§ {paragraph}</span>
      </nav>

      {/* Header */}
      <header className="mb-10">
        <div className="mb-3 inline-block rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
          {law.toUpperCase()}
        </div>
        {hasHeaders && paragraphData ? (
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {paragraphData.headers.map((header, index) => (
              <span
                dangerouslySetInnerHTML={{ __html: header }}
                key={`${header}-${index}`}
                className={index > 0 ? "ml-2" : ""}
              />
            ))}
          </h1>
        ) : (
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            § {paragraph}
          </h1>
        )}
      </header>

      {/* Content */}
      {paragraphData ? (
        <article className="mb-16">
          <div className="space-y-5 text-lg leading-relaxed text-gray-700">
            {paragraphData.content.map((content, index) => (
              <div
                dangerouslySetInnerHTML={{ __html: content }}
                key={`content-${index}`}
              />
            ))}
          </div>
          {paragraphData.footnotes.length > 0 && (
            <div className="mt-12 border-t-2 border-gray-100 pt-8">
              <div className="mb-4 text-xs font-bold tracking-widest text-gray-400 uppercase">
                Fußnoten
              </div>
              {paragraphData.footnotes.map((footnote, index) => (
                <div
                  className="text-sm text-gray-500"
                  dangerouslySetInnerHTML={{ __html: footnote }}
                  key={`footnote-${index}`}
                />
              ))}
            </div>
          )}
        </article>
      ) : (
        <UnavailableState
          law={law}
          paragraph={paragraph}
          sourceUrl={sourceUrl}
        />
      )}

      {/* Navigation */}
      <nav className="flex items-center justify-between border-t border-gray-100 pt-6">
        <NavigationButton
          law={law}
          paragraph={paragraphData?.backward}
          direction="back"
        >
          Zurück
        </NavigationButton>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-gray-300 hover:text-gray-500"
        >
          Quelle
        </a>
        <NavigationButton
          law={law}
          paragraph={paragraphData?.forward}
          direction="forward"
        >
          Weiter
        </NavigationButton>
      </nav>
    </div>
  );
}

interface NavigationButtonProps {
  law?: string;
  paragraph?: string;
  children: React.ReactNode;
  direction: "back" | "forward";
}

function NavigationButton({
  law,
  paragraph,
  children,
  direction,
}: NavigationButtonProps) {
  if (!law || !paragraph) return <div className="w-24" />;
  return (
    <Link
      href={`/${law}/${paragraph}`}
      className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
    >
      {direction === "back" && (
        <>
          <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-400">
            J
          </kbd>
          <span>←</span>
        </>
      )}
      {children}
      {direction === "forward" && (
        <>
          <span>→</span>
          <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-400">
            L
          </kbd>
        </>
      )}
    </Link>
  );
}

interface UnavailableStateProps {
  law: string;
  paragraph: string;
  sourceUrl: string;
}

function UnavailableState({
  law,
  paragraph,
  sourceUrl,
}: UnavailableStateProps) {
  return (
    <div className="space-y-4 text-sm text-gray-600">
      <p>
        {`§ ${paragraph} aus dem ${law.toUpperCase()} konnte gerade nicht geladen werden.`}
      </p>
      <p>Bitte versuche es erneut oder öffne das Originaldokument.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/">Zur Startseite</Link>
        </Button>
        <Button asChild>
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            Original öffnen
          </a>
        </Button>
      </div>
    </div>
  );
}

// // Generate all possible laws and paragraphs
// export async function getStaticPaths({ law, paragraph }) {
//   console.log(law, paragraph);
//   // Call an external API endpoint to get posts
//   const res = await fetch(
//     `https://www.gesetze-im-internet.de/{law}/__{paragraph}.html`
//   );
//   console.log(response);
// }
