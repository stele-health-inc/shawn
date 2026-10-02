// ─── Data model ──────────────────────────────────────────────────────────────

export type RefType = "journal-article" | "book" | "chapter" | "website" | "report" | "thesis" | "conference-paper" | "other";
export type Style = "apa" | "mla" | "chicago" | "harvard" | "ieee";
export const STYLES: Style[] = ["apa", "mla", "chicago", "harvard", "ieee"];
export const STYLE_LABEL: Record<Style, string> = { apa: "APA 7", mla: "MLA 9", chicago: "Chicago 17", harvard: "Harvard", ieee: "IEEE" };

export interface Person { family: string; given?: string }

export interface Reference {
  type: RefType;
  authors: Person[];
  editors?: Person[];
  title: string;
  containerTitle?: string; // journal, book (for chapters), website
  year?: number;
  month?: number;
  day?: number;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  place?: string;
  edition?: string;
  doi?: string;
  url?: string;
  accessed?: string; // YYYY-MM-DD
}

// ─── Name & text helpers ─────────────────────────────────────────────────────

const initials = (given?: string, sep = ". ") =>
  (given ?? "").split(/[\s.-]+/).filter(Boolean).map((p) => p[0].toUpperCase()).join(sep) + (given ? "." : "");

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const mon3 = (m: number) => MONTHS[m]?.slice(0, 3) ?? "";

/** Join a list with Oxford comma and the given conjunction. */
function joinList(items: string[], conj: string): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]}${conj === "&" ? " & " : ` ${conj} `}${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${conj} ${items[items.length - 1]}`;
}

const endDot = (s: string) => (/[.?!]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const noDot = (s: string) => s.trim().replace(/\.$/, "");
const em = (s: string) => `\u0001${s}\u0002`; // italic markers, converted at the end
const normDoi = (d?: string) => d?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").trim();
const doiUrl = (d?: string) => (normDoi(d) ? `https://doi.org/${normDoi(d)}` : undefined);
const pageRange = (p?: string) => p?.replace(/\s*-+\s*/g, "–");

function authorsApa(a: Person[]): string {
  const f = (p: Person) => (p.given ? `${p.family}, ${initials(p.given)}` : p.family);
  if (a.length === 0) return "";
  if (a.length === 1) return f(a[0]);
  if (a.length <= 20) return `${a.slice(0, -1).map(f).join(", ")}, & ${f(a[a.length - 1])}`;
  return `${a.slice(0, 19).map(f).join(", ")}, . . . ${f(a[a.length - 1])}`;
}
function authorsMla(a: Person[]): string {
  const first = (p: Person) => (p.given ? `${p.family}, ${p.given}` : p.family);
  const rest = (p: Person) => (p.given ? `${p.given} ${p.family}` : p.family);
  if (a.length === 0) return "";
  if (a.length === 1) return first(a[0]);
  if (a.length === 2) return `${first(a[0])}, and ${rest(a[1])}`;
  return `${first(a[0])}, et al`;
}
function authorsChicago(a: Person[]): string {
  const first = (p: Person) => (p.given ? `${p.family}, ${p.given}` : p.family);
  const rest = (p: Person) => (p.given ? `${p.given} ${p.family}` : p.family);
  if (a.length === 0) return "";
  if (a.length === 1) return first(a[0]);
  if (a.length === 2) return `${first(a[0])}, and ${rest(a[1])}`;
  if (a.length <= 10) return `${first(a[0])}, ${a.slice(1, -1).map(rest).join(", ")}, and ${rest(a[a.length - 1])}`;
  return `${first(a[0])}, ${a.slice(1, 7).map(rest).join(", ")}, et al`;
}
function authorsHarvard(a: Person[]): string {
  const f = (p: Person) => (p.given ? `${p.family}, ${initials(p.given, ".")}` : p.family);
  if (a.length === 0) return "";
  if (a.length === 1) return f(a[0]);
  if (a.length <= 3) return `${a.slice(0, -1).map(f).join(", ")} and ${f(a[a.length - 1])}`; // Harvard: no serial comma
  return `${f(a[0])} et al.`;
}
function authorsIeee(a: Person[]): string {
  const f = (p: Person) => (p.given ? `${initials(p.given, ". ")} ${p.family}` : p.family);
  if (a.length === 0) return "";
  if (a.length <= 6) return joinList(a.map(f), "and");
  return `${f(a[0])} et al.`;
}

function inTextName(a: Person[], style: Style): string {
  if (a.length === 0) return "";
  if (a.length === 1) return a[0].family;
  if (a.length === 2) return `${a[0].family} ${style === "apa" ? "&" : "and"} ${a[1].family}`;
  return `${a[0].family} et al.`;
}

// ─── Formatters (bibliography entry + in-text) ───────────────────────────────

function apa(r: Reference): { entry: string; inText: string } {
  const au = authorsApa(r.authors);
  const yr = r.year ? `(${r.year}${r.type === "website" && r.month ? `, ${MONTHS[r.month]}${r.day ? ` ${r.day}` : ""}` : ""})` : "(n.d.)";
  const link = doiUrl(r.doi) ?? r.url ?? "";
  let body: string;
  switch (r.type) {
    case "journal-article": {
      const vol = r.volume ? em(r.volume) : "";
      const iss = r.issue ? `(${r.issue})` : "";
      body = `${endDot(r.title)} ${em(noDot(r.containerTitle ?? ""))}${vol ? `, ${vol}` : ""}${iss}${r.pages ? `, ${pageRange(r.pages)}` : ""}.`;
      break;
    }
    case "chapter":
      body = `${endDot(r.title)} In ${r.editors?.length ? `${authorsIeeeLike(r.editors)} (Ed${r.editors.length > 1 ? "s" : ""}.), ` : ""}${em(noDot(r.containerTitle ?? ""))}${r.pages ? ` (pp. ${pageRange(r.pages)})` : ""}.${r.publisher ? ` ${r.publisher}.` : ""}`;
      break;
    case "book":
    case "report":
    case "thesis":
      body = `${em(noDot(r.title))}${r.edition ? ` (${r.edition} ed.)` : ""}.${r.publisher ? ` ${r.publisher}.` : ""}`;
      break;
    case "website":
      body = `${em(noDot(r.title))}.${r.containerTitle ? ` ${r.containerTitle}.` : ""}`;
      break;
    default:
      body = `${endDot(r.title)}${r.containerTitle ? ` ${em(noDot(r.containerTitle))}.` : ""}${r.publisher ? ` ${r.publisher}.` : ""}`;
  }
  const entry = `${au ? `${endDot(au)} ` : ""}${yr}. ${body}${link ? ` ${link}` : ""}`.replace(/\.\./g, ".");
  const inText = `(${inTextName(r.authors, "apa") || noDot(r.title)}, ${r.year ?? "n.d."})`;
  return { entry, inText };
}
// APA lists editors as initials-first.
function authorsIeeeLike(a: Person[]): string {
  const f = (p: Person) => (p.given ? `${initials(p.given, ". ")} ${p.family}` : p.family);
  return joinList(a.map(f), "&");
}

function mla(r: Reference): { entry: string; inText: string } {
  const au = authorsMla(r.authors);
  const link = (normDoi(r.doi) ? `https://doi.org/${normDoi(r.doi)}` : r.url?.replace(/^https?:\/\//, "")) ?? "";
  const date = r.year ? `${r.day ? `${r.day} ` : ""}${r.month ? `${mon3(r.month)}. ` : ""}${r.year}` : "";
  let body: string;
  switch (r.type) {
    case "journal-article":
      body = `"${endDot(r.title)}" ${em(noDot(r.containerTitle ?? ""))}${r.volume ? `, vol. ${r.volume}` : ""}${r.issue ? `, no. ${r.issue}` : ""}${date ? `, ${date}` : ""}${r.pages ? `, pp. ${pageRange(r.pages)}` : ""}.`;
      break;
    case "chapter":
      body = `"${endDot(r.title)}" ${em(noDot(r.containerTitle ?? ""))}${r.editors?.length ? `, edited by ${joinList(r.editors.map((p) => `${p.given ?? ""} ${p.family}`.trim()), "and")}` : ""}${r.publisher ? `, ${r.publisher}` : ""}${date ? `, ${date}` : ""}${r.pages ? `, pp. ${pageRange(r.pages)}` : ""}.`;
      break;
    case "website":
      body = `"${endDot(r.title)}" ${r.containerTitle ? `${em(noDot(r.containerTitle))}, ` : ""}${date ? `${date}, ` : ""}`.replace(/, $/, ".");
      break;
    default:
      body = `${em(noDot(r.title))}.${r.edition ? ` ${r.edition} ed.,` : ""}${r.publisher ? ` ${r.publisher},` : ""}${date ? ` ${date}.` : ""}`.replace(/,$/, ".");
  }
  const entry = `${au ? `${endDot(au)} ` : ""}${body}${link ? ` ${link}.` : ""}${r.type === "website" && r.accessed ? ` Accessed ${fmtAccessed(r.accessed, "mla")}.` : ""}`.replace(/\.\./g, ".").replace(/\.\s*\./g, ".");
  const inText = `(${inTextName(r.authors, "mla") || `"${noDot(r.title)}"`}${r.pages && r.type !== "journal-article" ? ` ${r.pages.split(/[-–]/)[0]}` : ""})`;
  return { entry, inText };
}

function chicago(r: Reference): { entry: string; inText: string } {
  const au = authorsChicago(r.authors);
  const link = doiUrl(r.doi) ?? r.url ?? "";
  let body: string;
  switch (r.type) {
    case "journal-article":
      body = `"${endDot(r.title)}" ${em(noDot(r.containerTitle ?? ""))}${r.volume ? ` ${r.volume}` : ""}${r.issue ? `, no. ${r.issue}` : ""}${r.year ? ` (${r.month ? `${MONTHS[r.month]} ` : ""}${r.year})` : ""}${r.pages ? `: ${pageRange(r.pages)}` : ""}.`;
      break;
    case "chapter":
      body = `"${endDot(r.title)}" In ${em(noDot(r.containerTitle ?? ""))}${r.editors?.length ? `, edited by ${joinList(r.editors.map((p) => `${p.given ?? ""} ${p.family}`.trim()), "and")}` : ""}${r.pages ? `, ${pageRange(r.pages)}` : ""}. ${r.place ? `${r.place}: ` : ""}${r.publisher ?? ""}${r.year ? `, ${r.year}` : ""}.`;
      break;
    case "website":
      body = `"${endDot(r.title)}" ${r.containerTitle ? `${r.containerTitle}. ` : ""}${r.year ? `${r.month ? `${MONTHS[r.month]} ` : ""}${r.day ? `${r.day}, ` : ""}${r.year}. ` : ""}`.trim();
      break;
    default:
      body = `${em(noDot(r.title))}.${r.edition ? ` ${r.edition} ed.` : ""} ${r.place ? `${r.place}: ` : ""}${r.publisher ?? ""}${r.year ? `, ${r.year}` : ""}.`;
  }
  const entry = `${au ? `${endDot(au)} ` : ""}${body}${link ? ` ${link}.` : ""}`.replace(/\s+/g, " ").replace(/\.\./g, ".").replace(/:\s*,/g, ",").trim();
  const inText = `(${inTextName(r.authors, "chicago") || noDot(r.title)} ${r.year ?? "n.d."}${r.pages && r.type !== "journal-article" ? `, ${r.pages}` : ""})`;
  return { entry, inText };
}

function harvard(r: Reference): { entry: string; inText: string } {
  const au = authorsHarvard(r.authors);
  const yr = `(${r.year ?? "n.d."})`;
  const link = doiUrl(r.doi) ?? r.url ?? "";
  let body: string;
  switch (r.type) {
    case "journal-article":
      body = `'${noDot(r.title)}', ${em(noDot(r.containerTitle ?? ""))}${r.volume ? `, ${r.volume}` : ""}${r.issue ? `(${r.issue})` : ""}${r.pages ? `, pp. ${pageRange(r.pages)}` : ""}.`;
      break;
    case "chapter":
      body = `'${noDot(r.title)}', in ${r.editors?.length ? `${authorsHarvard(r.editors)} (ed${r.editors.length > 1 ? "s" : ""}.) ` : ""}${em(noDot(r.containerTitle ?? ""))}. ${r.place ? `${r.place}: ` : ""}${r.publisher ?? ""}${r.pages ? `, pp. ${pageRange(r.pages)}` : ""}.`;
      break;
    case "website":
      body = `${em(noDot(r.title))}.${r.containerTitle ? ` ${r.containerTitle}.` : ""}`;
      break;
    default:
      body = `${em(noDot(r.title))}.${r.edition ? ` ${r.edition} edn.` : ""} ${r.place ? `${r.place}: ` : ""}${r.publisher ?? ""}.`;
  }
  const avail = link ? ` Available at: ${link}${r.accessed ? ` (Accessed: ${fmtAccessed(r.accessed, "harvard")})` : ""}.` : "";
  const entry = `${au ? `${au} ` : ""}${yr} ${body}${avail}`.replace(/\s+/g, " ").replace(/\.\./g, ".").replace(/:\s*\./g, ".").trim();
  const inText = `(${inTextName(r.authors, "harvard") || noDot(r.title)}, ${r.year ?? "n.d."})`;
  return { entry, inText };
}

function ieee(r: Reference): { entry: string; inText: string } {
  const au = authorsIeee(r.authors);
  const link = doiUrl(r.doi) ? ` doi: ${normDoi(r.doi)}.` : r.url ? ` [Online]. Available: ${r.url}` : "";
  let body: string;
  switch (r.type) {
    case "journal-article":
      body = `"${noDot(r.title)}," ${em(noDot(r.containerTitle ?? ""))}${r.volume ? `, vol. ${r.volume}` : ""}${r.issue ? `, no. ${r.issue}` : ""}${r.pages ? `, pp. ${pageRange(r.pages)}` : ""}${r.year ? `, ${r.month ? `${mon3(r.month)}. ` : ""}${r.year}` : ""}.`;
      break;
    case "conference-paper":
      body = `"${noDot(r.title)}," in ${em(noDot(r.containerTitle ?? ""))}${r.place ? `, ${r.place}` : ""}${r.year ? `, ${r.year}` : ""}${r.pages ? `, pp. ${pageRange(r.pages)}` : ""}.`;
      break;
    case "chapter":
      body = `"${noDot(r.title)}," in ${em(noDot(r.containerTitle ?? ""))}${r.editors?.length ? `, ${authorsIeee(r.editors)}, Ed${r.editors.length > 1 ? "s" : ""}.` : ""} ${r.place ? `${r.place}: ` : ""}${r.publisher ?? ""}${r.year ? `, ${r.year}` : ""}${r.pages ? `, pp. ${pageRange(r.pages)}` : ""}.`;
      break;
    case "website":
      body = `"${noDot(r.title)}." ${r.containerTitle ? `${r.containerTitle}. ` : ""}${r.accessed ? `Accessed: ${fmtAccessed(r.accessed, "ieee")}.` : ""}`.trim();
      break;
    default:
      body = `${em(noDot(r.title))}${r.edition ? `, ${r.edition} ed.` : ""} ${r.place ? `${r.place}: ` : ""}${r.publisher ?? ""}${r.year ? `, ${r.year}` : ""}.`;
  }
  const entry = `${au ? `${au}, ` : ""}${body}${link}`.replace(/\s+/g, " ").replace(/,\s*\./g, ".").trim();
  return { entry, inText: "[1]" };
}

function fmtAccessed(d: string, style: Style): string {
  const [y, m, dd] = d.split("-").map(Number);
  if (!y || !m || !dd) return d;
  if (style === "mla") return `${dd} ${mon3(m)}. ${y}`;
  if (style === "ieee") return `${mon3(m)}. ${dd}, ${y}`;
  return `${dd} ${MONTHS[m]} ${y}`;
}

export interface Formatted { text: string; markdown: string; html: string; inText: string }

function finish(entry: string, inText: string): Formatted {
  const clean = entry.replace(/\s+/g, " ").trim();
  return {
    text: clean.replace(/[\u0001\u0002]/g, ""),
    markdown: clean.replace(/\u0001/g, "*").replace(/\u0002/g, "*"),
    html: clean.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!)).replace(/\u0001/g, "<i>").replace(/\u0002/g, "</i>"),
    inText,
  };
}

export function format(r: Reference, style: Style): Formatted {
  const ref = { ...r, authors: r.authors.filter((a) => a.family?.trim()) };
  const f = { apa, mla, chicago, harvard, ieee }[style](ref);
  return finish(f.entry, f.inText);
}

export function formatAll(r: Reference): Record<Style, Formatted> {
  return Object.fromEntries(STYLES.map((s) => [s, format(r, s)])) as Record<Style, Formatted>;
}

/** Hints the model can pass on (sentence case, missing fields). */
export function tips(r: Reference): string[] {
  const t: string[] = [];
  if (!r.authors.length) t.push("No author given — the title moves to the author position.");
  if (!r.year) t.push("No year — cited as n.d.");
  if (r.type === "journal-article" && !r.doi) t.push("No DOI — add one if the article has it; APA, Chicago and Harvard expect it.");
  if (r.type === "website" && !r.accessed) t.push("Add the date you accessed the page for MLA/Harvard.");
  return t;
}

// ─── BibTeX / RIS export ─────────────────────────────────────────────────────

const bibKey = (r: Reference, i: number) =>
  `${(r.authors[0]?.family ?? "ref").toLowerCase().replace(/[^a-z]/g, "") || "ref"}${r.year ?? ""}${String.fromCharCode(97 + (i % 26))}`;

export function toBibtex(refs: Reference[]): string {
  const typeMap: Record<RefType, string> = { "journal-article": "article", book: "book", chapter: "incollection", website: "misc", report: "techreport", thesis: "phdthesis", "conference-paper": "inproceedings", other: "misc" };
  const esc = (s: string) => s.replace(/[{}]/g, "").replace(/&/g, "\\&").replace(/%/g, "\\%");
  return refs.map((r, i) => {
    const f: Array<[string, string | undefined]> = [
      ["author", r.authors.map((a) => (a.given ? `${a.family}, ${a.given}` : a.family)).join(" and ") || undefined],
      ["editor", r.editors?.map((a) => (a.given ? `${a.family}, ${a.given}` : a.family)).join(" and ")],
      ["title", r.title],
      [r.type === "journal-article" ? "journal" : r.type === "chapter" || r.type === "conference-paper" ? "booktitle" : "howpublished", r.containerTitle],
      ["year", r.year?.toString()], ["month", r.month ? mon3(r.month).toLowerCase() : undefined],
      ["volume", r.volume], ["number", r.issue], ["pages", r.pages?.replace(/[-–]+/, "--")],
      ["publisher", r.publisher], ["address", r.place], ["edition", r.edition],
      ["doi", normDoi(r.doi)], ["url", r.url], ["urldate", r.accessed],
    ];
    return `@${typeMap[r.type]}{${bibKey(r, i)},\n${f.filter(([, v]) => v).map(([k, v]) => `  ${k} = {${esc(v!)}}`).join(",\n")}\n}`;
  }).join("\n\n") + "\n";
}

export function toRis(refs: Reference[]): string {
  const typeMap: Record<RefType, string> = { "journal-article": "JOUR", book: "BOOK", chapter: "CHAP", website: "ELEC", report: "RPRT", thesis: "THES", "conference-paper": "CONF", other: "GEN" };
  return refs.map((r) => {
    const lines = [`TY  - ${typeMap[r.type]}`];
    for (const a of r.authors) lines.push(`AU  - ${a.given ? `${a.family}, ${a.given}` : a.family}`);
    for (const a of r.editors ?? []) lines.push(`ED  - ${a.given ? `${a.family}, ${a.given}` : a.family}`);
    lines.push(`TI  - ${r.title}`);
    if (r.containerTitle) lines.push(`${r.type === "journal-article" ? "JO" : "T2"}  - ${r.containerTitle}`);
    if (r.year) lines.push(`PY  - ${r.year}${r.month ? `/${String(r.month).padStart(2, "0")}` : ""}${r.day ? `/${String(r.day).padStart(2, "0")}` : ""}`);
    if (r.volume) lines.push(`VL  - ${r.volume}`);
    if (r.issue) lines.push(`IS  - ${r.issue}`);
    if (r.pages) {
      const [sp, ep] = r.pages.split(/[-–]+/);
      lines.push(`SP  - ${sp.trim()}`);
      if (ep) lines.push(`EP  - ${ep.trim()}`);
    }
    if (r.publisher) lines.push(`PB  - ${r.publisher}`);
    if (r.place) lines.push(`CY  - ${r.place}`);
    if (normDoi(r.doi)) lines.push(`DO  - ${normDoi(r.doi)}`);
    if (r.url) lines.push(`UR  - ${r.url}`);
    if (r.accessed) lines.push(`Y2  - ${r.accessed.replace(/-/g, "/")}`);
    lines.push("ER  - ");
    return lines.join("\r\n");
  }).join("\r\n\r\n") + "\r\n";
}

// ─── Lookup (Crossref, OpenAlex fallback) ────────────────────────────────────

export type FetchLike = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

export interface Candidate {
  ref: Reference;
  score: number; // 0–1 similarity to the query
  source: "crossref" | "openalex";
  citedBy?: number;
}

export interface LookupOptions {
  fetchImpl?: FetchLike;
  mailto?: string;
  rows?: number;
  timeoutMs?: number;
}

function crossrefToRef(it: any): Reference {
  const typeMap: Record<string, RefType> = { "journal-article": "journal-article", book: "book", "book-chapter": "chapter", monograph: "book", "edited-book": "book", "proceedings-article": "conference-paper", report: "report", dissertation: "thesis", "posted-content": "other" };
  const date = it.issued?.["date-parts"]?.[0] ?? it.created?.["date-parts"]?.[0] ?? [];
  return {
    type: typeMap[it.type] ?? "other",
    authors: (it.author ?? []).map((a: any) => ({ family: a.family ?? a.name ?? "", given: a.given })).filter((a: Person) => a.family),
    editors: it.editor?.map((a: any) => ({ family: a.family ?? "", given: a.given })),
    title: (it.title?.[0] ?? "").replace(/\s+/g, " ").trim(),
    containerTitle: it["container-title"]?.[0],
    year: date[0], month: date[1], day: date[2],
    volume: it.volume, issue: it.issue, pages: it.page,
    publisher: it.publisher,
    doi: it.DOI,
    url: it.URL,
  };
}

function openalexToRef(it: any): Reference {
  const typeMap: Record<string, RefType> = { article: "journal-article", book: "book", "book-chapter": "chapter", dissertation: "thesis", report: "report", "proceedings-article": "conference-paper" };
  const d = (it.publication_date ?? "").split("-").map(Number);
  return {
    type: typeMap[it.type] ?? "other",
    authors: (it.authorships ?? []).map((a: any) => {
      const name: string = a.author?.display_name ?? "";
      const parts = name.trim().split(/\s+/);
      return { family: parts.pop() ?? "", given: parts.join(" ") || undefined };
    }).filter((a: Person) => a.family),
    title: (it.title ?? it.display_name ?? "").trim(),
    containerTitle: it.primary_location?.source?.display_name,
    year: d[0] || it.publication_year, month: d[1] || undefined, day: d[2] || undefined,
    volume: it.biblio?.volume, issue: it.biblio?.issue,
    pages: it.biblio?.first_page ? `${it.biblio.first_page}${it.biblio.last_page && it.biblio.last_page !== it.biblio.first_page ? `-${it.biblio.last_page}` : ""}` : undefined,
    doi: it.doi?.replace(/^https?:\/\/doi\.org\//, ""),
    url: it.primary_location?.landing_page_url ?? it.doi,
  };
}

const tokens = (s: string) => new Set(s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 2));
/**
 * Title similarity: Dice coefficient, or — when the record's title is fully
 * contained in the query (queries usually carry journal, year, pages too) —
 * the containment ratio. Short titles are penalized slightly so "Deep
 * learning" doesn't match every string that mentions deep learning.
 */
function dice(query: string, title: string): number {
  const A = tokens(query);
  const B = tokens(title);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const t of B) if (A.has(t)) hit++;
  const d = (2 * hit) / (A.size + B.size);
  const containment = (hit / B.size) * (B.size >= 3 ? 1 : 0.95);
  return Math.max(d, containment);
}

/** Extract the parts of a pasted reference we can check: year, DOI, surnames, likely title. */
export function parseReferenceString(s: string): { doi?: string; year?: number; surnames: string[]; title?: string } {
  const doi = s.match(/\b(10\.\d{4,9}\/[^\s"<>]+)/i)?.[1]?.replace(/[.,;)]+$/, "");
  const year = Number(s.match(/\b(19|20)\d{2}[a-z]?\b/)?.[0]?.slice(0, 4)) || undefined;
  const head = year ? s.slice(0, s.search(/\b(19|20)\d{2}[a-z]?\b/)) : s.slice(0, 80);
  const surnames = [...head.matchAll(/\b([A-Z][a-zA-Z'’-]{2,})\b(?=,|\s+[A-Z]\.|\s+and\b|\s+&)/g)].map((m) => m[1]).filter((w) => !/^(And|The|In|Et|Al)$/.test(w));
  const quoted = s.match(/[“"]([^”"]{10,})[”"]/)?.[1];
  const afterYear = year ? s.slice(s.search(/\b(19|20)\d{2}[a-z]?\b/) + 4).replace(/^[).:\s]+/, "") : undefined;
  const title = quoted ?? afterYear?.split(/[.?!]\s/)[0]?.trim();
  return { doi, year, surnames, title: title && title.length > 8 ? title : undefined };
}

export function scoreCandidate(query: ReturnType<typeof parseReferenceString> & { raw: string }, ref: Reference): number {
  if (query.doi && ref.doi && query.doi.toLowerCase() === ref.doi.toLowerCase()) return 1;
  const titleSim = query.title ? dice(query.title, ref.title) : dice(query.raw, ref.title) * 0.9;
  const yearOk = query.year && ref.year ? (query.year === ref.year ? 1 : Math.abs(query.year - ref.year) === 1 ? 0.6 : 0) : 0.5;
  const fam = ref.authors.map((a) => a.family.toLowerCase());
  const authOk = query.surnames.length ? query.surnames.filter((s) => fam.includes(s.toLowerCase())).length / query.surnames.length : 0.5;
  return Math.max(0, Math.min(1, titleSim * 0.65 + yearOk * 0.15 + authOk * 0.2));
}

export async function lookup(query: string, opts: LookupOptions = {}): Promise<{ candidates: Candidate[]; error?: string }> {
  const fetchImpl: FetchLike = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const rows = opts.rows ?? 5;
  const timeout = opts.timeoutMs ?? 8000;
  const parsed = { ...parseReferenceString(query), raw: query };
  const headers = { "User-Agent": `VerifiedCitations/1.0 (mailto:${opts.mailto ?? "hi@example.com"})`, Accept: "application/json" };
  const errors: string[] = [];

  // 1. Exact DOI.
  if (parsed.doi) {
    try {
      const res = await fetchImpl(`https://api.crossref.org/works/${encodeURIComponent(parsed.doi)}`, { headers, signal: AbortSignal.timeout(timeout) });
      if (res.ok) {
        const j = await res.json();
        const ref = crossrefToRef(j.message);
        return { candidates: [{ ref, score: 1, source: "crossref", citedBy: j.message["is-referenced-by-count"] }] };
      }
      if (res.status !== 404) errors.push(`Crossref DOI lookup HTTP ${res.status}`);
    } catch (e) {
      errors.push(`Crossref unreachable (${(e as Error).message})`);
    }
  }

  // 2. Crossref bibliographic search.
  try {
    const u = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=${rows}&select=DOI,title,author,editor,issued,created,container-title,volume,issue,page,publisher,type,URL,is-referenced-by-count${opts.mailto ? `&mailto=${encodeURIComponent(opts.mailto)}` : ""}`;
    const res = await fetchImpl(u, { headers, signal: AbortSignal.timeout(timeout) });
    if (res.ok) {
      const j = await res.json();
      const items: any[] = j.message?.items ?? [];
      const cands = items.map((it) => {
        const ref = crossrefToRef(it);
        return { ref, score: scoreCandidate(parsed, ref), source: "crossref" as const, citedBy: it["is-referenced-by-count"] };
      }).filter((c) => c.ref.title);
      cands.sort((a, b) => b.score - a.score);
      if (cands.length) return { candidates: cands };
    } else errors.push(`Crossref search HTTP ${res.status}`);
  } catch (e) {
    errors.push(`Crossref unreachable (${(e as Error).message})`);
  }

  // 3. OpenAlex fallback.
  try {
    const u = `https://api.openalex.org/works?search=${encodeURIComponent(parsed.title ?? query)}&per-page=${rows}${opts.mailto ? `&mailto=${encodeURIComponent(opts.mailto)}` : ""}`;
    const res = await fetchImpl(u, { headers, signal: AbortSignal.timeout(timeout) });
    if (res.ok) {
      const j = await res.json();
      const cands = (j.results ?? []).map((it: any) => {
        const ref = openalexToRef(it);
        return { ref, score: scoreCandidate(parsed, ref), source: "openalex" as const, citedBy: it.cited_by_count };
      }).filter((c: Candidate) => c.ref.title);
      cands.sort((a: Candidate, b: Candidate) => b.score - a.score);
      return { candidates: cands, ...(errors.length ? { error: errors.join("; ") } : {}) };
    }
    errors.push(`OpenAlex HTTP ${res.status}`);
  } catch (e) {
    errors.push(`OpenAlex unreachable (${(e as Error).message})`);
  }
  return { candidates: [], error: errors.join("; ") || "No results" };
}

export type VerifyStatus = "verified" | "likely" | "not_found" | "unavailable";

export function classify(score: number | undefined, error: string | undefined, hadCandidates: boolean): VerifyStatus {
  if (!hadCandidates && error) return "unavailable";
  if (score == null) return "not_found";
  if (score >= 0.78) return "verified";
  if (score >= 0.55) return "likely";
  return "not_found";
}
