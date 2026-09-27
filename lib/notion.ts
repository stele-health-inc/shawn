import { STATUS_LABELS, type Save } from "./types";

function fmt(date: string | null): string {
  return date ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

// Markdown that Notion turns into proper blocks when pasted.
export function toNotionMarkdown(save: Save): string {
  const title = save.hook || save.summary || `@${save.creator ?? "unknown"}`;
  const lines = [
    `# ${title.replace(/\n/g, " ")}`,
    "",
    `**Creator:** @${save.creator ?? "unknown"}  `,
    `**Link:** ${save.url}  `,
    `**Posted:** ${fmt(save.posted_at)} · **Saved:** ${fmt(save.saved_at)}  `,
    `**Category:** ${save.category ?? "—"} · **Status:** ${STATUS_LABELS[save.status]}  `,
    `**Tags:** ${save.tags.length ? save.tags.map((t) => `#${t}`).join(" ") : "—"}`,
  ];
  if (save.summary) lines.push("", `> ${save.summary}`);
  if (save.remake_idea) lines.push("", "## 💡 Remake idea", save.remake_note || "Worth remaking.");
  if (save.notes) lines.push("", "## Notes", save.notes);
  if (save.transcript) lines.push("", "## Script", save.transcript);
  else if (save.caption) lines.push("", "## Caption", save.caption);
  return lines.join("\n");
}
