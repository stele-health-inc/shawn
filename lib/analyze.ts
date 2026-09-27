import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { TOPICS } from "./types";

const client = new Anthropic();

const AnalysisSchema = z.object({
  script: z.string(),
  summary: z.string(),
  hook: z.string(),
  category: z.enum([...TOPICS, "other"]),
  topic_tags: z.array(z.enum(TOPICS)),
  extra_tags: z.array(z.string()),
  remake_idea: z.boolean(),
  remake_note: z.string(),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

const SYSTEM = `You file Instagram posts into a creator's personal swipe file. The creator makes content about health, faith, business and fitness, and studies editing techniques and hooks.

For each post, return:
- script: the spoken audio rewritten as a clean, readable script. Keep the speaker's actual words and order; remove filler words, false starts and repeated phrases; fix punctuation; break it into short paragraphs. If there is no speech, return an empty string.
- summary: one sentence on what the post is about and why someone saved it.
- hook: the opening line or on-screen hook that grabs attention (quote it), or an empty string if there isn't a clear one.
- category: the single best-fitting primary topic, or "other".
- topic_tags: every topic that genuinely applies. Use "editing" when the post demonstrates or teaches an editing technique (cuts, captions, b-roll, transitions, sound design), and "hooks" when the opening is a strong, reusable hook pattern.
- extra_tags: up to three short lowercase tags for specifics not covered by the topics (e.g. "fasting", "sales", "prayer", "talking-head"). No hashtags.
- remake_idea: true only if this is worth remaking as the creator's own content — a strong format, hook or idea that would translate to their niches.
- remake_note: if remake_idea is true, one or two sentences on how to remake it; otherwise an empty string.`;

type PostInput = {
  creator: string | null;
  mediaType: string;
  caption: string | null;
  rawTranscript: string | null;
  imageUrls: string[];
};

export async function analyzePost(post: PostInput): Promise<Analysis> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = post.imageUrls
    .slice(0, 4)
    .map((url) => ({ type: "image" as const, source: { type: "url" as const, url } }));
  content.push({
    type: "text",
    text: [
      `Creator: @${post.creator ?? "unknown"}`,
      `Post type: ${post.mediaType}`,
      `<caption>\n${post.caption ?? ""}\n</caption>`,
      `<transcript>\n${post.rawTranscript ?? ""}\n</transcript>`,
    ].join("\n\n"),
  });

  const response = await client.beta.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: betaZodOutputFormat(AnalysisSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude declined to analyze this post (${response.stop_details?.category ?? "unknown"})`);
  }
  if (!response.parsed_output) {
    throw new Error(`Claude returned no analysis (stop_reason: ${response.stop_reason})`);
  }
  return response.parsed_output;
}
