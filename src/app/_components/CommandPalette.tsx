"use client";

import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useRouter, usePathname } from "next/navigation";
import { Search, BookOpenText, Landmark } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LawDirectoryEntry } from "@/lib/law-directory";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

const QUICK_LINKS = [
  { label: "HGB § 1", value: "hgb§1", description: "Handelsgesetzbuch" },
  { label: "BGB § 433", value: "bgb§433", description: "Kaufvertrag" },
  { label: "StGB § 242", value: "stgb§242", description: "Diebstahl" },
];

interface AliasEntry {
  token: string;
  code: string;
}

function buildAliasEntries(lawDirectory: LawDirectoryEntry[]): AliasEntry[] {
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

function processEntry(
  raw: string,
  aliasEntries: AliasEntry[],
  fallbackLaw?: string,
) {
  let sanitized = raw.replace(/\s+/g, "").toLowerCase();
  if (!sanitized) return { paragraph: undefined };

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
      };
    }
    return { law: detectedLaw ?? fallbackLaw, paragraph: sanitized };
  }

  const parts = sanitized.split("§").filter(Boolean);
  if (parts.length === 0) return { paragraph: undefined };

  const lawFromInput = parts.length > 1 ? parts[0] : undefined;
  const detectedParagraph = parts[parts.length - 1];

  return {
    law: detectedLaw ?? lawFromInput ?? fallbackLaw,
    paragraph: detectedParagraph,
  };
}

interface CommandPaletteProps {
  lawDirectory: LawDirectoryEntry[];
}

export function CommandPalette({ lawDirectory }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  // Extract current law/paragraph from pathname
  const pathPattern = /^\/([^/]+)\/([^/]+)/;
  const pathMatch = pathPattern.exec(pathname);
  const currentLaw = pathMatch?.[1];
  const currentParagraph = pathMatch?.[2];

  const aliasEntries = React.useMemo(
    () => buildAliasEntries(lawDirectory),
    [lawDirectory],
  );
  const normalizedTextQuery = React.useMemo(
    () => query.replace(/[^a-zäöüß]/gi, "").toLowerCase(),
    [query],
  );

  useHotkeys(
    "meta+k, ctrl+k",
    (event) => {
      event.preventDefault();
      setOpen(true);
    },
    [setOpen],
  );

  const handleNavigate = React.useCallback(
    (input: string) => {
      const { law: newLaw, paragraph: newParagraph } = processEntry(
        input,
        aliasEntries,
        currentLaw,
      );
      if (!newParagraph || !newLaw) return;

      setOpen(false);
      setQuery("");

      void router.push(
        `/${newLaw.toLowerCase()}/${newParagraph.toLowerCase()}`,
      );
    },
    [aliasEntries, currentLaw, router],
  );

  const currentShortcut =
    currentLaw && currentParagraph
      ? {
          label: `${currentLaw.toUpperCase()} § ${currentParagraph}`,
          value: `${currentLaw}§${currentParagraph}`,
          description: "Gerade geöffnet",
        }
      : null;

  const quickSuggestions = React.useMemo(
    () => QUICK_LINKS.filter((item) => item.value !== currentShortcut?.value),
    [currentShortcut?.value],
  );

  const lawMatches = React.useMemo(() => {
    const filtered = lawDirectory.filter((lawMeta) => {
      if (!normalizedTextQuery) return true;
      const tokens = [
        lawMeta.code,
        lawMeta.title,
        lawMeta.fullTitle ?? "",
        lawMeta.description ?? "",
      ];
      return tokens.some((token) =>
        token.toLowerCase().includes(normalizedTextQuery),
      );
    });
    return filtered.slice(0, 6);
  }, [lawDirectory, normalizedTextQuery]);

  const closeDialog = (value: boolean) => {
    setOpen(value);
    if (!value) setQuery("");
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Gesetz öffnen</span>
        <kbd className="bg-muted text-muted-foreground hidden rounded px-1.5 py-0.5 text-[10px] font-semibold sm:inline-flex">
          ⌘ K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={closeDialog}>
        <CommandInput
          placeholder="z.B. hgb §1 oder strafgesetzbuch 242"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            Keine Treffer. Probier &ldquo;hgb §1&rdquo;.
          </CommandEmpty>
          {currentShortcut && (
            <CommandGroup heading="Aktuelle Seite">
              <CommandItem
                onSelect={() => handleNavigate(currentShortcut.value)}
              >
                <BookOpenText className="mr-2 h-4 w-4 text-gray-600" />
                <div className="flex flex-col">
                  <span className="text-gray-900">{currentShortcut.label}</span>
                  <span className="text-xs text-gray-500">Gerade geöffnet</span>
                </div>
              </CommandItem>
            </CommandGroup>
          )}
          {lawMatches.length > 0 && (
            <CommandGroup heading="Gesetze">
              {lawMatches.map((lawMeta) => (
                <CommandItem
                  key={lawMeta.code}
                  value={lawMeta.code}
                  onSelect={() => setQuery(`${lawMeta.code}§`)}
                >
                  <Landmark className="mr-2 h-4 w-4 text-gray-600" />
                  <div className="flex flex-col">
                    <span className="text-gray-900">
                      {lawMeta.fullTitle ?? lawMeta.title}
                      <span className="ml-1 text-xs text-gray-500">
                        {lawMeta.code.toUpperCase()}
                      </span>
                    </span>
                    <span className="text-xs text-gray-500">
                      {lawMeta.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {quickSuggestions.length > 0 && (
            <CommandGroup heading="Schnellzugriff">
              {quickSuggestions.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={() => handleNavigate(item.value)}
                >
                  <Landmark className="mr-2 h-4 w-4 text-gray-600" />
                  <div className="flex flex-col">
                    <span className="text-gray-900">{item.label}</span>
                    <span className="text-xs text-gray-500">
                      {item.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {query.trim().length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Direkt öffnen">
                <CommandItem
                  value={query}
                  onSelect={() => handleNavigate(query)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  <span>{`Gehe zu „${query}"`}</span>
                  <CommandShortcut>Enter</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
