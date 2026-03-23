import { createFileRoute } from "@tanstack/react-router";

import { contentType, generateOGImage } from "@/lib/og";

export const Route = createFileRoute("/opengraph-image")({
  server: {
    handlers: {
      GET: async () =>
        await generateOGImage({
          title: "Deutsche Gesetze schnell durchsuchen",
          subtitle: "Gesetz.sh",
        }),
    },
  },
});

void contentType;
