import { createHttpApp } from "./kit/http.js";
import { apps } from "./apps/index.js";

const port = Number(process.env.PORT ?? 8787);
const publicBaseUrl = (process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`).replace(/\/$/, "");

// APPS=qr,calendar limits which apps this process serves (default: all).
const only = process.env.APPS?.split(",").map((s) => s.trim()).filter(Boolean);
const selected = only?.length ? apps.filter((a) => only.includes(a.slug)) : apps;
if (selected.length === 0) {
  console.error(`No apps matched APPS=${process.env.APPS}. Known: ${apps.map((a) => a.slug).join(", ")}`);
  process.exit(1);
}

const http = createHttpApp(selected, { publicBaseUrl });
const server = http.listen(port, () => {
  console.log(`Serving ${selected.length} app(s) on ${publicBaseUrl}`);
  for (const a of selected) console.log(`  ${a.name.padEnd(28)} ${publicBaseUrl}/${a.slug}/mcp`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
