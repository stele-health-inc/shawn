import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCsv, buildPdf, calculateTimesheet, fmtHM, parseClock, parseDuration } from "../src/apps/timesheet/lib.js";

test("parseClock accepts common formats", () => {
  assert.equal(parseClock("8:30am"), 510);
  assert.equal(parseClock("5pm"), 1020);
  assert.equal(parseClock("17:15"), 1035);
  assert.equal(parseClock("12am"), 0);
  assert.equal(parseClock("12pm"), 720);
  assert.equal(parseClock("noon"), 720);
  assert.throws(() => parseClock("25:00"));
});

test("parseDuration accepts H:MM, decimal, and h/m forms", () => {
  assert.equal(parseDuration("7:45"), 465);
  assert.equal(parseDuration("7.5"), 450);
  assert.equal(parseDuration("1h 30m"), 90);
  assert.equal(parseDuration("90m"), 90);
  assert.equal(parseDuration("2 hours"), 120);
  assert.throws(() => parseDuration("abc"));
});

test("weekly overtime after 40 hours", () => {
  const entries = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"].map((date) => ({ date, in: "8:00", out: "17:30", breakMinutes: 30 }));
  const r = calculateTimesheet(entries, {}, 20);
  assert.equal(fmtHM(r.totals.minutes), "45:00");
  assert.equal(fmtHM(r.totals.regular), "40:00");
  assert.equal(fmtHM(r.totals.overtime), "5:00");
  assert.equal(r.pay?.gross, 40 * 20 + 5 * 30);
  assert.equal(r.weeks.length, 1);
});

test("California-style daily overtime and double time", () => {
  const r = calculateTimesheet([{ date: "2026-10-05", in: "9:00", out: "22:30", breakMinutes: 30 }], { dailyOvertimeAfter: 8, dailyDoubleAfter: 12 });
  assert.equal(fmtHM(r.totals.minutes), "13:00");
  assert.equal(fmtHM(r.totals.regular), "8:00");
  assert.equal(fmtHM(r.totals.overtime), "4:00");
  assert.equal(fmtHM(r.totals.double), "1:00");
});

test("overnight shifts, rounding and hours-only entries", () => {
  const night = calculateTimesheet([{ date: "2026-10-01", in: "10pm", out: "6am", breakMinutes: 30 }]);
  assert.equal(fmtHM(night.totals.minutes), "7:30");
  assert.equal(night.days[0].out, "6:00am (+1)");
  const rounded = calculateTimesheet([{ date: "2026-10-01", in: "8:00", out: "16:52" }], { rounding: 15 });
  assert.equal(fmtHM(rounded.totals.minutes), "8:45");
  const direct = calculateTimesheet([{ date: "2026-10-01", hours: 7.25 }]);
  assert.equal(fmtHM(direct.totals.minutes), "7:15");
  assert.throws(() => calculateTimesheet([{ date: "2026-10-01", in: "9:00", out: "9:30", breakMinutes: 60 }]), /break is longer/);
});

test("CSV and PDF exports build", async () => {
  const r = calculateTimesheet([{ date: "2026-10-01", in: "9:00", out: "17:00", note: 'said "hi", left' }], {}, 25);
  const csv = buildCsv(r, { employeeName: "Sam" });
  assert.match(csv, /^Employee,Sam/);
  assert.match(csv, /"said ""hi"", left"/);
  const pdf = await buildPdf(r, { employeeName: "Sam", periodLabel: "Oct" });
  assert.equal(Buffer.from(pdf.slice(0, 5)).toString(), "%PDF-");
});
