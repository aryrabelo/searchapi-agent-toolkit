// Token-cost benchmark: the same SearchApi response, serialized the way an MCP
// would return it (pretty, all fields) vs the way this CLI returns it (minified,
// compacted, field-projected). Method matches the dev.to writeup: tokens = chars/4,
// the same proxy on both sides, so the ratios are what matter.
//
// Per-call numbers run offline from a representative fixture. The MCP *standing*
// cost (tools/list schema injected every turn) and *discovery* cost (engine
// resource) need a live SEARCHAPI_API_KEY + MCP connection; see PLAN.md Phase C.
//
// Run: bun bench/bench.ts

import { readFileSync } from "node:fs";
import { compact, shape } from "../src/format";

type Json = Record<string, unknown>;

const tokens = (s: string): number => Math.ceil(s.length / 4);

const raw = JSON.parse(
  readFileSync(new URL("./fixtures/google.json", import.meta.url), "utf8"),
) as Json;

// MCP serializes pretty (indent=2) and keeps every field; compact drops metadata only.
const mcpComplete = tokens(JSON.stringify(raw, null, 2));
const mcpCompact = tokens(JSON.stringify(compact(raw), null, 2));
// CLI minifies; compact is the default; --fields projects each result row.
const cliComplete = tokens(JSON.stringify(shape(raw, { format: "complete", fields: [] })));
const cliCompact = tokens(JSON.stringify(shape(raw, { format: "compact", fields: [] })));
const cliFields = tokens(
  JSON.stringify(shape(raw, { format: "compact", fields: ["title", "link"] })),
);

const rows: Array<[string, number]> = [
  ["MCP complete (pretty, default)", mcpComplete],
  ["MCP compact (pretty, no metadata)", mcpCompact],
  ["CLI --format complete (minified)", cliComplete],
  ["CLI compact (minified, default)", cliCompact],
  ["CLI --fields title,link (minified)", cliFields],
];

// Self-check: if shaping regresses, these orderings break.
if (
  !(
    mcpComplete > mcpCompact &&
    mcpComplete >= cliComplete &&
    cliComplete > cliCompact &&
    cliCompact > cliFields
  )
) {
  throw new Error(`bench self-check failed: ${JSON.stringify(rows)}`);
}

const pad = (s: string, n: number): string => s.padEnd(n);
const lines: string[] = [];
lines.push("Per-call token cost, same SearchApi google response (chars/4):");
lines.push("");
lines.push(`| ${pad("Response", 36)} | Tokens |`);
lines.push(`|${"-".repeat(38)}|--------|`);
for (const [label, t] of rows) lines.push(`| ${pad(label, 36)} | ${String(t).padStart(6)} |`);
lines.push("");
lines.push(
  `CLI --fields vs MCP default: ${(mcpComplete / cliFields).toFixed(1)}x smaller (${mcpComplete} -> ${cliFields} tokens).`,
);
lines.push(
  `CLI compact vs MCP compact: ${(mcpCompact / cliCompact).toFixed(1)}x smaller (${mcpCompact} -> ${cliCompact} tokens).`,
);
lines.push(
  "Note: per-call from a representative fixture. MCP standing/discovery cost needs a live key (PLAN.md Phase C).",
);
process.stdout.write(`${lines.join("\n")}\n`);
