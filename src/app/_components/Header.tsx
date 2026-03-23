import { Link } from "@tanstack/react-router";
import { loadLawDirectory } from "@/lib/law-directory";
import { CommandPalette } from "./CommandPalette";

export function Header() {
  const lawDirectory = loadLawDirectory();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex items-center justify-between py-5">
          <Link
            to="/"
            className="text-xl font-bold tracking-tight text-gray-900 transition-colors hover:text-gray-500"
          >
            Gesetz.sh
          </Link>
          <CommandPalette lawDirectory={lawDirectory.laws} />
        </div>
      </div>
    </header>
  );
}
