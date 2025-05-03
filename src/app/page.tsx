import Link from "next/link";

export default function Home() {
  return (
    <div className="p-8 text-gray-800">
      <p>
        Eine angenehme Webapp für{" "}
        <a
          href="gesetze-im-internet.de"
          target="_blank"
          rel="noopener"
          className="text-blue-800 underline"
        >
          Gesetze im Internet
        </a>
        . Die Inhalte sind genau die gleichen, es ist nur einfacher zu lesen und
        es gibt einige nette Features.
      </p>

      <h3 className="mt-4 text-xl">Bedienung</h3>
      <p>
        Alle Gesetze sind über die URL aufrufbar. Man nimmt das Kürzel, dass
        auch Gesetze-im-Internet benutzt und fügt es an die URL an. Dahinter
        dann der gewünschte Paragraph, als zweites Pfadsegment. Zum Beispiel das{" "}
        <Link href="/hgb/1" className="text-blue-800 underline">
          Handelsgesetzbuch, §1
        </Link>{" "}
        über{" "}
        <Link href="/hgb/1" className="text-blue-800 underline">
          &quot;/hgb/1&quot;
        </Link>
      </p>
      <h3 className="mt-4 text-xl">
        Shortcuts (warum es diese Seite überhaupt gibt)
      </h3>
      <p>
        Auf jeder Gesetzestextseite kann mit dem Drücken der Taste &quot;p&quot;
        eine schnelle Navigation aufgerufen werden, wo durch unterschiedliche
        Eingaben verschiedene schnelle Navigationen möglich sind:
        <ul>
          <li>
            Eine einfache Zahl (&quot;3&quot; oder &quot;255&quot;) führt zum
            Paragraphen der eingegebenen Nummer des aktuellen Gesetzes
          </li>
          <li>
            Eine einfache Zahl mit § (&quot;§260&quot;, &quot;§1&quot;) bewirkt
            den gleichen Effekt, wie ohne Paragraphzeichen
          </li>
          <li>
            Ein Gesetzkürzel mit dem Paragraphzeichen und einer Zahl
            (&quot;HGB§1&quot;, &quot;GmbhG§10&quot;) führt zum gewünschten
            Gesetz und Paragraphen
          </li>
        </ul>
      </p>
      <p>
        Mit &quot;j&quot; und &quot;l&quot; kann zum vorherigen, beziehungsweise
        nächsten Paragraphen gesprungen werden.
      </p>
      <p>Mit &quot;b&quot; kann ein Lesezeichen gesetzt werden</p>
      <br />
      <p className="">
        Autor -{" "}
        <a
          href="https://nicolaischmid.de"
          target="_blank"
          className="text-blue-800 underline"
        >
          Nicolai Schmid
        </a>
      </p>
    </div>
  );
}
