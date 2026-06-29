import { test, expect } from "bun:test";
import { parseArgs } from "../src/cli";

test("defaults: google_light, num 10, compact, no fields", () => {
  const a = parseArgs(["search", "hello world"]);
  expect(a.command).toBe("search");
  expect(a.query).toBe("hello world");
  expect(a.engine).toBe("google_light");
  expect(a.num).toBe(10);
  expect(a.format).toBe("compact");
  expect(a.fields).toEqual([]);
  expect(a.unknownFlags).toEqual([]);
});

test("parses space-form engine, num, fields, format", () => {
  const a = parseArgs([
    "search", "rails jobs",
    "--engine", "google_jobs",
    "--num", "5",
    "--fields", "title, link ,snippet",
    "--format", "complete",
  ]);
  expect(a.engine).toBe("google_jobs");
  expect(a.num).toBe(5);
  expect(a.fields).toEqual(["title", "link", "snippet"]);
  expect(a.format).toBe("complete");
});

test("parses equals-form flags", () => {
  const a = parseArgs(["search", "x", "--num=5", "--engine=google", "--format=complete"]);
  expect(a.num).toBe(5);
  expect(a.engine).toBe("google");
  expect(a.format).toBe("complete");
  expect(a.query).toBe("x");
});

test("multi-word query joins positionals after the command", () => {
  expect(parseArgs(["search", "coffee", "shops", "austin"]).query).toBe("coffee shops austin");
});

test("invalid or zero num is ignored, default kept", () => {
  expect(parseArgs(["search", "x", "--num", "abc"]).num).toBe(10);
  expect(parseArgs(["search", "x", "--num", "-3"]).num).toBe(10);
  expect(parseArgs(["search", "x", "--num=0"]).num).toBe(10);
});

test("invalid format is ignored, default kept", () => {
  expect(parseArgs(["search", "x", "--format", "weird"]).format).toBe("compact");
});

test("output: default json, parses toon, invalid ignored, equals form", () => {
  expect(parseArgs(["search", "x"]).output).toBe("json");
  expect(parseArgs(["search", "x", "--output", "toon"]).output).toBe("toon");
  expect(parseArgs(["search", "x", "--output", "bogus"]).output).toBe("json");
  expect(parseArgs(["search", "x", "--output=toon"]).output).toBe("toon");
});

test("unknown flag is captured, not leaked into the query", () => {
  const a = parseArgs(["search", "x", "--bogus"]);
  expect(a.unknownFlags).toEqual(["--bogus"]);
  expect(a.query).toBe("x");
});

test("help flag", () => {
  expect(parseArgs(["--help"]).help).toBe(true);
  expect(parseArgs(["-h"]).help).toBe(true);
});

test("geo flags are undefined when unset", () => {
  const a = parseArgs(["search", "x"]);
  expect(a.location).toBeUndefined();
  expect(a.gl).toBeUndefined();
  expect(a.hl).toBeUndefined();
});

test("parses geo flags: space form", () => {
  const a = parseArgs(["search", "doaudio.app", "--location", "Brazil", "--gl", "br", "--hl", "pt"]);
  expect(a.location).toBe("Brazil");
  expect(a.gl).toBe("br");
  expect(a.hl).toBe("pt");
  expect(a.query).toBe("doaudio.app");
});

test("parses geo flags: equals form", () => {
  const a = parseArgs(["search", "x", "--location=Austin, TX", "--gl=us", "--hl=en"]);
  expect(a.location).toBe("Austin, TX");
  expect(a.gl).toBe("us");
  expect(a.hl).toBe("en");
});
