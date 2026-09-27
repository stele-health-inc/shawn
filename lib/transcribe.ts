// Speech-to-text via Deepgram. We download the video ourselves (Instagram's
// CDN is picky about who fetches from it) and upload the bytes.

export async function transcribeVideo(videoUrl: string): Promise<string> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY must be set");

  const media = await fetch(videoUrl);
  if (!media.ok) throw new Error(`Video download failed: ${media.status}`);
  const bytes = await media.arrayBuffer();

  const res = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&paragraphs=true&detect_language=true",
    {
      method: "POST",
      headers: {
        authorization: `Token ${key}`,
        "content-type": media.headers.get("content-type") ?? "video/mp4",
      },
      body: bytes,
    },
  );
  if (!res.ok) throw new Error(`Deepgram failed: ${res.status} ${await res.text()}`);

  const data = (await res.json()) as {
    results?: {
      channels?: {
        alternatives?: { transcript?: string; paragraphs?: { transcript?: string } }[];
      }[];
    };
  };
  const alt = data.results?.channels?.[0]?.alternatives?.[0];
  return (alt?.paragraphs?.transcript ?? alt?.transcript ?? "").trim();
}
