// Instagram has no public API for arbitrary posts, so we use Apify's
// maintained instagram-scraper actor to resolve a post URL into metadata
// and direct media links.

const SHORTCODE_RE = /instagram\.com\/(?:[\w.]+\/)?(?:p|reel|reels|tv)\/([\w-]+)/i;

export function parseInstagramUrl(input: string): { shortcode: string; url: string } | null {
  const match = input.match(SHORTCODE_RE);
  if (!match) return null;
  const shortcode = match[1];
  const isReel = /\/(reel|reels|tv)\//i.test(input);
  return { shortcode, url: `https://www.instagram.com/${isReel ? "reel" : "p"}/${shortcode}/` };
}

// Pull the first Instagram link out of arbitrary shared text.
export function findInstagramUrl(text: string): string | null {
  const match = text.match(/https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/i);
  return match ? match[0] : null;
}

export type InstagramPost = {
  mediaType: "video" | "image" | "carousel";
  creator: string | null;
  creatorName: string | null;
  caption: string | null;
  postedAt: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  imageUrls: string[];
};

type ApifyItem = {
  type?: string;
  caption?: string;
  ownerUsername?: string;
  ownerFullName?: string;
  timestamp?: string;
  displayUrl?: string;
  videoUrl?: string;
  images?: string[];
  childPosts?: { type?: string; displayUrl?: string; videoUrl?: string }[];
  error?: string;
  errorDescription?: string;
};

export async function fetchInstagramPost(url: string): Promise<InstagramPost> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN must be set");

  const endpoint =
    "https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items" +
    `?token=${encodeURIComponent(token)}&timeout=120`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      directUrls: [url],
      resultsType: "posts",
      resultsLimit: 1,
      addParentData: false,
    }),
  });
  if (!res.ok) throw new Error(`Apify request failed: ${res.status} ${await res.text()}`);

  const items = (await res.json()) as ApifyItem[];
  const item = items[0];
  if (!item || item.error) {
    throw new Error(`Could not fetch post: ${item?.errorDescription ?? item?.error ?? "no data"}`);
  }

  const type = (item.type ?? "").toLowerCase();
  const mediaType = type === "video" ? "video" : type === "sidecar" ? "carousel" : "image";
  const children = item.childPosts ?? [];
  const imageUrls =
    mediaType === "carousel"
      ? (item.images?.length ? item.images : children.map((c) => c.displayUrl).filter(Boolean) as string[])
      : item.displayUrl
        ? [item.displayUrl]
        : [];
  // Carousels can contain videos; transcribe the first one if present.
  const videoUrl = item.videoUrl ?? children.find((c) => c.videoUrl)?.videoUrl ?? null;

  return {
    mediaType,
    creator: item.ownerUsername ?? null,
    creatorName: item.ownerFullName ?? null,
    caption: item.caption ?? null,
    postedAt: item.timestamp ?? null,
    thumbnailUrl: item.displayUrl ?? imageUrls[0] ?? null,
    videoUrl,
    imageUrls,
  };
}
