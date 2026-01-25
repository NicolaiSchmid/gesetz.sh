import Link from "next/link";

export default function Home() {
  return (
    <main className="prose prose-neutral dark:prose-invert mx-auto px-4 py-20">
      <h1>Gesetze 2.0</h1>
      <h2>Was ist das?</h2>
      <ul>
        <li>Schnelle Navigation durch deutsche Gesetze</li>
        <li>
          Drücke <code>⌘K</code> / <code>Ctrl+K</code> für Quick-Navigation
        </li>
        <li>Kompakte, kurze URLs</li>
        <li>Fokus auf Lesbarkeit und Effizienz</li>
      </ul>
      <h2>Schnellstart</h2>
      <ul>
        <li>
          <Link href="/hgb/1">Starte direkt bei HGB §1</Link>
        </li>
      </ul>
      <footer className="mt-24 text-center text-base text-gray-500 dark:text-gray-400">
        © 2025 Nicolai Schmid. All rights reserved.
      </footer>
    </main>
  );
}
