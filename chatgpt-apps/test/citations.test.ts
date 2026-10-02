import { test } from "node:test";
import assert from "node:assert/strict";
import { type Reference, classify, format, lookup, parseReferenceString, scoreCandidate, toBibtex, toRis } from "../src/apps/citations/lib.js";

const article: Reference = {
  type: "journal-article",
  authors: [{ family: "LeCun", given: "Yann" }, { family: "Bengio", given: "Yoshua" }, { family: "Hinton", given: "Geoffrey" }],
  title: "Deep learning",
  containerTitle: "Nature",
  year: 2015, month: 5,
  volume: "521", issue: "7553", pages: "436-444",
  doi: "10.1038/nature14539",
};
const book: Reference = { type: "book", authors: [{ family: "Kahneman", given: "Daniel" }], title: "Thinking, Fast and Slow", publisher: "Farrar, Straus and Giroux", place: "New York", year: 2011 };

test("APA 7", () => {
  const f = format(article, "apa");
  assert.equal(f.text, "LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. Nature, 521(7553), 436–444. https://doi.org/10.1038/nature14539");
  assert.equal(f.markdown, "LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. *Nature*, *521*(7553), 436–444. https://doi.org/10.1038/nature14539");
  assert.equal(f.inText, "(LeCun et al., 2015)");
  assert.equal(format(book, "apa").text, "Kahneman, D. (2011). Thinking, Fast and Slow. Farrar, Straus and Giroux.");
});

test("MLA 9", () => {
  assert.equal(format(article, "mla").text, 'LeCun, Yann, et al. "Deep learning." Nature, vol. 521, no. 7553, May. 2015, pp. 436–444. https://doi.org/10.1038/nature14539.');
  assert.equal(format(book, "mla").text, "Kahneman, Daniel. Thinking, Fast and Slow. Farrar, Straus and Giroux, 2011.");
  assert.equal(format(book, "mla").inText, "(Kahneman)");
});

test("Chicago, Harvard, IEEE", () => {
  assert.equal(format(article, "chicago").text, 'LeCun, Yann, Yoshua Bengio, and Geoffrey Hinton. "Deep learning." Nature 521, no. 7553 (May 2015): 436–444. https://doi.org/10.1038/nature14539.');
  assert.equal(format(book, "chicago").text, "Kahneman, Daniel. Thinking, Fast and Slow. New York: Farrar, Straus and Giroux, 2011.");
  assert.equal(format(article, "harvard").text, "LeCun, Y., Bengio, Y. and Hinton, G. (2015) 'Deep learning', Nature, 521(7553), pp. 436–444. Available at: https://doi.org/10.1038/nature14539.");
  assert.equal(format(article, "ieee").text, 'Y. LeCun, Y. Bengio, and G. Hinton, "Deep learning," Nature, vol. 521, no. 7553, pp. 436–444, May. 2015. doi: 10.1038/nature14539.');
});

test("HTML output escapes and italicizes", () => {
  const f = format({ ...book, title: "A <b>bold</b> & brave title" }, "apa");
  assert.match(f.html, /<i>A &lt;b&gt;bold&lt;\/b&gt; &amp; brave title<\/i>/);
});

test("BibTeX and RIS export", () => {
  const bib = toBibtex([article, book]);
  assert.match(bib, /^@article\{lecun2015a,/);
  assert.match(bib, /author = \{LeCun, Yann and Bengio, Yoshua and Hinton, Geoffrey\}/);
  assert.match(bib, /pages = \{436--444\}/);
  assert.match(bib, /@book\{kahneman2011b,/);
  const ris = toRis([article]);
  assert.match(ris, /TY {2}- JOUR/);
  assert.match(ris, /SP {2}- 436\r\nEP {2}- 444/);
  assert.match(ris, /DO {2}- 10.1038\/nature14539/);
});

test("parseReferenceString pulls out year, DOI, surnames and title", () => {
  const p = parseReferenceString("LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. Nature, 521(7553), 436-444. https://doi.org/10.1038/nature14539");
  assert.equal(p.year, 2015);
  assert.equal(p.doi, "10.1038/nature14539");
  assert.deepEqual(p.surnames, ["LeCun", "Bengio", "Hinton"]);
  assert.equal(p.title, "Deep learning");
});

test("scoring and classification", () => {
  const q = { ...parseReferenceString("LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. Nature, 521, 436-444."), raw: "" };
  assert.ok(scoreCandidate(q, article) >= 0.78);
  const wrong: Reference = { ...article, title: "Gradient-based learning applied to document recognition", year: 1998, authors: [{ family: "LeCun" }] };
  assert.ok(scoreCandidate(q, wrong) < 0.55);
  assert.equal(classify(0.9, undefined, true), "verified");
  assert.equal(classify(0.6, undefined, true), "likely");
  assert.equal(classify(0.2, undefined, true), "not_found");
  assert.equal(classify(undefined, "boom", false), "unavailable");
});

test("lookup maps Crossref records and falls back cleanly", async () => {
  const crossref = { message: { items: [{ DOI: "10.1038/nature14539", type: "journal-article", title: ["Deep learning"], author: [{ family: "LeCun", given: "Yann" }, { family: "Bengio", given: "Yoshua" }, { family: "Hinton", given: "Geoffrey" }], "container-title": ["Nature"], issued: { "date-parts": [[2015, 5, 27]] }, volume: "521", issue: "7553", page: "436-444", publisher: "Springer", URL: "https://doi.org/10.1038/nature14539", "is-referenced-by-count": 50000 }] } };
  const fetchImpl = async (url: string) => ({ ok: url.includes("crossref"), status: url.includes("crossref") ? 200 : 500, json: async () => crossref });
  const r = await lookup("LeCun 2015 Deep learning Nature", { fetchImpl: fetchImpl as any });
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0].ref.doi, "10.1038/nature14539");
  assert.equal(r.candidates[0].citedBy, 50000);
  assert.ok(r.candidates[0].score >= 0.78);

  const dead = async () => { throw new Error("ECONNREFUSED"); };
  const r2 = await lookup("anything at all", { fetchImpl: dead as any });
  assert.equal(r2.candidates.length, 0);
  assert.match(r2.error!, /unreachable/);
});
