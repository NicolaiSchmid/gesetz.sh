import Link from "next/link";
import { loadLawDirectory } from "@/lib/law-directory";

export default async function Home() {
  const { laws } = await loadLawDirectory();

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
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-10">
        <h1 className="mb-2 text-3xl font-bold">Gesetze 2.0</h1>
        <p className="text-gray-600">
          Schnelle Navigation durch deutsche Gesetze. Drücke{" "}
          <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-semibold">
            ⌘ K
          </kbd>{" "}
          für Quick-Navigation.
        </p>
      </div>

      <h2 className="mb-4 text-xl font-semibold">
        Alle Gesetze und Verordnungen ({laws.length})
      </h2>

      <nav className="mb-6 flex flex-wrap gap-2">
        {sortedLetters.map((letter) => (
          <a
            key={letter}
            href={`#${letter}`}
            className="rounded bg-gray-100 px-2 py-1 text-sm font-medium hover:bg-gray-200"
          >
            {letter}
          </a>
        ))}
      </nav>

      <div className="space-y-8">
        {sortedLetters.map((letter) => (
          <section key={letter} id={letter}>
            <h3 className="mb-3 border-b pb-1 text-lg font-semibold">
              {letter}
            </h3>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {groupedLaws[letter]?.map((law) => (
                <li key={law.code}>
                  <Link
                    href={`/${law.code}/1`}
                    className="block rounded p-2 hover:bg-gray-50"
                  >
                    <span className="font-medium">
                      {law.code.toUpperCase()}
                    </span>
                    <span className="ml-2 text-sm text-gray-600">
                      {law.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <footer className="mt-16 text-center text-sm text-gray-500">
        © 2025 Nicolai Schmid. All rights reserved.
      </footer>
    </main>
  );
}
