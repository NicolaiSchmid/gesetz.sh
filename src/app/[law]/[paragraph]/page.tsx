import type { Metadata } from "next";
import Link from "next/link";

import KeyboardNavigation from "./KeyboardNavigation";
import { Button } from "@/components/ui/button";
import { getPrerenderManifest } from "@/lib/gesetze/prerender-routes";
import {
  buildParagraphSourceUrl,
  fetchParagraphRecord,
} from "@/lib/gesetze/paragraph-source";
import { SOURCE_REVALIDATE_SECONDS } from "@/lib/source-cache";

export const dynamic = "force-static";
export const dynamicParams = true;
export const revalidate = SOURCE_REVALIDATE_SECONDS;

export function generateStaticParams(): PageParams[] {
  const manifest = getPrerenderManifest();

  return (manifest.laws ?? []).flatMap((law) =>
    (law.paragraphs ?? []).map((paragraph) => ({
      law: law.code,
      paragraph,
    })),
  );
}

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
  const lawUpper = law.toUpperCase();
  const title = `${lawUpper} § ${paragraph}`;
  const description = `${lawUpper} § ${paragraph} - Gesetzestext online lesen auf Gesetz.sh`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Gesetz.sh`,
      description,
      type: "article",
      url: `https://gesetz.sh/${law}/${paragraph}`,
    },
    twitter: {
      card: "summary",
      title: `${title} | Gesetz.sh`,
      description,
    },
  };
}

function buildSourceUrl(law: string, paragraph: string) {
  return buildParagraphSourceUrl(law, paragraph);
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
  const paragraphData = await fetchParagraphRecord(law, paragraph, {
    revalidateSeconds: SOURCE_REVALIDATE_SECONDS,
  });
  const sourceUrl = buildSourceUrl(law, paragraph);
  const hasHeaders = Boolean(paragraphData?.headers?.length);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <KeyboardNavigation
        law={law}
        backward={paragraphData?.navigation.previous}
        forward={paragraphData?.navigation.next}
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
                dangerouslySetInnerHTML={{ __html: header.html }}
                key={`${header.text}-${index}`}
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
                dangerouslySetInnerHTML={{ __html: content.html }}
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
                  dangerouslySetInnerHTML={{ __html: footnote.html }}
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
          paragraph={paragraphData?.navigation.previous}
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
          paragraph={paragraphData?.navigation.next}
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
