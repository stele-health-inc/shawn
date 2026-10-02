import { z } from "zod";
import { defineApp } from "../../kit/app.js";
import { READ_ONLY, fail, ok, registerWidget, uiToolMeta } from "../../kit/meta.js";
import { widgetHtml } from "../../kit/widget.js";
import { safeFilename } from "../../kit/files.js";
import {
  type EntryInput,
  type Rules,
  type SheetMeta,
  buildCsv,
  buildPdf,
  calculateTimesheet,
  fmtHM,
  money,
  parseDuration,
  toDecimal,
} from "./lib.js";

const WIDGET_URI = "ui://timesheet-calculator/timesheet-v1.html";

interface FilePayload { entries: EntryInput[]; rules: Partial<Rules>; rate?: number; currency: string; meta: SheetMeta }

const rulesInput = z.object({
  rounding: z.union([z.literal(0), z.literal(5), z.literal(6), z.literal(10), z.literal(15)]).optional()
    .describe("Round each shift to the nearest N minutes (0 = exact; 15 = quarter-hour rounding)"),
  weeklyOvertimeAfter: z.number().min(0).max(168).optional().describe("Overtime after this many hours per week (default 40; 0 disables)"),
  dailyOvertimeAfter: z.number().min(0).max(24).optional().describe("Daily overtime after N hours (e.g. 8 in California; default off)"),
  dailyDoubleAfter: z.number().min(0).max(24).optional().describe("Double time after N hours in a day (e.g. 12 in California; default off)"),
  overtimeMultiplier: z.number().min(1).max(3).optional().describe("Default 1.5"),
  doubleMultiplier: z.number().min(1).max(4).optional().describe("Default 2"),
  weekStartsOn: z.enum(["monday", "sunday"]).optional().describe("Default monday"),
});

export const timesheetApp = defineApp({
  slug: "timesheet",
  name: "Timesheet & Overtime Calculator",
  version: "1.0.0",
  subtitle: "Hours, overtime & pay",
  category: "BUSINESS",
  description:
    "Adds up work hours from clock-in/clock-out times with breaks, overnight shifts and rounding, applies weekly and daily overtime rules, computes gross pay, and exports a printable PDF timesheet or CSV. Exact arithmetic every time.",
  files: {
    csv: (p: FilePayload) => ({ body: buildCsv(calculateTimesheet(p.entries, p.rules, p.rate, p.currency), p.meta), contentType: "text/csv; charset=utf-8", filename: safeFilename(`timesheet-${p.meta.periodLabel ?? p.meta.employeeName ?? "export"}`, "csv") }),
    pdf: async (p: FilePayload) => ({ body: Buffer.from(await buildPdf(calculateTimesheet(p.entries, p.rules, p.rate, p.currency), p.meta)), contentType: "application/pdf", filename: safeFilename(`timesheet-${p.meta.periodLabel ?? p.meta.employeeName ?? "export"}`, "pdf") }),
  },
  samples: [
    {
      tool: "calculate_timesheet",
      args: {
        employeeName: "Sam Rivera", periodLabel: "Week of Sep 28, 2026", hourlyRate: 22.5,
        entries: [
          { date: "2026-09-28", in: "8:00am", out: "5:30pm", breakMinutes: 30 },
          { date: "2026-09-29", in: "8:00", out: "18:15", breakMinutes: 45 },
          { date: "2026-09-30", in: "7:45am", out: "4:15pm", breakMinutes: 30 },
          { date: "2026-10-01", in: "10pm", out: "6am", breakMinutes: 30, note: "night shift" },
          { date: "2026-10-02", in: "8:00am", out: "7:00pm", breakMinutes: 60 },
        ],
        rules: { rounding: 15 },
      },
    },
    { tool: "calculate_timesheet", args: { entries: [{ date: "2026-10-05", in: "9:00", out: "22:00", breakMinutes: 30 }], rules: { dailyOvertimeAfter: 8, dailyDoubleAfter: 12 }, hourlyRate: 30 } },
    { tool: "add_hours", args: { durations: ["7:45", "8:15", "1h 30m", "90m", "7.5"] } },
    { tool: "add_hours", args: { durations: ["abc"] }, expectError: true },
  ],
  register(server, ctx) {
    registerWidget(server, {
      uri: WIDGET_URI,
      name: "Timesheet widget",
      html: widgetHtml("timesheet"),
      description: "Shows the day-by-day hours table, regular/overtime totals, gross pay and PDF/CSV download buttons. Summarize totals in one sentence; don't repeat the table.",
    });

    server.registerTool(
      "calculate_timesheet",
      {
        title: "Calculate timesheet hours & overtime",
        description:
          "Use this when the user wants to total work hours or pay from clock-in/clock-out times — e.g. \"add up my hours this week\", \"timesheet calculator with lunch breaks\", \"how much overtime did I work\", \"make a timesheet for my employee\", \"I worked 8-5 Mon-Fri with 30 min lunch at $20/hr\". Handles breaks, overnight shifts, quarter-hour rounding, weekly (40h) and daily (8/12h) overtime rules, and produces a printable PDF and CSV. Not for pay stubs or tax withholding.",
        inputSchema: {
          entries: z.array(z.object({
            date: z.string().describe("YYYY-MM-DD"),
            in: z.string().optional().describe("Clock-in time, e.g. 8:30am or 08:30"),
            out: z.string().optional().describe("Clock-out time; may be earlier than 'in' for overnight shifts"),
            breakMinutes: z.number().min(0).max(600).optional().describe("Unpaid break minutes to subtract"),
            hours: z.number().min(0).max(24).optional().describe("Hours worked, if the user gives totals instead of times"),
            note: z.string().max(80).optional(),
          })).min(1).max(62).describe("One entry per shift"),
          hourlyRate: z.number().min(0).max(100000).optional().describe("Base pay rate per hour (omit to show hours only)"),
          currency: z.string().length(3).optional().describe("ISO currency code, default USD"),
          rules: rulesInput.optional(),
          employeeName: z.string().max(80).optional(),
          periodLabel: z.string().max(80).optional().describe("e.g. \"Week of Sep 28\" or \"October 2026\""),
          company: z.string().max(80).optional(),
        },
        outputSchema: {
          days: z.array(z.object({
            date: z.string(), weekday: z.string(), in: z.string(), out: z.string(), breakMinutes: z.number(),
            hours: z.string(), hoursDecimal: z.number(), regular: z.string(), overtime: z.string(), double: z.string(), note: z.string().optional(),
          })),
          weeks: z.array(z.object({ weekStart: z.string(), weekEnd: z.string(), hours: z.string(), regular: z.string(), overtime: z.string(), double: z.string() })),
          totals: z.object({ hours: z.string(), hoursDecimal: z.number(), regular: z.string(), overtime: z.string(), double: z.string(), overtimeDecimal: z.number() }),
          pay: z.object({ rate: z.string(), regular: z.string(), overtime: z.string(), double: z.string(), gross: z.string(), grossNumber: z.number(), currency: z.string() }).optional(),
          rulesApplied: z.string(),
          employeeName: z.string().optional(),
          periodLabel: z.string().optional(),
          downloads: z.object({ pdf: z.string().url(), csv: z.string().url() }),
        },
        annotations: READ_ONLY,
        _meta: uiToolMeta(WIDGET_URI, { invoking: "Adding up hours", invoked: "Timesheet ready" }),
      },
      async ({ entries, hourlyRate, currency, rules, employeeName, periodLabel, company }) => {
        try {
          const cur = (currency ?? "USD").toUpperCase();
          const r = calculateTimesheet(entries, rules ?? {}, hourlyRate, cur);
          const meta: SheetMeta = { employeeName, periodLabel, company };
          const payload: FilePayload = { entries, rules: rules ?? {}, rate: hourlyRate, currency: cur, meta };
          const ruleBits = [
            rules?.weeklyOvertimeAfter === 0 ? "no weekly overtime" : `overtime after ${rules?.weeklyOvertimeAfter ?? 40} h/week`,
            rules?.dailyOvertimeAfter ? `daily overtime after ${rules.dailyOvertimeAfter} h` : "",
            rules?.dailyDoubleAfter ? `double time after ${rules.dailyDoubleAfter} h/day` : "",
            rules?.rounding ? `rounded to ${rules.rounding} min` : "exact minutes",
            `overtime ×${rules?.overtimeMultiplier ?? 1.5}`,
          ].filter(Boolean).join(", ");
          const structured = {
            days: r.days.map((d) => ({ date: d.date, weekday: d.weekday, in: d.in, out: d.out, breakMinutes: d.breakMinutes, hours: fmtHM(d.minutes), hoursDecimal: toDecimal(d.minutes), regular: fmtHM(d.regular), overtime: fmtHM(d.overtime), double: fmtHM(d.double), ...(d.note ? { note: d.note } : {}) })),
            weeks: r.weeks.map((w) => ({ weekStart: w.weekStart, weekEnd: w.weekEnd, hours: fmtHM(w.minutes), regular: fmtHM(w.regular), overtime: fmtHM(w.overtime), double: fmtHM(w.double) })),
            totals: { hours: fmtHM(r.totals.minutes), hoursDecimal: toDecimal(r.totals.minutes), regular: fmtHM(r.totals.regular), overtime: fmtHM(r.totals.overtime), double: fmtHM(r.totals.double), overtimeDecimal: toDecimal(r.totals.overtime) },
            ...(r.pay ? { pay: { rate: money(r.pay.rate, cur), regular: money(r.pay.regular, cur), overtime: money(r.pay.overtime, cur), double: money(r.pay.double, cur), gross: money(r.pay.gross, cur), grossNumber: r.pay.gross, currency: cur } } : {}),
            rulesApplied: ruleBits,
            ...(employeeName ? { employeeName } : {}),
            ...(periodLabel ? { periodLabel } : {}),
            downloads: {
              pdf: ctx.fileUrl("pdf", payload, "timesheet.pdf"),
              csv: ctx.fileUrl("csv", payload, "timesheet.csv"),
            },
          };
          const text = `Total ${structured.totals.hours} (${structured.totals.hoursDecimal} h): ${structured.totals.regular} regular, ${structured.totals.overtime} overtime${r.totals.double ? `, ${structured.totals.double} double time` : ""}${r.pay ? `; gross pay ${money(r.pay.gross, cur)} at ${money(r.pay.rate, cur)}/h` : ""}. Rules: ${ruleBits}. The widget shows the table and the PDF/CSV buttons (PDF: ${structured.downloads.pdf}).`;
          return ok(text, structured);
        } catch (e) {
          return fail((e as Error).message);
        }
      },
    );

    server.registerTool(
      "add_hours",
      {
        title: "Add up hours and minutes",
        description:
          "Use this when the user wants to add, total or convert durations — e.g. \"add 7:45 + 8:15 + 6:30\", \"what's 1h 30m plus 45 minutes\", \"convert 7:45 to decimal hours\", \"total these hours\". Accepts H:MM, decimal hours (7.5), and \"1h 30m\" forms; returns H:MM and decimal totals. Not for clock-in/out shifts (use calculate_timesheet).",
        inputSchema: {
          durations: z.array(z.string()).min(1).max(200).describe("Durations as typed, e.g. [\"7:45\", \"8.25\", \"1h 30m\", \"90m\"]"),
        },
        outputSchema: {
          items: z.array(z.object({ input: z.string(), hm: z.string(), decimal: z.number(), minutes: z.number() })),
          total: z.object({ hm: z.string(), decimal: z.number(), minutes: z.number() }),
          summary: z.string(),
        },
        annotations: READ_ONLY,
        _meta: uiToolMeta(WIDGET_URI, { invoking: "Adding durations", invoked: "Total calculated" }),
      },
      async ({ durations }) => {
        try {
          const items = durations.map((d) => {
            const minutes = parseDuration(d);
            return { input: d, hm: fmtHM(minutes), decimal: toDecimal(minutes), minutes };
          });
          const minutes = items.reduce((a, b) => a + b.minutes, 0);
          const total = { hm: fmtHM(minutes), decimal: toDecimal(minutes), minutes };
          const summary = `${items.map((i) => i.hm).join(" + ")} = ${total.hm} (${total.decimal} hours, ${minutes} minutes)`;
          return ok(summary, { items, total, summary });
        } catch (e) {
          return fail((e as Error).message);
        }
      },
    );
  },
});
