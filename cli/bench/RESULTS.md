# TOON benchmark — honest matrix

Tokenizer: **o200k_base** (GPT-4o family, via `gpt-tokenizer`). Generated offline from committed fixtures (`cli/bench/fixtures/*.json`) — reproducible, no network. `bun bench/bench.ts`.

Serializers: JSON-pretty (indent 2), JSON-compact (minified), TOON. Δ columns are TOON vs that baseline; negative = TOON is cheaper.

| View                                    | JSON-pretty | JSON-compact |   TOON | Δ vs pretty | Δ vs compact |
|-----------------------------------------|-------------|--------------|--------|-------------|--------------|
| google — full raw                       |   3397      |   2654       |   2839 | -16%        | +7%          |
| google — organic_results raw            |   2080      |   1621       |   1786 | -14%        | +10%         |
| google — organic_results projected (5f) |   1004      |    812       |    741 | -26%        | -9%          |
| google_jobs — full raw                  |  31118      |  29314       |  29570 | -5%         | +1%          |
| google_jobs — jobs raw                  |  28098      |  26365       |  26599 | -5%         | +1%          |
| google_jobs — jobs projected (5f)       |    517      |    325       |    239 | -54%        | -26%         |

## Composition (where the savings come from)

- **google**: projecting 5 fields cuts the full payload 69% (2654 → 812 compact tokens); TOON on the projected slice saves a further 9% (812 → 741 tokens).
- **google_jobs**: projecting 5 fields cuts the full payload 99% (29314 → 325 compact tokens); TOON on the projected slice saves a further 26% (325 → 239 tokens).

Reading: the big win is **field projection** (shaping the result before it ever reaches the model). TOON adds a real, smaller second win **only on the uniform projected slice**, where its table mode amortizes the keys. On the raw nested view TOON is a wash-or-worse vs minified JSON — so `--output toon` is opt-in, best paired with `--fields`.
