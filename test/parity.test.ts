import assert from "node:assert/strict";
import {
  lookupIcd10,
  validateIcd10,
  searchIcd10,
  normalizeCode,
  formatCode,
  isWellFormed,
} from "../src/index.js";
import { handleRpc } from "../src/core.js";

let pass = 0;
let fail = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass++;
  } catch (err) {
    fail++;
    console.error(`✗ ${name}\n    ${(err as Error).message}`);
  }
}

/* ---------- normalize / format ---------- */
check("normalize strips dot + uppercases", () => assert.equal(normalizeCode("e11.9"), "E119"));
check("format re-inserts the dot", () => assert.equal(formatCode("S52521A"), "S52.521A"));
check("short codes keep no dot", () => assert.equal(formatCode("I10"), "I10"));

/* ---------- format validation ---------- */
check("well-formed: E11.9", () => assert.equal(isWellFormed("E11.9"), true));
check("well-formed without dot: E119", () => assert.equal(isWellFormed("E119"), true));
check("well-formed long: S52.521A", () => assert.equal(isWellFormed("S52.521A"), true));
check("malformed: starts with digit", () => assert.equal(isWellFormed("11.9"), false));
check("malformed: too short", () => assert.equal(isWellFormed("E1"), false));
check("malformed: letters only", () => assert.equal(isWellFormed("ABC"), false));

/* ---------- lookup (official descriptions; the gap) ---------- */
check("lookup E11.9 → official desc", () =>
  assert.equal(lookupIcd10("E11.9").description, "Type 2 diabetes mellitus without complications"));
check("lookup accepts no-dot form", () =>
  assert.equal(lookupIcd10("E119").description, "Type 2 diabetes mellitus without complications"));
check("lookup obscure V97.33XD (jet engine)", () =>
  assert.equal(lookupIcd10("V97.33XD").description, "Sucked into jet engine, subsequent encounter"));
check("lookup H40.1131 is bilateral/mild (the LLM trap)", () =>
  assert.equal(lookupIcd10("H40.1131").description, "Primary open-angle glaucoma, bilateral, mild stage"));
check("lookup returns category for sub-codes", () =>
  assert.equal(lookupIcd10("E11.9").category?.code, "E11"));
check("lookup well-formed-but-absent → found:false, NO fabricated desc", () => {
  const r = lookupIcd10("E11.99");
  assert.equal(r.wellFormed, true);
  assert.equal(r.found, false);
  assert.equal(r.description, null);
  assert.ok(r.note && /not guessing/i.test(r.note));
});
check("lookup malformed → error, not found", () => {
  const r = lookupIcd10("hello");
  assert.equal(r.wellFormed, false);
  assert.equal(r.found, false);
  assert.ok(r.errors.length > 0);
});

/* ---------- validate ---------- */
check("validate real code → valid", () => assert.equal(validateIcd10("E11.9").valid, true));
check("validate well-formed-absent → invalid (not in set)", () => {
  const r = validateIcd10("E11.99");
  assert.equal(r.wellFormed, true);
  assert.equal(r.existsInDataset, false);
  assert.equal(r.valid, false);
});
check("validate malformed → invalid", () => assert.equal(validateIcd10("E1").valid, false));

/* ---------- search (reverse lookup) ---------- */
check("search 'type 2 diabetes' finds E11.9", () => {
  const r = searchIcd10("type 2 diabetes without complications");
  assert.ok(r.results.some((h) => h.code === "E11.9"));
});
check("search 'generalized anxiety' finds F41.1", () => {
  const r = searchIcd10("generalized anxiety");
  assert.ok(r.results.some((h) => h.code === "F41.1"));
});
check("search respects limit", () => assert.ok(searchIcd10("asthma", 3).results.length <= 3));
check("search empty query → no results", () => assert.equal(searchIcd10("").count, 0));

/* ---------- core / handleRpc (hosted HTTP + Worker wire path) ---------- */
check("initialize returns serverInfo icdwise", () => {
  const r: any = handleRpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
  assert.equal(r.result.serverInfo.name, "icdwise");
});
check("tools/list returns 3 tools", () => {
  const r: any = handleRpc({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.equal(r.result.tools.length, 3);
});
check("tools/call lookup_icd10 over the wire", () => {
  const r: any = handleRpc({
    jsonrpc: "2.0", id: 3, method: "tools/call",
    params: { name: "lookup_icd10", arguments: { code: "S52.521A" } },
  });
  assert.match(JSON.parse(r.result.content[0].text).description, /torus fracture/i);
});
check("notifications/initialized → no response", () =>
  assert.equal(handleRpc({ jsonrpc: "2.0", method: "notifications/initialized" }), null));
check("unknown method → -32601", () => {
  const r: any = handleRpc({ jsonrpc: "2.0", id: 4, method: "nope" });
  assert.equal(r.error.code, -32601);
});

/* ---------- summary ---------- */
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
