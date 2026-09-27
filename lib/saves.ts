import { after } from "next/server";
import { parseInstagramUrl } from "./instagram";
import { processSave } from "./process";
import { db } from "./supabase";
import type { Save } from "./types";

export class InvalidUrlError extends Error {}

// Insert a save (or return the existing one for the same post) and kick off
// processing after the response is sent.
export async function createSave(
  input: string,
  opts: { source?: string; notes?: string; tags?: string[] } = {},
): Promise<{ save: Save; created: boolean }> {
  const parsed = parseInstagramUrl(input);
  if (!parsed) throw new InvalidUrlError("Not an Instagram post or reel URL");

  const existing = await db().from("saves").select("*").eq("shortcode", parsed.shortcode).maybeSingle<Save>();
  if (existing.error) throw existing.error;
  if (existing.data) return { save: existing.data, created: false };

  const { data, error } = await db()
    .from("saves")
    .insert({
      url: parsed.url,
      shortcode: parsed.shortcode,
      source: opts.source ?? "web",
      notes: opts.notes ?? null,
      tags: opts.tags ?? [],
    })
    .select("*")
    .single<Save>();
  if (error) throw error;

  after(() => processSave(data.id));
  return { save: data, created: true };
}
