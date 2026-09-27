import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "saves_session";

function sessionToken(): string {
  const password = process.env.APP_PASSWORD;
  if (!password) throw new Error("APP_PASSWORD must be set");
  return createHmac("sha256", password).update("saves-library-session").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(password: string): boolean {
  const expected = process.env.APP_PASSWORD;
  return !!expected && safeEqual(password, expected);
}

export function newSessionValue(): string {
  return sessionToken();
}

export async function hasSession(): Promise<boolean> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return !!value && safeEqual(value, sessionToken());
}

// Browser requests carry the session cookie; agents send `Authorization: Bearer <API_KEY>`.
export async function isAuthorized(req: Request): Promise<boolean> {
  const header = req.headers.get("authorization");
  const apiKey = process.env.API_KEY;
  if (header?.startsWith("Bearer ") && apiKey) {
    return safeEqual(header.slice(7).trim(), apiKey);
  }
  return hasSession();
}

export function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
