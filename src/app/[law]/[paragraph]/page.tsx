import flatten from "lodash-es/flatten";
import Link from "next/link";
import { parse } from "node-html-parser";

import Navigate from "@/app/_components/Navigate";
import KeyboardNavigation from "./KeyboardNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DOMAIN = "https://www.gesetze-im-internet.de";

function getLinkHref(element: Element | null): string | undefined {
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

  const response = await fetch(
    `${DOMAIN}/${law.toLowerCase()}/__${paragraph.toLowerCase()}.html`,
  );
  const text = await response.text();
  const html = parse(text);

  const headers = flatten(
    html
      .querySelectorAll(".jnheader")
      .map(
        (header) =>
          header
            .querySelectorAll("h1")
            .map((heading) => heading.innerHTML ?? "") ?? [],
      ),
  );

  const content = html
    .querySelectorAll(".jurAbsatz")
    .map((content) => content.innerHTML ?? "");

  const footnotes = html
    .querySelectorAll(".jnfussnote")
    .map((footnote) => footnote.innerHTML ?? "");

  const backward = getLinkHref(
    (html.querySelector("#blaettern_zurueck")
      ?.firstChild as unknown as Element) ?? null,
  );

  const forward = getLinkHref(
    (html.querySelector("#blaettern_weiter")
      ?.firstChild as unknown as Element) ?? null,
  );

  return (
    <div className="flex-inline items-center justify-center px-5 py-5">
      <div className="mx-auto w-full" style={{ maxWidth: "700px" }}>
        <Navigate law={law} paragraph={paragraph} />
        <KeyboardNavigation law={law} backward={backward} forward={forward} />
        <Card className="mx-auto w-full">
          <CardHeader>
            <CardTitle>
              {headers.map((header) => (
                <h2
                  className="text-lg"
                  dangerouslySetInnerHTML={{ __html: header }}
                  key={header}
                />
              ))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-10 w-full">
              {content.map((content) => (
                <div
                  className="text-gray-600px-5 m-2 text-sm"
                  dangerouslySetInnerHTML={{ __html: content }}
                  key={content}
                />
              ))}
            </div>
            <div className="w-full">
              {footnotes.map((footnote) => (
                <div
                  className="text-md text-gray-600"
                  dangerouslySetInnerHTML={{ __html: footnote }}
                  key={footnote}
                />
              ))}
            </div>
            <div className="flex w-full justify-between">
              <NavigationButton law={law} paragraph={backward}>
                Zurück
              </NavigationButton>
              <NavigationButton law={law} paragraph={forward}>
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

// // Generate all possible laws and paragraphs
// export async function getStaticPaths({ law, paragraph }) {
//   console.log(law, paragraph);
//   // Call an external API endpoint to get posts
//   const res = await fetch(
//     `https://www.gesetze-im-internet.de/{law}/__{paragraph}.html`
//   );
//   console.log(response);
// }
