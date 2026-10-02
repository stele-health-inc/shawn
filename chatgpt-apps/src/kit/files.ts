import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";

/**
 * Stateless file delivery.
 *
 * ChatGPT's `downloadFile` bridge method isn't live yet and sandboxed widgets
 * can't trigger `<a download>`, so every downloadable artifact (.ics, .csv,
 * .pdf, .svg, .bib …) is served from `GET /<app>/files/<token>`. The token is
 * the deflated JSON payload needed to *rebuild* the file plus an HMAC, so the
 * server keeps no state and the URL can be opened later from any device.
 */

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const secret = process.env.FILES_SECRET ?? randomBytes(32).toString("hex");
if (!process.env.FILES_SECRET) {
  console.warn(
    "[files] FILES_SECRET is not set; download links will stop working when the process restarts.",
  );
}

interface TokenBody {
  k: string; // kind
  f: string; // filename
  p: unknown; // payload
  e: number; // expiry (ms since epoch)
}

function sign(data: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function signFileToken(kind: string, payload: unknown, filename: string): string {
  const body: TokenBody = { k: kind, f: filename, p: payload, e: Date.now() + TTL_MS };
  const data = deflateRawSync(Buffer.from(JSON.stringify(body), "utf8")).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyFileToken(
  token: string,
): { kind: string; filename: string; payload: unknown } | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(data);
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const body = JSON.parse(
      inflateRawSync(Buffer.from(data, "base64url")).toString("utf8"),
    ) as TokenBody;
    if (typeof body.e !== "number" || body.e < Date.now()) return null;
    return { kind: body.k, filename: body.f, payload: body.p };
  } catch {
    return null;
  }
}

/** Make a string safe to use as a filename. */
export function safeFilename(name: string, ext: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "download";
  return `${base}.${ext}`;
}
