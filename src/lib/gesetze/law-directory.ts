import lawIndexData from "../../generated/law-index.json" with { type: "json" };

export interface LawDirectoryEntry {
  code: string;
  title: string;
  fullTitle?: string;
  description?: string;
}

export interface LawDirectoryFile {
  generatedAt: string;
  laws: LawDirectoryEntry[];
}

const lawDirectoryData = lawIndexData as LawDirectoryFile;

function normalizeLawSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9äöüß]+/gi, "");
}

function getLawSearchTokens(law: LawDirectoryEntry): string[] {
  return [
    law.code,
    law.title,
    law.fullTitle ?? "",
    law.description ?? "",
  ].filter(Boolean);
}

function scoreLawMatch(law: LawDirectoryEntry, query: string): number {
  const normalizedQuery = normalizeLawSearchText(query);
  if (!normalizedQuery) return 1;

  const tokens = getLawSearchTokens(law);
  const normalizedCode = normalizeLawSearchText(law.code);
  const normalizedTokens = tokens.map(normalizeLawSearchText);

  if (normalizedCode === normalizedQuery) return 1000;
  if (normalizedTokens.some((token) => token === normalizedQuery)) return 900;
  if (normalizedCode.startsWith(normalizedQuery)) return 800;
  if (normalizedTokens.some((token) => token.startsWith(normalizedQuery))) {
    return 700;
  }

  const substringIndex = normalizedTokens
    .map((token) => token.indexOf(normalizedQuery))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (substringIndex !== undefined) {
    return 600 - substringIndex;
  }

  return 0;
}

export function loadLawDirectory(): LawDirectoryFile {
  return lawDirectoryData;
}

export function findLawByCode(code: string): LawDirectoryEntry | undefined {
  const normalizedCode = code.trim().toLowerCase();
  return lawDirectoryData.laws.find((law) => law.code === normalizedCode);
}

export function searchLawDirectory(
  laws: LawDirectoryEntry[],
  query: string,
  limit = 10,
): LawDirectoryEntry[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return laws.slice(0, limit);
  }

  return laws
    .map((law) => ({ law, score: scoreLawMatch(law, trimmedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.law.code.localeCompare(b.law.code))
    .slice(0, limit)
    .map((entry) => entry.law);
}

export function getLawEntryPath(code: string): string {
  return `/${code.toLowerCase()}/1`;
}

export function getLawCanonicalUrl(code: string): string {
  return `https://gesetz.sh${getLawEntryPath(code)}`;
}

export function normalizeLawQuery(value: string): string {
  return normalizeLawSearchText(value);
}
