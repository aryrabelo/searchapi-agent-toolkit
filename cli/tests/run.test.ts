import { test, expect } from "bun:test";
import { run, type RunDeps } from "../src/index";
import type { FetchResponse } from "../src/search";

function okFetch() {
  return async (): Promise<FetchResponse> => ({
    ok: true,
    status: 200,
    json: async () => ({ organic_results: [{ title: "ok", link: "l", extra: "noise" }] }),
    text: async () => "",
  });
}

function harness(overrides: Partial<RunDeps>) {
  const out = { stdout: "", stderr: "" };
  const deps: RunDeps = {
    argv: [],
    env: {},
    fetchImpl: okFetch(),
    stdout: (s) => {
      out.stdout += s;
    },
    stderr: (s) => {
      out.stderr += s;
    },
    ...overrides,
  };
  return { deps, out };
}

test("--help prints usage to stdout, exit 0", async () => {
  const { deps, out } = harness({ argv: ["--help"] });
  expect(await run(deps)).toBe(0);
  expect(out.stdout).toContain("searchapi - tiny SearchApi");
  expect(out.stderr).toBe("");
});

test("no query prints usage to stderr, not stdout, exit 1", async () => {
  const { deps, out } = harness({ argv: ["search"] });
  expect(await run(deps)).toBe(1);
  expect(out.stderr).toContain("Usage");
  expect(out.stdout).toBe("");
});

test("unknown flag errors to stderr, exit 1", async () => {
  const { deps, out } = harness({ argv: ["search", "x", "--bogus"], env: { SEARCHAPI_API_KEY: "K" } });
  expect(await run(deps)).toBe(1);
  expect(out.stderr).toContain("unknown flag");
});

test("missing API key errors to stderr, exit 1", async () => {
  const { deps, out } = harness({ argv: ["search", "coffee"], env: {} });
  expect(await run(deps)).toBe(1);
  expect(out.stderr).toContain("SEARCHAPI_API_KEY");
  expect(out.stdout).toBe("");
});

test("success writes only minified JSON to stdout, exit 0", async () => {
  const { deps, out } = harness({
    argv: ["search", "coffee", "--fields", "title,link"],
    env: { SEARCHAPI_API_KEY: "K" },
  });
  expect(await run(deps)).toBe(0);
  expect(out.stderr).toBe("");
  const parsed = JSON.parse(out.stdout);
  expect(parsed.organic_results).toEqual([{ title: "ok", link: "l" }]);
  expect(out.stdout.endsWith("\n")).toBe(true);
});

test("a SearchApi error goes to stderr, leaving stdout clean, exit 1", async () => {
  const failing = async (): Promise<FetchResponse> => ({
    ok: false,
    status: 500,
    json: async () => ({}),
    text: async () => "boom",
  });
  const { deps, out } = harness({
    argv: ["search", "coffee"],
    env: { SEARCHAPI_API_KEY: "K" },
    fetchImpl: failing,
  });
  expect(await run(deps)).toBe(1);
  expect(out.stderr).toContain("error: SearchApi HTTP 500");
  expect(out.stdout).toBe("");
});

test("geo flags flow through to the request URL", async () => {
  let captured = "";
  const spy = async (url: string): Promise<FetchResponse> => {
    captured = url;
    return {
      ok: true,
      status: 200,
      json: async () => ({ organic_results: [] }),
      text: async () => "",
    };
  };
  const { deps } = harness({
    argv: ["search", "doaudio.app", "--location", "Brazil", "--gl", "br", "--hl", "pt"],
    env: { SEARCHAPI_API_KEY: "K" },
    fetchImpl: spy,
  });
  expect(await run(deps)).toBe(0);
  const params = new URL(captured).searchParams;
  expect(params.get("location")).toBe("Brazil");
  expect(params.get("gl")).toBe("br");
  expect(params.get("hl")).toBe("pt");
  expect(params.get("q")).toBe("doaudio.app");
});
