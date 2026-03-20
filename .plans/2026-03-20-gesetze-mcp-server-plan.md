# Gesetze MCP Server Plan

Owner: Codex
Status: Draft

## Goal

Add an MCP server for `gesetze` that gives agents a clean, structured way to:

- find laws by code or title
- resolve user-style references such as `bgb 433` or `strafgesetzbuch 242`
- fetch the exact text of a paragraph with metadata and navigation
- batch related paragraph lookups efficiently

The first version should be retrieval-first. It should be reliable for exact
lookups before it tries to solve global full-text search.

## Current State

The app already has the core pieces needed for a useful read-only MCP server:

- a generated local law directory in `src/generated/law-index.json`
- a loader for that directory in `src/lib/law-directory.ts`
- alias and reference parsing logic in `src/app/_components/CommandPalette.tsx`
- live paragraph fetch and parse logic in `src/app/api/[law]/[paragraph]/route.ts`
- previous/next paragraph extraction in `src/app/[law]/[paragraph]/page.tsx`
- a Cloudflare worker that safely proxies only allowed upstream paths in
  `worker/src/index.ts`

Important constraint:

- there is no paragraph-body index today
- current search only covers law metadata, not the text of all paragraphs
- exact paragraph lookup is already possible, but global string search across
  all laws is not yet backed by storage or an index

## Core Product Decision

The MCP server should start with exact retrieval and law discovery, not with
global full-text search.

Why:

- the existing codebase already supports exact paragraph fetches well
- the local law directory already supports useful search and reference
  resolution
- a weak full-text search tool would be misleading if it only searched titles
  while appearing to search legal text
- agents get immediate value from exact lookups, batching, and citation
  normalization

## Recommended Tool Set

## Phase 1 Tools

### `search_laws`

Purpose:
Find laws by code, short title, full title, or description.

Suggested input:

- `query`
- `limit` with a small default such as `10`

Suggested output:

- matched laws with `code`, `title`, `fullTitle`, `description`
- a stable canonical path such as `/{law}/1`

Notes:

- this should use the local generated directory, not live upstream fetches
- reuse the same matching vocabulary the command palette already builds

### `resolve_reference`

Purpose:
Turn loose user input into a canonical law and paragraph reference.

Suggested input:

- `input`
- `currentLaw` optional

Suggested output:

- `law`
- `paragraph`
- `citation`
- `canonicalPath`
- `confidence` or `resolutionMethod`

Notes:

- support inputs such as `bgb 433`, `bgb§433`, `§ 433`, and
  `strafgesetzbuch 242`
- reuse the parser logic that already exists in the command palette

### `get_paragraph`

Purpose:
Return the exact text for one paragraph.

Suggested input:

- `law`
- `paragraph`
- `format` optional: `json`, `text`, `markdown`

Suggested output:

- `law`
- `paragraph`
- `citation`
- `title`
- `headers`
- `content`
- `footnotes`
- `navigation.previous`
- `navigation.next`
- `sourceUrl`
- `canonicalUrl`

Notes:

- default to structured JSON
- keep markdown as an optional convenience format, not the primary contract
- this should call shared fetch and parse code, not the existing Next route

### `get_paragraphs`

Purpose:
Batch exact paragraph retrieval for agent workflows.

Suggested input:

- `items`: array of `{ law, paragraph }`
- `format` optional

Suggested output:

- array of `get_paragraph` results
- per-item not-found or fetch errors without failing the whole batch

Notes:

- this matters because legal questions often need several adjacent sections
- batching reduces repeated transport overhead and improves cache reuse

### `get_law_info`

Purpose:
Return directory metadata for a single law.

Suggested input:

- `law`

Suggested output:

- `code`
- `title`
- `fullTitle`
- `description`
- `generatedAt`
- `entryPath`

Notes:

- this is cheap and useful for disambiguation before paragraph retrieval

## Phase 1.5 Tools

### `navigate_paragraph`

Purpose:
Move to previous or next valid paragraph using upstream navigation instead of
guessing numeric neighbors.

Suggested input:

- `law`
- `paragraph`
- `direction`: `previous` or `next`

Suggested output:

- the resolved neighboring paragraph id
- optionally the neighboring paragraph payload

### `extract_citations`

Purpose:
Parse references out of free text and return normalized citations.

Suggested input:

- `text`
- `currentLaw` optional

Suggested output:

- array of normalized references with offsets and resolution confidence

Notes:

- keep this narrow at first
- `§` references are much easier than a full legal citation grammar

## Phase 2 Tools

### `search_within_law`

Purpose:
Search paragraph text within one law once paragraph indexing exists.

Suggested input:

- `law`
- `query`
- `limit`

Suggested output:

- paragraph hits with snippets and paragraph ids

Notes:

- this is a much better first search index than trying to search all laws at
  once

### `full_text_search_all_laws`

Purpose:
Search paragraph text across the full corpus.

Status:
Do not implement until a real paragraph index exists.

Why this is deferred:

- the repo does not currently store or index paragraph bodies
- upstream live crawling on each MCP request would be too slow and too fragile
- a fake search tool backed only by law metadata would confuse users and agents

## Response Contract Recommendation

Prefer structured JSON as the primary MCP contract.

Recommended `get_paragraph` shape:

```json
{
  "law": "bgb",
  "paragraph": "433",
  "citation": "BGB § 433",
  "title": "Vertragstypische Pflichten beim Kaufvertrag",
  "headers": ["Burgerliches Gesetzbuch", "§ 433 Vertragstypische Pflichten beim Kaufvertrag"],
  "content": ["..."],
  "footnotes": [],
  "navigation": {
    "previous": "432",
    "next": "434"
  },
  "sourceUrl": "https://www.gesetze-im-internet.de/bgb/__433.html",
  "canonicalUrl": "https://gesetz.sh/bgb/433"
}
```

Principles:

- do not make clients scrape markdown
- return arrays for content and footnotes so paragraph boundaries stay intact
- always include source provenance
- keep the field names stable across MCP and the internal fetch layer

## Architecture Recommendation

Do not build the MCP server by calling the existing page route or markdown API
route. Extract the shared legal-text logic into server-only modules first.

Recommended shared modules:

- `src/lib/gesetze/law-directory.ts`
  - wrap the generated index
  - expose search and exact law lookup helpers
- `src/lib/gesetze/reference.ts`
  - normalize user input into `{ law, paragraph }`
  - reuse the command palette parsing rules
- `src/lib/gesetze/paragraph-source.ts`
  - fetch one paragraph from upstream or the proxy
  - parse headers, content, footnotes, and navigation
- `src/lib/gesetze/contracts.ts`
  - shared Zod schemas for tool inputs and outputs

Recommended MCP entrypoint:

- `src/mcp/server.ts` for the tool registry and handlers
- `scripts/mcp-dev.ts` or a package script for local MCP development

Transport recommendation:

- start with a plain read-only MCP server implementation that can run locally
  for development
- if remote hosting is desired, add an HTTP MCP route after the shared modules
  and tool contracts are stable

## Implementation Phases

## Phase 0: Shared Retrieval Extraction

1. Extract duplicated paragraph fetch and parse logic out of the page route and
   markdown API route.
2. Extract reference normalization from the command palette into a reusable
   server-safe module.
3. Add unit tests around the shared parser and resolver logic.

Outcome:
One canonical retrieval layer exists before MCP transport is added.

## Phase 1: Minimal Useful MCP Server

1. Add MCP dependencies and server bootstrap.
2. Implement `search_laws`.
3. Implement `resolve_reference`.
4. Implement `get_law_info`.
5. Implement `get_paragraph`.
6. Implement `get_paragraphs`.

Outcome:
The MCP server is already useful for real legal lookup tasks.

## Phase 2: Ergonomics And Hardening

1. Add `navigate_paragraph`.
2. Add `extract_citations`.
3. Add response size limits and input validation.
4. Add caching strategy for repeated paragraph fetches.
5. Decide whether public use should be anonymous or key-protected.

Outcome:
The server becomes easier for agents to use safely and repeatedly.

## Phase 3: Search Indexing

1. Design a paragraph corpus format.
2. Add a build or sync job that stores paragraph text with identifiers.
3. Pick a search implementation:
   - local SQLite FTS
   - Postgres full-text search
   - a lightweight search engine
4. Implement `search_within_law`.
5. Only then decide whether `full_text_search_all_laws` is worth exposing.

Outcome:
Search is grounded in a real index instead of live scraping.

## Testing Plan

1. Unit test reference parsing for code-based and title-based inputs.
2. Unit test paragraph parsing against saved HTML fixtures from a few laws.
3. Add contract tests for each tool input and output shape.
4. Smoke-test the MCP server with the MCP Inspector.
5. Verify not-found behavior and partial batch failures.
6. Verify the proxy path validation still blocks unsupported upstream paths.

## Risks

1. Upstream HTML can change and break parsers.
2. Upstream availability and anti-bot behavior can make live retrieval flaky.
3. Citation parsing can grow into a large grammar problem if `Art.`, `Abs.`,
   `Satz`, and `Nr.` are all included too early.
4. Global search will be expensive and misleading if implemented before a real
   paragraph index exists.
5. Large paragraph batches can produce oversized responses unless bounded.

## Open Questions

1. Should the first server be local-only, or should this repo also host a
   remote HTTP MCP endpoint?
2. Should v1 stay focused on `§` references, or do we also want `Art.` support
   immediately for laws such as the GG?
3. Should anonymous access be allowed if the MCP server is public and read-only?
4. How much paragraph content should one tool call be allowed to return?
5. Do we want search ranking to prioritize exact law code matches over title
   matches in all cases?

## Recommendation

Build a retrieval-first MCP server with five tools:

- `search_laws`
- `resolve_reference`
- `get_law_info`
- `get_paragraph`
- `get_paragraphs`

Do the shared parser extraction first, because the current paragraph fetch logic
is duplicated and MCP would otherwise add a third copy. Do not ship
`full_text_search_all_laws` until paragraph text is indexed explicitly.
