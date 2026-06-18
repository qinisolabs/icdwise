import { ICD_CODES, ICD_VERSION } from "./data.generated.js";

// ICD-10-CM structure (no dot): 1 letter, 1 digit, 1 alphanumeric, then 0–4 more
// alphanumeric characters (3–7 chars total). Codes longer than 3 print with a dot
// after the 3rd character (E119 → E11.9, S52521A → S52.521A).
const FORMAT = /^[A-Z][0-9][0-9A-Z][0-9A-Z]{0,4}$/;

export const datasetVersion = ICD_VERSION;
export const datasetSize = Object.keys(ICD_CODES).length;

/** Normalize any user input to the lookup key: uppercase, no dots/spaces. */
export function normalizeCode(input: string): string {
  return (input ?? "").trim().toUpperCase().replace(/[.\s]/g, "");
}

/** Pretty ICD-10-CM form with the dot after the 3rd character. */
export function formatCode(normalized: string): string {
  return normalized.length > 3 ? `${normalized.slice(0, 3)}.${normalized.slice(3)}` : normalized;
}

/** Whether a string is structurally a well-formed ICD-10-CM code (format only). */
export function isWellFormed(input: string): boolean {
  return FORMAT.test(normalizeCode(input));
}

export interface LookupResult {
  input: string;
  code: string | null; // canonical dotted form, when well-formed
  wellFormed: boolean;
  found: boolean;
  description: string | null;
  category: { code: string; description: string | null } | null; // 3-char parent
  datasetVersion: string;
  note?: string;
  errors: string[];
}

/**
 * Look up an ICD-10-CM code and return its OFFICIAL description from the bundled
 * dataset — or an honest "not found" instead of fabricating one.
 */
export function lookupIcd10(input: string): LookupResult {
  const normalized = normalizeCode(input);
  const result: LookupResult = {
    input,
    code: null,
    wellFormed: false,
    found: false,
    description: null,
    category: null,
    datasetVersion: ICD_VERSION,
    errors: [],
  };

  if (!FORMAT.test(normalized)) {
    result.errors.push(
      "Not a well-formed ICD-10-CM code (expected a letter, a digit, then 1–5 more characters, e.g. E11.9)."
    );
    return result;
  }
  result.wellFormed = true;
  result.code = formatCode(normalized);

  const desc = ICD_CODES[normalized];
  if (desc) {
    result.found = true;
    result.description = desc;
  } else {
    result.note =
      "Well-formed but not present in the loaded ICD-10-CM dataset — it may be an invalid/retired code, a non-leaf category, or outside this dataset's coverage. Not guessing a description.";
  }

  // 3-character parent category, if we have it.
  const cat = normalized.slice(0, 3);
  if (cat !== normalized) {
    result.category = { code: cat, description: ICD_CODES[cat] ?? null };
  }
  return result;
}

export interface ValidateResult {
  input: string;
  code: string | null;
  wellFormed: boolean;
  existsInDataset: boolean;
  valid: boolean; // well-formed AND present in the dataset
  description: string | null;
  datasetVersion: string;
  errors: string[];
}

/** Validate a code: well-formed AND present in the dataset. */
export function validateIcd10(input: string): ValidateResult {
  const r = lookupIcd10(input);
  return {
    input,
    code: r.code,
    wellFormed: r.wellFormed,
    existsInDataset: r.found,
    valid: r.wellFormed && r.found,
    description: r.description,
    datasetVersion: r.datasetVersion,
    errors: r.errors,
  };
}

export interface SearchHit {
  code: string;
  description: string;
}
export interface SearchResult {
  query: string;
  count: number;
  results: SearchHit[];
  datasetVersion: string;
  truncated: boolean;
}

/**
 * Find ICD-10-CM codes whose description contains ALL of the query's words
 * (case-insensitive) — a reverse lookup ("what's the code for X?").
 */
export function searchIcd10(query: string, limit = 20): SearchResult {
  const words = (query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const hits: SearchHit[] = [];
  if (words.length) {
    for (const [key, desc] of Object.entries(ICD_CODES)) {
      const d = desc.toLowerCase();
      if (words.every((w) => d.includes(w))) hits.push({ code: formatCode(key), description: desc });
    }
  }
  hits.sort((a, b) => a.description.length - b.description.length || a.code.localeCompare(b.code));
  return {
    query,
    count: hits.length,
    results: hits.slice(0, limit),
    datasetVersion: ICD_VERSION,
    truncated: hits.length > limit,
  };
}
