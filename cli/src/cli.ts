// Pure argument parsing. No I/O — unit-testable.

export interface ParsedArgs {
  command: string;
  query: string;
  engine: string;
  num: number;
  fields: string[];
  format: "compact" | "complete";
  location?: string;
  gl?: string;
  hl?: string;
  help: boolean;
  unknownFlags: string[];
}

export const USAGE = `searchapi - tiny SearchApi search CLI (context-saving)

Usage:
  searchapi search "<query>" [--engine <name>] [--num <n>] [--fields a,b,c] [--format compact|complete] [--location <loc>] [--gl <cc>] [--hl <lang>]

Options:
  --engine   SearchApi engine (default: google)
  --num      number of results (default: 10)
  --fields   comma-separated fields to keep from each *_results item (default: all)
  --format   compact = drop metadata (default) | complete = raw JSON
  --location SearchApi location, e.g. "Brazil" or "Austin, TX" (default: none)
  --gl       two-letter country code, e.g. br, us (default: none)
  --hl       two-letter UI language code, e.g. pt, en (default: none)
  -h, --help show this help

--fields projects every *_results array; it is a no-op on responses with no
results array (e.g. an answer_box). Both --flag value and --flag=value work.

Env:
  SEARCHAPI_API_KEY   required

Examples:
  searchapi search "rails jobs" --engine google_jobs --num 5 --fields title,link
  searchapi search "AAPL stock" --engine=google --format=complete
  searchapi search "doaudio.app" --engine google --location Brazil --gl br --hl pt --fields title,link
`;

const VALUE_FLAGS = new Set(["engine", "num", "fields", "format", "location", "gl", "hl"]);

function applyFlag(out: ParsedArgs, key: string, value: string): void {
  if (key === "engine") {
    out.engine = value;
  } else if (key === "num") {
    const n = Number(value);
    if (Number.isInteger(n) && n > 0) out.num = n;
  } else if (key === "fields") {
    out.fields = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (key === "format") {
    if (value === "compact" || value === "complete") out.format = value;
  } else if (key === "location") {
    out.location = value;
  } else if (key === "gl") {
    out.gl = value;
  } else if (key === "hl") {
    out.hl = value;
  }
}

export function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {
    command: "",
    query: "",
    engine: "google",
    num: 10,
    fields: [],
    format: "compact",
    help: false,
    unknownFlags: [],
  };
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;

    if (arg === "-h" || arg === "--help") {
      out.help = true;
      continue;
    }

    if (arg.startsWith("--")) {
      let key = arg.slice(2);
      let value: string | undefined;
      const eq = key.indexOf("=");
      if (eq !== -1) {
        value = key.slice(eq + 1);
        key = key.slice(0, eq);
      }
      if (!VALUE_FLAGS.has(key)) {
        out.unknownFlags.push(arg);
        continue;
      }
      if (value === undefined) value = argv[++i];
      if (value !== undefined) applyFlag(out, key, value);
      continue;
    }

    positional.push(arg);
  }

  out.command = positional[0] ?? "";
  out.query = positional.slice(1).join(" ");
  return out;
}
