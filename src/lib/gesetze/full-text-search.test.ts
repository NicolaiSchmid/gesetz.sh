import assert from "node:assert/strict";
import test from "node:test";

import { parseFullTextSearchHtml } from "./full-text-search";

test("parseFullTextSearchHtml parses paragraph hits", () => {
  const html = `
    <div id="paddingLR12">
      <h2>Trefferliste f&uuml;r 'kaufvertrag'</h2>
      <strong>Dokument 1 - 2 von 48 Treffer, je mehr <img src="/htdig/star.gif" alt="*">, umso h&ouml;her die Genauigkeit.</strong>
      <dl>
        <dt>
          <strong>
            <a href="https://www.gesetze-im-internet.de/bgb/__433.html">&sect; 433 BGB - Einzelnorm</a>
          </strong>
          <img src="/htdig/star.gif" alt="*">
          <img src="/htdig/star.gif" alt="*">
          <img src="/htdig/star_blank.gif" alt=" ">
        </dt>
        <dd>zur&uuml;ck weiter Nichtamtliches Inhaltsverzeichnis B&Uuml;RGERLICHES GESETZBUCH (BGB) &sect; 433 <strong>Kaufvertrag</strong> ...</dd>
      </dl>
      <dl>
        <dt>
          <strong>
            <a href="https://www.gesetze-im-internet.de/vermbg_2/">5. VermBG - nichtamtliches Inhaltsverzeichnis</a>
          </strong>
          <img src="/htdig/star.gif" alt="*">
        </dt>
        <dd><strong><code>... </code></strong> Wertpapier-<strong>Kaufvertrag</strong></dd>
      </dl>
    </div>
  `;

  const result = parseFullTextSearchHtml(html, "Kaufvertrag", "and", 1);

  assert.equal(result.query, "Kaufvertrag");
  assert.equal(result.total, 48);
  assert.equal(result.start, 1);
  assert.equal(result.end, 2);
  assert.equal(result.results.length, 2);
  assert.deepEqual(result.results[0], {
    law: "bgb",
    paragraph: "433",
    citation: "BGB § 433",
    title: "§ 433 BGB - Einzelnorm",
    snippet: "BÜRGERLICHES GESETZBUCH (BGB) § 433 **Kaufvertrag** ...",
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__433.html",
    canonicalUrl: "https://gesetz.sh/bgb/433",
    score: 2,
  });
  assert.deepEqual(result.results[1], {
    law: "vermbg_2",
    title: "5. VermBG - nichtamtliches Inhaltsverzeichnis",
    snippet: "... Wertpapier-**Kaufvertrag**",
    sourceUrl: "https://www.gesetze-im-internet.de/vermbg_2/",
    canonicalUrl: "https://gesetz.sh/vermbg_2/1",
    score: 1,
  });
});

test("parseFullTextSearchHtml handles no results pages", () => {
  const html = `
    <div id="paddingLR12">
      <h2 class="rot">Keine Treffer gefunden f&uuml;r 'foo'</h2>
    </div>
  `;

  const result = parseFullTextSearchHtml(html, "foo", "or", 3);

  assert.deepEqual(result, {
    query: "foo",
    method: "or",
    page: 3,
    total: 0,
    start: 0,
    end: 0,
    results: [],
  });
});
