# icdwise benchmark

Measures how often an unaided LLM gets ICD-10-CM code descriptions wrong, versus icdwise
(which returns the official text by lookup).

## Files
- `icd-eval.json` — 16 codes (common → obscure, plus well-formed fakes). `official` is the
  authoritative description from the **NIH Clinical Tables Search Service** (or `null` for a
  non-existent/retired code); `llm` is a frontier model's cold, tool-free answer.
- `run.mjs` — scores the LLM baseline vs the icdwise library arm.

## Run

```bash
npm run build
node bench/run.mjs
```

## Recorded baseline (frontier model, no tools)

| Outcome | Result |
| --- | --- |
| Real codes described **wrong** | ~38% |
| Fabricated a description for a **fake** code | yes (J45.999 → "Other asthma") |
| **False-rejected** a real code | yes (V97.33XD) |
| Missed a 2021 code retirement | yes (M54.5) |

Standout errors: `H40.1131` → "severe, right eye" (official: *mild, bilateral*); `T63.011A` →
"ingested mushrooms" (official: *rattlesnake venom*); `S52.521A` → "displaced shaft, left"
(official: *torus fracture, lower end, right*).

**icdwise** returns the official description for every code in the loaded dataset and correctly
flags non-existent codes — correct by construction. (With the starter dataset, a few obscure
benchmark codes report "not in dataset"; load the full CMS set per the repo README to cover all.)
