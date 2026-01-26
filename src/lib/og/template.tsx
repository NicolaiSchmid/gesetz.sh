import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { OG_COLORS, OG_CONTENT_TYPE, OG_IMAGE_SIZE } from "./constants";

export type OGImageProps = {
  /** Main title displayed prominently (law content truncated) */
  title: string;
  /** Subtitle (e.g., "BGB § 433") */
  subtitle?: string;
};

/**
 * Generates an Open Graph image with Gesetz.sh branding.
 */
export async function generateOGImage({
  title,
  subtitle,
}: OGImageProps): Promise<ImageResponse> {
  const [headlineFont, bodyFont] = await Promise.all([
    readFile(join(process.cwd(), "public/og-font-source-serif-4.ttf")),
    readFile(join(process.cwd(), "public/og-font-source-sans-3.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: OG_COLORS.background,
          padding: "60px 80px",
          fontFamily: "Source Sans 3",
        }}
      >
        {/* German flag stripe at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            display: "flex",
          }}
        >
          <div style={{ flex: 1, backgroundColor: OG_COLORS.flag.black }} />
          <div style={{ flex: 1, backgroundColor: OG_COLORS.flag.red }} />
          <div style={{ flex: 1, backgroundColor: OG_COLORS.flag.gold }} />
        </div>

        {/* Header with logo and domain */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            marginTop: "20px",
          }}
        >
          {/* Logo text */}
          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: OG_COLORS.foreground,
              fontFamily: "Source Sans 3",
            }}
          >
            Gesetz.sh
          </div>

          {/* Domain badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: OG_COLORS.foreground,
              padding: "10px 20px",
              borderRadius: "9999px",
              fontSize: "20px",
              fontWeight: 600,
              color: OG_COLORS.background,
            }}
          >
            Deutsche Gesetze
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            gap: "24px",
          }}
        >
          {/* Large serif title */}
          <div
            style={{
              fontSize: "72px",
              fontWeight: 700,
              fontFamily: "Source Serif 4",
              color: OG_COLORS.foreground,
              lineHeight: 1.1,
              maxWidth: "1000px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>

          {/* Subtitle (law code + paragraph) */}
          {subtitle && (
            <div
              style={{
                fontSize: "36px",
                fontFamily: "Source Sans 3",
                color: OG_COLORS.muted,
                fontWeight: 500,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...OG_IMAGE_SIZE,
      fonts: [
        {
          name: "Source Serif 4",
          data: headlineFont,
          style: "normal",
          weight: 700,
        },
        {
          name: "Source Sans 3",
          data: bodyFont,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}

/** Re-export size and content type for opengraph-image.tsx files */
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;
