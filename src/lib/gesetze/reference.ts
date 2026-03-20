import type { LawDirectoryEntry } from "./law-directory";

export interface AliasEntry {
  token: string;
  code: string;
}

export interface ResolvedLawReference {
  law?: string;
  paragraph?: string;
  resolutionMethod:
    | "empty"
    | "alias-prefix"
    | "fallback-numeric"
    | "split-symbol"
    | "raw";
}

export function normalizeLawCode(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeParagraphId(value: string): string {
  return value.trim().toLowerCase();
}

export function buildCanonicalPath(law: string, paragraph: string): string {
  return `/${normalizeLawCode(law)}/${normalizeParagraphId(paragraph)}`;
}

export function buildCanonicalUrl(law: string, paragraph: string): string {
  return `https://gesetz.sh${buildCanonicalPath(law, paragraph)}`;
}

export function buildParagraphCitation(law: string, paragraph: string): string {
  return `${normalizeLawCode(law).toUpperCase()} § ${normalizeParagraphId(paragraph)}`;
}

export function buildLawAliasEntries(
  lawDirectory: LawDirectoryEntry[],
): AliasEntry[] {
  const entries: AliasEntry[] = [];

  for (const law of lawDirectory) {
    const aliasTokens = new Set<string>();
    aliasTokens.add(law.code);
    aliasTokens.add(law.title);
    if (law.fullTitle) aliasTokens.add(law.fullTitle);
    if (law.description) aliasTokens.add(law.description);

    const textToSplit = `${law.fullTitle ?? ""} ${law.description ?? ""}`;
    const keywords = textToSplit.split(/[^a-zA-Zäöüß0-9]+/i).filter(Boolean);

    for (const keyword of keywords) {
      aliasTokens.add(keyword);
    }

    for (const token of aliasTokens) {
      const normalized = token.replace(/\s+/g, "").toLowerCase();
      if (normalized.length < 2) continue;
      entries.push({ token: normalized, code: law.code });
    }
  }

  return entries.sort((a, b) => b.token.length - a.token.length);
}

export function resolveLawReference(
  raw: string,
  aliasEntries: AliasEntry[],
  fallbackLaw?: string,
): ResolvedLawReference {
  let sanitized = raw.replace(/\s+/g, "").toLowerCase();
  if (!sanitized) {
    return { paragraph: undefined, resolutionMethod: "empty" };
  }

  let detectedLaw: string | undefined;
  for (const { token, code } of aliasEntries) {
    if (sanitized.startsWith(token) && token.length > 0) {
      detectedLaw = code;
      sanitized = sanitized.slice(token.length);
      break;
    }
  }

  if (sanitized.startsWith("§")) {
    sanitized = sanitized.slice(1);
  }

  if (!sanitized.includes("§")) {
    const pattern = /^([a-zäöüß]+)?(\d.*)$/i;
    const match = pattern.exec(sanitized);
    if (match) {
      return {
        law: match[1] ?? detectedLaw ?? fallbackLaw,
        paragraph: match[2],
        resolutionMethod: detectedLaw ? "alias-prefix" : "fallback-numeric",
      };
    }

    return {
      law: detectedLaw ?? fallbackLaw,
      paragraph: sanitized,
      resolutionMethod: detectedLaw ? "alias-prefix" : "raw",
    };
  }

  const parts = sanitized.split("§").filter(Boolean);
  if (parts.length === 0) {
    return { paragraph: undefined, resolutionMethod: "empty" };
  }

  const lawFromInput = parts.length > 1 ? parts[0] : undefined;
  const detectedParagraph = parts[parts.length - 1];

  return {
    law: detectedLaw ?? lawFromInput ?? fallbackLaw,
    paragraph: detectedParagraph,
    resolutionMethod: "split-symbol",
  };
}

export function extractSimpleCitations(
  text: string,
  currentLaw?: string,
): Array<{
  match: string;
  paragraph: string;
  law?: string;
  citation?: string;
  start: number;
  end: number;
}> {
  const pattern = /(§{1,2})\s*(\d+[a-zA-Z]*)/g;
  const results: Array<{
    match: string;
    paragraph: string;
    law?: string;
    citation?: string;
    start: number;
    end: number;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const paragraph = normalizeParagraphId(match[2] ?? "");
    if (!paragraph) continue;

    const law = currentLaw ? normalizeLawCode(currentLaw) : undefined;
    results.push({
      match: match[0],
      paragraph,
      law,
      citation: law ? buildParagraphCitation(law, paragraph) : undefined,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return results;
}
