// Single source of truth for icdwise's tools + a minimal, stateless JSON-RPC 2.0
// handler (the wire format of MCP's Streamable HTTP transport). The Cloudflare
// Worker and any HTTP host reuse handleRpc(); the stdio server reuses the same
// TOOLS array via the MCP SDK. No node:fs, no SDK here — so this bundles at the edge.
import { lookupIcd10, validateIcd10, searchIcd10, datasetVersion, datasetSize } from "./icd.js";

export type ArgType = "string" | "number";

export interface ToolArg {
  name: string;
  type: ArgType;
  description: string;
  optional?: boolean;
}

export interface ToolSpec {
  name: string;
  description: string;
  args: ToolArg[];
  run: (a: Record<string, unknown>) => unknown;
}

export const TOOLS: ToolSpec[] = [
  {
    name: "lookup_icd10",
    description:
      "USE THIS to get the OFFICIAL description of an ICD-10-CM diagnosis code instead of recalling it — models confidently misstate the specifics (laterality, severity, encounter type) and invent descriptions for codes that don't exist. Returns the official description, the canonical dotted form, and its 3-character category; if the code is well-formed but not in the dataset it says so rather than guessing. Accepts codes with or without the dot (E11.9 or E119).",
    args: [{ name: "code", type: "string", description: "The ICD-10-CM code, e.g. E11.9 or E119." }],
    run: (a) => lookupIcd10(String(a.code ?? "")),
  },
  {
    name: "validate_icd10",
    description:
      "USE THIS to check whether an ICD-10-CM code is real before relying on it — never assume a plausible-looking code exists. Returns whether it is well-formed AND present in the official code set, plus the description when valid. Catches fabricated or retired codes a model would otherwise accept.",
    args: [{ name: "code", type: "string", description: "The ICD-10-CM code to validate." }],
    run: (a) => validateIcd10(String(a.code ?? "")),
  },
  {
    name: "search_icd10",
    description:
      "USE THIS to find the ICD-10-CM code for a condition (reverse lookup) instead of guessing the code — e.g. 'type 2 diabetes' or 'generalized anxiety'. Returns official codes whose description contains all your search words, shortest (most general) first.",
    args: [
      { name: "query", type: "string", description: "Condition or keywords to search descriptions for." },
      { name: "limit", type: "number", description: "Max results (default 20).", optional: true },
    ],
    run: (a) => searchIcd10(String(a.query ?? ""), a.limit === undefined ? 20 : Number(a.limit)),
  },
];

export const SERVER_INFO = { name: "icdwise", version: "0.1.2" } as const;
export const PUBLIC_BASE = "https://qinisolabs.github.io/icdwise";
const DEFAULT_PROTOCOL = "2025-06-18";

function jsonType(t: ArgType) {
  return t === "number" ? { type: "number" } : { type: "string" };
}
function inputSchema(t: ToolSpec) {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const a of t.args) {
    properties[a.name] = { ...jsonType(a.type), description: a.description };
    if (!a.optional) required.push(a.name);
  }
  return { type: "object", properties, required, additionalProperties: false };
}
// Human-readable Title Case for a tool name, uppercasing known acronyms — used for the
// `title` + `readOnlyHint` tool annotations the Claude connector directory requires.
const ACRONYMS = new Set(["iban","vat","vin","gtin","upc","ean","isbn","isbn10","issn","icd10","orcid","gln","sscc","imei","isin","cusip","sedol","lei","aba","eth","btc","tld","url","uuid","ip","id","dni","cpf","cnpj","pesel","bsn","nrn","nif","pt","sa","tckn","ric","rc","nir","ahv","curp","cnp","egn","de","fr","ch","mx","hr","ro","bg","ee","cz","uk","us","eu","sic","icd","fcdo"]);
export function humanizeTitle(name: string): string {
  return name.split("_").map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
}
export function toolAnnotations(name: string) {
  return { title: humanizeTitle(name), readOnlyHint: true };
}
// Mirror every tool's JSON result into `structuredContent` so MCP clients get a
// typed object, not just text. Permissive-but-honest schema (results vary by tool).
const OUTPUT_SCHEMA = {
  type: "object",
  description: "Deterministic result object, identical to the JSON in the text payload and mirrored in `structuredContent`.",
  additionalProperties: true,
} as const;
export function listTools() {
  return TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: inputSchema(t), outputSchema: OUTPUT_SCHEMA, annotations: toolAnnotations(t.name) }));
}
export function callTool(name: string, args: Record<string, unknown> | undefined) {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) {
    const e: any = new Error(`Unknown tool: ${name}`);
    e.code = -32602;
    throw e;
  }
  const a: Record<string, unknown> = {};
  for (const arg of t.args) {
    const v = args?.[arg.name];
    a[arg.name] = v === undefined || v === null ? undefined : arg.type === "number" ? Number(v) : String(v);
  }
  const result = t.run(a);
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result as Record<string, unknown>,
  };
}

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: string | number;
  method?: string;
  params?: any;
}

export function handleRpc(msg: JsonRpcMessage): object | null {
  const { id, method, params } = msg;
  if (id === undefined || method === "notifications/initialized") return null;
  try {
    let result: unknown;
    switch (method) {
      case "initialize":
        result = {
          protocolVersion: params?.protocolVersion ?? DEFAULT_PROTOCOL,
          capabilities: { tools: {} },
          serverInfo: { ...SERVER_INFO, websiteUrl: PUBLIC_BASE },
          instructions:
            `icdwise looks up and validates ICD-10-CM diagnosis codes against the official U.S. code set (dataset version ${datasetVersion}, ${datasetSize} codes loaded). Use lookup_icd10 for a code's official description, validate_icd10 to confirm a code is real, and search_icd10 to find a code from a condition name. It returns an honest "not found" rather than fabricating — never guess ICD-10 codes or their meanings. Not medical advice.`,
        };
        break;
      case "tools/list":
        result = { tools: listTools() };
        break;
      case "tools/call":
        result = callTool(params?.name, params?.arguments);
        break;
      case "ping":
        result = {};
        break;
      default:
        return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
    }
    return { jsonrpc: "2.0", id, result };
  } catch (err: any) {
    return { jsonrpc: "2.0", id, error: { code: err?.code ?? -32603, message: err?.message ?? String(err) } };
  }
}
