// icdwise benchmark runner.
//
//   npm run build
//   node bench/run.mjs
//
// Scores the recorded step-0 eval (bench/icd-eval.json): the unaided LLM baseline
// vs the icdwise library arm. icdwise returns the official description by lookup, or
// correctly reports a non-existent code as invalid — so it is correct by construction
// for every code present in the loaded dataset.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { lookupIcd10, validateIcd10, datasetVersion, datasetSize } from "../dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { items } = JSON.parse(readFileSync(join(root, "bench/icd-eval.json"), "utf8"));

let llmOK = 0;
let icdOK = 0;
let icdNA = 0; // codes not in this (starter) dataset — can't be scored as official
const icdMiss = [];

for (const it of items) {
  if (it.llmCorrect) llmOK++;

  if (it.official === null) {
    // Non-existent/retired → icdwise should report it as not valid.
    if (validateIcd10(it.code).valid === false) icdOK++;
    else icdMiss.push(`${it.code}: icdwise wrongly accepted a non-code`);
  } else {
    const got = lookupIcd10(it.code).description;
    if (got === it.official) icdOK++;
    else if (got === null) icdNA++; // not in starter dataset (load full set to cover)
    else icdMiss.push(`${it.code}: icdwise="${got}" official="${it.official}"`);
  }
}

const n = items.length;
console.log(`dataset: version ${datasetVersion}, ${datasetSize} codes loaded\n`);
console.log(`unaided LLM:   ${llmOK}/${n} correct (${Math.round((100 * (n - llmOK)) / n)}% error)`);
console.log(`icdwise:       ${icdOK}/${n} correct${icdNA ? ` (+${icdNA} not in starter dataset — load full set)` : ""}`);
if (icdMiss.length) {
  console.log("\nicdwise mismatches (should be none):");
  icdMiss.forEach((m) => console.log("  " + m));
}
