// Generates src/data.generated.ts from data/icd10cm-codes.json.
// A generated TS module (not node:fs at runtime) keeps the code bundleable in a
// Cloudflare Worker. Run via `npm run gen` (chained into build/test) and by wrangler.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "data/icd10cm-codes.json"), "utf8"));
const codes = data.codes ?? {};

const out = `// AUTO-GENERATED from data/icd10cm-codes.json by scripts/gen-data.mjs — do not edit by hand.
export const ICD_VERSION = ${JSON.stringify(data.version ?? "unknown")};
export const ICD_CODES: Record<string, string> = ${JSON.stringify(codes)};
`;

writeFileSync(join(root, "src/data.generated.ts"), out);
console.error(`generated src/data.generated.ts (${Object.keys(codes).length} codes, version ${data.version})`);
