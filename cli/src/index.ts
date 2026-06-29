#!/usr/bin/env bun
import { parseArgs, USAGE } from "./cli";
import { runSearch, type FetchLike } from "./search";
import { shape, serialize } from "./format";

export interface RunDeps {
  argv: string[];
  env: Record<string, string | undefined>;
  fetchImpl: FetchLike;
  stdout: (s: string) => void;
  stderr: (s: string) => void;
}

/**
 * The whole CLI as a pure-ish function: returns the exit code, writes through
 * the injected streams. stdout carries only the success JSON; everything else
 * (help, usage, errors) goes to stderr so a caller can parse stdout safely.
 */
export async function run(deps: RunDeps): Promise<number> {
  const args = parseArgs(deps.argv);

  if (args.help) {
    deps.stdout(USAGE);
    return 0;
  }
  if (args.unknownFlags.length > 0) {
    deps.stderr(`error: unknown flag(s): ${args.unknownFlags.join(", ")}\n${USAGE}`);
    return 1;
  }
  if (args.command !== "search" || !args.query) {
    deps.stderr(USAGE);
    return 1;
  }

  const apiKey = deps.env.SEARCHAPI_API_KEY;
  if (!apiKey) {
    deps.stderr("error: set SEARCHAPI_API_KEY\n");
    return 1;
  }

  try {
    const raw = await runSearch(
      { engine: args.engine, q: args.query, num: args.num, location: args.location, gl: args.gl, hl: args.hl },
      apiKey,
      deps.fetchImpl,
    );
    deps.stdout(serialize(shape(raw, { format: args.format, fields: args.fields }), args.output) + "\n");
    return 0;
  } catch (e) {
    deps.stderr(`error: ${(e as Error).message}\n`);
    return 1;
  }
}

if (import.meta.main) {
  const code = await run({
    argv: Bun.argv.slice(2),
    env: process.env,
    fetchImpl: (url) => fetch(url),
    stdout: (s) => process.stdout.write(s),
    stderr: (s) => process.stderr.write(s),
  });
  process.exit(code);
}
