import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/datenschutz")({
  head: () => ({
    meta: [
      { title: "Datenschutz | Gesetz.sh" },
      {
        name: "description",
        content:
          "Datenschutzhinweise fuer Gesetz.sh mit einer knappen Beschreibung der verarbeiteten Daten.",
      },
    ],
    links: [{ rel: "canonical", href: "https://gesetz.sh/datenschutz" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
        <h1>Datenschutzerklaerung</h1>

        <p>
          Gesetz.sh ist ein statisches Such- und Nachschlageangebot fuer
          deutsche Gesetze. Es gibt keine Benutzerkonten, keine Newsletter und
          keine Kommentarfunktion.
        </p>

        <h2>Verantwortlicher</h2>
        <p>
          Nicolai Schmid
          <br />
          E-Mail: inbox@gesetz.sh
        </p>

        <h2>Welche Daten verarbeitet werden</h2>
        <p>
          Beim Aufruf der Website verarbeitet der Hosting-Anbieter technisch
          erforderliche Verbindungsdaten, insbesondere IP-Adresse, Datum und
          Uhrzeit, aufgerufene URL, uebertragene Datenmenge, Referrer,
          Browsertyp und Betriebssystem. Die Verarbeitung ist erforderlich, um
          die Website auszuliefern und die Sicherheit des Betriebs zu
          gewaehrleisten.
        </p>

        <h2>Keine Nutzerkonten, keine Tracking-Profile</h2>
        <p>
          Gesetz.sh speichert keine Benutzerkonten und erstellt keine
          personenbezogenen Nutzungsprofile. Es werden keine personenbezogenen
          Daten zu Werbezwecken verkauft oder weitergegeben.
        </p>

        <h2>Rechtsgrundlage</h2>
        <p>
          Die Verarbeitung technisch notwendiger Daten erfolgt auf Grundlage von
          Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt im
          sicheren und stabilen Betrieb dieser Website.
        </p>

        <h2>Empfaenger</h2>
        <p>
          Daten koennen durch eingesetzte technische Dienstleister verarbeitet
          werden, soweit dies fuer Hosting, Auslieferung und Sicherheit der
          Website erforderlich ist.
        </p>

        <h2>Speicherdauer</h2>
        <p>
          Personenbezogene Daten werden nur so lange gespeichert, wie dies fuer
          den technischen Betrieb, die Sicherheit oder gesetzliche Pflichten
          erforderlich ist.
        </p>

        <h2>Ihre Rechte</h2>
        <p>
          Ihnen stehen nach der DSGVO insbesondere Rechte auf Auskunft,
          Berichtigung, Loeschung, Einschraenkung der Verarbeitung,
          Datenuebertragbarkeit und Widerspruch zu. Zudem besteht ein
          Beschwerderecht bei einer Datenschutzaufsichtsbehoerde.
        </p>

        <h2>Kontakt</h2>
        <p>
          Bei Fragen zum Datenschutz wenden Sie sich bitte an:
          <br />
          inbox@gesetz.sh
        </p>
      </article>
    </main>
  );
}
