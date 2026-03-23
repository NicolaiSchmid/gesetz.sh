import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";

import appCss from "../styles/globals.css?url";
import { Header } from "../app/_components/Header";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Gesetz.sh - Deutsche Gesetze schnell durchsuchen",
      },
      {
        name: "description",
        content:
          "Alle deutschen Gesetze und Verordnungen schnell durchsuchbar. BGB, StGB, HGB und über 6.800 weitere Gesetze mit Keyboard-Navigation.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="min-h-screen min-w-screen">
          <div className="sticky top-0 flex h-2 w-full justify-evenly">
            <div className="h-full w-full bg-black" />
            <div className="h-full w-full bg-red-600" />
            <div className="h-full w-full bg-yellow-400" />
          </div>
          <Header />
          <div>{children}</div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
