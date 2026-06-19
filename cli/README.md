# searchapi — a tiny, context-saving SearchApi CLI for agents

A [Bun](https://bun.com) + TypeScript CLI with **zero runtime dependencies** (dev-only:
`typescript`, `@types/bun`) that wraps SearchApi's REST search endpoint and returns
**only the fields you ask for**. Built for AI agents that call search inside a long
session, where every token of standing context has a price.

Runtime: needs `bun` on PATH, or run the single binary produced by `bun run build`
(`dist/searchapi`), which bundles its own runtime.

It is a **complement** to SearchApi's official [MCP server](https://www.searchapi.io/integrations/mcp),
not a replacement. Use the MCP server when you want a hosted, multi-client
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
bun run build          # produces a single binary at dist/searchapi
export SEARCHAPI_API_KEY=your_key
```

## Usage

```bash
searchapi search "rails jobs" --engine google_jobs --num 5 --fields title,link
searchapi search "1TB NVMe SSD" --engine google_shopping --fields title,price,link
searchapi search "AAPL stock" --engine google --format complete
searchapi search "best noise cancelling headphones" --engine google --location Brazil --gl br --hl pt --fields title,link
```

| Flag | Default | Meaning |
|------|---------|---------|
| `--engine` | `google_light` | any SearchApi engine |
| `--num` | `10` | number of results |
| `--fields` | (all) | comma-separated fields to keep from each result |
| `--format` | `compact` | `compact` drops metadata; `complete` is raw JSON |
| `--location` | (none) | SearchApi location, e.g. `Brazil`, `"Austin, TX"` |
| `--gl` | (none) | two-letter country code, e.g. `br`, `us` |
| `--hl` | (none) | two-letter UI language code, e.g. `pt`, `en` |

`compact` (the default) drops the bookkeeping blocks `search_metadata`,
`search_parameters`, `search_information`, and `pagination`. `--fields` goes
further: it returns only the `*_results` arrays trimmed to the keys you name and
drops every other block (ads, answer_box, knowledge_graph, the heavy presentation
blocks on rich engines), so the payload tracks what you asked for, not how verbose
the engine is — a full `google` SERP (~32k tokens raw) comes back at ~291 with
`--fields title,link`. `--location`, `--gl`, and `--hl` are sent to SearchApi only
when set. Output is minified JSON on one stream, because the agent reads it.

## Develop

```bash
bun test        # 35 unit tests, fully offline (no key, no network)
bun run typecheck   # tsc --noEmit, strict + noUncheckedIndexedAccess
```

The URL builder, arg parser, and result-shaping are pure functions; the network call
and the whole `run()` entry take injected `fetch`/streams, so the suite runs with no
API key and no requests.

MIT.
