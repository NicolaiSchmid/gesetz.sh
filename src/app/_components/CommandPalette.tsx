"use client";

import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useRouter, usePathname } from "next/navigation";
import { Search, BookOpenText, Landmark } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LawDirectoryEntry } from "@/lib/law-directory";
import {
  buildLawAliasEntries,
  resolveLawReference,
} from "@/lib/gesetze/reference";
import { searchLawDirectory } from "@/lib/law-directory";
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
    () => buildLawAliasEntries(lawDirectory),
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
      const { law: newLaw, paragraph: newParagraph } = resolveLawReference(
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
    return searchLawDirectory(lawDirectory, normalizedTextQuery, 6);
  }, [lawDirectory, normalizedTextQuery]);

  const closeDialog = (value: boolean) => {
    setOpen(value);
    if (!value) setQuery("");
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2 border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-900"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Suche</span>
        <kbd className="hidden rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] sm:inline-flex">
          ⌘K
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
                <BookOpenText className="mr-2 h-4 w-4 text-gray-400" />
                <div className="flex flex-col">
                  <span className="font-medium text-black">
                    {currentShortcut.label}
                  </span>
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
                  <Landmark className="mr-2 h-4 w-4 text-gray-400" />
                  <div className="flex flex-col">
                    <span className="font-medium text-black">
                      {lawMeta.fullTitle ?? lawMeta.title}
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        {lawMeta.code.toUpperCase()}
                      </span>
                    </span>
                    <span className="text-xs text-gray-600">
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
                  <Landmark className="mr-2 h-4 w-4 text-gray-400" />
                  <div className="flex flex-col">
                    <span className="font-medium text-black">{item.label}</span>
                    <span className="text-xs text-gray-600">
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
