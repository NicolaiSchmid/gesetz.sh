import { useNavigate } from "@tanstack/react-router";
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
  const navigate = useNavigate();

  // Previous paragraph
  useHotkeys(
    "j",
    (event) => {
      event.preventDefault();

      if (!law || !backward) return;

      void navigate({
        to: "/$law/$paragraph",
        params: { law, paragraph: backward },
      });
    },
    [backward, law, navigate],
  );

  // Next paragraph
  useHotkeys(
    "l",
    (event) => {
      event.preventDefault();

      if (!law || !forward) return;

      void navigate({
        to: "/$law/$paragraph",
        params: { law, paragraph: forward },
      });
    },
    [forward, law, navigate],
  );

  return null;
}
