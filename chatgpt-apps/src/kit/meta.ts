import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Metadata helpers that emit BOTH the open MCP Apps keys (`_meta.ui.*`,
 * `text/html;profile=mcp-app`) and ChatGPT's compatibility aliases
 * (`openai/outputTemplate`, `openai/toolInvocation/*`, `openai/widget*`).
 * ChatGPT reads the standard keys first; the aliases cost nothing and keep
 * older ChatGPT builds and inspectors happy.
 */

export const WIDGET_MIME = "text/html;profile=mcp-app";

/** Tool-level metadata linking a tool to its widget. */
export function uiToolMeta(uri: string, status: { invoking: string; invoked: string }) {
  return {
    ui: { resourceUri: uri, visibility: ["model", "app"] },
    "openai/outputTemplate": uri,
    "openai/toolInvocation/invoking": status.invoking,
    "openai/toolInvocation/invoked": status.invoked,
    "openai/widgetAccessible": true,
  };
}

/** Pure computation / lookup: safe to call without confirmation. */
export const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
} as const;

/** Read-only, but talks to a public third-party API (e.g. Crossref). */
export const READ_ONLY_OPEN_WORLD = { ...READ_ONLY, openWorldHint: true } as const;

export interface WidgetOptions {
  uri: string;
  name: string;
  html: () => string;
  /** Tells the model what the widget already shows so it doesn't repeat it. */
  description: string;
  prefersBorder?: boolean;
  csp?: { connectDomains?: string[]; resourceDomains?: string[] };
}

/** Register a widget HTML resource with full dual metadata. */
export function registerWidget(server: McpServer, opts: WidgetOptions) {
  const prefersBorder = opts.prefersBorder ?? true;
  const csp = { connectDomains: [], resourceDomains: [], ...opts.csp };
  const meta = {
    ui: { prefersBorder, csp },
    "openai/widgetPrefersBorder": prefersBorder,
    "openai/widgetCSP": {
      connect_domains: csp.connectDomains,
      resource_domains: csp.resourceDomains,
    },
    "openai/widgetDescription": opts.description,
  };
  server.registerResource(
    opts.name,
    opts.uri,
    { mimeType: WIDGET_MIME, description: opts.description, _meta: meta },
    async () => ({
      contents: [{ uri: opts.uri, mimeType: WIDGET_MIME, text: opts.html(), _meta: meta }],
    }),
  );
}

/** A tool result the model can narrate and the widget can render. */
export function ok(
  text: string,
  structuredContent: Record<string, unknown>,
  widgetOnly?: Record<string, unknown>,
): CallToolResult {
  return {
    content: [{ type: "text", text }],
    structuredContent,
    ...(widgetOnly ? { _meta: widgetOnly } : {}),
  };
}

/** A tool error. Skips output-schema validation and tells the model why. */
export function fail(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}
