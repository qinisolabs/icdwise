<div align="center">

<img src="https://qinisolabs.github.io/icdwise/logo.svg" width="96" height="96" alt="Qiniso" />

# icdwise

**Verified ICD-10-CM code lookup & validation for AI agents — official descriptions, not guesses.**

*Verified, trustworthy data tools for AI agents. "Qiniso" means "truth" in Zulu.*

[Website](https://qinisolabs.github.io/icdwise/) · [npm](https://www.npmjs.com/package/icdwise) · [MCP endpoint](https://icdwise.qinisolabs.workers.dev/mcp) · [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=icdwise)

</div>

---

Ask an LLM what an ICD-10-CM code means and it will answer confidently — and often **wrongly**: the wrong laterality, the wrong severity, the wrong condition entirely, and it will happily invent a description for a code that doesn't exist. **icdwise** looks the code up in the official U.S. ICD-10-CM code set and returns the real description — or an honest *"not found"* instead of a guess.

> Asked to describe real ICD-10-CM codes, a frontier model with no tools was **wrong ~38% of the time** — e.g. it called `H40.1131` *"severe stage, right eye"* (it's *mild, bilateral*) and `T63.011A` *"ingested mushrooms"* (it's *rattlesnake venom*) — and it **fabricated a description for a code that doesn't exist**. icdwise: the official text, or "not found." Never a guess.

## Add it to Claude

Settings → Connectors → **Add custom connector**, and paste — no login, no key:

```
https://icdwise.qinisolabs.workers.dev/mcp
```

Stateless, reads no user data, requires no secrets. Prefer to run it locally over stdio? Add `{ "command": "npx", "args": ["-y", "icdwise"] }` under `mcpServers` in your client config.

## Use it as a library

```bash
npm i icdwise
```

```ts
import { lookupIcd10, validateIcd10, searchIcd10 } from "icdwise";

lookupIcd10("E11.9").description;     // "Type 2 diabetes mellitus without complications"
lookupIcd10("H40.1131").description;  // "Primary open-angle glaucoma, bilateral, mild stage"
validateIcd10("E11.99").valid;        // false — well-formed but not a real code
searchIcd10("generalized anxiety");   // → [{ code: "F41.1", description: "Generalized anxiety disorder" }, ...]
```

Codes are accepted with or without the dot (`E11.9` or `E119`). A well-formed code that isn't in the official set returns `found: false` with a clear note — it never invents a description.

## Tools — 3

| Tool | What it answers |
| --- | --- |
| **lookup_icd10** | The official description of a code (+ canonical form and 3-char category) |
| **validate_icd10** | Is this a real ICD-10-CM code? (well-formed *and* in the official set) |
| **search_icd10** | Reverse lookup — find the code(s) for a condition by keywords |

## Data

ICD-10-CM is U.S. **public-domain** data (NCHS/CMS). The full code set (~74,000 codes) is bundled and generated from the official CMS release via `npm run build-data <icd10cm-codes-YYYY.txt>` (see `scripts/build-data.mjs`); every response reports the `datasetVersion` it used. Descriptions are the official text — the curated, versioned dataset kept current is the moat.

## What it is *not*

- **Not medical advice**, and not a determination of billability, coverage, or clinical appropriateness.
- **Not ICD-10 (WHO) or ICD-11** — this is ICD-10-**CM** (the U.S. Clinical Modification).
- **Not a guesser** — unknown/retired/non-leaf codes return an honest "not found", never a fabricated description.

## Architecture

A single TypeScript package exposing one MCP server over two transports — **stdio** (local / `npx`) and a **Cloudflare Worker** (hosted edge endpoint) — both driven by the same `core.ts` tool definitions, which also power the importable library.

```bash
npm install
npm run build
npm test
```

## Privacy

This tool runs locally on your machine and is built not to collect, store, or transmit your data — no analytics, no telemetry, no account. All reference data is bundled — no network calls, and nothing leaves your device. Full policy: <https://qinisolabs.github.io/privacy.html>.

## License

Apache-2.0. ICD-10-CM data is U.S. public domain (NCHS/CMS); see `NOTICE`.
