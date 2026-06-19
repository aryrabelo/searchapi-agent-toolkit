# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-19

### Added

- `searchapi` CLI: a zero-runtime-dependency Bun + TypeScript wrapper over
  SearchApi's REST search endpoint (`https://www.searchapi.io/api/v1/search`)
  that returns only the fields you ask for, to keep agent context cheap.
- Flags: `--engine`, `--num`, `--fields`, and `--format` (`compact` | `complete`).
- Geo flags `--location`, `--gl`, and `--hl`, sent to SearchApi only when set.
- API key resolved from `SEARCHAPI_API_KEY`.
- `searching-with-searchapi` Claude Code skill: the procedure layer for choosing
  an engine by intent, compact-vs-complete output, query operators, dedup/cite,
  and when not to search.
- Fully offline unit tests (pure functions + injected `fetch`/env); `bun run
  build` produces a single self-contained binary.

[0.1.0]: https://github.com/aryrabelo/searchapi-agent-toolkit/releases/tag/v0.1.0
