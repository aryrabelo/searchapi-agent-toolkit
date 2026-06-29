// Honest token-cost benchmark: the SAME SearchApi response across three serializers
// (JSON-pretty, JSON-compact/minified, TOON) and three views (full raw, main array
// raw, main array projected to 5 fields), over the committed google and google_jobs
// fixtures. Tokens are measured with the real o200k_base tokenizer (GPT-4o family),
// not chars/4, so the deltas are honest.
//
// The finding it encodes: TOON wins on the *uniform projected* slice (table mode),
// and is a wash-or-worse on the *raw nested* view. The self-check throws if that
// ordering regresses.
//
// Offline + reproducible: runs entirely from the committed fixtures, no key, no network.
// Run: bun bench/bench.ts

import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { encode as o200k } from "gpt-tokenizer/encoding/o200k_base";
import { encode as toonEncode } from "@toon-format/toon";
import { pick } from "../src/format";

type Json = Record<string, unknown>;

const tokens = (s: string): number => o200k(s).length;

const load = (name: string): Json =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8")) as Json;

interface Engine {
  name: string;
  fixture: string;
  mainArray: string;
  fields: string[];
}

const engines: Engine[] = [
  {
    name: "google",
    fixture: "google",
    mainArray: "organic_results",
    fields: ["position", "title", "link", "snippet", "source"],
  },
  {
    name: "google_jobs",
    fixture: "google_jobs",
    mainArray: "jobs",
    fields: ["position", "title", "company_name", "location", "via"],
  },
];

// Three serializers measured the same way on both sides.
const cost = (v: Json): { pretty: number; compact: number; toon: number } => ({
  pretty: tokens(JSON.stringify(v, null, 2)),
  compact: tokens(JSON.stringify(v)),
  toon: tokens(toonEncode(v)),
});

// Signed % of TOON vs a baseline: negative = TOON cheaper.
const delta = (toon: number, base: number): string => {
  const pct = Math.round(((toon - base) / base) * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
};

interface Row {
  view: string;
  pretty: number;
  compact: number;
  toon: number;
}

const rows: Row[] = [];
const compositions: string[] = [];

for (const eng of engines) {
  const raw = load(eng.fixture);
  const items = raw[eng.mainArray] as Json[];
  if (!Array.isArray(items)) throw new Error(`fixture ${eng.fixture} missing array ${eng.mainArray}`);

  // View 1: full raw object (everything SearchApi returned).
  const full = raw;
  // View 2: main array only, all fields (nested/heavy).
  const arrRaw: Json = { [eng.mainArray]: items };
  // View 3: main array projected to 5 fields (uniform slice). projectFields/shape only
  // touch *_results keys, so jobs would slip through — project the main array directly.
  const arrProj: Json = { [eng.mainArray]: items.map((it) => pick(it, eng.fields)) };

  const cFull = cost(full);
  const cRaw = cost(arrRaw);
  const cProj = cost(arrProj);

  rows.push({ view: `${eng.name} — full raw`, ...cFull });
  rows.push({ view: `${eng.name} — ${eng.mainArray} raw`, ...cRaw });
  rows.push({ view: `${eng.name} — ${eng.mainArray} projected (5f)`, ...cProj });

  // Composition: projection alone (compact) vs raw-full (compact), then TOON on top of projection.
  const projVsFull = Math.round((1 - cProj.compact / cFull.compact) * 100);
  const toonOnProj = Math.round((1 - cProj.toon / cProj.compact) * 100);
  compositions.push(
    `- **${eng.name}**: projecting 5 fields cuts the full payload ${projVsFull}% ` +
      `(${cFull.compact} → ${cProj.compact} compact tokens); TOON on the projected slice ` +
      `saves a further ${toonOnProj}% (${cProj.compact} → ${cProj.toon} tokens).`,
  );

  // Self-check (throws on regression):
  // projected uniform slice: toon < compact < pretty
  if (!(cProj.toon < cProj.compact && cProj.compact < cProj.pretty)) {
    throw new Error(
      `self-check failed (${eng.name} projected): expected toon<compact<pretty, got ${JSON.stringify(cProj)}`,
    );
  }
  // raw nested view: TOON is wash-or-worse vs compact, but still < pretty.
  if (!(cRaw.compact <= cRaw.toon && cRaw.toon < cRaw.pretty)) {
    throw new Error(
      `self-check failed (${eng.name} raw nested): expected compact<=toon<pretty, got ${JSON.stringify(cRaw)}`,
    );
  }
}

// Render the matrix.
const pad = (s: string, n: number): string => s.padEnd(n);
const num = (n: number): string => String(n).padStart(6);
const viewW = Math.max(...rows.map((r) => r.view.length), "View".length);

const out: string[] = [];
out.push("# TOON benchmark — honest matrix");
out.push("");
out.push(
  "Tokenizer: **o200k_base** (GPT-4o family, via `gpt-tokenizer`). " +
    "Generated offline from committed fixtures (`cli/bench/fixtures/*.json`) — reproducible, no network. " +
    "`bun bench/bench.ts`.",
);
out.push("");
out.push("Serializers: JSON-pretty (indent 2), JSON-compact (minified), TOON. " +
  "Δ columns are TOON vs that baseline; negative = TOON is cheaper.");
out.push("");
out.push(
  `| ${pad("View", viewW)} | JSON-pretty | JSON-compact |   TOON | Δ vs pretty | Δ vs compact |`,
);
out.push(`|${"-".repeat(viewW + 2)}|-------------|--------------|--------|-------------|--------------|`);
for (const r of rows) {
  out.push(
    `| ${pad(r.view, viewW)} | ${num(r.pretty)}      | ${num(r.compact)}       | ${num(r.toon)} | ` +
      `${pad(delta(r.toon, r.pretty), 11)} | ${pad(delta(r.toon, r.compact), 12)} |`,
  );
}
out.push("");
out.push("## Composition (where the savings come from)");
out.push("");
out.push(...compositions);
out.push("");
out.push(
  "Reading: the big win is **field projection** (shaping the result before it ever reaches the model). " +
    "TOON adds a real, smaller second win **only on the uniform projected slice**, where its table mode " +
    "amortizes the keys. On the raw nested view TOON is a wash-or-worse vs minified JSON — so `--output toon` " +
    "is opt-in, best paired with `--fields`.",
);

const report = `${out.join("\n")}\n`;
process.stdout.write(report);
writeFileSync(new URL("./RESULTS.md", import.meta.url), report);
