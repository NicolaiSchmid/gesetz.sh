import { contentType, generateOGImage, size } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Gesetz.sh - Deutsche Gesetze schnell durchsuchen";
export { contentType, size };

export default async function Image() {
  return generateOGImage({
    title: "Deutsche Gesetze schnell durchsuchen",
    subtitle: "Gesetz.sh",
  });
}
