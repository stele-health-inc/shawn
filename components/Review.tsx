"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toNotionMarkdown } from "@/lib/notion";
import { STATUS_LABELS, TOPICS, type Save, type Status } from "@/lib/types";
import { updateSave } from "./api";

type Draft = Pick<Save, "tags" | "category" | "remake_idea" | "remake_note" | "notes">;

const draftOf = (s: Save): Draft => ({
  tags: s.tags,
  category: s.category,
  remake_idea: s.remake_idea,
  remake_note: s.remake_note,
  notes: s.notes,
});

const ACTIONS: { status: Status; key: string; label: string }[] = [
  { status: "keep", key: "k", label: "Keep" },
  { status: "content", key: "c", label: "Content" },
  { status: "done", key: "d", label: "Done" },
];

export default function Review({
  saves,
  startIndex,
  onUpdated,
  onClose,
}: {
  saves: Save[];
  startIndex: number;
  onUpdated: (s: Save) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(Math.min(startIndex, saves.length - 1));
  const save = saves[index];
  const [draft, setDraft] = useState<Draft>(() => draftOf(save));
  const [flipped, setFlipped] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const touchX = useRef<number | null>(null);

  // Reset the editor whenever we move to a different save.
  useEffect(() => {
    if (save) setDraft(draftOf(save));
    setFlipped(false);
    setNewTag("");
    setCopied(false);
  }, [save?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = save && JSON.stringify(draft) !== JSON.stringify(draftOf(save));

  const persist = useCallback(
    async (extra: Partial<Save> = {}) => {
      if (!save || (!dirty && !Object.keys(extra).length)) return;
      const optimistic = { ...save, ...draft, ...extra };
      onUpdated(optimistic);
      try {
        onUpdated(await updateSave(save.id, { ...draft, ...extra }));
        setError(null);
      } catch (err) {
        onUpdated(save);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [save, draft, dirty, onUpdated],
  );

  const go = useCallback(
    (delta: number) => {
      void persist();
      const next = index + delta;
      if (next < 0) return;
      if (next >= saves.length) return onClose();
      setIndex(next);
    },
    [index, saves.length, persist, onClose],
  );

  const decide = useCallback(
    (status: Status) => {
      void persist({ status });
      if (index + 1 >= saves.length) onClose();
      else setIndex(index + 1);
    },
    [index, saves.length, persist, onClose],
  );

  const close = useCallback(() => {
    void persist();
    onClose();
  }, [persist, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
        if (e.key === "Escape") el.blur();
        return;
      }
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") close();
      else if (e.key === " " || e.key === "f") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else {
        const action = ACTIONS.find((a) => a.key === e.key.toLowerCase());
        if (action) decide(action.status);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, close, decide]);

  if (!save) return null;

  const toggleTag = (t: string) =>
    setDraft((d) => ({ ...d, tags: d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t] }));
  const suggestions = [...TOPICS.filter((t) => !draft.tags.includes(t))];

  async function copyForNotion() {
    await navigator.clipboard.writeText(toNotionMarkdown({ ...save, ...draft }));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="review"
      onTouchStart={(e) => {
        const el = e.target as HTMLElement;
        touchX.current = el.closest("input, textarea, .script") ? null : e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 70) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="progress">
        {saves.map((s, i) => (
          <span key={s.id} className={i < index ? "seen" : i === index ? "current" : ""} />
        ))}
      </div>

      <div className="review-head">
        <button className="icon" onClick={close} aria-label="Close">✕</button>
        <div className="who">
          <strong>@{save.creator ?? "unknown"}</strong>
          <span>
            {save.posted_at ? new Date(save.posted_at).toLocaleDateString() : ""}
            {" · "}
            {STATUS_LABELS[save.status]}
          </span>
        </div>
        <span className="pos">{index + 1}/{saves.length}</span>
      </div>

      <div className="review-body" key={save.id}>
        <div className={`flip ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)}>
          <div className="face front">
            {save.thumbnail_url ? <img src={save.thumbnail_url} alt="" /> : <div className="ph" />}
            <span className="hint">Tap for script</span>
          </div>
          <div className="face back script">
            {save.hook && <p className="hook">“{save.hook}”</p>}
            {save.summary && <p className="summary">{save.summary}</p>}
            <div className="text">{save.transcript || save.caption || "No script or caption."}</div>
          </div>
        </div>

        <div className="panel">
          <a className="watch" href={save.url} target="_blank" rel="noreferrer">
            ▶ Watch on Instagram
          </a>

          <div className="section">
            <label>Tags</label>
            <div className="chips wrap">
              {draft.tags.map((t) => (
                <button key={t} className="chip on" onClick={() => toggleTag(t)}>#{t} ✕</button>
              ))}
              {suggestions.map((t) => (
                <button key={t} className="chip ghost" onClick={() => toggleTag(t)}>+ {t}</button>
              ))}
            </div>
            <form
              className="tag-add"
              onSubmit={(e) => {
                e.preventDefault();
                const t = newTag.trim().toLowerCase().replace(/^#/, "");
                if (t && !draft.tags.includes(t)) setDraft((d) => ({ ...d, tags: [...d.tags, t] }));
                setNewTag("");
              }}
            >
              <input placeholder="Add tag…" value={newTag} onChange={(e) => setNewTag(e.target.value)} />
            </form>
          </div>

          <div className="section">
            <label>Category</label>
            <div className="chips wrap">
              {[...TOPICS, "other"].map((c) => (
                <button
                  key={c}
                  className={`chip ${draft.category === c ? "on" : "ghost"}`}
                  onClick={() => setDraft((d) => ({ ...d, category: c }))}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="section">
            <button
              className={`chip ${draft.remake_idea ? "on remake" : "ghost"}`}
              onClick={() => setDraft((d) => ({ ...d, remake_idea: !d.remake_idea }))}
            >
              💡 Worth remaking
            </button>
            {draft.remake_idea && (
              <textarea
                rows={2}
                placeholder="How would you remake it?"
                value={draft.remake_note ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, remake_note: e.target.value }))}
              />
            )}
          </div>

          <div className="section">
            <textarea
              rows={2}
              placeholder="Notes…"
              value={draft.notes ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          </div>

          <button className="copy" onClick={copyForNotion}>{copied ? "Copied ✓" : "Copy for Notion"}</button>
          {error && <p className="error">{error}</p>}
        </div>
      </div>

      <div className="actions">
        <button className="icon" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous">←</button>
        {ACTIONS.map((a) => (
          <button
            key={a.status}
            className={`action ${a.status} ${save.status === a.status ? "current" : ""}`}
            onClick={() => decide(a.status)}
          >
            {a.label}
            <kbd>{a.key.toUpperCase()}</kbd>
          </button>
        ))}
        <button className="icon" onClick={() => go(1)} aria-label="Next">→</button>
      </div>
    </div>
  );
}
