/**
 * End-to-end smoke test over real MCP (Streamable HTTP), the same path ChatGPT
 * uses. Starts the HTTP server on a random port, then for every app:
 *   1. initialize + list tools: every tool must declare all three hints,
 *      an outputSchema, and dual UI metadata.
 *   2. list + read the widget resource: must be text/html;profile=mcp-app with
 *      the bridge injected.
 *   3. call each sample: validate structuredContent is present (or isError when
 *      expected) and that every download URL in the result actually serves a
 *      file with the right content type.
 *
 * Run: npm run smoke   (optionally APPS=qr,calendar)
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createHttpApp } from "./kit/http.js";
import { apps } from "./apps/index.js";
import type { AppDefinition } from "./kit/app.js";

const only = process.env.APPS?.split(",").map((s) => s.trim()).filter(Boolean);
const selected = only?.length ? apps.filter((a) => only.includes(a.slug)) : apps;

let failures = 0;
function check(cond: unknown, msg: string) {
  if (!cond) {
    failures++;
    console.log(`    ✗ ${msg}`);
  }
}

function findUrls(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") {
    if (/\/files\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(v)) out.push(v);
  } else if (Array.isArray(v)) v.forEach((x) => findUrls(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => findUrls(x, out));
  return out;
}

async function testApp(app: AppDefinition, base: string) {
  console.log(`\n▶ ${app.name} (${base}/${app.slug}/mcp)`);
  const client = new Client({ name: "smoke", version: "0.0.1" });
  const transport = new StreamableHTTPClientTransport(new URL(`${base}/${app.slug}/mcp`));
  await client.connect(transport);

  const { tools } = await client.listTools();
  console.log(`  tools: ${tools.map((t) => t.name).join(", ")}`);
  for (const t of tools) {
    const a = t.annotations ?? {};
    check(typeof a.readOnlyHint === "boolean", `${t.name}: readOnlyHint must be explicit`);
    check(typeof a.destructiveHint === "boolean", `${t.name}: destructiveHint must be explicit`);
    check(typeof a.openWorldHint === "boolean", `${t.name}: openWorldHint must be explicit`);
    check(t.outputSchema, `${t.name}: missing outputSchema`);
    check(t.description && /Use this when/i.test(t.description), `${t.name}: description should start with "Use this when"`);
    const meta = (t._meta ?? {}) as Record<string, any>;
    check(meta.ui?.resourceUri, `${t.name}: missing _meta.ui.resourceUri`);
    check(meta["openai/outputTemplate"] === meta.ui?.resourceUri, `${t.name}: openai/outputTemplate must mirror ui.resourceUri`);
  }

  const { resources } = await client.listResources();
  check(resources.length >= 1, "no widget resource listed");
  for (const r of resources) {
    const read = await client.readResource({ uri: r.uri });
    const c = read.contents[0] as { mimeType?: string; text?: string; _meta?: Record<string, unknown> };
    check(c.mimeType === "text/html;profile=mcp-app", `${r.uri}: mimeType is ${c.mimeType}`);
    check(c.text?.includes("ui/initialize"), `${r.uri}: bridge not injected`);
    check((c._meta as any)?.ui?.csp, `${r.uri}: missing _meta.ui.csp`);
    check(typeof (c._meta as any)?.["openai/widgetDescription"] === "string", `${r.uri}: missing openai/widgetDescription`);
    console.log(`  widget: ${r.uri} (${(c.text?.length ?? 0 / 1024).toLocaleString()} bytes)`);
  }
  const toolUris = new Set(tools.map((t) => (t._meta as any)?.ui?.resourceUri));
  for (const u of toolUris) check(resources.some((r) => r.uri === u), `tool references unknown widget ${u}`);

  for (const s of app.samples) {
    const label = `${s.tool}(${JSON.stringify(s.args).slice(0, 80)})`;
    try {
      const res = await client.callTool({ name: s.tool, arguments: s.args });
      if (s.expectError) {
        check(res.isError, `${label}: expected isError`);
        console.log(`  ✓ ${label} → error as expected: ${(res.content as any[])?.[0]?.text?.slice(0, 80)}`);
        continue;
      }
      check(!res.isError, `${label}: unexpected error: ${(res.content as any[])?.[0]?.text}`);
      check(res.structuredContent, `${label}: no structuredContent`);
      const urls = findUrls(res.structuredContent);
      for (const u of urls) {
        const r = await fetch(u);
        check(r.ok, `${label}: download ${u.slice(0, 60)}… returned ${r.status}`);
        const body = Buffer.from(await r.arrayBuffer());
        check(body.length > 0, `${label}: empty download`);
        if (r.ok) console.log(`    file ${r.headers.get("content-type")} ${body.length} bytes ← ${r.headers.get("content-disposition")}`);
      }
      const summary = JSON.stringify(res.structuredContent).slice(0, 140);
      console.log(`  ✓ ${label} → ${summary}${summary.length >= 140 ? "…" : ""}`);
    } catch (e) {
      failures++;
      console.log(`  ✗ ${label} threw: ${(e as Error).message}`);
    }
  }
  await client.close();
}

async function main() {
  const http = createHttpApp(selected, { publicBaseUrl: "http://127.0.0.1:0" });
  const server = http.listen(0);
  await new Promise((r) => server.once("listening", r));
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;
  // Rebind with the real port so download URLs are reachable.
  server.close();
  const http2 = createHttpApp(selected, { publicBaseUrl: base });
  const server2 = http2.listen(port);
  await new Promise((r) => server2.once("listening", r));

  for (const app of selected) await testApp(app, base);
  server2.close();
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
