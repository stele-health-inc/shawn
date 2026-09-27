import { isAuthorized, unauthorized } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { EDITABLE_FIELDS, STATUSES } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  if (!(await isAuthorized(req))) return unauthorized();
  const { id } = await params;
  const { data, error } = await db().from("saves").select("*").eq("id", id).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ save: data });
}

// PATCH /api/saves/:id  { tags?, category?, status?, remake_idea?, remake_note?, notes?, transcript? }
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isAuthorized(req))) return unauthorized();
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Body must be JSON" }, { status: 400 });

  const fields: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) if (key in body) fields[key] = body[key];
  if ("status" in fields && !(STATUSES as readonly unknown[]).includes(fields.status)) {
    return Response.json({ error: `status must be one of ${STATUSES.join(", ")}` }, { status: 400 });
  }
  if ("tags" in fields) {
    if (!Array.isArray(fields.tags) || !fields.tags.every((t) => typeof t === "string")) {
      return Response.json({ error: "tags must be an array of strings" }, { status: 400 });
    }
    fields.tags = [...new Set((fields.tags as string[]).map((t) => t.trim().toLowerCase()).filter(Boolean))];
  }
  if (!Object.keys(fields).length) {
    return Response.json({ error: `Nothing to update. Editable: ${EDITABLE_FIELDS.join(", ")}` }, { status: 400 });
  }

  const { data, error } = await db().from("saves").update(fields).eq("id", id).select("*").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ save: data });
}

export async function DELETE(req: Request, { params }: Ctx) {
  if (!(await isAuthorized(req))) return unauthorized();
  const { id } = await params;
  const { data, error } = await db().from("saves").delete().eq("id", id).select("shortcode").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (data) {
    const folder = await db().storage.from("media").list(data.shortcode);
    const paths = (folder.data ?? []).map((f) => `${data.shortcode}/${f.name}`);
    if (paths.length) await db().storage.from("media").remove(paths);
  }
  return new Response(null, { status: 204 });
}
