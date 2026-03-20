# ⚖️ Gesetze 2.0

A lightning-fast reader for German law built for keyboards, muscle memory, and people who live in §§.

## Why it exists

- **Stay in flow** – hit `⌘K` / `Ctrl+K`, type `bgb§433`, press enter. Done.
- **Blazing navigation** – `j`/`l` flick through paragraphs, URLs stay tidy (`/hgb/1`).
- **Readable typography** – cards, contrast, and whitespace focused on the text, not the chrome.
- **Resilient data** – we proxy through Cloudflare to keep `gesetze-im-internet.de` happy even when it blocks cloud IPs.

## Quick Start

```bash
# install
pnpm install

# dev server with hot reload
pnpm dev

# type-safe production build
pnpm build && pnpm start
```

## URL Cheatsheet

```
/{law}/{paragraph}
```

Examples:

| Path        | Meaning                      |
| ----------- | ---------------------------- |
| `/hgb/1`    | Handelsgesetzbuch §1         |
| `/bgb/433`  | Bürgerliches Gesetzbuch §433 |
| `/stgb/242` | Strafgesetzbuch §242         |

Open the command palette with `⌘K` / `Ctrl+K`. The quick-jump accepts combos like `bgb§433` or `stgb 242` and figures it out.

## Stack

- **Next.js 15 App Router** – streaming SSR + React 19
- **Tailwind CSS 4** – custom theme tuned for long-form text
- **shadcn/ui + lucide** – polished primitive components
- **tRPC + React Query** – fully typed client/server boundary
- **Cloudflare Worker proxy** – keeps upstream content reachable from Vercel

## MCP Server

This repo includes a read-only MCP server for law lookup and exact paragraph
retrieval.

Use it when you want an agent to:

- find the right law by code or title
- normalize user input like `bgb 433` into a canonical reference
- fetch the exact text of one or more paragraphs
- move to the previous or next valid paragraph without guessing numbering
- extract simple `§` citations from free text

Current scope:

- local law directory search
- live exact paragraph retrieval from `gesetze-im-internet.de`
- streamable HTTP transport at `/mcp`
- `stdio` transport for local development
- no global full-text search across all legal text yet

The MCP server reuses the same shared parsing layer as the web app, so the app
routes and MCP tools stay in sync.

### Run It Locally

Start the server locally over `stdio`:

```bash
pnpm mcp
```

The server expects the same optional proxy env vars as the web app:

```bash
GESETZE_PROXY_URL=https://<your-worker-subdomain>.workers.dev
GESETZE_PROXY_API_KEY=<same key as above>
```

If those env vars are absent, paragraph fetches go directly to
`gesetze-im-internet.de`.

### HTTP Endpoint

The Next.js app also exposes the MCP server over Streamable HTTP at:

```text
/mcp
```

Example:

```text
https://your-domain.example/mcp
```

### Tool List

- `search_laws`
- `resolve_reference`
- `get_law_info`
- `get_paragraph`
- `get_paragraphs`
- `navigate_paragraph`
- `extract_citations`

### Shared Paragraph Shape

Paragraph-returning tools use this shape in `structuredContent`:

```json
{
  "law": "bgb",
  "paragraph": "433",
  "citation": "BGB § 433",
  "title": "§ 433 Vertragstypische Pflichten beim Kaufvertrag",
  "headers": [
    "Bürgerliches Gesetzbuch",
    "§ 433 Vertragstypische Pflichten beim Kaufvertrag"
  ],
  "content": [
    "Der Verkäufer hat dem Käufer die Sache frei von Sach- und Rechtsmängeln zu verschaffen."
  ],
  "footnotes": [],
  "navigation": {
    "previous": "432",
    "next": "434"
  },
  "sourceUrl": "https://www.gesetze-im-internet.de/bgb/__433.html",
  "canonicalUrl": "https://gesetz.sh/bgb/433"
}
```

Notes:

- `headers`, `content`, and `footnotes` are arrays of strings
- paragraph text strings are markdown-aware where useful
- inline paragraph references are emitted as markdown links where they can be
  resolved
- the tool `content` text payload for `get_paragraph` is the full paragraph as a
  markdown document

### Tool Reference

#### `search_laws`

Find laws by code, short title, full title, or description.

Input:

```json
{
  "query": "strafgesetzbuch",
  "limit": 5
}
```

Output shape:

```json
{
  "query": "strafgesetzbuch",
  "count": 1,
  "laws": [
    {
      "code": "stgb",
      "title": "StGB",
      "fullTitle": "Strafgesetzbuch",
      "description": "Strafgesetzbuch",
      "entryPath": "/stgb/1",
      "canonicalUrl": "https://gesetz.sh/stgb/1"
    }
  ]
}
```

Behavior:

- uses the local generated law directory
- defaults `limit` to `10`
- caps `limit` at `25`

#### `resolve_reference`

Resolve loose user input into a canonical law and paragraph.

Good inputs:

- `bgb 433`
- `bgb§433`
- `strafgesetzbuch 242`
- `§ 433` with `currentLaw`

Input:

```json
{
  "input": "§ 433",
  "currentLaw": "bgb"
}
```

Output shape:

```json
{
  "input": "§ 433",
  "law": "bgb",
  "paragraph": "433",
  "citation": "BGB § 433",
  "canonicalPath": "/bgb/433",
  "canonicalUrl": "https://gesetz.sh/bgb/433",
  "resolutionMethod": "fallback-numeric"
}
```

#### `get_law_info`

Get directory metadata for one exact law code.

Input:

```json
{
  "law": "bgb"
}
```

Output shape:

```json
{
  "generatedAt": "2026-03-14T11:10:37.551Z",
  "law": {
    "code": "bgb",
    "title": "BGB",
    "fullTitle": "Bürgerliches Gesetzbuch",
    "description": "Bürgerliches Gesetzbuch",
    "entryPath": "/bgb/1",
    "canonicalUrl": "https://gesetz.sh/bgb/1"
  }
}
```

#### `get_paragraph`

Fetch one exact legal paragraph.

Input:

```json
{
  "law": "bgb",
  "paragraph": "433"
}
```

Behavior:

- returns a markdown document in the tool text payload
- returns the structured paragraph shape in `structuredContent`
- returns `isError: true` if the paragraph cannot be loaded

#### `get_paragraphs`

Fetch multiple exact paragraphs in one call.

Input:

```json
{
  "items": [
    { "law": "bgb", "paragraph": "433" },
    { "law": "bgb", "paragraph": "434" }
  ]
}
```

Output shape:

```json
{
  "count": 2,
  "results": [
    {
      "law": "bgb",
      "paragraph": "433",
      "found": true,
      "data": {}
    },
    {
      "law": "bgb",
      "paragraph": "999999",
      "found": false,
      "error": "Could not load BGB § 999999."
    }
  ]
}
```

Behavior:

- caps `items` at `25`
- does not fail the whole call if one item is missing
- returns `found: false` per failed item

#### `navigate_paragraph`

Resolve the previous or next valid paragraph using upstream navigation links.

Input:

```json
{
  "law": "bgb",
  "paragraph": "433",
  "direction": "next",
  "includeParagraph": true
}
```

Output shape:

```json
{
  "law": "bgb",
  "paragraph": "433",
  "direction": "next",
  "targetParagraph": "434",
  "targetCitation": "BGB § 434",
  "targetPath": "/bgb/434",
  "targetUrl": "https://gesetz.sh/bgb/434",
  "target": {}
}
```

Behavior:

- `direction` must be `previous` or `next`
- `includeParagraph` defaults to `false`
- if `includeParagraph` is `true`, `target` contains the full shared paragraph
  shape

#### `extract_citations`

Extract simple `§` citations from free text.

Input:

```json
{
  "text": "Siehe § 433 und § 434.",
  "currentLaw": "bgb"
}
```

Output shape:

```json
{
  "count": 2,
  "citations": [
    {
      "match": "§ 433",
      "paragraph": "433",
      "law": "bgb",
      "citation": "BGB § 433",
      "start": 6,
      "end": 11
    }
  ]
}
```

Current limitation:

- this is intentionally narrow
- it handles simple `§` paragraph references
- it does not try to fully parse complex legal citations like `Abs.`, `Satz`,
  `Nr.`, or `Art.`

### Errors And Limits

When a tool cannot complete its job, it returns a normal MCP tool result with
`isError: true` and a short text explanation.

Important limits:

- `search_laws.limit`: max `25`
- `get_paragraphs.items`: max `25`
- `navigate_paragraph.direction`: `previous | next`

### Current Gaps

What this MCP server does not do yet:

- search across the full text of all paragraphs
- provide an HTTP MCP endpoint
- support semantic search
- fully parse complex legal citations beyond simple `§` references

## Proxy Config (optional but recommended)

1. Deploy the worker in `worker/` with `wrangler deploy` (or connect it via Cloudflare’s GitHub integration).
2. Set the worker secret `API_KEY` (`wrangler secret put API_KEY`).
3. In Vercel (and optionally `.env.local`), configure:

```
GESETZE_PROXY_URL=https://<your-worker-subdomain>.workers.dev
GESETZE_PROXY_API_KEY=<same key as above>
```

If the env vars are absent, the app falls back to direct fetches against gesetze-im-internet.de.

## Contributing

1. Fork / branch
2. `pnpm install`
3. Make changes with tests/linters
4. Open a PR – describe which laws or flows you touched

## License

MIT – use it, remix it, cite your sources.
