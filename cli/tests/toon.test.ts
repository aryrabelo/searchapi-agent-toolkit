import { test, expect } from "bun:test";
import { encode, decode } from "@toon-format/toon";
import { serialize, shape } from "../src/format";
import google from "../bench/fixtures/google.json";

// --output json must never change: byte-identical to the old behavior.
test("json mode is byte-identical to JSON.stringify", () => {
  const obj = { organic_results: [{ title: "a", link: "b" }], count: 1 };
  expect(serialize(obj, "json")).toBe(JSON.stringify(obj));
});

// The win case: a uniform array collapses into a single {fields} table header + rows.
test("toon mode emits a table header for a uniform array", () => {
  const out = serialize(
    { organic_results: [{ title: "a", link: "b" }, { title: "c", link: "d" }] },
    "toon",
  );
  expect(out.startsWith("organic_results[2]{title,link}:")).toBe(true);
  // two data rows under the header
  expect(out.trim().split("\n").length).toBe(3);
});

// TOON is advertised as lossless — prove it round-trips, the property that matters.
test("toon is lossless: decode(encode(x)) round-trips mixed data", () => {
  const obj = {
    a: 1,
    flags: [true, false],
    rows: [{ id: 1, name: "n" }, { id: 2, name: "m" }],
    nested: { k: true, z: null },
  };
  expect(decode(serialize(obj, "toon"))).toEqual(obj);
});

// Round-trip on a REAL projected SearchApi SERP slice (the actual --fields output).
test("toon round-trips a real projected SERP slice", () => {
  const projected = shape(google as Record<string, unknown>, {
    format: "compact",
    fields: ["position", "title", "link"],
  });
  expect(decode(serialize(projected, "toon"))).toEqual(projected);
});

// Values that would break a naive CSV (commas, colons, URLs) must survive.
test("toon safely quotes values with commas, colons and urls", () => {
  const obj = { rows: [{ t: "a, b: c", u: "https://x.com/p?q=1,2", n: "42" }] };
  expect(decode(serialize(obj, "toon"))).toEqual(obj);
});

// Degenerate shapes must not throw and must still round-trip.
test("toon handles an empty results array", () => {
  const obj = { organic_results: [] as unknown[] };
  expect(decode(serialize(obj, "toon"))).toEqual(obj);
});

// serialize is a thin switch over the official encoder — toon path equals encode().
test("serialize toon path equals the official encode()", () => {
  const obj = { rows: [{ id: 1 }, { id: 2 }] };
  expect(serialize(obj, "toon")).toBe(encode(obj));
});
