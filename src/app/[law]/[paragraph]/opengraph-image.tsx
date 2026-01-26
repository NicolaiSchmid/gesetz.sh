import { contentType, generateOGImage, size } from "@/lib/og";
import { loadLawDirectory } from "@/lib/law-directory";

export const runtime = "nodejs";
export { contentType, size };

export function generateImageMetadata({
  params,
}: {
  params: { law: string; paragraph: string };
}) {
  return [
    {
      id: "og",
      alt: `${params.law.toUpperCase()} § ${params.paragraph} | Gesetz.sh`,
    },
  ];
}

export default async function Image({
  params,
}: {
  params: { law: string; paragraph: string };
}) {
  const { law, paragraph } = params;
  const lawUpper = law.toUpperCase();

  // Try to get full law title
  const { laws } = loadLawDirectory();
  const lawEntry = laws.find((l) => l.code.toLowerCase() === law.toLowerCase());

  // Use full title if available, otherwise just the code
  const title = lawEntry?.fullTitle ?? lawEntry?.title ?? lawUpper;

  // Truncate title if too long
  const truncatedTitle =
    title.length > 80 ? `${title.substring(0, 77)}...` : title;

  return generateOGImage({
    title: truncatedTitle,
    subtitle: `${lawUpper} § ${paragraph}`,
  });
}
