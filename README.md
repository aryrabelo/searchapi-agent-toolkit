# searchapi-agent-toolkit

[![CI](https://github.com/aryrabelo/searchapi-agent-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/aryrabelo/searchapi-agent-toolkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Context-cheap [SearchApi](https://www.searchapi.io) search for AI agents: a CLI and a Claude Code skill, built as **complements** to SearchApi's official [MCP server](https://www.searchapi.io/integrations/mcp), not replacements.

The idea is simple. An MCP server injects its tool schema into the model's context on every turn, whether you search or not. A CLI is a binary on `PATH` that costs nothing until you call it, and it can trim each response down to the fields you actually want. For stateless, high-frequency search inside a coding loop, that gap adds up.

## Measured: SearchApi MCP vs the `searchapi` CLI

Same query (`best noise cancelling headphones`, 10 results), same machine. Tokens are `chars / 4` on both sides, so trust the ratios over the absolutes. The MCP integration exposed one tool (`google_search_light`); the full method is in [`BLOG.md`](BLOG.md).

| | SearchApi MCP (`google_search_light`) | `searchapi` CLI (`google_light`) |
|---|---|---|
| Standing cost, every turn | 218 tokens (tool schema) | ~0 (binary) + ~110 if the skill is loaded |
| Discovery, once | via the MCP client | `--help` = 301 tokens |
| Per call | 1,630 (server-compacted) | 1,290 compact / **417** `--fields title,link` |

Two things the CLI does on purpose. First, `--fields` returns only the result rows trimmed to the keys you name, so the payload stays ~300–420 tokens **regardless of how verbose the engine is** — a full `google` SERP whose raw response is ~32k tokens still drops to 291 with `--fields title,link`. Second, it costs ~0 standing tokens when idle, where the MCP pays its schema every turn; SearchApi's MCP is one tool per engine, so that standing cost compounds as you enable more engines. The honest gap is modest — roughly 1.3x (compact) to 4x (`--fields`) per call, plus 218-vs-0 standing — not the order-of-magnitude numbers from big multi-tool end-to-end benchmarks. Pick the transport that fits the call.

## The two pieces

| Piece | What | When |
|-------|------|------|
| [`cli/`](cli/README.md) | `searchapi`, a Bun + TypeScript CLI that returns only the fields you ask for, as one compiled binary. One small runtime dependency (`@toon-format/toon`, MIT), used only for `--output toon`. | High-frequency, stateless one-shot search in a coding loop, where an always-loaded MCP schema taxes every turn. |
| [`skills/searching-with-searchapi`](skills/searching-with-searchapi/SKILL.md) | A Claude Code skill: the *procedure* for searching well (engine by intent, compact vs complete, operators, pagination, dedup and cite, when not to search). Costs little until triggered. | Any agent with a SearchApi search capability that should use it well and cheaply. |

MCP (or this CLI) provides the capability; the skill provides the how-to on top. Use SearchApi's MCP server for hosted, multi-client, stateful connections; use `searchapi` for cheap stateless calls; let the skill make either one easy to use correctly.

## Quick start

```bash
cd cli && bun install && bun run build
export SEARCHAPI_API_KEY=your_key

# stateless search, trimmed to the fields you want
./dist/searchapi search "remote rails jobs" --engine google_jobs --num 5 --fields title,link

# localized results: geo flags only go on the wire when set
./dist/searchapi search "best noise cancelling headphones" --engine google --location Brazil --gl br --hl pt --fields title,link

# TOON output: lossless, fewer tokens on uniform/projected result arrays
./dist/searchapi search "rails jobs" --engine google_jobs --fields title,link --output toon
```

The CLI calls SearchApi's REST endpoint, `https://www.searchapi.io/api/v1/search`. The API key reads from `SEARCHAPI_API_KEY`. `--fields` returns only the result rows trimmed to the keys you name (e.g. `title,link`), dropping every other block; `--format compact` (the default) drops the metadata bookkeeping blocks, `--format complete` returns the raw payload. `--output json` (the default) emits minified JSON; `--output toon` emits the same shaped object as [TOON](https://github.com/toon-format/toon) (Token-Oriented Object Notation) — lossless and fewer tokens on uniform/projected result arrays.

Install the skill into Claude Code:

```bash
cp -r skills/searching-with-searchapi ~/.claude/skills/
```

## Develop

```bash
cd cli
bun test            # unit tests, fully offline (no key, no network)
bun run typecheck
bun run build       # single self-contained binary at dist/searchapi
```

The URL builder, argument parser, and result shaping are pure functions; the network call and the `run()` entry take an injected `fetch` and injected streams, so the whole suite runs offline.

## License

MIT. See [LICENSE](LICENSE).
