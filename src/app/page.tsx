import Link from "next/link";
import { loadLawDirectory } from "@/lib/law-directory";

export default function Home() {
  const { laws } = loadLawDirectory();

  // Group laws by first letter
  const groupedLaws = laws.reduce(
    (acc, law) => {
      const firstLetter = law.code.charAt(0).toUpperCase();
      (acc[firstLetter] ??= []).push(law);
      return acc;
    },
    {} as Record<string, typeof laws>,
  );

  const sortedLetters = Object.keys(groupedLaws).sort();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      {/* Hero */}
      <header className="mb-20">
        <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
          Deutsche Gesetze
        </h1>
        <p className="mb-8 max-w-xl text-xl text-gray-500">
          {laws.length.toLocaleString("de-DE")} Gesetze und Verordnungen.
          Schnell durchsuchbar.
        </p>
        <div className="flex flex-wrap gap-6 text-sm text-gray-400">
          <span className="flex items-center gap-2">
            <kbd className="rounded bg-gray-900 px-2 py-1 font-mono text-xs text-white">
              ⌘K
            </kbd>
            <span>Suche</span>
          </span>
          <span className="flex items-center gap-2">
            <kbd className="rounded bg-gray-900 px-2 py-1 font-mono text-xs text-white">
              J
            </kbd>
            <kbd className="rounded bg-gray-900 px-2 py-1 font-mono text-xs text-white">
              L
            </kbd>
            <span>Navigation</span>
          </span>
        </div>
      </header>

      {/* Quick links */}
      <section className="mb-20">
        <div className="flex flex-wrap gap-3">
          {["BGB", "StGB", "HGB", "GG", "ZPO", "StPO"].map((code) => (
            <Link
              key={code}
              href={`/${code.toLowerCase()}/1`}
              className="rounded-full bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-900 hover:text-white"
            >
              {code}
            </Link>
          ))}
        </div>
      </section>

      {/* Alphabet nav */}
      <nav className="mb-12 flex flex-wrap gap-1">
        {sortedLetters.map((letter) => (
          <a
            key={letter}
            href={`#${letter}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-gray-400 transition-all hover:bg-gray-900 hover:text-white"
          >
            {letter}
          </a>
        ))}
      </nav>

      {/* Law sections */}
      <div className="space-y-16">
        {sortedLetters.map((letter) => (
          <section key={letter} id={letter}>
            <h2 className="mb-6 text-3xl font-extrabold text-gray-900">
              {letter}
            </h2>
            <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {groupedLaws[letter]?.map((law) => (
                <Link
                  key={law.code}
                  href={`/${law.code}/1`}
                  className="group block rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-100"
                >
                  <div className="font-semibold text-gray-900">{law.title}</div>
                  {law.fullTitle && law.fullTitle !== law.title && (
                    <div className="line-clamp-1 text-sm text-gray-400 group-hover:text-gray-500">
                      {law.fullTitle}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-100 pt-8 text-center text-sm text-gray-400">
        Daten von gesetze-im-internet.de
      </footer>
    </main>
  );
}
