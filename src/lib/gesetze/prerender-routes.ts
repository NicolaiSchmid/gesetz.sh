import prerenderManifest from "@/generated/law-prerender-manifest.json";

export interface PrerenderManifestLaw {
  code: string;
  paragraphs?: string[];
}

export interface PrerenderManifest {
  generatedAt?: string;
  sourceLawIndexGeneratedAt?: string | null;
  lawCount?: number;
  routeCount?: number;
  laws?: PrerenderManifestLaw[];
}

const manifest = prerenderManifest as PrerenderManifest;

const prerenderedParagraphsByLaw = new Map(
  (manifest.laws ?? []).map((law) => [law.code, new Set(law.paragraphs ?? [])]),
);

export function getPrerenderManifest(): PrerenderManifest {
  return manifest;
}

export function isPrerenderedRoute(law: string, paragraph: string): boolean {
  return prerenderedParagraphsByLaw.get(law)?.has(paragraph) ?? false;
}
