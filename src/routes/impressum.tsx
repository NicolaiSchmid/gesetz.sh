import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/impressum")({
  head: () => ({
    meta: [
      { title: "Impressum | Gesetz.sh" },
      {
        name: "description",
        content: "Impressum von Gesetz.sh.",
      },
    ],
    links: [{ rel: "canonical", href: "https://gesetz.sh/impressum" }],
  }),
  component: LegalNoticePage,
});

function LegalNoticePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-10">
        <Link
          to="/"
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          Zur Startseite
        </Link>
      </div>

      <article className="prose prose-gray max-w-none">
        <h1>Impressum</h1>

        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          Nicolai Schmid
          <br />
          Deutschland
        </p>

        <h2>Kontakt</h2>
        <p>E-Mail: inbox@gesetz.sh</p>

        <h2>Inhaltlich verantwortlich</h2>
        <p>Nicolai Schmid</p>
      </article>
    </main>
  );
}
