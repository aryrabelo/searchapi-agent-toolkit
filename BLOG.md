# I measured an MCP server vs a CLI for agent search. The standing cost is the number nobody shows.

I ran the same Google search through [SearchApi](https://www.searchapi.io)'s [MCP server](https://www.searchapi.io/integrations/mcp) and through [`searchapi`](https://github.com/aryrabelo/searchapi-agent-toolkit), a small open-source (MIT) CLI I built for the same job. Before I had searched anything, the MCP had already put 218 tokens into the model's context for one tool. The CLI put zero. When I did search, the MCP returned 1,630 tokens; the CLI returned 1,290 by default and 417 when I asked for only the fields I wanted. Same query, same SearchApi data underneath, same machine.

This isn't a "CLI beats MCP" piece. The gap on a single light search is modest. The point is *where* the cost lives — the MCP pays a standing tax on every turn whether you search or not, and that tax compounds as you add tools, while the CLI pays nothing until you call it and lets you trim the response to the fields you actually use.

**TL;DR:** for stateless search inside an agent loop, a CLI costs ~0 standing tokens against ~218 per turn per MCP tool, and the `--fields` projection keeps each response around 300–420 tokens *no matter how verbose the engine is*. The honest per-call gap on a comparable engine is roughly 1.3x–4x, not an order of magnitude. Pick the transport that fits the call.

## Standing cost, paid every turn

| | SearchApi MCP (`google_search_light`) | `searchapi` CLI |
|---|---|---|
| Tool schema in context, per turn | 218 tokens | ~0 (binary on `PATH`) |
| Skill metadata | n/a | ~110 tokens, and only until it triggers |

The MCP injects each tool's schema (name, description, input schema) on every request. For the one `google_search_light` tool that's 218 tokens. The CLI injects nothing: it's a binary on `PATH`; the agent learns it exists once and forgets about it until it calls it.

The catch with the MCP is that **SearchApi exposes one tool per engine**. Enable web + news + images + shopping + jobs + local + scholar and you're carrying roughly seven schemas of standing context — on the order of 1.5k tokens — before the agent has done any work. The CLI covers every engine through one `--engine` flag at zero standing cost.

## Discovery cost, paid once

| | SearchApi MCP | `searchapi` CLI |
|---|---|---|
| Learn the interface | via the MCP client | `--help` = 301 tokens |

Both are on demand. You read the CLI's `--help` once (301 tokens) and you're done.

## Per call, the same `google_light` query

| Response | Tokens |
|---|---|
| MCP (server-compacted) | 1,630 |
| CLI `--format complete` | 1,527 |
| CLI compact (the default) | 1,290 |
| CLI compact `--fields title,link` | **417** |

The MCP already compacts well — 1,630 is a reasonable payload, not bloat. The CLI's default compact (1,290) is close. The separation comes from `--fields`: ask for `title,link` and the same ten results come back at 417, because the CLI returns only the result rows trimmed to the keys you named.

## Why `--fields` is the real lever

The compaction both sides do — dropping the bookkeeping blocks (`search_metadata`, `search_parameters`, `search_information`, `pagination`) — is roughly equal. The difference is field projection, and it matters most on the heavy engines.

A full `google` SERP is not a list of ten links. It carries `shopping_ads`, `ai_overview`, `perspectives`, `related_questions`, inline thumbnails and favicons — for a commercial query the raw response runs about **32,000 tokens**. Compaction barely dents that, because the bulk isn't bookkeeping, it's presentation blocks.

`--fields title,link` cuts that same response to **291 tokens**. It keeps only the result arrays, trims each row to the keys you asked for, and drops every other block. So the payload size tracks *what you asked for*, not how verbose the engine is:

| Engine | raw (`complete`) | `--fields title,link` |
|---|---|---|
| `google_light` | 1,527 | 417 |
| `google` (full SERP) | ~31,800 | 291 |

That flat ~300-token floor across engines is the part I'm actually happy with. If you only want links, you pay for links.

## Other people measured the same effect, harder

The principle isn't mine. Anthropic frames the context window as a public good, and two published benchmarks point the same way. Their "code execution with MCP" write-up took a Drive-to-Salesforce workflow from ~150,000 tokens to ~2,000 by calling tools as code instead of loading their definitions, a 98.7% cut. The OnlyCLI benchmark clocked a GitHub task at 44,026 tokens through MCP versus 1,365 through a CLI, about 32x. Those are big end-to-end scenarios with many tools and intermediate results. My numbers on a single search are the small, conservative version of the same mechanism — and I'm reporting them honestly: on one light search the gap is single-digit, the leverage shows up in standing cost as you stack tools and in `--fields` on the heavy engines.

## When you actually want the MCP

Reach for the MCP when the connection is the hard part: OAuth or multi-user auth, server-side quota and rate-limit governance, one hosted endpoint shared by many clients, a session that holds state across steps. SearchApi runs a hosted MCP for exactly that, and that's where it earns its keep.

Reach for the CLI when the call is stateless. Query in, results out, one step, one key in the environment, and a payload you want to trim before it reaches the model. A search is the textbook case. You read `--help` once, and every call after that returns only what you asked for.

## What `searchapi` is

It wraps SearchApi's REST endpoint (`https://www.searchapi.io/api/v1/search`) and compiles to a single binary with `bun build --compile`, no runtime dependencies. `compact` (the default) drops the metadata blocks; `--fields` returns only the result rows projected to the keys you name; the geo flags (`--location`, `--gl`, `--hl`) only go on the wire when you set them. Output is minified JSON on stdout, because the thing reading it is a machine. The key reads from `SEARCHAPI_API_KEY`.

The parts that matter for testing are pure functions: the URL builder, the arg parser, the result shaping. The network call and the `run()` entry take an injected `fetch` and injected streams, so the whole suite runs offline with no key and no requests.

There's a Claude Code skill next to it, `searching-with-searchapi`, that holds the procedure: which engine fits which intent, compact vs complete, operators, when to dedup and cite, when not to search at all. It costs about 110 tokens until it triggers. Capability comes from the CLI (or the MCP); the how-to from the skill.

## Two caveats I'd want if I were reading this

Prompt caching narrows the standing gap on warm sessions where the toolset doesn't change, since the static schema block gets amortized. The per-turn number bites hardest on cold starts and whenever you add or swap a tool. The per-call gap doesn't care about caching; you pay it fresh on every search.

And code execution is a bigger lever than any of this — it's where the 98.7% comes from — but it needs a real sandbox with resource limits and monitoring, which a plain CLI call skips. Different tradeoff, worth naming out loud.

## Bottom line

Match the transport to the call. For stateless search in a coding loop, a small CLI plus a skill is ~0 standing context against ~218 per tool per turn, and `--fields` keeps every response around 300–420 tokens regardless of engine. For a hosted, governed, multi-client connection, the MCP is the right call.

The repo is open source and MIT: [github.com/aryrabelo/searchapi-agent-toolkit](https://github.com/aryrabelo/searchapi-agent-toolkit). The CLI and the skill ship together, both complements to SearchApi's MCP server.

## Appendix: how I measured

Tokens are `characters / 4`, the same proxy on both sides, so trust the ratios more than the absolute numbers; live results also drift between runs.

MCP standing is the real `tools/list` payload from the SearchApi MCP server, counting the fields a client actually receives (`name`, `description`, `inputSchema`): 218 tokens for the one `google_search_light` tool. Per call is one live tool call for the query.

CLI numbers are one live `google_light` (and one `google`) search for the same query through SearchApi's REST endpoint, serialized the way the CLI ships it: `complete` (raw), `compact` (metadata dropped), and compact with `--fields title,link` (result rows projected). Exact tokens: MCP standing 218, MCP per-call 1,630; CLI `google_light` complete 1,527 / compact 1,290 / `--fields` 417; CLI `google` complete ~31,800 / `--fields` 291; CLI `--help` 301, skill ~110.

Sources: Anthropic's "Code execution with MCP", "Writing tools for agents", and "Effective context engineering"; the OnlyCLI token-cost benchmark; SearchApi's MCP and REST documentation.
