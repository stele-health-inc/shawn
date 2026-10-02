import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { AppDefinition, AppContext } from "./app.js";
import { signFileToken, verifyFileToken } from "./files.js";

export interface MountOptions {
  publicBaseUrl: string;
}

/** Build a fresh McpServer for one app (stateless: one per request). */
export function buildServer(app: AppDefinition, publicBaseUrl: string): McpServer {
  const server = new McpServer({ name: app.name, version: app.version });
  const baseUrl = `${publicBaseUrl.replace(/\/$/, "")}/${app.slug}`;
  const ctx: AppContext = {
    baseUrl,
    fileUrl(kind, payload, filename) {
      if (!app.files?.[kind]) throw new Error(`${app.slug}: unknown file kind "${kind}"`);
      return `${baseUrl}/files/${signFileToken(kind, payload, filename)}`;
    },
  };
  instrument(server, app.slug);
  app.register(server, ctx);
  return server;
}

/**
 * One JSON line per tool call on stdout: which app/tool got invoked, how long
 * it took and whether it errored. This is the traction signal — pipe it into
 * your log drain and count calls per app per day.
 */
function instrument(server: McpServer, slug: string) {
  const original = server.registerTool.bind(server);
  (server as any).registerTool = (name: string, config: any, cb: (...a: any[]) => any) =>
    original(name, config, (async (...args: any[]) => {
      const t0 = Date.now();
      let outcome = "ok";
      try {
        const result = await cb(...args);
        if (result?.isError) outcome = "tool_error";
        return result;
      } catch (err) {
        outcome = "exception";
        throw err;
      } finally {
        console.log(JSON.stringify({ t: new Date().toISOString(), event: "tool_call", app: slug, tool: name, ms: Date.now() - t0, outcome }));
      }
    }) as any);
}

/**
 * Mounts `/<slug>/mcp` (Streamable HTTP, stateless) and `/<slug>/files/:token`.
 * Stateless mode: a new McpServer + transport per HTTP request, no session ids,
 * which is what ChatGPT expects from a hosted app and lets us scale horizontally.
 */
export function mountApp(router: Express, app: AppDefinition, opts: MountOptions) {
  const mcpPath = `/${app.slug}/mcp`;

  router.all(mcpPath, async (req: Request, res: Response) => {
    const server = buildServer(app, opts.publicBaseUrl);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error(`[${app.slug}] MCP error`, err);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
      }
    }
  });

  router.get(`/${app.slug}/files/:token`, async (req: Request, res: Response) => {
    const parsed = verifyFileToken(String(req.params.token));
    const builder = parsed && app.files?.[parsed.kind];
    if (!parsed || !builder) {
      res.status(404).type("text/plain").send("This download link is invalid or has expired.");
      return;
    }
    try {
      const file = await builder(parsed.payload);
      res.setHeader("Content-Type", file.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(file.body);
    } catch (err) {
      console.error(`[${app.slug}] file build error`, err);
      res.status(500).type("text/plain").send("Could not build this file.");
    }
  });

  router.get(`/${app.slug}`, (_req, res) => {
    res.type("text/plain").send(`${app.name} — MCP endpoint: ${mcpPath}`);
  });
}

/** PRIVACY.md rendered as a minimal HTML page — the submission form needs a privacy policy URL. */
function privacyHtml(): string {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "PRIVACY.md");
  const md = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "# Privacy Policy\n\nNot yet written.";
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  const inline = (s: string) =>
    esc(s)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/_([^_]+)_/g, "<em>$1</em>");
  const body = md
    .split(/\n{2,}/)
    .map((block) => {
      const b = block.trim();
      if (b.startsWith("# ")) return `<h1>${inline(b.slice(2))}</h1>`;
      if (b.startsWith("## ")) return `<h2>${inline(b.slice(3))}</h2>`;
      if (b.startsWith("- ")) return `<ul>${b.split("\n").map((l) => `<li>${inline(l.replace(/^- /, ""))}</li>`).join("")}</ul>`;
      return `<p>${inline(b)}</p>`;
    })
    .join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy Policy</title><style>body{font-family:-apple-system,Segoe UI,Inter,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.6;color:#1a1a1e}h1{font-size:28px}h2{font-size:18px;margin-top:28px}</style></head><body>${body}</body></html>`;
}

export function createHttpApp(apps: AppDefinition[], opts: MountOptions): Express {
  const router = express();
  router.disable("x-powered-by");
  router.use(cors({ exposedHeaders: ["Mcp-Session-Id"] }));
  router.use(express.json({ limit: "2mb" }));
  router.get("/healthz", (_req, res) => res.json({ ok: true, apps: apps.map((a) => a.slug) }));
  router.get("/privacy", (_req, res) => res.type("text/html").send(privacyHtml()));
  router.get("/", (_req, res) => {
    res.type("text/plain").send(
      ["ChatGPT apps", ...apps.map((a) => `  ${a.name}: ${opts.publicBaseUrl}/${a.slug}/mcp`)].join("\n"),
    );
  });
  for (const app of apps) mountApp(router, app, opts);
  return router;
}
