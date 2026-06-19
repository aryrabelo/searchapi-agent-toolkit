import { test, expect } from "bun:test";
import { compact, resultsKeys, pick, projectFields, shape } from "../src/format";

// Representative SearchApi google response (keys grounded against searchapi.io/docs/google).
const RAW = {
  search_metadata: { id: "search_abc", status: "Success" },
  search_parameters: { engine: "google", q: "chatgpt" },
  search_information: { total_results: 945000000 },
  knowledge_graph: { title: "ChatGPT", type: "Software" },
  answer_box: { answer: "42" },
  organic_results: [
    {
      position: 1,
      title: "Introducing ChatGPT",
      link: "https://openai.com/index/chatgpt/",
      snippet: "ChatGPT is a sibling model to InstructGPT.",
      date: "Nov 30, 2022",
      domain: "openai.com",
      favicon: "data:image/png;base64,...",
    },
    {
      position: 2,
      title: "ChatGPT on the App Store",
      link: "https://apps.apple.com/app/chatgpt",
      snippet: "Chat with the most advanced AI.",
      date: "May 18, 2023",
      domain: "apps.apple.com",
      favicon: "data:image/png;base64,...",
    },
  ],
  related_questions: [{ question: "Is ChatGPT free?" }],
  related_searches: [{ query: "chatgpt login" }],
  pagination: { current: 1, next: "https://www.searchapi.io/..." },
};

test("compact drops SearchApi bookkeeping fields, keeps results and blocks", () => {
  const out = compact(RAW);
  for (const k of ["search_metadata", "search_parameters", "search_information", "pagination"]) {
    expect(out).not.toHaveProperty(k);
  }
  expect(out).toHaveProperty("organic_results");
  expect(out).toHaveProperty("answer_box");
  expect(out).toHaveProperty("knowledge_graph");
  expect(out).toHaveProperty("related_questions");
});

test("resultsKeys finds every *_results array, ignores non-arrays and blocks", () => {
  expect(resultsKeys(RAW)).toEqual(["organic_results"]);
  expect(resultsKeys({ news_results: [], organic_results: [] })).toEqual([
    "news_results",
    "organic_results",
  ]);
  // answer_box / knowledge_graph are objects, not *_results arrays.
  expect(resultsKeys({ answer_box: {}, knowledge_graph: {} })).toEqual([]);
  expect(resultsKeys({ foo_results: "not an array" })).toEqual([]);
});

test("pick keeps only requested SearchApi fields and skips absent ones", () => {
  expect(
    pick(
      { title: "t", link: "l", snippet: "s", position: 1, date: "d" },
      ["title", "link", "missing"],
    ),
  ).toEqual({ title: "t", link: "l" });
});

test("projectFields trims each organic result and leaves blocks alone", () => {
  const out = projectFields(RAW, ["title", "link", "position", "date"]) as {
    answer_box: unknown;
    knowledge_graph: unknown;
    organic_results: unknown[];
  };
  expect(out.answer_box).toEqual({ answer: "42" });
  expect(out.knowledge_graph).toEqual({ title: "ChatGPT", type: "Software" });
  expect(out.organic_results).toEqual([
    {
      position: 1,
      title: "Introducing ChatGPT",
      link: "https://openai.com/index/chatgpt/",
      date: "Nov 30, 2022",
    },
    {
      position: 2,
      title: "ChatGPT on the App Store",
      link: "https://apps.apple.com/app/chatgpt",
      date: "May 18, 2023",
    },
  ]);
});

test("projectFields trims every results array, not just the first", () => {
  const obj = { organic_results: [{ title: "o", x: 1 }], news_results: [{ title: "n", y: 2 }] };
  const out = projectFields(obj, ["title"]) as {
    organic_results: unknown[];
    news_results: unknown[];
  };
  expect(out.organic_results).toEqual([{ title: "o" }]);
  expect(out.news_results).toEqual([{ title: "n" }]);
});

test("projectFields with no fields is a no-op", () => {
  expect(projectFields(RAW, [])).toBe(RAW);
});

test("projectFields is a no-op when there is no results array", () => {
  const obj = { answer_box: { answer: "42" }, knowledge_graph: { title: "x" } };
  expect(projectFields(obj, ["title"])).toBe(obj);
});

test("shape compact + fields produces the minimal SearchApi payload", () => {
  const out = shape(RAW, { format: "compact", fields: ["title", "link", "snippet"] }) as {
    organic_results: Record<string, unknown>[];
  };
  expect(out).not.toHaveProperty("search_metadata");
  expect(out).not.toHaveProperty("pagination");
  expect(out.organic_results[0]).toEqual({
    title: "Introducing ChatGPT",
    link: "https://openai.com/index/chatgpt/",
    snippet: "ChatGPT is a sibling model to InstructGPT.",
  });
  // Heavy per-result fields (favicon, domain) are dropped by the projection.
  expect(out.organic_results[0]).not.toHaveProperty("favicon");
});

test("shape complete keeps everything when no fields given", () => {
  expect(shape(RAW, { format: "complete", fields: [] })).toBe(RAW);
});
