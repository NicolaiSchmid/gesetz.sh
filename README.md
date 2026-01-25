# Gesetze 2.0

A modern, fast interface for browsing German laws from [gesetze-im-internet.de](https://www.gesetze-im-internet.de).

## Features

- **Quick Navigation** — Press `p` to jump to any paragraph instantly
- **Keyboard Shortcuts** — Use `j`/`l` to move between sections
- **Clean URLs** — Simple paths like `/hgb/1` instead of cryptic query strings
- **Readable Design** — Focus on the text, not the clutter

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run production server
pnpm start
```

## Tech Stack

- [Next.js 15](https://nextjs.org) — React framework with App Router
- [Tailwind CSS 4](https://tailwindcss.com) — Utility-first styling
- [tRPC](https://trpc.io) — End-to-end typesafe APIs
- [shadcn/ui](https://ui.shadcn.com) — Accessible component primitives

## Usage

Navigate to any law paragraph using the URL pattern:

```
/{law}/{paragraph}
```

Examples:

- `/hgb/1` — HGB § 1
- `/bgb/433` — BGB § 433
- `/stgb/242` — StGB § 242

Or press `p` on any page to open the quick-jump input.

## License

MIT
