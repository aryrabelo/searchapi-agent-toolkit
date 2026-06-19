// SearchApi HTTP call. The URL builder is pure and testable; the network call
// takes an injectable fetch so tests never hit the live API or need a key.

export interface SearchParams {
  engine: string;
  q: string;
  num: number;
  location?: string;
  gl?: string;
  hl?: string;
  device?: string;
}

type Json = Record<string, unknown>;

/** Build the SearchApi REST URL. Pure — no network. */
export function buildSearchUrl(p: SearchParams, apiKey: string): string {
  const u = new URL("https://www.searchapi.io/api/v1/search");
  u.searchParams.set("engine", p.engine);
  u.searchParams.set("q", p.q);
  if (p.num > 0) u.searchParams.set("num", String(p.num));
  if (p.location) u.searchParams.set("location", p.location);
  if (p.gl) u.searchParams.set("gl", p.gl);
  if (p.hl) u.searchParams.set("hl", p.hl);
  if (p.device) u.searchParams.set("device", p.device);
  u.searchParams.set("api_key", apiKey);
  return u.toString();
}

/** The slice of the global fetch Response that runSearch needs. */
export interface FetchResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

export type FetchLike = (url: string) => Promise<FetchResponse>;

/** Run a SearchApi search. Throws an actionable error on non-2xx. */
export async function runSearch(
  p: SearchParams,
  apiKey: string,
  fetchImpl: FetchLike,
): Promise<Json> {
  const res = await fetchImpl(buildSearchUrl(p, apiKey));
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const hint =
      res.status === 401
        ? " (check SEARCHAPI_API_KEY)"
        : res.status === 429
          ? " (rate limit, retry later)"
          : "";
    throw new Error(`SearchApi HTTP ${res.status}${hint}${body ? ": " + body.slice(0, 300) : ""}`);
  }
  return (await res.json()) as Json;
}
