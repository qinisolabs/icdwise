# Publishing icdwise

Run these on your Mac (npm 2FA passkey + `gh` auth as `kristaffa`). From the repo root: `cd icdwise`.

---

## 0. ⚠️ FIRST: load the full ICD-10-CM dataset

The repo ships with a **starter subset** (~40 codes) so tests run. Before publishing, replace it
with the full official set, or the tool will report most real codes as "not found".

1. Download the **"Code Descriptions in Tabular Order"** zip from CMS:
   <https://www.cms.gov/medicare/coding-billing/icd-10-codes> (ICD-10-CM section).
2. Unzip it and find `icd10cm-codes-YYYY.txt` (a plain text file, code + description per line).
3. Build the dataset and rebuild:
```
npm install
npm run build-data /path/to/icd10cm-codes-2025.txt 2025
npm run build
npm test
```
`npm run build-data` rewrites `data/icd10cm-codes.json`; confirm it reports ~70,000+ codes.

---

## 1. Pre-flight

```
npm test
node -e "import('./dist/index.js').then(m=>console.log('dataset', m.datasetVersion, m.datasetSize, 'codes'))"
npm pack --dry-run
grep -rniE "anthropic|/Users/|TODO|FIXME" src scripts data docs bench README.md
```
The pack should ship only `dist/ README.md LICENSE NOTICE`. The grep should print nothing
(scrub for personal paths/usernames, local home paths, and AI attribution — and eyeball for your
own name or work email).

---

## 2. Publish to npm

Name is unscoped (`icdwise`). If npm rejects with 403 "too similar", scope it to
`@qinisolabs/icdwise` (update `package.json` name, `server.json` identifier, and the install
strings in README/docs/llms.txt/smithery), then republish.

```
npm whoami
npm publish --access public
```

## 3. GitHub repo + push

The `git config user.email` line MUST print `qinisolabs@gmail.com` before the first commit.

```
git init
git config user.name "Qiniso"
git config user.email "qinisolabs@gmail.com"
git config user.email
git add .
git commit -m "Initial commit: icdwise"
git branch -M main
gh repo create qinisolabs/icdwise --source=. --remote=origin --push --public --description "Verified ICD-10-CM code lookup & validation for AI agents — official descriptions, not guesses."
gh repo edit qinisolabs/icdwise --add-topic mcp,model-context-protocol,agents,llm,icd-10,icd10,medical-coding,healthcare,typescript
gh repo edit qinisolabs/icdwise --homepage "https://qinisolabs.github.io/icdwise"
git log --format='%an <%ae>' -1
```

## 4. MCP Registry

```
mcp-publisher login github
mcp-publisher publish
```

## 5. Deploy the hosted Worker

```
wrangler login
npm run deploy
curl https://icdwise.qinisolabs.workers.dev/health
curl -s -X POST https://icdwise.qinisolabs.workers.dev/mcp -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"lookup_icd10","arguments":{"code":"E11.9"}}}'
```

## 6. GitHub Pages

```
gh api -X POST repos/qinisolabs/icdwise/pages --input - <<'JSON'
{"source":{"branch":"main","path":"/docs"}}
JSON
```
Live at <https://qinisolabs.github.io/icdwise>.

## 7. Verify live + directories

Add the connector in Claude, then `lookup_icd10` an obscure code (e.g. `T63.011A`) and validate a
fake (`E11.99`). Track directory submissions in `SUBMISSIONS.md` (Glama / mcp.so auto-ingest from
the registry; the awesome-mcp-servers PR is the manual one).
