import { isAuthorized, unauthorized } from "@/lib/auth";
import { createSave, InvalidUrlError } from "@/lib/saves";
import { db } from "@/lib/supabase";
import { STATUSES } from "@/lib/types";

// Processing (scrape + transcribe + tag) runs after the response via after().
export const maxDuration = 300;

// GET /api/saves?status=unreviewed&tag=hooks&category=health&q=text&sort=posted&limit=100
export async function GET(req: Request) {
  if (!(await isAuthorized(req))) return unauthorized();
  const params = new URL(req.url).searchParams;

  let query = db().from("saves").select("*");
  const status = params.get("status");
  if (status && (STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);
  const tag = params.get("tag");
  if (tag) query = query.contains("tags", [tag]);
  const category = params.get("category");
  if (category) query = query.eq("category", category);
  if (params.get("remake") === "true") query = query.eq("remake_idea", true);
  const q = params.get("q")?.replace(/[%,()]/g, " ").trim();
  if (q) {
    query = query.or(
      ["creator", "caption", "transcript", "summary", "notes"].map((c) => `${c}.ilike.%${q}%`).join(","),
    );
  }

  const sortColumn = params.get("sort") === "posted" ? "posted_at" : "saved_at";
  const limit = Math.min(Number(params.get("limit")) || 500, 1000);
  const { data, error } = await query
    .order(sortColumn, { ascending: params.get("order") === "asc", nullsFirst: false })
    .limit(limit);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ saves: data });
}

// POST /api/saves  { "url": "https://www.instagram.com/reel/...", "notes"?: string, "tags"?: string[] }
export async function POST(req: Request) {
  if (!(await isAuthorized(req))) return unauthorized();
  const body = (await req.json().catch(() => null)) as
    | { url?: unknown; notes?: unknown; tags?: unknown; source?: unknown }
    | null;
  if (!body || typeof body.url !== "string") {
    return Response.json({ error: "Body must be JSON with a `url` string" }, { status: 400 });
  }

  try {
    const { save, created } = await createSave(body.url, {
      source: typeof body.source === "string" ? body.source : req.headers.has("authorization") ? "api" : "web",
      notes: typeof body.notes === "string" ? body.notes : undefined,
      tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : undefined,
    });
    return Response.json({ save, created }, { status: created ? 201 : 200 });
  } catch (err) {
    if (err instanceof InvalidUrlError) return Response.json({ error: err.message }, { status: 400 });
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
