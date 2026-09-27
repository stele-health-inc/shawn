export const STATUSES = ["unreviewed", "keep", "content", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  unreviewed: "Unreviewed",
  keep: "Keep",
  content: "Turn into content",
  done: "Done",
};

export const TOPICS = ["health", "faith", "business", "fitness", "editing", "hooks"] as const;
export type Topic = (typeof TOPICS)[number];

export type Save = {
  id: string;
  url: string;
  shortcode: string;
  media_type: "video" | "image" | "carousel" | null;
  creator: string | null;
  creator_name: string | null;
  caption: string | null;
  posted_at: string | null;
  saved_at: string;
  thumbnail_url: string | null;
  image_urls: string[];
  raw_transcript: string | null;
  transcript: string | null;
  summary: string | null;
  hook: string | null;
  tags: string[];
  category: string | null;
  status: Status;
  remake_idea: boolean;
  remake_note: string | null;
  notes: string | null;
  processing_state: "pending" | "processing" | "ready" | "error";
  error: string | null;
  source: string | null;
  updated_at: string;
};

// Fields the UI / API may change directly.
export const EDITABLE_FIELDS = [
  "tags",
  "category",
  "status",
  "remake_idea",
  "remake_note",
  "notes",
  "transcript",
] as const;
