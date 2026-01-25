import Link from "next/link";
import { loadLawDirectory } from "@/lib/law-directory";
import { CommandPalette } from "./CommandPalette";

export function Header() {
  const lawDirectory = loadLawDirectory();

  return (
    <div className="relative z-50 bg-white shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center justify-between py-3 md:justify-start md:space-x-10">
          <div className="flex w-0 flex-1">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-gray-900"
            >
              Gesetze 2.0
            </Link>
          </div>
          <CommandPalette lawDirectory={lawDirectory.laws} />
        </div>
      </div>
    </div>
  );
}
