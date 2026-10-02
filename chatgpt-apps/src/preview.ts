/**
 * Renders every widget in a headless Chromium inside a minimal MCP Apps host
 * (the same postMessage protocol ChatGPT uses), feeds it real tool results from
 * the sample calls, and saves screenshots to ./screenshots. Fails on console
 * errors or a widget that never leaves its loading state.
 *
 * Run: npm run preview        (CHROMIUM_PATH overrides the browser binary)
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createHttpApp } from "./kit/http.js";
import { apps } from "./apps/index.js";

const OUT = path.resolve("screenshots");
const only = process.env.APPS?.split(",").map((s) => s.trim()).filter(Boolean);
const selected = only?.length ? apps.filter((a) => only.includes(a.slug)) : apps;

const HOST_PAGE = `<!doctype html><html><body style="margin:0;background:#f4f4f6;padding:16px;font-family:sans-serif">
<iframe id="f" sandbox="allow-scripts allow-same-origin" style="width:720px;height:200px;border:0;display:block;background:#fff;border-radius:16px"></iframe>
<script>
  const log = [];
  window.__log = log;
  let pending = null;
  window.__load = (html, args, result) => new Promise((resolve) => {
    pending = { args, result, resolve };
    document.getElementById("f").srcdoc = html;
  });
  window.addEventListener("message", (ev) => {
    const m = ev.data; if (!m || m.jsonrpc !== "2.0") return;
    const reply = (id, result) => document.getElementById("f").contentWindow.postMessage({ jsonrpc: "2.0", id, result }, "*");
    const send = (method, params) => document.getElementById("f").contentWindow.postMessage({ jsonrpc: "2.0", method, params }, "*");
    log.push(m.method || ("response:" + m.id));
    if (m.method === "ui/initialize") {
      reply(m.id, { protocolVersion: "2026-01-26", hostInfo: { name: "preview-host", version: "1" }, hostCapabilities: { openLinks: {} }, hostContext: { theme: window.__theme || "light", displayMode: "inline", locale: "en-US" } });
    } else if (m.method === "ui/notifications/initialized") {
      send("ui/notifications/tool-input", { arguments: pending.args });
      send("ui/notifications/tool-result", pending.result);
      setTimeout(() => pending.resolve(), 150);
    } else if (m.method === "ui/notifications/size-changed") {
      if (m.params && m.params.height) document.getElementById("f").style.height = Math.min(1400, m.params.height + 8) + "px";
    } else if (m.id != null && m.method) {
      reply(m.id, {});
    }
  });
</script></body></html>`;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const http = createHttpApp(selected, { publicBaseUrl: "http://127.0.0.1:0" });
  const tmp = http.listen(0);
  await new Promise((r) => tmp.once("listening", r));
  const port = (tmp.address() as { port: number }).port;
  tmp.close();
  const base = `http://127.0.0.1:${port}`;
  const server = createHttpApp(selected, { publicBaseUrl: base }).listen(port);
  await new Promise((r) => server.once("listening", r));

  const executablePath = process.env.CHROMIUM_PATH ?? (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: 760, height: 900 }, deviceScaleFactor: 2 });
  const consoleErrors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  await page.setContent(HOST_PAGE);

  let failures = 0;
  for (const app of selected) {
    const client = new Client({ name: "preview", version: "0.0.1" });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/${app.slug}/mcp`)));
    const { resources } = await client.listResources();
    const htmlByUri = new Map<string, string>();
    for (const r of resources) {
      const read = await client.readResource({ uri: r.uri });
      htmlByUri.set(r.uri, (read.contents[0] as { text: string }).text);
    }
    const { tools } = await client.listTools();
    let n = 0;
    for (const s of app.samples) {
      if (s.expectError) continue;
      const tool = tools.find((t) => t.name === s.tool);
      const uri = (tool?._meta as any)?.ui?.resourceUri as string | undefined;
      const html = uri && htmlByUri.get(uri);
      if (!html) continue;
      const res = await client.callTool({ name: s.tool, arguments: s.args });
      if (res.isError) { console.log(`  ✗ ${app.slug}/${s.tool} errored`); failures++; continue; }
      const result = { content: res.content, structuredContent: res.structuredContent, _meta: res._meta };
      const themes = n === 0 ? ["light", "dark"] : ["light"];
      for (const theme of themes) {
        consoleErrors.length = 0;
        await page.evaluate((t) => { (window as any).__theme = t; }, theme);
        await page.evaluate(({ html, args, result }) => (window as any).__load(html, args, result), { html, args: s.args, result });
        await page.waitForTimeout(400);
        const frame = page.frames().find((f) => f.parentFrame() === page.mainFrame());
        const text = (await frame?.evaluate(() => document.body.innerText)) ?? "";
        const stuck = /Working…|Generating QR code…|Adding up hours…|Running the numbers…/.test(text) && text.length < 40;
        const file = path.join(OUT, `${app.slug}-${n + 1}-${s.tool}${theme === "dark" ? "-dark" : ""}.png`);
        await page.screenshot({ path: file, fullPage: true });
        const bad = stuck || consoleErrors.length > 0;
        if (bad) failures++;
        console.log(`  ${bad ? "✗" : "✓"} ${app.slug}/${s.tool} [${theme}] → ${path.relative(process.cwd(), file)}${stuck ? " (widget never rendered)" : ""}${consoleErrors.length ? ` console: ${consoleErrors.join(" | ")}` : ""}`);
      }
      n++;
    }
    await client.close();
  }
  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} widget render(s) failed` : "\nAll widgets rendered");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
