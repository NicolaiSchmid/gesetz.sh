"use client";

import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useRouter } from "next/navigation";
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
    if (law.description) aliasTokens.add(law.description);

    const keywords = `${law.title} ${law.description ?? ""}`
      .split(/[^a-zA-Zäöüß0-9]+/i)
      .filter(Boolean);

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

function processEntry(raw: string, aliasEntries: AliasEntry[]) {
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
      return { law: match[1] ?? detectedLaw, paragraph: match[2] };
    }
    return { law: detectedLaw, paragraph: sanitized };
  }

  const parts = sanitized.split("§").filter(Boolean);
  if (parts.length === 0) return { paragraph: undefined };

  const lawFromInput = parts.length > 1 ? parts[0] : undefined;
  const detectedParagraph = parts[parts.length - 1];

  return { law: detectedLaw ?? lawFromInput, paragraph: detectedParagraph };
}

interface NavigateProps {
  law: string;
  paragraph?: string;
  lawDirectory: LawDirectoryEntry[];
}

export default function Navigate({
  law,
  paragraph,
  lawDirectory,
}: NavigateProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
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
      );
      if (!newParagraph) return;

      setOpen(false);
      setQuery("");

      const targetLaw = (newLaw ?? law).toLowerCase();
      void router.push(`/${targetLaw}/${newParagraph.toLowerCase()}`);
    },
    [aliasEntries, law, router],
  );

  const currentShortcut =
    law && paragraph
      ? {
          label: `${law.toUpperCase()} § ${paragraph}`,
          value: `${law}§${paragraph}`,
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
      const tokens = [lawMeta.code, lawMeta.title, lawMeta.description ?? ""];
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
      <div className="mb-4 flex justify-end">
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          Gesetz öffnen
          <kbd className="bg-muted text-muted-foreground hidden rounded px-1.5 py-0.5 text-[10px] font-semibold sm:inline-flex">
            ⌘K
          </kbd>
        </Button>
      </div>
      <CommandDialog open={open} onOpenChange={closeDialog}>
        <CommandInput
          placeholder="z.B. hgb §1 oder bgb 433"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>Keine Treffer. Probier „hgb §1”.</CommandEmpty>
          {currentShortcut && (
            <CommandGroup heading="Aktuelle Seite">
              <CommandItem
                onSelect={() => handleNavigate(currentShortcut.value)}
              >
                <BookOpenText className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{currentShortcut.label}</span>
                  <span className="text-muted-foreground text-xs">
                    Gerade geöffnet
                  </span>
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
                  <Landmark className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>
                      {lawMeta.title}
                      <span className="text-muted-foreground ml-1 text-xs">
                        {lawMeta.code.toUpperCase()}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-xs">
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
                  <Landmark className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{item.label}</span>
                    <span className="text-muted-foreground text-xs">
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
                  <span>{`Gehe zu „${query}”`}</span>
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
