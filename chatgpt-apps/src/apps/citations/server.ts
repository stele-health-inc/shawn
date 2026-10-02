import { z } from "zod";
import { defineApp } from "../../kit/app.js";
import { READ_ONLY, READ_ONLY_OPEN_WORLD, fail, ok, registerWidget, uiToolMeta } from "../../kit/meta.js";
import { widgetHtml } from "../../kit/widget.js";
import { safeFilename } from "../../kit/files.js";
import {
  type Reference,
  type Style,
  STYLES,
  STYLE_LABEL,
  classify,
  format,
  formatAll,
  lookup,
  tips,
  toBibtex,
  toRis,
} from "./lib.js";

const WIDGET_URI = "ui://verified-citations/citations-v1.html";
const MAILTO = process.env.CONTACT_EMAIL;

const personSchema = z.object({ family: z.string().min(1).describe("Surname"), given: z.string().optional().describe("Given name(s) or initials") });
const referenceSchema = z.object({
  type: z.enum(["journal-article", "book", "chapter", "website", "report", "thesis", "conference-paper", "other"]),
  authors: z.array(personSchema).max(50).describe("In the order printed; empty array if none"),
  editors: z.array(personSchema).max(20).optional(),
  title: z.string().min(1).describe("Article / chapter / page / book title"),
  containerTitle: z.string().optional().describe("Journal, book (for chapters), website or conference name"),
  year: z.number().int().min(1000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
  volume: z.string().optional(), issue: z.string().optional(), pages: z.string().optional().describe("e.g. 12-34"),
  publisher: z.string().optional(), place: z.string().optional().describe("Publisher city"), edition: z.string().optional().describe("e.g. 2nd"),
  doi: z.string().optional(), url: z.string().optional(),
  accessed: z.string().optional().describe("Date accessed, YYYY-MM-DD (websites)"),
});
const formattedSchema = z.object({ text: z.string(), markdown: z.string(), html: z.string(), inText: z.string() });
const allStylesSchema = z.object({ apa: formattedSchema, mla: formattedSchema, chicago: formattedSchema, harvard: formattedSchema, ieee: formattedSchema });
const styleEnum = z.enum(["apa", "mla", "chicago", "harvard", "ieee"]);

const refOut = (r: Reference) => ({
  type: r.type, authors: r.authors, title: r.title,
  ...(r.containerTitle ? { containerTitle: r.containerTitle } : {}),
  ...(r.year ? { year: r.year } : {}), ...(r.volume ? { volume: r.volume } : {}), ...(r.issue ? { issue: r.issue } : {}),
  ...(r.pages ? { pages: r.pages } : {}), ...(r.publisher ? { publisher: r.publisher } : {}),
  ...(r.doi ? { doi: r.doi } : {}), ...(r.url ? { url: r.url } : {}),
});
const refOutSchema = z.object({
  type: z.string(), authors: z.array(personSchema), title: z.string(), containerTitle: z.string().optional(), year: z.number().optional(),
  volume: z.string().optional(), issue: z.string().optional(), pages: z.string().optional(), publisher: z.string().optional(), doi: z.string().optional(), url: z.string().optional(),
});

interface ExportPayload { refs: Reference[]; format: "bibtex" | "ris" | "txt"; style: Style }

export const citationsApp = defineApp({
  slug: "citations",
  name: "Verified Citations",
  version: "1.0.0",
  subtitle: "Checked APA/MLA citations",
  category: "EDUCATION",
  description:
    "Formats citations in APA 7, MLA 9, Chicago, Harvard and IEEE from real bibliographic data, looks papers up in Crossref and OpenAlex by title or DOI, flags references that don't exist, and exports BibTeX/RIS. Built to stop invented references: every lookup result links to a resolvable DOI.",
  files: {
    export: (p: ExportPayload) => {
      const body = p.format === "bibtex" ? toBibtex(p.refs) : p.format === "ris" ? toRis(p.refs) : p.refs.map((r) => format(r, p.style).text).sort().join("\n\n") + "\n";
      const ext = p.format === "bibtex" ? "bib" : p.format === "ris" ? "ris" : "txt";
      return { body, contentType: p.format === "ris" ? "application/x-research-info-systems" : "text/plain; charset=utf-8", filename: safeFilename("references", ext) };
    },
  },
  samples: [
    {
      tool: "format_citation",
      args: { style: "apa", reference: { type: "journal-article", authors: [{ family: "Vaswani", given: "Ashish" }, { family: "Shazeer", given: "Noam" }], title: "Attention is all you need", containerTitle: "Advances in Neural Information Processing Systems", year: 2017, volume: "30", pages: "5998-6008", url: "https://arxiv.org/abs/1706.03762" } },
    },
    { tool: "format_citation", args: { style: "mla", reference: { type: "book", authors: [{ family: "Kahneman", given: "Daniel" }], title: "Thinking, Fast and Slow", publisher: "Farrar, Straus and Giroux", place: "New York", year: 2011 } } },
    { tool: "lookup_reference", args: { query: "10.1038/nature14539", style: "apa" } },
    { tool: "verify_references", args: { references: ["LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. Nature, 521(7553), 436-444."], style: "apa" } },
    { tool: "export_bibliography", args: { format: "bibtex", references: [{ type: "journal-article", authors: [{ family: "LeCun", given: "Yann" }], title: "Deep learning", containerTitle: "Nature", year: 2015, volume: "521", issue: "7553", pages: "436-444", doi: "10.1038/nature14539" }] } },
    { tool: "format_citation", args: { style: "apa", reference: { type: "book", authors: [], title: "" } }, expectError: true },
  ],
  register(server, ctx) {
    registerWidget(server, {
      uri: WIDGET_URI,
      name: "Citations widget",
      html: widgetHtml("citations"),
      description: "Shows formatted citations with a style switcher, copy buttons, verification badges (verified / likely / not found) with DOI links, and export downloads. Don't repeat the full citations; summarize status.",
    });

    server.registerTool(
      "format_citation",
      {
        title: "Format a citation",
        description:
          "Use this when the user has the details of a source and wants it cited correctly — e.g. \"cite this in APA\", \"MLA citation for this book\", \"format this reference in Chicago style\", \"give me the in-text citation\". Produces the reference-list entry and in-text form in APA 7, MLA 9, Chicago 17, Harvard and IEEE from structured fields. If the user only has a title or DOI, use lookup_reference first so the details are real.",
        inputSchema: {
          reference: referenceSchema,
          style: styleEnum.describe("Primary style to show"),
        },
        outputSchema: {
          view: z.literal("citation"),
          style: styleEnum,
          entry: formattedSchema,
          styles: allStylesSchema,
          reference: refOutSchema,
          tips: z.array(z.string()),
        },
        annotations: READ_ONLY,
        _meta: uiToolMeta(WIDGET_URI, { invoking: "Formatting citation", invoked: "Citation formatted" }),
      },
      async ({ reference, style }) => {
        try {
          if (!reference.title.trim()) return fail("title is required");
          const styles = formatAll(reference as Reference);
          const structured = { view: "citation" as const, style, entry: styles[style], styles, reference: refOut(reference as Reference), tips: tips(reference as Reference) };
          return ok(`${STYLE_LABEL[style]} reference: ${styles[style].text}\nIn-text: ${styles[style].inText}${structured.tips.length ? `\nNotes: ${structured.tips.join(" ")}` : ""}\nThe widget shows all five styles with copy buttons.`, structured);
        } catch (e) {
          return fail((e as Error).message);
        }
      },
    );

    server.registerTool(
      "lookup_reference",
      {
        title: "Look up a paper or book",
        description:
          "Use this when the user wants a citation but only has a title, author/year, DOI or a half-remembered reference — e.g. \"cite the 2015 Nature deep learning paper by LeCun\", \"find the DOI for Attention Is All You Need\", \"APA citation for this DOI\", \"is this a real paper?\". Searches Crossref and OpenAlex (170M+ records) and returns real metadata with a resolvable DOI, formatted in the chosen style. Never invent a citation when this tool is available.",
        inputSchema: {
          query: z.string().min(3).max(500).describe("Title, DOI, or free-text reference"),
          style: styleEnum.optional().describe("Default apa"),
          rows: z.number().int().min(1).max(10).optional().describe("Max candidates (default 5)"),
        },
        outputSchema: {
          view: z.literal("lookup"),
          query: z.string(),
          style: styleEnum,
          candidates: z.array(z.object({ score: z.number(), source: z.string(), citedBy: z.number().optional(), reference: refOutSchema, entry: formattedSchema, styles: allStylesSchema })),
          error: z.string().optional(),
          summary: z.string(),
        },
        annotations: READ_ONLY_OPEN_WORLD,
        _meta: uiToolMeta(WIDGET_URI, { invoking: "Searching Crossref", invoked: "Lookup complete" }),
      },
      async ({ query, style, rows }) => {
        const st = style ?? "apa";
        const r = await lookup(query, { rows: rows ?? 5, mailto: MAILTO });
        const candidates = r.candidates.map((c) => ({ score: Math.round(c.score * 100) / 100, source: c.source, ...(c.citedBy != null ? { citedBy: c.citedBy } : {}), reference: refOut(c.ref), entry: format(c.ref, st), styles: formatAll(c.ref) }));
        const summary = candidates.length
          ? `Top match (${Math.round(candidates[0].score * 100)}% similar${candidates[0].citedBy != null ? `, cited ${candidates[0].citedBy} times` : ""}): ${candidates[0].entry.text}` + (candidates.length > 1 ? ` ${candidates.length - 1} other candidate(s) in the widget.` : "")
          : r.error ? `Lookup unavailable: ${r.error}. Tell the user the source could not be checked right now rather than guessing.` : `No records matched "${query}". The source may not exist, or the title may be wrong — ask the user for more details.`;
        return ok(summary, { view: "lookup" as const, query, style: st, candidates, ...(r.error ? { error: r.error } : {}), summary });
      },
    );

    server.registerTool(
      "verify_references",
      {
        title: "Verify a reference list",
        description:
          "Use this when the user pastes one or more references and wants to know whether they are real — e.g. \"are these citations real?\", \"check my bibliography\", \"verify these references exist\", \"did ChatGPT make these up?\". Each line is matched against Crossref/OpenAlex and labelled verified, likely, or not found, with the real DOI and a corrected citation. Also use it on any reference list you generate yourself before presenting it.",
        inputSchema: {
          references: z.array(z.string().min(5).max(1000)).min(1).max(40).describe("One reference per item, as the user pasted them"),
          style: styleEnum.optional().describe("Style for corrected citations (default apa)"),
        },
        outputSchema: {
          view: z.literal("verify"),
          style: styleEnum,
          results: z.array(z.object({
            input: z.string(),
            status: z.enum(["verified", "likely", "not_found", "unavailable"]),
            score: z.number().optional(),
            match: refOutSchema.optional(),
            corrected: formattedSchema.optional(),
            styles: allStylesSchema.optional(),
            note: z.string().optional(),
          })),
          counts: z.object({ verified: z.number(), likely: z.number(), not_found: z.number(), unavailable: z.number() }),
          summary: z.string(),
        },
        annotations: READ_ONLY_OPEN_WORLD,
        _meta: uiToolMeta(WIDGET_URI, { invoking: "Checking references against Crossref", invoked: "References checked" }),
      },
      async ({ references, style }) => {
        const st = style ?? "apa";
        const results = [];
        for (const input of references) {
          const r = await lookup(input, { rows: 3, mailto: MAILTO });
          const best = r.candidates[0];
          const status = classify(best?.score, r.error, r.candidates.length > 0);
          const note = status === "unavailable" ? `Could not reach the lookup service: ${r.error}` : status === "not_found" ? (best ? `Closest record is only ${Math.round(best.score * 100)}% similar: ${best.ref.title}` : "No similar record in Crossref or OpenAlex") : status === "likely" ? "Details differ slightly from the published record — check author list, year or pages" : undefined;
          results.push({
            input,
            status,
            ...(best ? { score: Math.round(best.score * 100) / 100 } : {}),
            ...(best && status !== "not_found" ? { match: refOut(best.ref), corrected: format(best.ref, st), styles: formatAll(best.ref) } : {}),
            ...(note ? { note } : {}),
          });
        }
        const counts = { verified: 0, likely: 0, not_found: 0, unavailable: 0 };
        for (const r of results) counts[r.status]++;
        const summary = `${results.length} reference(s): ${counts.verified} verified, ${counts.likely} likely, ${counts.not_found} not found${counts.unavailable ? `, ${counts.unavailable} could not be checked` : ""}.` +
          (counts.not_found ? " Not-found items may be fabricated or mis-typed — show the user which ones and do not present them as real." : "");
        return ok(`${summary} Details are in the widget.`, { view: "verify" as const, style: st, results, counts, summary });
      },
    );

    server.registerTool(
      "export_bibliography",
      {
        title: "Export bibliography (BibTeX / RIS / text)",
        description:
          "Use this when the user wants their references as a file for Zotero, Mendeley, EndNote, LaTeX or Word — e.g. \"export these as BibTeX\", \"give me a .bib file\", \"RIS file for EndNote\", \"download my works-cited list\". Takes structured references (from lookup_reference or format_citation results) and returns a download link.",
        inputSchema: {
          references: z.array(referenceSchema).min(1).max(200),
          format: z.enum(["bibtex", "ris", "txt"]),
          style: styleEnum.optional().describe("Style for txt export (default apa)"),
        },
        outputSchema: {
          view: z.literal("export"),
          format: z.string(),
          count: z.number(),
          download: z.string().url(),
          preview: z.string().describe("First part of the file"),
        },
        annotations: READ_ONLY,
        _meta: uiToolMeta(WIDGET_URI, { invoking: "Building export", invoked: "Export ready" }),
      },
      async ({ references, format: fmt, style }) => {
        try {
          const st = style ?? "apa";
          const payload: ExportPayload = { refs: references as Reference[], format: fmt, style: st };
          const file = citationsApp.files!.export(payload) as { body: string };
          const download = ctx.fileUrl("export", payload, "references");
          return ok(`${references.length} reference(s) exported as ${fmt.toUpperCase()}: ${download}`, { view: "export" as const, format: fmt, count: references.length, download, preview: file.body.slice(0, 1500) });
        } catch (e) {
          return fail((e as Error).message);
        }
      },
    );
  },
});

export { STYLES };
