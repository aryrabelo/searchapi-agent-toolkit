// Pure argument parsing. No I/O — unit-testable.

export interface ParsedArgs {
  command: string;
  query: string;
  engine: string;
  num: number;
  fields: string[];
  format: "compact" | "complete";
  output: "json" | "toon";
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
  --engine   SearchApi engine (default: google_light)
  --num      number of results (default: 10)
  --fields   comma-separated fields to keep from each *_results item (default: all)
  --format   compact = drop metadata (default) | complete = raw JSON
  --location SearchApi location, e.g. "Brazil" or "Austin, TX" (default: none)
  --gl       two-letter country code, e.g. br, us (default: none)
  --hl       two-letter UI language code, e.g. pt, en (default: none)
  --output   json (default) | toon = Token-Oriented Object Notation (lossless, fewer tokens on uniform/projected arrays)
  -h, --help show this help

--fields returns only the *_results arrays, each trimmed to the named keys; all
other blocks (ads, answer_box, knowledge_graph, ...) are dropped. Both --flag
value and --flag=value work.

Env:
  SEARCHAPI_API_KEY   required

Examples:
  searchapi search "rails jobs" --engine google_jobs --num 5 --fields title,link
  searchapi search "AAPL stock" --engine=google --format=complete
  searchapi search "doaudio.app" --engine google --location Brazil --gl br --hl pt --fields title,link
`;

// One setter per value flag. The key set doubles as the known-flag allowlist.
const FLAG_SETTERS: Record<string, (out: ParsedArgs, value: string) => void> = {
  engine: (o: ParsedArgs, v: string) => {
    o.engine = v;
  },
  num: (o: ParsedArgs, v: string) => {
    const n = Number(v);
    if (Number.isInteger(n) && n > 0) o.num = n;
  },
  fields: (o: ParsedArgs, v: string) => {
    o.fields = v
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  },
  format: (o: ParsedArgs, v: string) => {
    if (v === "compact" || v === "complete") o.format = v;
  },
  output: (o: ParsedArgs, v: string) => {
    if (v === "json" || v === "toon") o.output = v;
  },
  location: (o: ParsedArgs, v: string) => {
    o.location = v;
  },
  gl: (o: ParsedArgs, v: string) => {
    o.gl = v;
  },
  hl: (o: ParsedArgs, v: string) => {
    o.hl = v;
  },
};

/** Handle one `--flag` (space or = form). Returns the (possibly advanced) argv index. */
function applyLongFlag(out: ParsedArgs, arg: string, argv: string[], i: number): number {
  let key = arg.slice(2);
  let value: string | undefined;
  const eq = key.indexOf("=");
  if (eq !== -1) {
    value = key.slice(eq + 1);
    key = key.slice(0, eq);
  }
  const setter = FLAG_SETTERS[key];
  if (!setter) {
    out.unknownFlags.push(arg);
    return i;
  }
  if (value === undefined) value = argv[++i];
  if (value !== undefined) setter(out, value);
  return i;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {
    command: "",
    query: "",
    engine: "google_light",
    num: 10,
    fields: [],
    format: "compact",
    output: "json",
    help: false,
    unknownFlags: [],
  };
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === "-h" || arg === "--help") {
      out.help = true;
    } else if (arg.startsWith("--")) {
      i = applyLongFlag(out, arg, argv, i);
    } else {
      positional.push(arg);
    }
  }

  out.command = positional[0] ?? "";
  out.query = positional.slice(1).join(" ");
  return out;
}
