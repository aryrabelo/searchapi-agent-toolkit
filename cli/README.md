# serp — a tiny, context-saving SerpApi CLI for agents

A [Bun](https://bun.com) + TypeScript CLI with **zero runtime dependencies** (dev-only:
`typescript`, `@types/bun`) that wraps SerpApi's REST search endpoint and returns
**only the fields you ask for**. Built for AI agents that call search inside a long
session, where every token of standing context has a price.

Runtime: needs `bun` on PATH, or run the single binary produced by `bun run build`
(`dist/serp`), which bundles its own runtime.

It is a **complement** to SerpApi's official [`serpapi-mcp`](https://github.com/serpapi/serpapi-mcp)
server, not a replacement. Use the MCP server when you want a hosted, multi-client
connection; reach for this CLI for high-frequency, stateless one-shot lookups in a
coding loop, where you do not want to pay a tool-schema tax on every turn.

## Why

An MCP server injects its tool definitions into context on every request, used or not.
A CLI the agent calls via Bash is discovered once (`--help`) and returns only the
distilled result. For a stateless search (query in, results out, no OAuth, no session)
that difference is large in practice. See [the project README](../README.md) for the measured numbers.

## Install

```bash
bun install            # no runtime deps; dev only
bun run build          # produces a single binary at dist/serp
export SERPAPI_API_KEY=your_key   # SERP_API_KEY is also accepted
```

## Usage

```bash
serp search "rails jobs" --engine google_jobs --num 5 --fields title,link
serp search "1TB NVMe SSD" --engine google_shopping --fields title,price,link
serp search "AAPL stock" --engine google --format complete
serp search "best noise cancelling headphones" --engine google --location Brazil --gl br --hl pt --fields title,link
```

| Flag | Default | Meaning |
|------|---------|---------|
| `--engine` | `google_light` | any SerpApi engine |
| `--num` | `10` | number of results |
| `--fields` | (all) | comma-separated fields to keep from each result |
| `--format` | `compact` | `compact` drops metadata; `complete` is raw JSON |
| `--location` | (none) | SerpApi location, e.g. `Brazil`, `"Austin, TX"` |
| `--gl` | (none) | two-letter country code, e.g. `br`, `us` |
| `--hl` | (none) | two-letter UI language code, e.g. `pt`, `en` |

`compact` drops `search_metadata`, `search_parameters`, `search_information`,
`pagination`, and `serpapi_pagination`. `--fields` then projects each result down to
just those keys. `--location`, `--gl`, and `--hl` are sent to SerpApi only when set,
so localized results (e.g. Brazilian Portuguese) are a flag away. The output is
minified JSON on one stream, because the agent reads it.

## Develop

```bash
bun test        # 37 unit tests, fully offline (no key, no network)
bun run typecheck   # tsc --noEmit, strict + noUncheckedIndexedAccess
```

The URL builder, arg parser, and result-shaping are pure functions; the network call
and the whole `run()` entry take injected `fetch`/streams, so the suite runs with no
API key and no requests.

MIT.
