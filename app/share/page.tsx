import { redirect } from "next/navigation";
import { hasSession } from "@/lib/auth";
import { findInstagramUrl } from "@/lib/instagram";
import { createSave, InvalidUrlError } from "@/lib/saves";

export const maxDuration = 300;

// Target for the PWA share sheet (Android) and bookmarklets:
//   /share?url=https://www.instagram.com/reel/...
export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; text?: string; title?: string }>;
}) {
  const params = await searchParams;
  if (!(await hasSession())) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    redirect(`/login?next=${encodeURIComponent(`/share?${qs}`)}`);
  }

  const link = [params.url, params.text, params.title].map((v) => (v ? findInstagramUrl(v) : null)).find(Boolean);
  if (!link) return <main className="login"><p>No Instagram link found in what was shared.</p></main>;

  let target = "/";
  try {
    const { save } = await createSave(link, { source: "share" });
    target = `/?added=${save.id}`;
  } catch (err) {
    if (!(err instanceof InvalidUrlError)) throw err;
    return <main className="login"><p>{err.message}</p></main>;
  }
  redirect(target);
}
