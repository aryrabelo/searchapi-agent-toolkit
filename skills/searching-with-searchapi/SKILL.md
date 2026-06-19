---
name: searching-with-searchapi
description: Use when an agent needs live, structured search-engine data through SearchApi (web results, news, jobs, scholar, shopping, maps/local, images, video, Bing). Covers picking the right engine for the intent, choosing compact vs complete output, query operators, pagination, deduping and citing results, and when NOT to search. Triggers on "search the web", "current/latest", "rank tracking", "SERP", "google results", "searchapi".
---

# Searching with SearchApi

SearchApi runs a query against a real search engine, solves CAPTCHAs and proxies, and returns clean structured JSON. This skill is the *procedure* layer: it assumes you already have a SearchApi search capability available (the official SearchApi MCP server, or the `searchapi` CLI in this repo) and tells you how to use it well so you spend few tokens and get trustworthy results.

The single biggest mistake agents make with a SERP tool is dumping the full raw JSON into context. SearchApi responses are large. Treat the context window as a public good: ask for the narrowest result that answers the question.

## Decision: do you even need to search?

Search when the answer is **time-sensitive, niche, or must be cited** (prices, news, rankings, "latest", a specific page's current content, anything post-training-cutoff). Do **not** search for stable general knowledge you already hold, for math, or to re-fetch something already in context. A wasted search costs tokens and latency on both sides.

## Step 1 — pick the engine by intent

`engine` is required by the SearchApi endpoint; the `searchapi` CLI defaults it to `google`. Override it to match the intent:

| Intent | Engine |
|--------|--------|
| Full Google SERP (organic, answer box, knowledge graph) | `google` |
| News / recency | `google_news` |
| Job postings | `google_jobs` |
| Academic papers, citations | `google_scholar` |
| Shopping / product listings + prices | `google_shopping` |
| Local businesses, maps | `google_maps` (or `google_local`) |
| Images / video | `google_images` / `google_videos` |
| YouTube | `youtube` (also `youtube_transcripts`, `youtube_video`) |
| Non-Google web | `bing` (also `bing_news`, `baidu`) |

If you are unsure which parameters an engine accepts, read its reference page first: `https://www.searchapi.io/docs/<engine>` (e.g. `/docs/google`, `/docs/google_jobs`). Read the one engine you need, not the whole index — and confirm the exact response key names there before shaping output rather than guessing them.

## Step 2 — choose output mode: compact first

- **`compact`** (prefer this): drops the bookkeeping blocks (`search_metadata`, `search_parameters`, `search_information`, `pagination`) and keeps the actual results. Use it for almost everything.
- **`complete`**: only when you specifically need pagination tokens, the search-information totals, or metadata for a follow-up call.

Default to `compact`. Reach for `complete` deliberately.

## Step 3 — write a tight query

- Quote exact phrases: `"senior rails engineer"`.
- Scope by site: `site:news.ycombinator.com`.
- Exclude noise: `rails -jobs`.
- Constrain freshness with the engine (`google_news`) rather than stuffing date words into `q`.
- Set geo for local or geo-sensitive intent instead of baking the city into `q`. The `searchapi` CLI forwards `--location` (e.g. `"Austin, TX"` or `Brazil`), `--gl` (two-letter country, e.g. `br`), and `--hl` (UI language, e.g. `pt`); the MCP server takes the same `location`/`gl`/`hl` params. Example: `searchapi search "best noise cancelling headphones" --engine google --location Brazil --gl br --hl pt --fields title,link`.
- Keep `num` small (5–10). You rarely need 100 results; you need the right 5.

## Step 4 — read narrow, then widen only if needed

Prefer several small targeted searches over one broad search you then scroll. Pull `title`, `link`, `snippet` (and `price`/`date` when relevant) from the top `organic_results`. If the answer isn't on the first page, refine the query before asking for more pages — a sharper query beats deeper pagination.

## Step 5 — dedup and cite

- Dedup by normalized URL/domain before presenting; the same story often appears across results.
- Always cite the `link` for any claim drawn from a result. Never present a scraped snippet as your own knowledge.
- If results conflict, say so and cite both rather than silently picking one.

## Anti-patterns

- Returning full `complete` JSON into context "just in case" — strip to `compact`.
- Searching for something already in the conversation.
- Asking for `num=100` then summarizing — search narrower instead.
- Inventing a result `link` or a date the response didn't contain.
- Looping the same query with tiny wording changes — change the engine or add operators instead.

## Examples / evals

These double as the skill's evals — each should be answerable with one or two well-shaped calls.

1. **"What's the latest news on a major antitrust ruling?"**
   → `engine=google_news`, `q="antitrust ruling"`, `mode=compact`, `num=5`; cite the top 2–3 `link`s with dates.

2. **"Cheapest 1TB NVMe SSD right now?"**
   → `engine=google_shopping`, `q="1TB NVMe SSD"`, `mode=compact`; sort the returned shopping results by `price`, cite the merchant `link`.

3. **"Coffee shops near downtown Austin."**
   → `engine=google_maps`, `q="coffee shops"`, `location="Austin, TX"`, `mode=compact`; return name + address + rating, not the raw blob.

4. **"Is there a remote senior Rails role posted this week?"**
   → `engine=google_jobs`, `q="senior rails engineer remote"`, `mode=compact`, `num=5`; confirm from each posting `link`, don't guess.

## When to reach for the CLI instead of the MCP

For high-frequency, stateless lookups in a long agent session, the `searchapi` CLI in this repo returns only the fields you ask for and costs almost no standing context, where an always-loaded MCP server pays its tool schema on every turn. Use the MCP server when you want a hosted, multi-client connection; use the CLI for cheap one-shot calls inside a coding loop. Both are complements to SearchApi's official MCP, not replacements.
