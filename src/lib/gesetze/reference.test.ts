import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLawAliasEntries,
  buildParagraphCitation,
  extractSimpleCitations,
  resolveLawReference,
} from "./reference";

const laws = [
  {
    code: "bgb",
    title: "BGB",
    fullTitle: "Burgerliches Gesetzbuch",
    description: "Zivilrecht",
  },
  {
    code: "stgb",
    title: "StGB",
    fullTitle: "Strafgesetzbuch",
    description: "Strafrecht",
  },
];

void test("resolveLawReference resolves alias-prefixed input", () => {
  const aliasEntries = buildLawAliasEntries(laws);
  const resolved = resolveLawReference("strafgesetzbuch 242", aliasEntries);

  assert.equal(resolved.law, "stgb");
  assert.equal(resolved.paragraph, "242");
  assert.equal(resolved.resolutionMethod, "alias-prefix");
});

void test("resolveLawReference falls back to current law for bare paragraphs", () => {
  const aliasEntries = buildLawAliasEntries(laws);
  const resolved = resolveLawReference("§ 433", aliasEntries, "bgb");

  assert.equal(resolved.law, "bgb");
  assert.equal(resolved.paragraph, "433");
});

void test("extractSimpleCitations keeps offsets and optional current law", () => {
  const citations = extractSimpleCitations("Siehe § 433 und § 434.", "bgb");

  assert.equal(citations.length, 2);
  assert.deepEqual(
    citations.map((citation) => citation.citation),
    [buildParagraphCitation("bgb", "433"), buildParagraphCitation("bgb", "434")],
  );
  assert.deepEqual(
    citations.map((citation) => citation.match),
    ["§ 433", "§ 434"],
  );
});
