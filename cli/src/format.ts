// Pure result-shaping. SearchApi payloads are big; trim them before they reach the model.

export const COMPACT_DROP = [
  "search_metadata",
  "search_parameters",
  "search_information",
  "pagination",
] as const;

type Json = Record<string, unknown>;

/** Drop SearchApi bookkeeping fields, keeping the actual results. */
export function compact(obj: Json): Json {
  const drop = new Set<string>(COMPACT_DROP);
  const out: Json = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!drop.has(k)) out[k] = v;
  }
  return out;
}

/** Every top-level key that is a results array (organic_results, news_results, ...). */
export function resultsKeys(obj: Json): string[] {
  return Object.keys(obj).filter((k) => k.endsWith("_results") && Array.isArray(obj[k]));
}

/** Subset an object to the named fields (silently skips absent ones). */
export function pick(item: Json, fields: string[]): Json {
  const out: Json = {};
  for (const f of fields) {
    if (Object.hasOwn(item, f)) out[f] = item[f];
  }
  return out;
}

/**
 * Project the named fields onto the items of every *_results array, leaving
 * non-results keys (e.g. answer_box) untouched. With no fields, or on a
 * response that has no results array, it returns the object unchanged.
 */
export function projectFields(obj: Json, fields: string[]): Json {
  if (fields.length === 0) return obj;
  const keys = resultsKeys(obj);
  if (keys.length === 0) return obj;
  const out: Json = { ...obj };
  for (const k of keys) {
    out[k] = (obj[k] as Json[]).map((item) => pick(item, fields));
  }
  return out;
}

export interface ShapeOptions {
  format: "compact" | "complete";
  fields: string[];
}

/** Apply compact + field projection in order. */
export function shape(raw: Json, opts: ShapeOptions): Json {
  const base = opts.format === "compact" ? compact(raw) : raw;
  return projectFields(base, opts.fields);
}
