import { DateTime } from "luxon";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// ─── Parsing ─────────────────────────────────────────────────────────────────

/** "8:30am", "08:30", "5pm", "17:15", "noon" → minutes since midnight. */
export function parseClock(input: string): number {
  const s = input.trim().toLowerCase().replace(/\s+/g, "");
  if (s === "noon") return 12 * 60;
  if (s === "midnight") return 0;
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?(am|pm|a|p)?$/);
  if (!m) throw new Error(`Can't read time "${input}". Use 8:30am, 08:30 or 17:15.`);
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3]?.[0];
  if (min > 59 || h > 24 || (ap && h > 12) || (ap && h === 0)) throw new Error(`Invalid time "${input}"`);
  if (ap === "p" && h !== 12) h += 12;
  if (ap === "a" && h === 12) h = 0;
  if (h === 24) h = 0;
  return h * 60 + min;
}

/** "7:45", "7.5", "1h 30m", "90m", "45 min", "2 hours" → minutes. */
export function parseDuration(input: string): number {
  const s = input.trim().toLowerCase();
  let m = s.match(/^(\d{1,3}):(\d{2})$/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  m = s.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)?$/);
  if (m) return Math.round(parseFloat(m[1]) * 60);
  m = s.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)$/);
  if (m) return Math.round(parseFloat(m[1]));
  m = s.match(/^(?:(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours))?\s*(?:(\d+)\s*(?:m|min|mins|minute|minutes))?$/);
  if (m && (m[1] || m[2])) return Math.round(parseFloat(m[1] ?? "0") * 60) + parseInt(m[2] ?? "0", 10);
  throw new Error(`Can't read duration "${input}". Use 7:45, 7.75, or 1h 30m.`);
}

export function fmtHM(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const a = Math.abs(Math.round(minutes));
  return `${sign}${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")}`;
}

export const toDecimal = (minutes: number) => Math.round((minutes / 60) * 100) / 100;

// ─── Timesheet ───────────────────────────────────────────────────────────────

export interface EntryInput {
  date: string; // YYYY-MM-DD
  in?: string;
  out?: string;
  breakMinutes?: number;
  hours?: number; // alternative to in/out
  note?: string;
}

export interface Rules {
  rounding: 0 | 5 | 6 | 10 | 15;
  weeklyOvertimeAfter: number; // hours, 0 = off
  dailyOvertimeAfter: number; // hours, 0 = off
  dailyDoubleAfter: number; // hours, 0 = off
  overtimeMultiplier: number;
  doubleMultiplier: number;
  weekStartsOn: "monday" | "sunday";
}

export const DEFAULT_RULES: Rules = {
  rounding: 0,
  weeklyOvertimeAfter: 40,
  dailyOvertimeAfter: 0,
  dailyDoubleAfter: 0,
  overtimeMultiplier: 1.5,
  doubleMultiplier: 2,
  weekStartsOn: "monday",
};

export interface DayRow {
  date: string;
  weekday: string;
  in: string;
  out: string;
  breakMinutes: number;
  minutes: number;
  regular: number;
  overtime: number;
  double: number;
  note?: string;
}

export interface WeekRow {
  weekStart: string;
  weekEnd: string;
  minutes: number;
  regular: number;
  overtime: number;
  double: number;
}

export interface TimesheetResult {
  days: DayRow[];
  weeks: WeekRow[];
  totals: { minutes: number; regular: number; overtime: number; double: number };
  pay?: { rate: number; currency: string; regular: number; overtime: number; double: number; gross: number };
}

function roundMinutes(min: number, step: number): number {
  if (!step) return min;
  return Math.round(min / step) * step;
}

export function calculateTimesheet(entries: EntryInput[], rulesIn: Partial<Rules> = {}, rate?: number, currency = "USD"): TimesheetResult {
  const rules: Rules = { ...DEFAULT_RULES, ...rulesIn };
  if (!entries.length) throw new Error("Add at least one entry");

  const days: DayRow[] = entries.map((e) => {
    const d = DateTime.fromISO(e.date, { zone: "UTC" });
    if (!d.isValid) throw new Error(`Invalid date "${e.date}" — use YYYY-MM-DD`);
    let minutes: number;
    let inStr = "";
    let outStr = "";
    const brk = Math.max(0, Math.round(e.breakMinutes ?? 0));
    if (e.hours != null) {
      minutes = Math.round(e.hours * 60) - brk;
      inStr = "—";
      outStr = "—";
    } else {
      if (!e.in || !e.out) throw new Error(`Entry for ${e.date} needs both "in" and "out" (or "hours")`);
      const a = parseClock(e.in);
      let b = parseClock(e.out);
      if (b <= a) b += 24 * 60; // overnight shift
      minutes = b - a - brk;
      inStr = fmtClock(a);
      outStr = fmtClock(b % (24 * 60)) + (b >= 24 * 60 ? " (+1)" : "");
    }
    if (minutes < 0) throw new Error(`Entry for ${e.date}: break is longer than the shift`);
    minutes = roundMinutes(minutes, rules.rounding);

    // Daily overtime / double time (e.g. California 8 / 12).
    let regular = minutes;
    let overtime = 0;
    let double = 0;
    if (rules.dailyOvertimeAfter > 0) {
      const otStart = rules.dailyOvertimeAfter * 60;
      const dtStart = rules.dailyDoubleAfter > 0 ? rules.dailyDoubleAfter * 60 : Infinity;
      regular = Math.min(minutes, otStart);
      overtime = Math.max(0, Math.min(minutes, dtStart) - otStart);
      double = Math.max(0, minutes - dtStart);
    }
    return { date: d.toISODate()!, weekday: d.toFormat("ccc"), in: inStr, out: outStr, breakMinutes: brk, minutes, regular, overtime, double, ...(e.note ? { note: e.note } : {}) };
  });

  days.sort((a, b) => a.date.localeCompare(b.date));

  // Weekly overtime: regular minutes beyond the threshold become overtime.
  const weeksMap = new Map<string, WeekRow>();
  for (const day of days) {
    const d = DateTime.fromISO(day.date, { zone: "UTC" });
    const start = rules.weekStartsOn === "sunday" ? d.minus({ days: d.weekday % 7 }) : d.startOf("week");
    const key = start.toISODate()!;
    let w = weeksMap.get(key);
    if (!w) {
      w = { weekStart: key, weekEnd: start.plus({ days: 6 }).toISODate()!, minutes: 0, regular: 0, overtime: 0, double: 0 };
      weeksMap.set(key, w);
    }
    if (rules.weeklyOvertimeAfter > 0) {
      const cap = rules.weeklyOvertimeAfter * 60;
      const room = Math.max(0, cap - w.regular);
      const shift = Math.max(0, day.regular - room);
      day.regular -= shift;
      day.overtime += shift;
    }
    w.minutes += day.minutes;
    w.regular += day.regular;
    w.overtime += day.overtime;
    w.double += day.double;
  }
  const weeks = [...weeksMap.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const totals = weeks.reduce(
    (t, w) => ({ minutes: t.minutes + w.minutes, regular: t.regular + w.regular, overtime: t.overtime + w.overtime, double: t.double + w.double }),
    { minutes: 0, regular: 0, overtime: 0, double: 0 },
  );
  const result: TimesheetResult = { days, weeks, totals };
  if (rate != null && rate > 0) {
    const r = (m: number, mult: number) => Math.round((m / 60) * rate * mult * 100) / 100;
    const regular = r(totals.regular, 1);
    const overtime = r(totals.overtime, rules.overtimeMultiplier);
    const double = r(totals.double, rules.doubleMultiplier);
    result.pay = { rate, currency, regular, overtime, double, gross: Math.round((regular + overtime + double) * 100) / 100 };
  }
  return result;
}

function fmtClock(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ap = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${ap}`;
}

export function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export interface SheetMeta {
  employeeName?: string;
  periodLabel?: string;
  company?: string;
}

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildCsv(r: TimesheetResult, meta: SheetMeta): string {
  const rows: unknown[][] = [];
  if (meta.employeeName) rows.push(["Employee", meta.employeeName]);
  if (meta.periodLabel) rows.push(["Period", meta.periodLabel]);
  if (rows.length) rows.push([]);
  rows.push(["Date", "Day", "In", "Out", "Break (min)", "Hours", "Regular", "Overtime", "Double", "Note"]);
  for (const d of r.days) rows.push([d.date, d.weekday, d.in, d.out, d.breakMinutes, toDecimal(d.minutes), toDecimal(d.regular), toDecimal(d.overtime), toDecimal(d.double), d.note ?? ""]);
  rows.push([]);
  rows.push(["Totals", "", "", "", "", toDecimal(r.totals.minutes), toDecimal(r.totals.regular), toDecimal(r.totals.overtime), toDecimal(r.totals.double), ""]);
  if (r.pay) {
    rows.push(["Rate", r.pay.rate], ["Regular pay", r.pay.regular], ["Overtime pay", r.pay.overtime], ["Double-time pay", r.pay.double], ["Gross pay", r.pay.gross]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export async function buildPdf(r: TimesheetResult, meta: SheetMeta): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageW = 612;
  const pageH = 792;
  const margin = 48;
  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;
  const gray = rgb(0.45, 0.45, 0.5);

  const text = (s: string, x: number, size = 10, f = font, color = rgb(0.1, 0.1, 0.12)) => page.drawText(s, { x, y, size, font: f, color });

  text("Timesheet", margin, 20, bold);
  y -= 18;
  const sub = [meta.company, meta.employeeName, meta.periodLabel].filter(Boolean).join("  ·  ");
  if (sub) { text(sub, margin, 11, font, gray); y -= 14; }
  text(`Generated ${DateTime.utc().toFormat("d LLL yyyy")}`, margin, 9, font, gray);
  y -= 24;

  const cols = [
    { k: "date", label: "Date", w: 70 },
    { k: "weekday", label: "Day", w: 36 },
    { k: "in", label: "In", w: 62 },
    { k: "out", label: "Out", w: 72 },
    { k: "break", label: "Break", w: 44, num: true },
    { k: "hours", label: "Hours", w: 50, num: true },
    { k: "regular", label: "Regular", w: 54, num: true },
    { k: "overtime", label: "OT", w: 46, num: true },
    { k: "double", label: "DT", w: 46, num: true },
  ];
  const header = () => {
    let x = margin;
    for (const c of cols) {
      page.drawText(c.label, { x: c.num ? x + c.w - bold.widthOfTextAtSize(c.label, 9) : x, y, size: 9, font: bold, color: gray });
      x += c.w + 6;
    }
    y -= 6;
    page.drawLine({ start: { x: margin, y }, end: { x: pageW - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.84) });
    y -= 12;
  };
  header();
  const row = (vals: Record<string, string>, f = font) => {
    if (y < margin + 60) {
      page = pdf.addPage([pageW, pageH]);
      y = pageH - margin;
      header();
    }
    let x = margin;
    for (const c of cols) {
      const v = vals[c.k] ?? "";
      const w = f.widthOfTextAtSize(v, 9);
      page.drawText(v, { x: c.num ? x + c.w - w : x, y, size: 9, font: f });
      x += c.w + 6;
    }
    y -= 14;
  };
  for (const d of r.days) {
    row({ date: d.date, weekday: d.weekday, in: d.in, out: d.out, break: d.breakMinutes ? `${d.breakMinutes}m` : "", hours: fmtHM(d.minutes), regular: fmtHM(d.regular), overtime: d.overtime ? fmtHM(d.overtime) : "", double: d.double ? fmtHM(d.double) : "" });
  }
  y -= 2;
  page.drawLine({ start: { x: margin, y: y + 10 }, end: { x: pageW - margin, y: y + 10 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.84) });
  row({ date: "Total", hours: fmtHM(r.totals.minutes), regular: fmtHM(r.totals.regular), overtime: fmtHM(r.totals.overtime), double: fmtHM(r.totals.double) }, bold);
  y -= 8;
  text(`Decimal hours: ${toDecimal(r.totals.minutes)} total · ${toDecimal(r.totals.regular)} regular · ${toDecimal(r.totals.overtime)} overtime · ${toDecimal(r.totals.double)} double`, margin, 9, font, gray);
  y -= 14;
  if (r.pay) {
    text(`Rate ${money(r.pay.rate, r.pay.currency)}/h  ·  Regular ${money(r.pay.regular, r.pay.currency)}  ·  Overtime ${money(r.pay.overtime, r.pay.currency)}  ·  Double ${money(r.pay.double, r.pay.currency)}`, margin, 9, font, gray);
    y -= 16;
    text(`Gross pay: ${money(r.pay.gross, r.pay.currency)}`, margin, 13, bold);
    y -= 20;
  }
  y -= 30;
  for (const label of ["Employee signature", "Approved by"]) {
    page.drawLine({ start: { x: margin, y }, end: { x: margin + 220, y }, thickness: 0.5 });
    page.drawText(label, { x: margin, y: y - 11, size: 8, font, color: gray });
    y -= 36;
  }
  return pdf.save();
}
