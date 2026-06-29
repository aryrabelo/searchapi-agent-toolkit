import { encode as toonEncode } from "@toon-format/toon";

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
 * With fields, return only the *_results arrays, each item projected to the
 * named keys; every other top-level key (ads, answer_box, knowledge_graph, and
 * the heavy presentation blocks that dominate rich engines like google) is
 * dropped. With no fields it returns the object unchanged.
 */
export function projectFields(obj: Json, fields: string[]): Json {
  if (fields.length === 0) return obj;
  const out: Json = {};
  for (const k of resultsKeys(obj)) {
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

/** Serialize the shaped result as minified JSON (default) or TOON. */
export function serialize(obj: Json, output: "json" | "toon"): string {
  return output === "toon" ? toonEncode(obj) : JSON.stringify(obj);
}
