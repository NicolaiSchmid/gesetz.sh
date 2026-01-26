/**
 * Open Graph image configuration constants.
 */

/** Standard OG image dimensions (recommended by most platforms) */
export const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

/** Content type for generated images */
export const OG_CONTENT_TYPE = "image/png" as const;

/**
 * Brand colors for OG images.
 * Clean monochrome design with German flag accent.
 */
export const OG_COLORS = {
  /** Light background */
  background: "#fafafa",
  /** Primary text (dark) */
  foreground: "#0a0a0a",
  /** Muted text */
  muted: "#6b7280",
  /** German flag colors */
  flag: {
    black: "#000000",
    red: "#dd0000",
    gold: "#ffcc00",
  },
} as const;
