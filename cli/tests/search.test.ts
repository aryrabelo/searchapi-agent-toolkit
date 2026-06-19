import { test, expect } from "bun:test";
import { buildSearchUrl, runSearch, type FetchResponse } from "../src/search";

test("buildSearchUrl targets the SearchApi endpoint with engine, q, num, api_key", () => {
  const url = new URL(buildSearchUrl({ engine: "google_news", q: "a b", num: 5 }, "KEY123"));
  expect(url.origin + url.pathname).toBe("https://www.searchapi.io/api/v1/search");
  expect(url.searchParams.get("engine")).toBe("google_news");
  expect(url.searchParams.get("q")).toBe("a b");
  expect(url.searchParams.get("num")).toBe("5");
  expect(url.searchParams.get("api_key")).toBe("KEY123");
});

test("buildSearchUrl omits num when not positive", () => {
  const url = new URL(buildSearchUrl({ engine: "google", q: "x", num: 0 }, "KEY"));
  expect(url.searchParams.has("num")).toBe(false);
});

test("runSearch returns parsed SearchApi organic_results on ok", async () => {
  // Representative SearchApi google response shape (searchapi.io/docs/google):
  // organic_results[] carries position, title, link, snippet, date.
  const payload = {
    search_metadata: { status: "Success" },
    organic_results: [
      {
        position: 1,
        title: "SearchApi - Real-Time SERP API",
        link: "https://www.searchapi.io/",
        source: "SearchApi",
        domain: "www.searchapi.io",
        snippet: "Scrape Google and other search engines with a fast JSON API.",
        date: "2 days ago",
      },
    ],
    related_searches: [{ query: "serp api", link: "https://www.google.com/search?q=serp+api" }],
  };
  const fake = async (): Promise<FetchResponse> => ({
    ok: true,
    status: 200,
    json: async () => payload,
    text: async () => "",
  });
  const out = await runSearch({ engine: "google", q: "searchapi", num: 1 }, "KEY", fake);
  const results = out.organic_results as Array<Record<string, unknown>>;
  expect(results).toHaveLength(1);
  expect(results[0]?.position).toBe(1);
  expect(results[0]?.title).toBe("SearchApi - Real-Time SERP API");
  expect(results[0]?.link).toBe("https://www.searchapi.io/");
  expect(results[0]?.snippet).toContain("JSON API");
});

test("runSearch throws actionable error on 401", async () => {
  const fake = async (): Promise<FetchResponse> => ({
    ok: false,
    status: 401,
    json: async () => ({}),
    text: async () => "Invalid API key",
  });
  await expect(runSearch({ engine: "google", q: "x", num: 1 }, "BAD", fake)).rejects.toThrow(
    /HTTP 401.*check SEARCHAPI_API_KEY/,
  );
});

test("runSearch flags 429 as rate limit", async () => {
  const fake = async (): Promise<FetchResponse> => ({
    ok: false,
    status: 429,
    json: async () => ({}),
    text: async () => "slow down",
  });
  await expect(runSearch({ engine: "google", q: "x", num: 1 }, "KEY", fake)).rejects.toThrow(
    /HTTP 429.*rate limit/,
  );
});

test("buildSearchUrl includes location, gl, hl, device when set", () => {
  const url = new URL(
    buildSearchUrl(
      { engine: "google", q: "x", num: 5, location: "Brazil", gl: "br", hl: "pt", device: "mobile" },
      "KEY",
    ),
  );
  expect(url.searchParams.get("location")).toBe("Brazil");
  expect(url.searchParams.get("gl")).toBe("br");
  expect(url.searchParams.get("hl")).toBe("pt");
  expect(url.searchParams.get("device")).toBe("mobile");
});

test("buildSearchUrl omits geo params when unset", () => {
  const url = new URL(buildSearchUrl({ engine: "google", q: "x", num: 5 }, "KEY"));
  expect(url.searchParams.has("location")).toBe(false);
  expect(url.searchParams.has("gl")).toBe(false);
  expect(url.searchParams.has("hl")).toBe(false);
  expect(url.searchParams.has("device")).toBe(false);
});

test("buildSearchUrl omits geo params given empty strings", () => {
  const url = new URL(
    buildSearchUrl(
      { engine: "google", q: "x", num: 5, location: "", gl: "", hl: "", device: "" },
      "KEY",
    ),
  );
  expect(url.searchParams.has("location")).toBe(false);
  expect(url.searchParams.has("gl")).toBe(false);
  expect(url.searchParams.has("hl")).toBe(false);
  expect(url.searchParams.has("device")).toBe(false);
});
