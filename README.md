# searchapi-agent-toolkit

[![CI](https://github.com/aryrabelo/searchapi-agent-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/aryrabelo/searchapi-agent-toolkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Context-cheap [SearchApi](https://www.searchapi.io) search for AI agents: a CLI and a Claude Code skill, built as **complements** to SearchApi's official [MCP server](https://www.searchapi.io/docs/mcp), not replacements.

The idea is simple. An MCP server injects its tool schema into the model's context on every turn, whether you search or not. A CLI is a binary on `PATH` that costs nothing until you call it, and it can trim each response down to the fields you actually want. For stateless, high-frequency search inside a coding loop, that gap adds up.

## Measured: SearchApi MCP vs the `searchapi` CLI

A token benchmark of the SearchApi MCP server against this CLI — standing cost per turn, discovery cost, and per-call response size on the same query — is **TBD** (to be filled once we measure against a live key). The method mirrors the dev.to write-up in [`BLOG.md`](BLOG.md); the numbers there are placeholders until then.

## The two pieces

| Piece | What | When |
|-------|------|------|
| [`cli/`](cli/README.md) | `searchapi`, a zero-dependency Bun + TypeScript CLI that returns only the fields you ask for, as one compiled binary. | High-frequency, stateless one-shot search in a coding loop, where an always-loaded MCP schema taxes every turn. |
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
```

The CLI calls SearchApi's REST endpoint, `https://www.searchapi.io/api/v1/search`. The API key reads from `SEARCHAPI_API_KEY`. `--fields` projects each result down to the keys you name (e.g. `title,link`); `--format compact` (the default) drops the metadata bookkeeping blocks, `--format complete` returns the raw payload.

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
