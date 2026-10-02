/**
 * Cross-checks each app's chatgpt-app-submission.json (the file you upload in
 * the ChatGPT app submission form) against the live tool list, so the
 * submission can never drift from the server:
 *   - every listed tool exists, and vice versa
 *   - annotations in the JSON equal the server's annotations
 *   - exactly 5 positive and 3 negative test cases; tools_triggered are real
 *   - subtitle ≤ 30 chars, category is one of the allowed values
 *
 * Run: npm run submission
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createHttpApp } from "./kit/http.js";
import { apps } from "./apps/index.js";

const APPS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "apps");
const CATEGORIES = ["BUSINESS", "COLLABORATION", "DESIGN", "DEVELOPER_TOOLS", "EDUCATION", "ENTERTAINMENT", "FINANCE", "FOOD", "LIFESTYLE", "NEWS", "PRODUCTIVITY", "SHOPPING", "TRAVEL"];
let failures = 0;
const bad = (msg: string) => { failures++; console.log(`  ✗ ${msg}`); };

async function main() {
  const server = createHttpApp(apps, { publicBaseUrl: "http://127.0.0.1" }).listen(0);
  await new Promise((r) => server.once("listening", r));
  const port = (server.address() as { port: number }).port;

  for (const app of apps) {
    console.log(`\n▶ ${app.name}`);
    const file = path.join(APPS_DIR, app.slug, "chatgpt-app-submission.json");
    if (!fs.existsSync(file)) { bad(`missing ${file}`); continue; }
    const sub = JSON.parse(fs.readFileSync(file, "utf8"));
    const client = new Client({ name: "submission-check", version: "0.0.1" });
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/${app.slug}/mcp`)));
    const { tools } = await client.listTools();
    await client.close();

    const info = sub.app_info ?? {};
    if (info.display_name !== app.name) bad(`display_name "${info.display_name}" ≠ server name "${app.name}"`);
    if (typeof info.subtitle !== "string" || info.subtitle.length > 30) bad(`subtitle must be ≤30 chars (got ${info.subtitle?.length})`);
    if (info.subtitle !== app.subtitle) bad(`subtitle differs from app definition`);
    if (!CATEGORIES.includes(info.category)) bad(`category "${info.category}" not allowed`);
    if (info.category !== app.category) bad(`category differs from app definition`);

    const listed = new Set(Object.keys(sub.tools ?? {}));
    for (const t of tools) {
      if (!listed.has(t.name)) { bad(`tool ${t.name} missing from submission`); continue; }
      const a = sub.tools[t.name].annotations ?? {};
      for (const k of ["readOnlyHint", "openWorldHint", "destructiveHint"] as const) {
        if (typeof a[k] !== "boolean") bad(`${t.name}.${k} must be explicit boolean`);
        else if (a[k] !== t.annotations?.[k]) bad(`${t.name}.${k}: submission says ${a[k]}, server says ${t.annotations?.[k]}`);
      }
      const j = sub.tools[t.name].justifications ?? {};
      for (const k of ["read_only_justification", "open_world_justification", "destructive_justification"]) {
        if (!j[k] || j[k].length < 20) bad(`${t.name}.${k} is missing or too short`);
      }
    }
    for (const name of listed) if (!tools.some((t) => t.name === name)) bad(`submission lists unknown tool ${name}`);

    const pos = sub.test_cases ?? [];
    const neg = sub.negative_test_cases ?? [];
    if (pos.length !== 5) bad(`need exactly 5 test_cases, got ${pos.length}`);
    if (neg.length !== 3) bad(`need exactly 3 negative_test_cases, got ${neg.length}`);
    for (const tc of pos) if (!tools.some((t) => t.name === tc.tools_triggered)) bad(`test case "${tc.description}" triggers unknown tool ${tc.tools_triggered}`);
    for (const tc of neg) if (tc.tools_triggered !== null) bad(`negative case "${tc.description}" must have tools_triggered null`);
    const covered = new Set(pos.map((t: any) => t.tools_triggered));
    for (const t of tools) if (!covered.has(t.name)) console.log(`  · note: no positive test case exercises ${t.name}`);
    console.log(`  ${tools.length} tools, ${pos.length} positive / ${neg.length} negative cases, category ${info.category}`);
  }
  server.close();
  console.log(failures ? `\n${failures} problem(s)` : "\nAll submission files consistent with the server");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
