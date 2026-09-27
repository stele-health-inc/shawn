"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { STATUS_LABELS, STATUSES, TOPICS, type Save, type Status } from "@/lib/types";
import { addSave, listSaves, retrySave } from "./api";
import Review from "./Review";

type StatusFilter = Status | "all";

export default function Library() {
  const [saves, setSaves] = useState<Save[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [remakeOnly, setRemakeOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"saved" | "posted">("saved");
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [review, setReview] = useState<{ ids: string[]; index: number } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSaves(await listSaves());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll while anything is still being fetched / transcribed.
  const busy = saves.some((s) => s.processing_state === "pending" || s.processing_state === "processing");
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [busy, refresh]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of saves) for (const t of s.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    const extra = [...counts.keys()].filter((t) => !(TOPICS as readonly string[]).includes(t));
    extra.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
    return [...TOPICS.filter((t) => counts.has(t)), ...extra];
  }, [saves]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = saves.filter(
      (s) =>
        (status === "all" || s.status === status) &&
        (!tag || s.tags.includes(tag)) &&
        (!remakeOnly || s.remake_idea) &&
        (!q ||
          [s.creator, s.caption, s.transcript, s.summary, s.notes, s.tags.join(" ")]
            .some((f) => f?.toLowerCase().includes(q))),
    );
    const key = sort === "posted" ? "posted_at" : "saved_at";
    return list.sort((a, b) => (b[key] ?? "").localeCompare(a[key] ?? ""));
  }, [saves, status, tag, remakeOnly, search, sort]);

  const unreviewed = useMemo(
    () => visible.filter((s) => s.status === "unreviewed" && s.processing_state === "ready"),
    [visible],
  );

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setAdding(true);
    setMessage(null);
    try {
      const { save, created } = await addSave(url.trim());
      setUrl("");
      if (!created) setMessage("Already in your library");
      setSaves((prev) => [save, ...prev.filter((s) => s.id !== save.id)]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  }

  function onUpdated(updated: Save) {
    setSaves((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  const byId = useMemo(() => new Map(saves.map((s) => [s.id, s])), [saves]);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">Saves</div>
        <form className="add" onSubmit={onAdd}>
          <input
            type="url"
            inputMode="url"
            placeholder="Paste an Instagram link…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={async () => {
              // Offer the clipboard link on focus when it's an Instagram URL.
              if (url || !navigator.clipboard?.readText) return;
              try {
                const text = await navigator.clipboard.readText();
                if (/instagram\.com\//.test(text)) setUrl(text.trim());
              } catch {}
            }}
          />
          <button type="submit" disabled={adding}>{adding ? "…" : "Save"}</button>
        </form>
      </header>

      {message && (
        <div className="toast" onClick={() => setMessage(null)}>
          {message}
        </div>
      )}

      <nav className="filters">
        <div className="chips">
          {(["all", ...STATUSES] as StatusFilter[]).map((s) => (
            <button key={s} className={`chip ${status === s ? "on" : ""}`} onClick={() => setStatus(s)}>
              {s === "all" ? "All" : STATUS_LABELS[s]}
              <span className="count">
                {s === "all" ? saves.length : saves.filter((x) => x.status === s).length}
              </span>
            </button>
          ))}
          <button className={`chip ${remakeOnly ? "on" : ""}`} onClick={() => setRemakeOnly(!remakeOnly)}>
            💡 Remake
          </button>
        </div>
        <div className="chips">
          {allTags.map((t) => (
            <button key={t} className={`chip tag ${tag === t ? "on" : ""}`} onClick={() => setTag(tag === t ? null : t)}>
              #{t}
            </button>
          ))}
        </div>
        <div className="row">
          <input
            className="search"
            type="search"
            placeholder="Search creator, script, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value as "saved" | "posted")}>
            <option value="saved">Date saved</option>
            <option value="posted">Date posted</option>
          </select>
        </div>
        {unreviewed.length > 0 && (
          <button className="review-cta" onClick={() => setReview({ ids: unreviewed.map((s) => s.id), index: 0 })}>
            Review {unreviewed.length} unreviewed →
          </button>
        )}
      </nav>

      {loaded && visible.length === 0 && (
        <p className="empty">{saves.length ? "Nothing matches these filters." : "Paste a reel or post link to start your library."}</p>
      )}

      <main className="grid">
        {visible.map((s, i) => (
          <Card
            key={s.id}
            save={s}
            onOpen={() => setReview({ ids: visible.map((v) => v.id), index: i })}
            onRetry={async () => {
              await retrySave(s.id);
              onUpdated({ ...s, processing_state: "processing", error: null });
            }}
          />
        ))}
      </main>

      {review && (
        <Review
          saves={review.ids.map((id) => byId.get(id)).filter((s): s is Save => !!s)}
          startIndex={review.index}
          onUpdated={onUpdated}
          onClose={() => setReview(null)}
        />
      )}
    </div>
  );
}

function Card({ save, onOpen, onRetry }: { save: Save; onOpen: () => void; onRetry: () => void }) {
  const pending = save.processing_state === "pending" || save.processing_state === "processing";
  return (
    <article className={`card status-${save.status}`}>
      <a className="thumb" href={save.url} target="_blank" rel="noreferrer" aria-label="Open on Instagram">
        {save.thumbnail_url ? <img src={save.thumbnail_url} alt="" loading="lazy" /> : <div className="ph" />}
        {save.media_type === "video" && <span className="badge play">▶</span>}
        {save.media_type === "carousel" && <span className="badge">❏</span>}
        {save.remake_idea && <span className="badge remake">💡</span>}
        {pending && <div className="overlay"><span className="spinner" />Processing…</div>}
        {save.processing_state === "error" && (
          <div className="overlay error" onClick={(e) => e.preventDefault()}>
            <span>Couldn’t process</span>
            <button onClick={(e) => { e.preventDefault(); onRetry(); }}>Retry</button>
          </div>
        )}
      </a>
      <button className="meta" onClick={onOpen}>
        <span className="handle">
          <span className={`dot ${save.status}`} />@{save.creator ?? "…"}
        </span>
        <span className="tags">{save.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}</span>
      </button>
    </article>
  );
}
