export interface LawDirectoryEntry {
  code: string;
  title: string;
  fullTitle?: string;
  description?: string;
}

interface LawDirectoryFile {
  generatedAt: string;
  laws: LawDirectoryEntry[];
}

// Import the generated JSON directly - this ensures it's bundled fresh each build
import lawIndexData from "@/generated/law-index.json";

export function loadLawDirectory(): LawDirectoryFile {
  return lawIndexData as LawDirectoryFile;
}
