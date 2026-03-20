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

This repo now includes a read-only MCP server for law lookup and exact
paragraph retrieval.

Run it locally over `stdio`:

```bash
pnpm mcp
```

Current tools:

- `search_laws`
- `resolve_reference`
- `get_law_info`
- `get_paragraph`
- `get_paragraphs`
- `navigate_paragraph`
- `extract_citations`

The MCP server reuses the same shared parsing layer as the web app, so the app
routes and MCP tools stay in sync.

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
