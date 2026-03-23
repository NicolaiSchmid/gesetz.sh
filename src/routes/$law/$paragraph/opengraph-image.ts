import { createFileRoute } from "@tanstack/react-router";

import { generateOGImage } from "@/lib/og";
import { loadLawDirectory } from "@/lib/law-directory";

function truncateTitle(title: string) {
  return title.length > 80 ? `${title.slice(0, 77)}...` : title;
}

export const Route = createFileRoute("/$law/$paragraph/opengraph-image")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { laws } = loadLawDirectory();
        const lawEntry = laws.find(
          (law) => law.code.toLowerCase() === params.law.toLowerCase(),
        );
        const lawUpper = params.law.toUpperCase();
        const title =
          lawEntry?.fullTitle ?? lawEntry?.title ?? lawUpper;

        return await generateOGImage({
          title: truncateTitle(title),
          subtitle: `${lawUpper} § ${params.paragraph}`,
        });
      },
    },
  },
});
