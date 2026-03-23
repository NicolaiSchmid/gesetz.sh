import { ImageResponse } from "workers-og";
import { OG_COLORS, OG_CONTENT_TYPE, OG_IMAGE_SIZE } from "./constants";

export type OGImageProps = {
  /** Main title displayed prominently (law content truncated) */
  title: string;
  /** Subtitle (e.g., "BGB § 433") */
  subtitle?: string;
};

export async function generateOGImage({
  title,
  subtitle,
}: OGImageProps): Promise<Response> {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          background: OG_COLORS.background,
          color: OG_COLORS.foreground,
          padding: "60px 80px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            height: "8px",
            display: "flex",
          }}
        >
          <div
            style={{ display: "flex", flex: 1, background: OG_COLORS.flag.black }}
          />
          <div
            style={{ display: "flex", flex: 1, background: OG_COLORS.flag.red }}
          />
          <div
            style={{ display: "flex", flex: 1, background: OG_COLORS.flag.gold }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "20px",
          }}
        >
          <div style={{ display: "flex", fontSize: "32px", fontWeight: 700 }}>
            Gesetz.sh
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: OG_COLORS.foreground,
              color: OG_COLORS.background,
              borderRadius: "9999px",
              padding: "10px 20px",
              fontSize: "20px",
              fontWeight: 600,
            }}
          >
            Deutsche Gesetze
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              maxWidth: "1000px",
              fontSize: "72px",
              lineHeight: 1.1,
              fontWeight: 700,
              fontFamily: "Georgia, ui-serif, serif",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                display: "flex",
                fontSize: "36px",
                fontWeight: 500,
                color: OG_COLORS.muted,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    ),
    OG_IMAGE_SIZE,
  );
}

/** Re-export size and content type for opengraph-image.tsx files */
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;
