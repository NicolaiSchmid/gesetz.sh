"use client";

import React, { useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useRouter } from "next/navigation";

function processEntry(string: string) {
  const parts = string.split("§");

  if (parts.length === 1) {
    return { paragraph: parts[0] };
  }

  if (parts.length > 2) {
    console.error("Wrong entry");
  }

  return { law: parts[0], paragraph: parts[parts.length - 1] };
}

// Define prop types
interface NavigateFormProps {
  law: string;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  paragraph?: string;
}

function NavigateForm({ law, setOpen, paragraph }: NavigateFormProps) {
  const router = useRouter();

  return (
    <div>
      <form
        onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const target = event.target as typeof event.target & {
            paragraph: { value: string };
          };
          const { law: newLaw, paragraph: newParagraph } = processEntry(
            target.paragraph.value,
          );

          if (!newParagraph) {
            setOpen(false);
            return;
          }

          setOpen(false);

          // route to new paragraph
          router.push(`/${newLaw ?? law}/${newParagraph}`);
        }}
      >
        <input
          type="text"
          id="paragraph"
          name="paragraph"
          placeholder="Shortcut"
          autoFocus
          className="max-auto mb-2 w-full rounded-lg p-2 text-gray-800 shadow-lg ring-blue-200 focus:ring-2 focus:outline-none"
        />
      </form>
    </div>
  );
}

interface NavigateProps {
  law: string;
  paragraph?: string;
}

export default function Navigate({ law, paragraph }: NavigateProps) {
  const [open, setOpen] = useState(false);

  useHotkeys(
    "meta+k, ctrl+k",
    (event) => {
      event.preventDefault();

      if (!open) setOpen(true);
    },
    [open, setOpen],
  );

  if (open)
    return <NavigateForm law={law} paragraph={paragraph} setOpen={setOpen} />;

  return null;
}
