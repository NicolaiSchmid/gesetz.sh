import DOMParser from "dom-parser";
import flatten from "lodash/flatten";
import Link from "next/link";
import { useHotkeys } from "react-hotkeys-hook";
import { useRouter } from "next/router";

import Flag from "../../components/Flag";
import Navigate from "../../components/Navigate";

import BookmarkButton from "../../components/BookmarkButton";

import crawlLaws from "../../lib/crawlLaws";

const DOMAIN = "https://www.gesetze-im-internet.de";
export default function Display({
  headers = [],
  content = [],
  footnotes = [],
  forward,
  backward,
  law,
  paragraph,
}) {
  const router = useRouter();
  // Previous paragraph
  useHotkeys(
    "j",
    (event) => {
      event.preventDefault();

      if (!law || !backward) return;

      router.push(`/${law}/${backward}`);
    },
    [backward, router]
  );

  // Next paragraph
  useHotkeys(
    "l",
    (event) => {
      event.preventDefault();

      if (!law || !forward) return;

      router.push(`/${law}/${forward}`);
    },
    [backward, router]
  );

  return (
    <div className="min-w-screen min-h-screen bg-gray-200 ">
      <Flag />
      <div className="flex-inline items-center justify-center px-5 py-5">
        <div className="w-full mx-auto" style={{ maxWidth: "700px" }}>
          <Navigate law={law} paragraph={paragraph} />
          <div className="w-full mx-auto rounded-lg bg-white shadow-lg px-5 pt-5 pb-10 text-gray-800">
            <div className="w-full pt-1 pb-5 flex justify-between">
              <div>
                {headers.map((header) => (
                  <h2
                    className="text-lg"
                    dangerouslySetInnerHTML={{ __html: header }}
                    key={header}
                  />
                ))}
              </div>
              <BookmarkButton bookmark={`/${law}/${paragraph}`} />
            </div>
            <div className="w-full mb-10">
              {content.map((content) => (
                <div
                  className="text-sm text-gray-600px-5 m-2"
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
            <div className="w-full flex justify-between">
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
    </div>
  );
}

function NavigationButton({ law, paragraph, children }) {
  if (!law || !paragraph) return <div />;
  return (
    <Link href={`/${law}/${paragraph}`}>
      <a className="px-1 py-1 border border-transparent text-sm leading-2 font-medium rounded-md hover:bg-indigo-500 hover:text-white focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700">
        {children}
      </a>
    </Link>
  );
}

function getLinkHref(element) {
  if (!element || !element.attributes) return null;

  const originalLink = element.attributes
    .map((attribute) => (attribute.name === "href" ? attribute.value : null))
    .filter(Boolean)[0];

  return originalLink.match(/__(.+)\.html/)[1];
}

export async function getServerSideProps({ params: { law, paragraph } }) {
  const domparser = new DOMParser();

  const html = await fetch(
    `${DOMAIN}/${law.toLowerCase()}/__${paragraph.toLowerCase()}.html`
  )
    .then((response) => response.text())
    .then((response) => domparser.parseFromString(response));

  const headers = flatten(
    html
      .getElementsByClassName("jnheader")
      .map((header) =>
        header.getElementsByTagName("h1").map((heading) => heading.innerHTML)
      )
  );
  const content = html
    .getElementsByClassName("jurAbsatz")
    .map((content) => content.innerHTML);
  const footnotes = html
    .getElementsByClassName("jnfussnote")
    .map((footnote) => footnote.innerHTML);

  const backward = getLinkHref(
    html.getElementById("blaettern_zurueck").firstChild
  );
  const forward = getLinkHref(
    html.getElementById("blaettern_weiter").firstChild
  );

  return {
    props: { headers, content, footnotes, forward, backward, law, paragraph },
  };
}

// Generate all possible laws and paragraphs
export async function getStaticPaths() {
  // console.log(law, paragraph);
  // // Call an external API endpoint to get posts
  // const res = await fetch(
  //   `https://www.gesetze-im-internet.de/{law}/__{paragraph}.html`
  // );
  // console.log(response);

  const laws = await crawlLaws();
  const articles = await Promise.all(
    laws.map(async (law) => {
      const { paragraphs } = await crawlArticles(law);

      return paragraphs.map((paragraph) => ({
        law,
        paragraph,
      }));
    })
  );

  return {
    paths: articles.map((article) => ({ params: article })),
    fallback: true,
  };
}
