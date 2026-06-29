import { test, expect } from "bun:test";
import { serialize } from "../src/format";

test("serialize json mode equals JSON.stringify", () => {
  const obj = { organic_results: [{ title: "a", link: "b" }], count: 1 };
  expect(serialize(obj, "json")).toBe(JSON.stringify(obj));
});

test("serialize toon mode emits TOON table header", () => {
  const out = serialize(
    { organic_results: [{ title: "a", link: "b" }, { title: "c", link: "d" }] },
    "toon",
  );
  expect(out.length).toBeGreaterThan(0);
  expect(out.startsWith("organic_results[2]{title,link}:")).toBe(true);
});
