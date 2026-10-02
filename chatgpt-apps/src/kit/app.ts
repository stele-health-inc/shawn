import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/** A file the server can rebuild from a signed payload (see files.ts). */
export interface FileSpec {
  body: Buffer | string;
  contentType: string;
  filename: string;
}

export type FileBuilder = (payload: any) => Promise<FileSpec> | FileSpec;

/** Per-app runtime context handed to `register`. */
export interface AppContext {
  /** Public origin + app prefix, e.g. https://apps.example.com/qr */
  baseUrl: string;
  /** Mint a stateless, signed download URL. `kind` must exist in `files`. */
  fileUrl(kind: string, payload: unknown, filename: string): string;
}

export interface AppDefinition {
  /** URL slug: served at /<slug>/mcp */
  slug: string;
  /** Display name used in the MCP server info and submission form. */
  name: string;
  version: string;
  /** One-line, review-facing description. */
  description: string;
  /** ≤30 chars, used in the submission form. */
  subtitle: string;
  category:
    | "BUSINESS" | "COLLABORATION" | "DESIGN" | "DEVELOPER_TOOLS" | "EDUCATION"
    | "ENTERTAINMENT" | "FINANCE" | "FOOD" | "LIFESTYLE" | "NEWS"
    | "PRODUCTIVITY" | "SHOPPING" | "TRAVEL";
  register(server: McpServer, ctx: AppContext): void;
  /** Builders for signed download URLs, keyed by `kind`. */
  files?: Record<string, FileBuilder>;
  /** Example calls exercised by `npm run smoke` (one per tool at least). */
  samples: Array<{ tool: string; args: Record<string, unknown>; expectError?: boolean }>;
}

export function defineApp(def: AppDefinition): AppDefinition {
  return def;
}
