# icdwise — distribution & submission tracker

Status of every place icdwise should appear. Verify live listings — don't assume.

**Reusable copy**
- One-liner: *Verified ICD-10-CM diagnosis-code lookup & validation for AI agents — official descriptions, not guesses.*
- Connector URL: `https://icdwise.qinisolabs.workers.dev/mcp`
- Repo: `https://github.com/qinisolabs/icdwise` · Site: `https://qinisolabs.github.io/icdwise`
- npm: `icdwise`

| Channel | Type | Status | Checked | Notes |
| --- | --- | --- | --- | --- |
| Full dataset loaded | data | ⏳ REQUIRED before publish | — | run `npm run build-data <CMS file>` (see PUBLISH.md §0) |
| npm | publish | ⏳ to do | — | unscoped `icdwise`; scope fallback if 403 |
| GitHub repo + Pages | publish | ⏳ to do | — | topics + homepage; enable Pages /docs |
| Official MCP Registry | publish | ⏳ to do | — | io.github.qinisolabs/icdwise |
| Cloudflare Worker | deploy | ⏳ to do | — | icdwise.qinisolabs.workers.dev/mcp |
| Glama | auto-ingest / claim | ⏳ pending — verify | — | claim via qinisolabs GitHub, **no billing** |
| mcp.so | auto-ingest / form | ⏳ pending — verify | — | |
| PulseMCP | auto-ingest | ⏳ pending — verify | — | |
| awesome-mcp-servers | **manual PR** | ⏳ to do | — | punkpeye/awesome-mcp-servers |
| Launch post | manual | ⏳ when ready | — | lead with "LLMs misdescribe ICD-10 ~38% of the time; icdwise 0%" |

Legend: ✅ done & verified · ⏳ pending · ➖ skip.

## Ready-to-paste directory descriptions (medical-coding keywords)

**Glama / mcp.so description:**
> icdwise gives AI agents the official description of **ICD-10-CM** diagnosis codes, validates whether a code is real, and finds the code for a condition (reverse lookup) — from the public-domain U.S. code set, not the model's memory. Catches the wrong descriptions and fabricated codes LLMs produce ~38% of the time. Hosted (no key) or as a typed npm library.

**mcp.so server config:**
```json
{"mcpServers":{"icdwise":{"command":"npx","args":["-y","icdwise"]}}}
```

**awesome-mcp-servers line:**
```
- [qinisolabs/icdwise](https://github.com/qinisolabs/icdwise) 📇 ☁️ 🏠 - Verified ICD-10-CM medical diagnosis-code lookup, validation & search — official descriptions, not guesses.
```

**Tags:** `mcp, ai-agents, icd-10, icd10, icd-10-cm, medical-coding, diagnosis-codes, healthcare, validation`

**Next actions:** load full dataset → publish (npm/GitHub/registry/Worker/Pages) → awesome PR → verify Glama/mcp.so/PulseMCP ~1 week later.
