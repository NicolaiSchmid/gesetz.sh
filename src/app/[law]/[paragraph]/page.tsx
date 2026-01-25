import flatten from "lodash-es/flatten";
import Link from "next/link";
import { parse, type HTMLElement } from "node-html-parser";

import Navigate from "@/app/_components/Navigate";
import KeyboardNavigation from "./KeyboardNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadLawDirectory } from "@/lib/law-directory";
import { env } from "@/env";

const DOMAIN = "https://www.gesetze-im-internet.de";
const REQUEST_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) GesetzeNext/1.0 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
};

const paragraphReferenceRegex = /(§{1,2})\s*(\d+[a-zA-Z]*)/g;

function linkifyParagraphReferences(htmlContent: string, law: string) {
  return htmlContent.replace(
    paragraphReferenceRegex,
    (match: string, symbol: string, paragraph: string) => {
      if (!paragraph) return match;
      const slug = paragraph.toLowerCase();
      const label = `${symbol} ${paragraph}`.trim();
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

    const text = await response.text();
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
  const lawDirectory = await loadLawDirectory();
  const paragraphData = await fetchParagraphData(law, paragraph);
  const sourceUrl = buildSourceUrl(law, paragraph);
  const hasHeaders = Boolean(paragraphData?.headers?.length);

  return (
    <div className="flex-inline items-center justify-center px-5 py-5">
      <div className="mx-auto w-full" style={{ maxWidth: "700px" }}>
        <Navigate
          law={law}
          paragraph={paragraph}
          lawDirectory={lawDirectory.laws}
        />
        <KeyboardNavigation
          law={law}
          backward={paragraphData?.backward}
          forward={paragraphData?.forward}
        />
        <Card className="mx-auto w-full">
          <CardHeader>
            <CardTitle>
              {hasHeaders && paragraphData ? (
                paragraphData.headers.map((header, index) => (
                  <h2
                    className="text-lg"
                    dangerouslySetInnerHTML={{ __html: header }}
                    key={`${header}-${index}`}
                  />
                ))
              ) : (
                <h2 className="text-lg">
                  {`${law.toUpperCase()} § ${paragraph}`}
                </h2>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paragraphData ? (
              <>
                <div className="mb-10 w-full">
                  {paragraphData.content.map((content, index) => (
                    <div
                      className="m-2 px-5 text-sm text-gray-600"
                      dangerouslySetInnerHTML={{ __html: content }}
                      key={`content-${index}`}
                    />
                  ))}
                </div>
                <div className="w-full">
                  {paragraphData.footnotes.map((footnote, index) => (
                    <div
                      className="text-md text-gray-600"
                      dangerouslySetInnerHTML={{ __html: footnote }}
                      key={`footnote-${index}`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <UnavailableState
                law={law}
                paragraph={paragraph}
                sourceUrl={sourceUrl}
              />
            )}
            <div className="flex w-full justify-between pt-6">
              <NavigationButton law={law} paragraph={paragraphData?.backward}>
                Zurück
              </NavigationButton>
              <NavigationButton law={law} paragraph={paragraphData?.forward}>
                Vor
              </NavigationButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface NavigationButtonProps {
  law?: string;
  paragraph?: string;
  children: React.ReactNode;
}

function NavigationButton({ law, paragraph, children }: NavigationButtonProps) {
  if (!law || !paragraph) return <div />;
  return (
    <Button variant="outline" asChild>
      <Link href={`/${law}/${paragraph}`}>{children}</Link>
    </Button>
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
