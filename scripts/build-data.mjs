// Build the FULL data/icd10cm-codes.json from the official CMS ICD-10-CM release.
//
// ICD-10-CM is U.S. public-domain data. Download the "Code Descriptions in Tabular
// Order" zip from CMS (https://www.cms.gov/medicare/coding-billing/icd-10-codes),
// unzip it, and find the plain-text file `icd10cm-codes-YYYY.txt` (also called the
// code descriptions file). Each line looks like:
//
//     A000    Cholera due to Vibrio cholerae 01, biovar cholerae
//
// i.e. the code WITHOUT a dot, some spaces, then the long description.
//
// Usage:
//   node scripts/build-data.mjs /path/to/icd10cm-codes-2025.txt 2025
//
// Then run `npm run build` (which runs gen-data) to regenerate src/data.generated.ts.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const [, , file, version] = process.argv;
if (!file) {
  console.error("Usage: node scripts/build-data.mjs <icd10cm-codes-YYYY.txt> [version]");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const text = readFileSync(file, "utf8");
const codes = {};
let n = 0;
for (const raw of text.split(/\r?\n/)) {
  const line = raw.trim();
  if (!line) continue;
  const m = line.match(/^([A-Z][0-9][0-9A-Z][0-9A-Z]{0,4})\s+(.+)$/);
  if (!m) continue;
  codes[m[1].toUpperCase()] = m[2].trim();
  n++;
}
if (n === 0) {
  console.error("No codes parsed — is this the CMS icd10cm-codes-YYYY.txt file?");
  process.exit(1);
}

const out = {
  _comment:
    "ICD-10-CM code → official description. Keys are the code with no dot, uppercase. Generated from the CMS public-domain release by scripts/build-data.mjs.",
  version: version || "unknown",
  codes,
};
writeFileSync(join(root, "data/icd10cm-codes.json"), JSON.stringify(out, null, 0));
console.error(`wrote data/icd10cm-codes.json — ${n} codes (version ${out.version}). Now run: npm run build`);
