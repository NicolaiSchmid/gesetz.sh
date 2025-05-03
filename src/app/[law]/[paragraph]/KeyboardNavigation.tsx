"use client";

import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";

interface KeyboardNavigationProps {
  law: string;
  backward?: string;
  forward?: string;
}

export default function KeyboardNavigation({
  law,
  backward,
  forward,
}: KeyboardNavigationProps) {
  const router = useRouter();

  // Previous paragraph
  useHotkeys(
    "j",
    (event) => {
      event.preventDefault();

      if (!law || !backward) return;

      void router.push(`/${law}/${backward}`);
    },
    [backward, router],
  );

  // Next paragraph
  useHotkeys(
    "l",
    (event) => {
      event.preventDefault();

      if (!law || !forward) return;

      void router.push(`/${law}/${forward}`);
    },
    [forward, router],
  );

  return null;
}
