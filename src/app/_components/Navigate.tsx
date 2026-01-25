"use client";

import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useRouter } from "next/navigation";
import { Search, BookOpenText, Landmark } from "lucide-react";

import { Button } from "@/components/ui/button";
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

function processEntry(raw: string) {
  const sanitized = raw.replace(/\s+/g, "").toLowerCase();
  if (!sanitized) return { paragraph: undefined };

  if (!sanitized.includes("§")) {
    const pattern = /^([a-zäöüß]+)?(\d.*)$/i;
    const match = pattern.exec(sanitized);
    if (match) {
      return { law: match[1], paragraph: match[2] };
    }
    return { paragraph: sanitized };
  }

  const parts = sanitized.split("§").filter(Boolean);
  if (parts.length === 0) return { paragraph: undefined };

  const detectedLaw = parts.length > 1 ? parts[0] : undefined;
  const detectedParagraph = parts[parts.length - 1];

  return { law: detectedLaw, paragraph: detectedParagraph };
}

interface NavigateProps {
  law: string;
  paragraph?: string;
}

export default function Navigate({ law, paragraph }: NavigateProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

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
      const { law: newLaw, paragraph: newParagraph } = processEntry(input);
      if (!newParagraph) return;

      setOpen(false);
      setQuery("");

      const targetLaw = (newLaw ?? law).toLowerCase();
      void router.push(`/${targetLaw}/${newParagraph.toLowerCase()}`);
    },
    [law, router],
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
