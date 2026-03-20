import assert from "node:assert/strict";
import test from "node:test";

import { parseParagraphHtml } from "./paragraph-source";

const sampleHtml = `
  <html>
    <body>
      <div class="jnheader">
        <h1>Burgerliches Gesetzbuch</h1>
        <h1>§ 433 Vertragstypische Pflichten beim Kaufvertrag</h1>
      </div>
      <div class="jurAbsatz">Der Verkäufer hat dem Käufer die Sache frei von Mängeln zu verschaffen. Siehe § 434.</div>
      <div class="jnfussnote">
        <div class="jurAbsatz">Fußnote zu § 433.</div>
      </div>
      <div id="blaettern_zurueck"><a href="./__432.html">Zurück</a></div>
      <div id="blaettern_weiter"><a href="./__434.html">Weiter</a></div>
    </body>
  </html>
`;

void test("parseParagraphHtml extracts headers, content, footnotes, and navigation", () => {
  const record = parseParagraphHtml(sampleHtml, "bgb", "433");

  assert.ok(record);
  assert.equal(record.law, "bgb");
  assert.equal(record.paragraph, "433");
  assert.equal(record.title, "§ 433 Vertragstypische Pflichten beim Kaufvertrag");
  assert.deepEqual(
    record.headers.map((header) => header.text),
    ["Burgerliches Gesetzbuch", "§ 433 Vertragstypische Pflichten beim Kaufvertrag"],
  );
  assert.equal(record.content.length, 1);
  assert.equal(record.footnotes.length, 1);
  assert.match(record.content[0]?.html ?? "", /href="\/bgb\/434"/);
  assert.equal(record.navigation.previous, "432");
  assert.equal(record.navigation.next, "434");
});
