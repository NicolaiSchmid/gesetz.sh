import fs from "node:fs/promises";
import path from "node:path";

export interface LawDirectoryEntry {
  code: string;
  title: string;
  description?: string;
}

interface LawDirectoryFile {
  generatedAt: string;
  laws: LawDirectoryEntry[];
}

let cache: Promise<LawDirectoryFile> | null = null;

async function readLawDirectoryFile(): Promise<LawDirectoryFile> {
  const filePath = path.resolve(".next/cache/law-index.json");

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as LawDirectoryFile;
  } catch (error) {
    console.warn(
      "Law directory file missing or unreadable, continuing with empty list",
      error,
    );
    return { generatedAt: new Date().toISOString(), laws: [] };
  }
}

export function loadLawDirectory() {
  cache ??= readLawDirectoryFile();
  return cache;
}
