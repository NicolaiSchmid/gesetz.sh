import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import KeyboardNavigation from "@/app/[law]/[paragraph]/KeyboardNavigation";
import { Button } from "@/components/ui/button";
import {
  buildParagraphSourceUrl,
  fetchParagraphRecord,
} from "@/lib/gesetze/paragraph-source";
import { buildCanonicalUrl } from "@/lib/gesetze/reference";
import { SOURCE_REVALIDATE_SECONDS } from "@/lib/source-cache";

const paragraphParamsSchema = z.object({
  law: z.string().trim().min(1),
  paragraph: z.string().trim().min(1),
});

const getParagraph = createServerFn({ method: "GET" })
  .inputValidator((input) => paragraphParamsSchema.parse(input))
  .handler(async ({ data }) => {
    const paragraphData = await fetchParagraphRecord(data.law, data.paragraph, {
      revalidateSeconds: SOURCE_REVALIDATE_SECONDS,
    });

    return {
      law: data.law,
      paragraph: data.paragraph,
      paragraphData,
      sourceUrl:
        paragraphData?.sourceUrl ??
        buildParagraphSourceUrl(data.law, data.paragraph),
      canonicalUrl:
        paragraphData?.canonicalUrl ??
        buildCanonicalUrl(data.law, data.paragraph),
    };
  });

export const Route = createFileRoute("/$law/$paragraph")({
  loader: async ({ params }) => await getParagraph({ data: params }),
  head: ({ loaderData, params }) => {
    const lawUpper = params.law.toUpperCase();
    const title = `${lawUpper} § ${params.paragraph}`;
    const description = `${lawUpper} § ${params.paragraph} - Gesetzestext online lesen auf Gesetz.sh`;
    const canonicalUrl =
      loaderData?.canonicalUrl ?? `https://gesetz.sh/${params.law}/${params.paragraph}`;
    const ogImageUrl = `${canonicalUrl}/opengraph-image`;

    return {
      meta: [
        { title: `${title} | Gesetz.sh` },
        { name: "description", content: description },
        { property: "og:title", content: `${title} | Gesetz.sh` },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        {
          property: "og:url",
          content: canonicalUrl,
        },
        { property: "og:image", content: ogImageUrl },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${title} | Gesetz.sh` },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImageUrl },
      ],
      links: [{ rel: "canonical", href: canonicalUrl }],
    };
  },
  component: LawParagraphPage,
});

function LawParagraphPage() {
  const { law, paragraph, paragraphData, sourceUrl } = Route.useLoaderData();
  const hasHeaders = Boolean(paragraphData?.headers?.length);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <KeyboardNavigation
        law={law}
        backward={paragraphData?.navigation.previous}
        forward={paragraphData?.navigation.next}
      />

      <nav className="mb-10 flex items-center gap-2 text-sm">
        <Link to="/" className="text-gray-400 hover:text-gray-900">
          Gesetze
        </Link>
        <span className="text-gray-300">/</span>
        <Link
          to="/$law/$paragraph"
          params={{ law, paragraph: "1" }}
          className="text-gray-400 hover:text-gray-900"
        >
          {law.toUpperCase()}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-900">§ {paragraph}</span>
      </nav>

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
      to="/$law/$paragraph"
      params={{ law, paragraph }}
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
          <Link to="/">Zur Startseite</Link>
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
