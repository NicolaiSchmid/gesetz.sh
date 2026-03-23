# Gesetze Next.js to TanStack Start Migration Plan

Owner: Codex
Status: Draft
Branch: `chore/cloudflare-opennext`
Date: 2026-03-23

## Goal

Migrate `gesetz.sh` from Next.js App Router on Vercel to TanStack Start on
Cloudflare, while preserving:

- canonical public URLs such as `/{law}/{paragraph}`
- the markdown paragraph endpoint
- the MCP HTTP endpoint
- current SEO behavior and Open Graph coverage
- the shared law parsing and directory logic

The business reason is cost model alignment. This site is bandwidth-heavy,
compute-light, and crawler-heavy. TanStack Start on Cloudflare is a better fit
than continuing to optimize around Vercel ISR and Fast Origin Transfer.

## Research Summary

### What the docs say

- TanStack provides an official migration guide from Next.js App Router to
  TanStack Start, including route mapping, layout migration, link migration,
  and server route migration.
- Cloudflare provides first-party guidance for running TanStack Start on
  Workers with the Cloudflare Vite plugin, bindings, and static prerendering.
- TanStack Start supports server functions, server routes, middleware, SEO, and
  static prerendering. This is enough for this app’s current feature set.

Primary references:

- https://tanstack.com/start/latest/docs/framework/react/migrate-from-next-js
- https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/
- https://tanstack.com/start/latest/docs/framework/react/start-vs-nextjs

### What that means for this repo

This migration is not a business-logic rewrite. Most of the important code is
already framework-agnostic:

- `src/lib/gesetze/*` parsing and normalization logic
- `src/lib/law-directory.ts`
- the generated law index pipeline
- most presentational React components
- the MCP server implementation in `src/lib/mcp-server.ts`

The migration work is concentrated in framework glue:

- App Router files under `src/app/*`
- Next-specific navigation APIs
- Next metadata and OG image integration
- Next route handlers and middleware
- the T3 starter’s unused tRPC scaffolding
- env handling currently tied to `@t3-oss/env-nextjs`
- the current standalone Cloudflare proxy worker

## Current State Assessment

### What should carry over with minimal change

- `src/lib/gesetze/reference.ts`
- `src/lib/gesetze/paragraph-source.ts`
- `src/lib/gesetze/law-directory.ts`
- `scripts/build-law-index.mjs`
- UI components under `src/components/*`
- most of `src/lib/mcp-server.ts`

### What is Next-specific and must be replaced

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/[law]/[paragraph]/page.tsx`
- `src/app/[law]/[paragraph]/opengraph-image.tsx`
- `src/app/api/[law]/[paragraph]/route.ts`
- `src/app/api/trpc/[trpc]/route.ts`
- `src/app/mcp/route.ts`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/middleware.ts`
- client navigation in:
  - `src/app/[law]/[paragraph]/KeyboardNavigation.tsx`
  - `src/app/_components/CommandPalette.tsx`
  - header and page links using `next/link`
- `src/env.js`
- `src/lib/og/template.tsx` because it imports `next/og`

### What should be removed rather than migrated

The tRPC/T3 starter layer appears to be unused by the actual product:

- `src/server/api/*`
- `src/trpc/*`
- `src/app/_components/post.tsx`
- `src/app/api/trpc/[trpc]/route.ts`

Recommendation:

- remove this early in the migration to reduce complexity
- do not carry the T3 starter debt into the TanStack codebase

### What should stay, but in a framework-neutral form

The project should keep T3 Env instead of replacing it with ad-hoc environment
access.

Current state:

- `src/env.js` uses `@t3-oss/env-nextjs`

Recommendation:

- keep T3 Env, but move to a framework-neutral setup that also works with
  TanStack Start
- validate process env in local Node/Vite contexts
- validate Cloudflare bindings separately where appropriate

Practical implication:

- do not replace env validation with raw `process.env`
- do replace the Next-specific helper package usage with a non-Next T3 Env
  approach

## Recommendation

Do the migration directly to TanStack Start instead of first doing OpenNext.

Why:

- the app is small enough that the framework migration is manageable
- most critical logic is already isolated from Next
- TanStack Start gives a cleaner Cloudflare-native hosting and caching model
- continuing to preserve Next semantics only delays the real architecture move

This is still a multi-step migration. We should not try to port everything in
one giant patch.

## Proposed Architecture After Migration

### Runtime

- TanStack Start app running on Cloudflare Workers via Vite
- Cloudflare bindings available to server code via `cloudflare:workers`
- optional future R2 binding for durable paragraph/source caching
- no standalone Cloudflare proxy worker in the target state

### Routing

- keep TanStack routes under `src/app` initially by setting
  `routesDirectory: "app"` in the TanStack Vite plugin
- preserve current public URLs
- use TanStack file routes for pages and server routes for APIs

### Data flow

- keep paragraph retrieval in shared library code
- read the generated law directory from local files at build/runtime as today
- keep the MCP implementation as shared library code and expose it via a
  TanStack server route
- preserve the current compatibility behavior where a request to
  `/{law}/{paragraph}` with `Accept: text/markdown` or `Accept: text/x-markdown`
  returns the law in markdown
- also expose an explicit markdown route internally so the implementation
  remains clear and testable
- remove the standalone proxy worker by moving the app itself onto Cloudflare
  and fetching upstream directly from there

Recommendation:

- preserve `Accept`-header markdown compatibility, but back it with one shared
  markdown generation path
- remove the standalone proxy worker if direct Cloudflare-hosted fetches to
  `gesetze-im-internet.de` work reliably

Why:

- it simplifies caching behavior
- it avoids content-type ambiguity at the CDN layer
- it makes the new platform easier to reason about
- it eliminates an extra service whose original purpose was to avoid Vercel IP
  rejection

## Migration Phases

## Phase 0: Define the cut line

Deliverable:

- explicit agreement that this is a real framework migration, not an adapter
  spike

Decisions to lock:

- target platform is Cloudflare Workers
- target framework is TanStack Start
- tRPC starter code will be removed
- T3 Env stays, but in a framework-neutral form
- the standalone proxy worker is removed if direct Cloudflare-hosted upstream
  fetches succeed
- `Accept: text/markdown` compatibility on canonical law URLs is preserved

## Phase 1: Create a minimal TanStack/Cloudflare skeleton

Goal:

- get the app booting on TanStack Start with Cloudflare tooling before porting
  real features

Tasks:

- remove `next` and Next-specific config
- add:
  - `@tanstack/react-router`
  - `@tanstack/react-start`
  - `vite`
  - `@vitejs/plugin-react`
  - `vite-tsconfig-paths`
  - `@tailwindcss/vite`
  - `@cloudflare/vite-plugin`
- add `vite.config.ts`
- add `src/router.tsx`
- migrate `src/app/layout.tsx` to `src/app/__root.tsx`
- import global CSS through TanStack root route head config
- add `wrangler.jsonc` or root `wrangler.toml` for the app runtime
- add type generation for Cloudflare bindings

Success criteria:

- local dev boots on Vite
- a placeholder home route renders under TanStack Start

## Phase 2: Port the public website routes

Goal:

- preserve public browsing before APIs and ancillary routes

Route mapping:

- `src/app/page.tsx` -> `src/app/index.tsx`
- `src/app/[law]/[paragraph]/page.tsx` ->
  `src/app/$law/$paragraph.tsx`

Tasks:

- replace `next/link` with TanStack `Link`
- replace `next/navigation` router usage with TanStack router APIs
- convert `generateMetadata` behavior into TanStack route `head()` functions
- port keyboard navigation to TanStack navigation APIs
- keep shared paragraph fetch logic in `src/lib/gesetze/paragraph-source.ts`

Success criteria:

- `/`
- `/{law}/{paragraph}`
- internal navigation
- command palette navigation
- canonical titles/descriptions

## Phase 3: Port machine-facing routes

Goal:

- restore the programmatic interfaces without reintroducing Next-specific glue

Tasks:

- port the markdown route as a dedicated TanStack server route
- preserve the compatibility behavior for requests to `/{law}/{paragraph}` with
  `Accept: text/markdown` or `Accept: text/x-markdown`
- port `/mcp` as a TanStack server route that reuses `createMcpServer()`
- remove `src/middleware.ts`
- explicitly choose a markdown path shape:
  - `/api/{law}/{paragraph}`
  - or `/{law}/{paragraph}.md`

Recommendation:

- keep `/api/{law}/{paragraph}` first, because it is closest to the current
  implementation and easiest to validate
- preserve `Accept`-header markdown behavior as a compatibility layer over the
  same markdown implementation

Compatibility requirement:

- today, a request to `/{law}/{paragraph}` with a markdown `Accept` header is
  rewritten to the markdown endpoint
- the migration must preserve that external behavior unless we intentionally
  deprecate it later

Success criteria:

- markdown route returns the same content and cache headers
- markdown `Accept` requests on canonical law URLs still return markdown
- MCP GET/POST/DELETE/OPTIONS flow still works

## Phase 4: Replace or remove Next-only platform features

Goal:

- finish the migration by removing the remaining framework dependencies

Tasks:

- replace `next/font/google`
  - either self-host fonts
  - or use plain CSS font loading
- replace `next/og`
  - preferred: use a Worker-compatible OG approach such as Satori + Resvg
  - fallback: defer OG image migration temporarily and return a stable static OG
    image during cutover
- port:
  - `robots.txt`
  - `sitemap.xml`
- replace `@t3-oss/env-nextjs` with a framework-neutral T3 Env setup
  - keep schema validation
  - validate Cloudflare bindings where appropriate

Recommendation:

- do not let OG image parity block the first staging deploy
- if needed, ship with a temporary static social image and port dynamic OG in a
  follow-up

## Phase 5: Remove dead starter infrastructure

Goal:

- simplify the codebase once the TanStack app is functional

Tasks:

- remove `src/trpc/*`
- remove `src/server/api/*`
- remove `src/app/_components/post.tsx`
- remove `vercel.json`
- remove `next.config.js`
- remove Next-specific lockfile entries after dependency cleanup

Success criteria:

- no imports from `next/*`
- no tRPC starter remnants
- Cloudflare/TanStack is the only app runtime path

## Phase 6: Cloudflare-native hardening

Goal:

- make the migrated app production-worthy for crawler-heavy traffic

Tasks:

- define Cloudflare cache strategy for paragraph pages
- consider R2-backed paragraph/source caching
- remove the standalone proxy worker from the production request path
- remove proxy-specific credentials if they are no longer needed after the move
- verify that direct upstream fetches from the Cloudflare-hosted app are
  accepted reliably
- add staged load testing against crawler-like traffic

Recommendation:

- remove the standalone proxy worker during the migration if staging confirms
  that direct Cloudflare-hosted fetches are accepted
- keep a temporary fallback path only if upstream behavior is inconsistent

Why:

- once the app is hosted on Cloudflare, the original reason for the separate
  proxy should mostly disappear
- removing the extra worker simplifies deployment and operations

## Implementation Order

This is the recommended sequence inside the repo:

1. Remove unused tRPC starter code.
2. Add TanStack Start + Vite + Cloudflare skeleton.
3. Port root layout and home page.
4. Port the law paragraph page and navigation.
5. Port markdown route as an explicit server route.
6. Port `/mcp`.
7. Port `robots`, `sitemap`, and OG.
8. Remove remaining Next-specific code.
9. Add Cloudflare deployment config and staging validation.

## Suggested Execution Steps And Commit Boundaries

The migration should be done in small, reviewable commits. Suggested sequence:

1. Add TanStack Start and Cloudflare scaffolding without porting app features.
2. Port root layout, shared shell, and home page.
3. Port the law paragraph route and client-side navigation.
4. Port markdown delivery, including `Accept: text/markdown` compatibility.
5. Port `/mcp`.
6. Replace Next-only SEO, sitemap, robots, and OG integration.
7. Migrate env handling from `@t3-oss/env-nextjs` to framework-neutral T3 Env.
8. Remove unused tRPC/T3 starter code.
9. Remove the standalone proxy worker if direct Cloudflare-hosted upstream
   fetches are validated.
10. Add Cloudflare staging config, deploy, and smoke tests.

Suggested Conventional Commits:

- `chore(tanstack): scaffold tanstack start with cloudflare vite runtime`
- `feat(app): port root layout and home route to tanstack start`
- `feat(law): port law paragraph route and tanstack navigation`
- `feat(markdown): preserve markdown accept negotiation and explicit markdown route`
- `feat(mcp): port streamable mcp endpoint to tanstack server route`
- `feat(seo): port sitemap robots and route metadata to tanstack`
- `refactor(env): migrate from next-specific t3 env to framework-neutral config`
- `refactor(app): remove unused trpc starter infrastructure`
- `refactor(proxy): remove standalone cloudflare proxy worker`
- `chore(deploy): add cloudflare staging configuration and validation scripts`

Commit discipline notes:

- do not mix framework scaffolding with route rewrites in the same commit
- keep markdown compatibility work separate from the general law route port
- keep proxy removal separate from the main app migration so it can be reverted
  independently
- keep env migration separate because it affects both local dev and deployment

## High-Risk Areas

### Route shape mistakes

Risk:

- breaking canonical URLs during the move

Mitigation:

- preserve the current path structure exactly
- add route-level tests or scripted URL smoke tests

### Metadata and OG regressions

Risk:

- SEO or preview regressions because Next metadata APIs disappear

Mitigation:

- explicitly map head metadata during each route migration
- allow temporary static OG fallback if dynamic parity is slow

### MCP transport differences

Risk:

- the MCP transport may behave differently once no longer wrapped in Next route
  handlers

Mitigation:

- port `/mcp` early in staging
- test GET, POST, DELETE, OPTIONS explicitly

### Font loading and styling drift

Risk:

- visual regressions from losing `next/font`

Mitigation:

- self-host fonts or move to CSS import with explicit fallbacks

### Over-migrating while under-testing

Risk:

- doing framework migration, cache redesign, and proxy removal together

Mitigation:

- keep cache redesign separate from runtime migration
- test direct upstream fetches from Cloudflare staging before removing the last
  fallback path

## Validation Plan

### Functional smoke tests

- home page renders
- command palette opens and navigates
- direct law route loads known paragraphs such as `/bgb/433`
- keyboard navigation works on a paragraph page
- markdown endpoint returns correct markdown
- requests to `/{law}/{paragraph}` with `Accept: text/markdown` return markdown
- MCP endpoint handles basic tool invocation
- `robots.txt` and `sitemap.xml` are present

### Compatibility checks

- no `next/*` imports remain
- Vite build succeeds
- local Workers dev succeeds
- Cloudflare preview deploy succeeds

### Production-readiness checks

- verify cache headers on paragraph pages and markdown endpoints
- verify T3 Env works correctly outside Next.js
- verify direct upstream fetches work from the Cloudflare-hosted app without the
  standalone proxy
- verify generated law index build step still runs before deploy

## Suggested Deliverables

### Deliverable 1

Minimal TanStack Start app boots locally with the current home page and shared
styles.

### Deliverable 2

Law paragraph route works end-to-end with preserved URLs and metadata.

### Deliverable 3

Markdown and MCP routes work on Cloudflare staging.

### Deliverable 4

Next.js and tRPC starter code fully removed.

## Practical Notes For This Repo

- Keep `src/app` as the route directory initially. This reduces route churn and
  keeps the migration legible.
- The generated law index is a good fit for the new stack. Do not redesign it.
- The current unused tRPC layer is dead weight. Drop it, do not translate it.
- The MCP server code is valuable and should stay as a shared library.
- Keep T3 Env, but migrate away from the Next-specific package shape.
- Preserve the current markdown-over-`Accept` behavior during migration.
- Remove the standalone proxy worker if direct Cloudflare-hosted upstream
  fetches behave reliably.

## Recommendation Summary

Proceed with the TanStack Start migration.

This repo is small enough that the migration is realistic, and the current cost
problem is structural enough that doing a platform-native move is more sensible
than continuing to optimize around Next/Vercel semantics.

The first implementation goal should be:

- get TanStack Start running on Cloudflare
- port the public law route
- port markdown and MCP
- preserve markdown compatibility on `Accept: text/markdown`
- keep T3 Env in a framework-neutral form
- remove the standalone proxy worker if direct Cloudflare fetches work
- remove Next and tRPC

Do not combine that first migration with a deeper cache redesign. Measure the
new hosting shape first, then decide whether R2 or static prerendering is worth
the second step.
