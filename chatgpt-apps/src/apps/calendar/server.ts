import { z } from "zod";
import { DateTime } from "luxon";
import { defineApp } from "../../kit/app.js";
import { READ_ONLY, fail, ok, registerWidget, uiToolMeta } from "../../kit/meta.js";
import { widgetHtml } from "../../kit/widget.js";
import { safeFilename } from "../../kit/files.js";
import {
  type EventInput,
  WEEKDAYS,
  addToDate,
  buildIcs,
  convertTime,
  dateDifference,
  describeRecurrence,
  findMeetingTimes,
  googleCalendarUrl,
  humanDuration,
  outlookUrl,
  parseDate,
  resolveEvent,
  resolveZone,
} from "./lib.js";

const WIDGET_URI = "ui://calendar-invite-maker/calendar-v1.html";

const zoneRowSchema = z.object({
  zone: z.string(), label: z.string(), localTime: z.string(), display: z.string(),
  abbreviation: z.string(), offset: z.string(), dayDelta: z.number(),
});

export const calendarApp = defineApp({
  slug: "calendar",
  name: "Calendar Invite & Date Math",
  version: "1.0.0",
  subtitle: "Invites, date math, time zones",
  category: "PRODUCTIVITY",
  description:
    "Turns a plan into a real calendar entry — a downloadable .ics file plus one-tap Google Calendar and Outlook links, no account connection needed — and does exact date arithmetic (business days, deadlines, day-of-week), time-zone conversion and cross-time-zone meeting planning.",
  files: {
    ics: (p: EventInput) => {
      const ev = resolveEvent(p);
      return { body: buildIcs(ev), contentType: "text/calendar; charset=utf-8", filename: safeFilename(ev.title, "ics") };
    },
  },
  samples: [
    { tool: "create_calendar_invite", args: { title: "Dentist", start: "2026-10-09T14:30", durationMinutes: 45, timeZone: "New York", location: "12 Main St", reminderMinutes: 30 } },
    { tool: "create_calendar_invite", args: { title: "Team standup", start: "2026-10-12T09:00", end: "2026-10-12T09:15", timeZone: "Europe/Berlin", recurrence: { frequency: "weekly", byDay: ["MO", "WE", "FR"], count: 12 }, attendees: ["a@example.com"] } },
    { tool: "create_calendar_invite", args: { title: "Rent due", start: "2026-11-01", allDay: true, timeZone: "UTC", recurrence: { frequency: "monthly" } } },
    { tool: "calculate_date", args: { operation: "add", date: "2026-10-02", amount: 90, unit: "business_days", holidays: ["2026-11-26", "2026-12-25"] } },
    { tool: "calculate_date", args: { operation: "difference", date: "2026-10-02", secondDate: "2027-04-15" } },
    { tool: "calculate_date", args: { operation: "weekday", date: "2000-02-29" } },
    { tool: "convert_time_zones", args: { time: "2026-10-09T14:30", fromZone: "PST", toZones: ["London", "Bangalore", "Tokyo"] } },
    { tool: "find_meeting_times", args: { zones: ["New York", "London", "Bangalore"], date: "2026-10-13", durationMinutes: 30 } },
    { tool: "create_calendar_invite", args: { title: "Bad", start: "2026-13-45T10:00", timeZone: "UTC" }, expectError: true },
  ],
  register(server, ctx) {
    registerWidget(server, {
      uri: WIDGET_URI,
      name: "Calendar & date widget",
      html: widgetHtml("calendar"),
      description: "Shows the event card with Add-to-Google/Outlook buttons and the .ics download, or the date/time-zone result table. Do not repeat the links or the table.",
    });

    server.registerTool(
      "create_calendar_invite",
      {
        title: "Create calendar invite (.ics)",
        description:
          "Use this when the user wants to put something on a calendar or send an invite — e.g. \"add this to my calendar\", \"make a calendar invite for Friday 2pm\", \"create an .ics for the team offsite\", \"remind me every Monday at 9\". Returns a downloadable .ics file plus Add-to-Google-Calendar and Outlook links that work without connecting any account. Supports recurrence, reminders, attendees and all-day events. Ask for the time zone if it isn't clear from context.",
        inputSchema: {
          title: z.string().min(1).max(200),
          start: z.string().describe("Local start as ISO 8601, e.g. 2026-10-09T14:30 (YYYY-MM-DD for all-day)"),
          end: z.string().optional().describe("Local end as ISO 8601. Omit to use durationMinutes."),
          durationMinutes: z.number().int().min(1).max(10080).optional().describe("Length when end is omitted (default 60)"),
          timeZone: z.string().describe("IANA zone (America/New_York), city (\"Berlin\") or abbreviation (PST)"),
          allDay: z.boolean().optional(),
          location: z.string().max(300).optional(),
          description: z.string().max(2000).optional().describe("Notes / agenda shown in the event body"),
          url: z.string().url().optional().describe("Meeting link or related URL"),
          attendees: z.array(z.string().email()).max(50).optional().describe("Attendee email addresses"),
          organizerEmail: z.string().email().optional(),
          reminderMinutes: z.number().int().min(0).max(40320).optional().describe("Alert N minutes before start"),
          recurrence: z.object({
            frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
            interval: z.number().int().min(1).max(99).optional().describe("Every N periods (default 1)"),
            count: z.number().int().min(1).max(999).optional().describe("Stop after N occurrences"),
            until: z.string().optional().describe("Stop after this date, YYYY-MM-DD"),
            byDay: z.array(z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"])).optional().describe("Weekdays for weekly rules"),
          }).optional(),
        },
        outputSchema: {
          view: z.literal("event"),
          title: z.string(),
          startLocal: z.string(), endLocal: z.string(),
          startDisplay: z.string().describe("e.g. Fri 9 Oct 2026, 14:30–15:15 EDT"),
          timeZone: z.string(), allDay: z.boolean(), duration: z.string(),
          location: z.string().optional(), recurrence: z.string().optional(),
          reminder: z.string().optional(), attendees: z.array(z.string()).optional(),
          downloads: z.object({ ics: z.string().url() }),
          links: z.object({ google: z.string().url(), outlook: z.string().url(), office365: z.string().url() }),
        },
        annotations: READ_ONLY,
        _meta: uiToolMeta(WIDGET_URI, { invoking: "Building your calendar invite", invoked: "Calendar invite ready" }),
      },
      async (input) => {
        try {
          const ev = resolveEvent(input as EventInput);
          const payload: EventInput = { ...(input as EventInput), timeZone: ev.timeZone };
          const sameDay = ev.startDt.toISODate() === ev.endDt.minus({ minutes: ev.allDay ? 1 : 0 }).toISODate();
          const startDisplay = ev.allDay
            ? sameDay ? ev.startDt.toFormat("ccc d LLL yyyy") + " (all day)" : `${ev.startDt.toFormat("ccc d LLL")} – ${ev.endDt.minus({ days: 1 }).toFormat("ccc d LLL yyyy")} (all day)`
            : sameDay
              ? `${ev.startDt.toFormat("ccc d LLL yyyy, HH:mm")}–${ev.endDt.toFormat("HH:mm ZZZZ")}`
              : `${ev.startDt.toFormat("ccc d LLL yyyy, HH:mm")} – ${ev.endDt.toFormat("ccc d LLL yyyy, HH:mm ZZZZ")}`;
          const structured = {
            view: "event" as const,
            title: ev.title,
            startLocal: ev.startDt.toISO({ suppressMilliseconds: true, includeOffset: false })!,
            endLocal: ev.endDt.toISO({ suppressMilliseconds: true, includeOffset: false })!,
            startDisplay,
            timeZone: ev.timeZone,
            allDay: !!ev.allDay,
            duration: humanDuration(ev.endDt.diff(ev.startDt, "minutes").minutes),
            ...(ev.location ? { location: ev.location } : {}),
            ...(ev.recurrence ? { recurrence: describeRecurrence(ev.recurrence) } : {}),
            ...(ev.reminderMinutes != null ? { reminder: `${humanDuration(ev.reminderMinutes)} before` } : {}),
            ...(ev.attendees?.length ? { attendees: ev.attendees } : {}),
            downloads: { ics: ctx.fileUrl("ics", payload, safeFilename(ev.title, "ics")) },
            links: {
              google: googleCalendarUrl(ev),
              outlook: outlookUrl(ev, "outlook.live.com"),
              office365: outlookUrl(ev, "outlook.office.com"),
            },
          };
          return ok(
            `Invite ready: "${ev.title}" — ${startDisplay} (${ev.timeZone}). The widget has Add to Google Calendar / Outlook buttons and the .ics download (${structured.downloads.ics}). Confirm the details in one line; don't repeat the links.`,
            structured,
          );
        } catch (e) {
          return fail((e as Error).message);
        }
      },
    );

    server.registerTool(
      "calculate_date",
      {
        title: "Calculate a date",
        description:
          "Use this when the user needs exact date arithmetic — e.g. \"what date is 90 days from today\", \"45 business days after Oct 2\", \"how many days until April 15\", \"what day of the week was 29 Feb 2000\", \"deadline 6 weeks from Friday\". Counts calendar days, business days (skipping weekends and optional holidays), weeks, months or years. Always use this instead of counting in your head.",
        inputSchema: {
          operation: z.enum(["add", "subtract", "difference", "weekday"]).describe("add/subtract an amount, difference between two dates, or weekday of a date"),
          date: z.string().describe("Start date, YYYY-MM-DD. Use today's date from context when the user says 'today'."),
          amount: z.number().optional().describe("Amount to add/subtract"),
          unit: z.enum(["days", "business_days", "weeks", "months", "years"]).optional().describe("Unit for add/subtract (default days)"),
          secondDate: z.string().optional().describe("End date for difference, YYYY-MM-DD"),
          holidays: z.array(z.string()).max(100).optional().describe("Dates (YYYY-MM-DD) to skip when counting business days"),
        },
        outputSchema: {
          view: z.literal("date"),
          operation: z.string(),
          result: z.string().optional().describe("Resulting date, YYYY-MM-DD"),
          resultDisplay: z.string().optional(),
          weekday: z.string().optional(),
          explanation: z.string(),
          difference: z.object({
            totalDays: z.number(), weeks: z.number(), remainderDays: z.number(),
            years: z.number(), months: z.number(), days: z.number(), businessDays: z.number(),
          }).optional(),
          rows: z.array(z.object({ label: z.string(), value: z.string() })),
        },
        annotations: READ_ONLY,
        _meta: uiToolMeta(WIDGET_URI, { invoking: "Counting days", invoked: "Date calculated" }),
      },
      async ({ operation, date, amount, unit, secondDate, holidays }) => {
        try {
          const start = parseDate(date);
          const fmt = (d: DateTime) => d.toFormat("cccc, d LLLL yyyy");
          if (operation === "weekday") {
            const rows = [{ label: "Date", value: fmt(start) }, { label: "Day of week", value: WEEKDAYS[start.weekday] }, { label: "Day of year", value: String(start.ordinal) }, { label: "ISO week", value: `W${start.weekNumber} of ${start.weekYear}` }];
            const s = { view: "date" as const, operation, result: start.toISODate()!, resultDisplay: fmt(start), weekday: WEEKDAYS[start.weekday], explanation: `${start.toISODate()} is a ${WEEKDAYS[start.weekday]}.`, rows };
            return ok(s.explanation, s);
          }
          if (operation === "difference") {
            if (!secondDate) return fail("secondDate is required for difference");
            const end = parseDate(secondDate);
            const { sign: _sign, ...d } = dateDifference(date, secondDate, { holidays });
            const abs = Math.abs(d.totalDays);
            const explanation = `From ${start.toISODate()} to ${end.toISODate()} is ${abs} day${abs === 1 ? "" : "s"} (${Math.abs(d.weeks)} weeks and ${Math.abs(d.remainderDays)} days; ${Math.abs(d.years)}y ${Math.abs(d.months)}m ${Math.abs(d.days)}d), including ${Math.abs(d.businessDays)} business days${holidays?.length ? ` after skipping ${holidays.length} holiday(s)` : ""}.`;
            const rows = [
              { label: "From", value: fmt(start) }, { label: "To", value: fmt(end) },
              { label: "Calendar days", value: String(abs) }, { label: "Weeks + days", value: `${Math.abs(d.weeks)} w ${Math.abs(d.remainderDays)} d` },
              { label: "Years / months / days", value: `${Math.abs(d.years)} y ${Math.abs(d.months)} m ${Math.abs(d.days)} d` },
              { label: "Business days", value: String(Math.abs(d.businessDays)) },
            ];
            return ok(explanation, { view: "date" as const, operation, explanation, difference: d, rows });
          }
          if (amount == null) return fail("amount is required for add/subtract");
          const u = unit ?? "days";
          const signed = operation === "subtract" ? -amount : amount;
          const { result, skipped } = addToDate(date, signed, u, { holidays });
          const unitLabel = u.replace("_", " ");
          const explanation = `${start.toISODate()} ${operation === "subtract" ? "minus" : "plus"} ${Math.abs(amount)} ${unitLabel} is ${result.toISODate()} (${WEEKDAYS[result.weekday]})${u === "business_days" ? `, skipping ${skipped} weekend/holiday day${skipped === 1 ? "" : "s"}` : ""}.`;
          const rows = [{ label: "Start", value: fmt(start) }, { label: `${operation === "subtract" ? "−" : "+"} ${Math.abs(amount)} ${unitLabel}`, value: "" }, { label: "Result", value: fmt(result) }];
          if (u === "business_days") rows.push({ label: "Non-working days skipped", value: String(skipped) });
          return ok(explanation, { view: "date" as const, operation, result: result.toISODate()!, resultDisplay: fmt(result), weekday: WEEKDAYS[result.weekday], explanation, rows });
        } catch (e) {
          return fail((e as Error).message);
        }
      },
    );

    server.registerTool(
      "convert_time_zones",
      {
        title: "Convert time zones",
        description:
          "Use this when the user asks what a time is in other time zones — e.g. \"what's 2pm PST in London and Bangalore\", \"convert 09:00 Berlin time to EST\", \"if it's 5pm in Tokyo what time is it in New York\". Handles daylight-saving correctly by date. Not for finding a meeting slot (use find_meeting_times).",
        inputSchema: {
          time: z.string().describe("Local date-time in the source zone, ISO 8601 e.g. 2026-10-09T14:00. Include the date — DST depends on it."),
          fromZone: z.string().describe("Source zone: IANA name, city or abbreviation"),
          toZones: z.array(z.string()).min(1).max(12).describe("Target zones"),
        },
        outputSchema: {
          view: z.literal("zones"),
          source: zoneRowSchema,
          rows: z.array(zoneRowSchema),
          utc: z.string(),
          summary: z.string(),
        },
        annotations: READ_ONLY,
        _meta: uiToolMeta(WIDGET_URI, { invoking: "Converting time zones", invoked: "Times converted" }),
      },
      async ({ time, fromZone, toZones }) => {
        try {
          const r = convertTime(time, fromZone, toZones);
          const summary = `${r.source.display} ${r.source.abbreviation} (${r.source.label}) = ` + r.rows.map((x) => `${x.display} ${x.abbreviation} in ${x.label}${x.dayDelta ? ` (${x.dayDelta > 0 ? "next" : "previous"} day)` : ""}`).join("; ");
          return ok(summary, { view: "zones" as const, ...r, summary });
        } catch (e) {
          return fail((e as Error).message);
        }
      },
    );

    server.registerTool(
      "find_meeting_times",
      {
        title: "Find meeting times across time zones",
        description:
          "Use this when the user needs a meeting slot that works for people in different time zones — e.g. \"best time for a call between New York, London and Bangalore\", \"when can my US and Australian teams meet\", \"find a 30-minute slot that's business hours for everyone\". Ranks slots where everyone is inside (or close to) working hours.",
        inputSchema: {
          zones: z.array(z.string()).min(2).max(10).describe("Participants' zones: IANA names, cities or abbreviations"),
          date: z.string().describe("Day to search, YYYY-MM-DD (in the first zone)"),
          durationMinutes: z.number().int().min(15).max(480).optional().describe("Meeting length (default 60)"),
          workStart: z.number().min(0).max(23).optional().describe("Working day starts at this hour (default 9)"),
          workEnd: z.number().min(1).max(24).optional().describe("Working day ends at this hour (default 17)"),
        },
        outputSchema: {
          view: z.literal("slots"),
          date: z.string(),
          durationMinutes: z.number(),
          zones: z.array(z.string()),
          slots: z.array(z.object({ startUtc: z.string(), score: z.number(), rows: z.array(zoneRowSchema) })),
          summary: z.string(),
        },
        annotations: READ_ONLY,
        _meta: uiToolMeta(WIDGET_URI, { invoking: "Comparing working hours", invoked: "Meeting slots found" }),
      },
      async ({ zones, date, durationMinutes, workStart, workEnd }) => {
        try {
          const dur = durationMinutes ?? 60;
          const r = findMeetingTimes(zones, date, dur, workStart ?? 9, workEnd ?? 17);
          const summary = r.slots.length
            ? `Best ${humanDuration(dur)} slots on ${date}: ` + r.slots.slice(0, 3).map((s) => s.rows.map((x) => `${x.display.split(", ")[1]} ${x.label}`).join(" / ")).join(" · ") + (r.slots[0].score < 1 ? " (some participants slightly outside 9–5)" : "")
            : `No slot on ${date} keeps everyone within ${workStart ?? 9}:00–${workEnd ?? 17}:00 ±2h. Try a different day, shorter meeting, or widen working hours.`;
          return ok(summary, { view: "slots" as const, date, durationMinutes: dur, zones: zones.map((z) => resolveZone(z)), slots: r.slots, summary });
        } catch (e) {
          return fail((e as Error).message);
        }
      },
    );
  },
});
