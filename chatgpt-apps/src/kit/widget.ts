import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KIT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APPS_DIR = path.resolve(KIT_DIR, "..", "apps");
const BRIDGE_PATH = path.join(KIT_DIR, "bridge.js");
const BASE_CSS_PATH = path.join(KIT_DIR, "base.css");
const DEV = process.env.NODE_ENV !== "production";

const cache = new Map<string, string>();

/**
 * Returns a loader for `src/apps/<slug>/widget.html` with the shared bridge
 * runtime (bridge.js) injected as the first script in <head>. Cached in
 * production; re-read on every call in development so edits show up on the
 * next tool call.
 */
export function widgetHtml(slug: string): () => string {
  const file = path.join(APPS_DIR, slug, "widget.html");
  return () => {
    const hit = cache.get(file);
    if (hit && !DEV) return hit;
    const bridge = fs.readFileSync(BRIDGE_PATH, "utf8");
    const css = fs.readFileSync(BASE_CSS_PATH, "utf8");
    const raw = fs.readFileSync(file, "utf8");
    const html = raw.replace(
      /<head([^>]*)>/i,
      `<head$1>\n<script>${bridge}</script>\n<style>${css}</style>`,
    );
    if (html === raw) throw new Error(`widget.html for "${slug}" has no <head> to inject the bridge into`);
    cache.set(file, html);
    return html;
  };
}
