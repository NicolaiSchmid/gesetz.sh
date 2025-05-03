import flatten from "lodash-es/flatten";
import Link from "next/link";
import { parse } from "node-html-parser";

import Navigate from "@/app/_components/Navigate";
import KeyboardNavigation from "./KeyboardNavigation";

const DOMAIN = "https://www.gesetze-im-internet.de";

interface DisplayProps {
  params: {
    law: string;
    paragraph: string;
  };
}

function getLinkHref(element: Element | null): string | undefined {
  if (!element) return undefined;

  const originalLink = element.getAttribute("href");
  return originalLink?.match(/__(.+)\.html/)?.[1] ?? undefined;
}

export default async function Display({ params }: DisplayProps) {
  const { law, paragraph } = params;

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
        <div className="mx-auto w-full rounded-lg bg-white px-5 pt-5 pb-10 text-gray-800 shadow-lg">
          <div className="flex w-full justify-between pt-1 pb-5">
            <div>
              {headers.map((header) => (
                <h2
                  className="text-lg"
                  dangerouslySetInnerHTML={{ __html: header }}
                  key={header}
                />
              ))}
            </div>
          </div>
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
        </div>
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
    <Link
      href={`/${law}/${paragraph}`}
      className="focus:shadow-outline-indigo rounded-md border border-transparent px-1 py-1 text-sm leading-2 font-medium hover:bg-indigo-500 hover:text-white focus:border-indigo-700 focus:outline-none active:bg-indigo-700"
    >
      {children}
    </Link>
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
