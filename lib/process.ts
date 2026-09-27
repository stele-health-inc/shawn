import { analyzePost } from "./analyze";
import { fetchInstagramPost } from "./instagram";
import { db, MEDIA_BUCKET } from "./supabase";
import { transcribeVideo } from "./transcribe";
import type { Save } from "./types";

// Instagram CDN links expire after a few days, so keep our own copy of images.
async function storeImage(shortcode: string, index: number, url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`);
  const type = res.headers.get("content-type") ?? "image/jpeg";
  const path = `${shortcode}/${index}.${type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg"}`;
  const { error } = await db()
    .storage.from(MEDIA_BUCKET)
    .upload(path, await res.arrayBuffer(), { contentType: type, upsert: true });
  if (error) throw error;
  return db().storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function update(id: string, fields: Partial<Save>) {
  const { error } = await db().from("saves").update(fields).eq("id", id);
  if (error) throw error;
}

// Fetch → store images → transcribe → clean up + tag. Each stage is saved as it
// finishes so a later failure still leaves a useful card.
export async function processSave(id: string): Promise<void> {
  const { data: save, error } = await db().from("saves").select("*").eq("id", id).single<Save>();
  if (error || !save) throw error ?? new Error(`Save ${id} not found`);

  try {
    await update(id, { processing_state: "processing", error: null });

    const post = await fetchInstagramPost(save.url);
    const sources = post.mediaType === "video" ? [post.thumbnailUrl] : post.imageUrls;
    const stored = await Promise.all(
      sources.filter((u): u is string => !!u).slice(0, 10).map((u, i) => storeImage(save.shortcode, i, u)),
    );
    await update(id, {
      media_type: post.mediaType,
      creator: post.creator,
      creator_name: post.creatorName,
      caption: post.caption,
      posted_at: post.postedAt,
      thumbnail_url: stored[0] ?? null,
      image_urls: post.mediaType === "video" ? [] : stored,
    });

    const rawTranscript = post.videoUrl ? await transcribeVideo(post.videoUrl) : null;
    await update(id, { raw_transcript: rawTranscript });

    const analysis = await analyzePost({
      creator: post.creator,
      mediaType: post.mediaType,
      caption: post.caption,
      rawTranscript,
      imageUrls: post.mediaType === "video" ? [] : stored,
    });
    const tags = [...new Set([...analysis.topic_tags, ...analysis.extra_tags.map((t) => t.toLowerCase())])];

    await update(id, {
      transcript: analysis.script || null,
      summary: analysis.summary,
      hook: analysis.hook || null,
      category: analysis.category,
      // Don't clobber tags the user already edited (e.g. on a retry).
      tags: save.tags.length ? save.tags : tags,
      remake_idea: analysis.remake_idea,
      remake_note: analysis.remake_note || null,
      processing_state: "ready",
    });
  } catch (err) {
    console.error(`processSave(${id}) failed`, err);
    await update(id, {
      processing_state: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
