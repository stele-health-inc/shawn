import { createHash } from "node:crypto";
import { DateTime, Duration, type DurationLikeObject } from "luxon";

// ─── Time zones ──────────────────────────────────────────────────────────────

/** Common names/abbreviations people type → IANA zone. */
const ZONE_ALIASES: Record<string, string> = {
  utc: "UTC", gmt: "UTC", z: "UTC",
  est: "America/New_York", edt: "America/New_York", eastern: "America/New_York", et: "America/New_York",
  "new york": "America/New_York", nyc: "America/New_York", boston: "America/New_York", miami: "America/New_York",
  toronto: "America/Toronto", montreal: "America/Toronto", atlanta: "America/New_York", "washington": "America/New_York",
  cst: "America/Chicago", cdt: "America/Chicago", central: "America/Chicago", ct: "America/Chicago",
  chicago: "America/Chicago", dallas: "America/Chicago", houston: "America/Chicago", austin: "America/Chicago",
  mst: "America/Denver", mdt: "America/Denver", mountain: "America/Denver", mt: "America/Denver", denver: "America/Denver",
  phoenix: "America/Phoenix", arizona: "America/Phoenix",
  pst: "America/Los_Angeles", pdt: "America/Los_Angeles", pacific: "America/Los_Angeles", pt: "America/Los_Angeles",
  "los angeles": "America/Los_Angeles", la: "America/Los_Angeles", "san francisco": "America/Los_Angeles", sf: "America/Los_Angeles",
  seattle: "America/Los_Angeles", vancouver: "America/Vancouver", "san diego": "America/Los_Angeles",
  anchorage: "America/Anchorage", hawaii: "Pacific/Honolulu", honolulu: "Pacific/Honolulu", hst: "Pacific/Honolulu",
  "mexico city": "America/Mexico_City", bogota: "America/Bogota", lima: "America/Lima", santiago: "America/Santiago",
  "buenos aires": "America/Argentina/Buenos_Aires", "sao paulo": "America/Sao_Paulo", "são paulo": "America/Sao_Paulo",
  brt: "America/Sao_Paulo",
  london: "Europe/London", bst: "Europe/London", uk: "Europe/London", dublin: "Europe/Dublin", lisbon: "Europe/Lisbon",
  cet: "Europe/Paris", cest: "Europe/Paris", paris: "Europe/Paris", berlin: "Europe/Berlin", madrid: "Europe/Madrid",
  rome: "Europe/Rome", amsterdam: "Europe/Amsterdam", brussels: "Europe/Brussels", zurich: "Europe/Zurich",
  vienna: "Europe/Vienna", stockholm: "Europe/Stockholm", oslo: "Europe/Oslo", copenhagen: "Europe/Copenhagen",
  warsaw: "Europe/Warsaw", prague: "Europe/Prague", eet: "Europe/Athens", athens: "Europe/Athens", helsinki: "Europe/Helsinki",
  kyiv: "Europe/Kyiv", kiev: "Europe/Kyiv", istanbul: "Europe/Istanbul", moscow: "Europe/Moscow", msk: "Europe/Moscow",
  cairo: "Africa/Cairo", johannesburg: "Africa/Johannesburg", sast: "Africa/Johannesburg", lagos: "Africa/Lagos", nairobi: "Africa/Nairobi",
  dubai: "Asia/Dubai", gst: "Asia/Dubai", riyadh: "Asia/Riyadh", "tel aviv": "Asia/Jerusalem", jerusalem: "Asia/Jerusalem",
  tehran: "Asia/Tehran", karachi: "Asia/Karachi", pkt: "Asia/Karachi",
  ist: "Asia/Kolkata", india: "Asia/Kolkata", mumbai: "Asia/Kolkata", delhi: "Asia/Kolkata", bangalore: "Asia/Kolkata",
  bengaluru: "Asia/Kolkata", hyderabad: "Asia/Kolkata", chennai: "Asia/Kolkata", kolkata: "Asia/Kolkata", pune: "Asia/Kolkata",
  dhaka: "Asia/Dhaka", bangkok: "Asia/Bangkok", ict: "Asia/Bangkok", jakarta: "Asia/Jakarta", wib: "Asia/Jakarta",
  "ho chi minh": "Asia/Ho_Chi_Minh", hanoi: "Asia/Ho_Chi_Minh", manila: "Asia/Manila", pht: "Asia/Manila",
  singapore: "Asia/Singapore", sgt: "Asia/Singapore", "kuala lumpur": "Asia/Kuala_Lumpur", "hong kong": "Asia/Hong_Kong",
  hkt: "Asia/Hong_Kong", shanghai: "Asia/Shanghai", beijing: "Asia/Shanghai", china: "Asia/Shanghai", taipei: "Asia/Taipei",
  seoul: "Asia/Seoul", kst: "Asia/Seoul", tokyo: "Asia/Tokyo", jst: "Asia/Tokyo", japan: "Asia/Tokyo",
  perth: "Australia/Perth", awst: "Australia/Perth", adelaide: "Australia/Adelaide", brisbane: "Australia/Brisbane",
  sydney: "Australia/Sydney", aest: "Australia/Sydney", aedt: "Australia/Sydney", melbourne: "Australia/Melbourne",
  canberra: "Australia/Sydney", auckland: "Pacific/Auckland", nzst: "Pacific/Auckland", nzdt: "Pacific/Auckland",
  "new zealand": "Pacific/Auckland",
};

/** Resolve "PST", "Bangalore", "Europe/Paris" or "UTC+5:30" to a valid IANA zone (or fixed offset). */
export function resolveZone(input: string): string {
  const raw = input.trim();
  if (!raw) throw new Error("time zone is required");
  // Aliases first: ICU accepts legacy ids like "PST" but reports them verbatim.
  const key = raw.toLowerCase().replace(/[_]/g, " ").replace(/\s+/g, " ");
  const alias = ZONE_ALIASES[key];
  if (alias) return alias;
  if (DateTime.now().setZone(raw).isValid) return DateTime.now().setZone(raw).zoneName!;
  const m = raw.match(/^(?:utc|gmt)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i);
  if (m) {
    const mins = m[3] ? `:${m[3]}` : "";
    return `UTC${m[1]}${parseInt(m[2], 10)}${mins}`;
  }
  throw new Error(`Unknown time zone "${input}". Use an IANA name like America/New_York, a city like "Berlin", or an abbreviation like PST.`);
}

export function parseLocal(dateTime: string, zone: string): DateTime {
  const dt = DateTime.fromISO(dateTime, { zone, setZone: true });
  if (!dt.isValid) throw new Error(`Invalid date/time "${dateTime}": ${dt.invalidExplanation ?? dt.invalidReason}. Use ISO format like 2026-10-09T14:30.`);
  return dt;
}

export function parseDate(date: string): DateTime {
  const dt = DateTime.fromISO(date, { zone: "UTC" });
  if (!dt.isValid) throw new Error(`Invalid date "${date}": use YYYY-MM-DD.`);
  return dt.startOf("day");
}

// ─── ICS ─────────────────────────────────────────────────────────────────────

export interface Recurrence {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number;
  count?: number;
  until?: string; // YYYY-MM-DD
  byDay?: Array<"MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU">;
}

export interface EventInput {
  title: string;
  start: string; // ISO local, e.g. 2026-10-09T14:30 (or YYYY-MM-DD when allDay)
  end?: string;
  durationMinutes?: number;
  timeZone: string; // IANA
  allDay?: boolean;
  location?: string;
  description?: string;
  url?: string;
  attendees?: string[];
  organizerEmail?: string;
  reminderMinutes?: number;
  recurrence?: Recurrence;
}

export interface ResolvedEvent extends EventInput {
  startDt: DateTime;
  endDt: DateTime;
  uid: string;
  rrule?: string;
}

function icsEscape(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 §3.1: lines longer than 75 octets are folded with CRLF + space. */
function fold(line: string): string {
  const out: string[] = [];
  let buf = "";
  let bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch, "utf8");
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(buf);
      buf = "";
      bytes = 0;
    }
    buf += ch;
    bytes += b;
  }
  out.push(buf);
  return out.join("\r\n ");
}

const utcStamp = (d: DateTime) => d.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
const dateStamp = (d: DateTime) => d.toFormat("yyyyLLdd");

export function buildRrule(r: Recurrence | undefined): string | undefined {
  if (!r) return undefined;
  const parts = [`FREQ=${r.frequency.toUpperCase()}`];
  if (r.interval && r.interval > 1) parts.push(`INTERVAL=${Math.round(r.interval)}`);
  if (r.count) parts.push(`COUNT=${Math.round(r.count)}`);
  if (r.until) parts.push(`UNTIL=${dateStamp(parseDate(r.until))}T235959Z`);
  if (r.byDay?.length) parts.push(`BYDAY=${r.byDay.join(",")}`);
  return parts.join(";");
}

export function resolveEvent(e: EventInput): ResolvedEvent {
  const zone = resolveZone(e.timeZone);
  if (!e.title.trim()) throw new Error("title is required");
  let startDt: DateTime;
  let endDt: DateTime;
  if (e.allDay) {
    startDt = parseDate(e.start.slice(0, 10)).setZone(zone, { keepLocalTime: true });
    endDt = e.end ? parseDate(e.end.slice(0, 10)).setZone(zone, { keepLocalTime: true }).plus({ days: 1 }) : startDt.plus({ days: 1 });
  } else {
    startDt = parseLocal(e.start, zone);
    if (e.end) endDt = parseLocal(e.end, zone);
    else endDt = startDt.plus({ minutes: e.durationMinutes ?? 60 });
  }
  if (endDt <= startDt) throw new Error("end must be after start");
  const uid = `${createHash("sha1").update(`${e.title}|${startDt.toISO()}|${zone}`).digest("hex").slice(0, 20)}@chatgpt-apps`;
  return { ...e, timeZone: zone, startDt, endDt, uid, rrule: buildRrule(e.recurrence) };
}

export function buildIcs(ev: ResolvedEvent): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Calendar Invite Maker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}`,
    `DTSTAMP:${utcStamp(DateTime.utc())}`,
  ];
  if (ev.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${dateStamp(ev.startDt)}`, `DTEND;VALUE=DATE:${dateStamp(ev.endDt)}`);
  } else {
    // UTC timestamps import correctly everywhere; no VTIMEZONE block needed.
    lines.push(`DTSTART:${utcStamp(ev.startDt)}`, `DTEND:${utcStamp(ev.endDt)}`);
  }
  lines.push(`SUMMARY:${icsEscape(ev.title)}`);
  if (ev.location) lines.push(`LOCATION:${icsEscape(ev.location)}`);
  if (ev.description) lines.push(`DESCRIPTION:${icsEscape(ev.description)}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  if (ev.rrule) lines.push(`RRULE:${ev.rrule}`);
  if (ev.organizerEmail) lines.push(`ORGANIZER;CN=${icsEscape(ev.organizerEmail)}:mailto:${ev.organizerEmail}`);
  for (const a of ev.attendees ?? []) lines.push(`ATTENDEE;RSVP=TRUE:mailto:${a.trim()}`);
  if (ev.reminderMinutes != null && ev.reminderMinutes >= 0) {
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(ev.title)}`, `TRIGGER:-PT${Math.round(ev.reminderMinutes)}M`, "END:VALARM");
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(ev: ResolvedEvent): string {
  const p = new URLSearchParams({ action: "TEMPLATE", text: ev.title });
  p.set("dates", ev.allDay ? `${dateStamp(ev.startDt)}/${dateStamp(ev.endDt)}` : `${utcStamp(ev.startDt)}/${utcStamp(ev.endDt)}`);
  if (!ev.allDay) p.set("ctz", ev.timeZone);
  if (ev.description) p.set("details", ev.description);
  if (ev.location) p.set("location", ev.location);
  if (ev.rrule) p.set("recur", `RRULE:${ev.rrule}`);
  if (ev.attendees?.length) p.set("add", ev.attendees.join(","));
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function outlookUrl(ev: ResolvedEvent, host: "outlook.live.com" | "outlook.office.com"): string {
  const p = new URLSearchParams({ path: "/calendar/action/compose", rru: "addevent", subject: ev.title });
  const fmt = (d: DateTime) => (ev.allDay ? d.toFormat("yyyy-LL-dd") : d.toUTC().toISO({ suppressMilliseconds: true })!);
  p.set("startdt", fmt(ev.startDt));
  p.set("enddt", fmt(ev.endDt));
  if (ev.allDay) p.set("allday", "true");
  if (ev.description) p.set("body", ev.description);
  if (ev.location) p.set("location", ev.location);
  return `https://${host}/calendar/0/action/compose?${p.toString()}`;
}

export function describeRecurrence(r: Recurrence | undefined): string | undefined {
  if (!r) return undefined;
  const n = r.interval && r.interval > 1 ? `every ${r.interval} ${r.frequency.replace("ly", "").replace("dai", "day")}s` : { daily: "daily", weekly: "weekly", monthly: "monthly", yearly: "yearly" }[r.frequency];
  const days = r.byDay?.length ? ` on ${r.byDay.map((d) => ({ MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat", SU: "Sun" })[d]).join("/")}` : "";
  const end = r.count ? `, ${r.count} times` : r.until ? `, until ${r.until}` : "";
  return `Repeats ${n}${days}${end}`;
}

// ─── Date math ───────────────────────────────────────────────────────────────

export type Unit = "days" | "business_days" | "weeks" | "months" | "years";

export interface DateMathOptions {
  holidays?: string[]; // YYYY-MM-DD
  weekendDays?: number[]; // 1=Mon … 7=Sun (luxon)
}

function isWorkday(d: DateTime, opts: DateMathOptions, holidaySet: Set<string>): boolean {
  const weekend = opts.weekendDays ?? [6, 7];
  return !weekend.includes(d.weekday) && !holidaySet.has(d.toISODate()!);
}

export function addToDate(date: string, amount: number, unit: Unit, opts: DateMathOptions = {}): { result: DateTime; skipped: number } {
  const start = parseDate(date);
  if (!Number.isFinite(amount)) throw new Error("amount must be a number");
  if (unit !== "business_days") {
    const key = unit as keyof DurationLikeObject;
    return { result: start.plus({ [key]: amount } as DurationLikeObject), skipped: 0 };
  }
  const holidaySet = new Set((opts.holidays ?? []).map((h) => parseDate(h).toISODate()!));
  let d = start;
  let remaining = Math.abs(Math.round(amount));
  const step = amount >= 0 ? 1 : -1;
  let skipped = 0;
  while (remaining > 0) {
    d = d.plus({ days: step });
    if (isWorkday(d, opts, holidaySet)) remaining--;
    else skipped++;
  }
  return { result: d, skipped };
}

export function dateDifference(from: string, to: string, opts: DateMathOptions = {}) {
  const a = parseDate(from);
  const b = parseDate(to);
  const sign = b >= a ? 1 : -1;
  const [lo, hi] = sign === 1 ? [a, b] : [b, a];
  const totalDays = Math.round(hi.diff(lo, "days").days);
  const ymd = hi.diff(lo, ["years", "months", "days"]).toObject();
  const holidaySet = new Set((opts.holidays ?? []).map((h) => parseDate(h).toISODate()!));
  let business = 0;
  for (let d = lo.plus({ days: 1 }); d <= hi; d = d.plus({ days: 1 })) if (isWorkday(d, opts, holidaySet)) business++;
  return {
    sign,
    totalDays: totalDays * sign,
    weeks: Math.floor(totalDays / 7) * sign,
    remainderDays: (totalDays % 7) * sign,
    years: Math.round(ymd.years ?? 0) * sign,
    months: Math.round(ymd.months ?? 0) * sign,
    days: Math.round(ymd.days ?? 0) * sign,
    businessDays: business * sign,
  };
}

export const WEEKDAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ─── Time zone conversion & meeting planner ─────────────────────────────────

export interface ZoneRow {
  zone: string;
  label: string;
  localTime: string; // ISO
  display: string; // "Fri 9 Oct, 14:30"
  abbreviation: string;
  offset: string; // "UTC+5:30"
  dayDelta: number; // -1, 0, +1 relative to source date
}

export function zoneRow(dt: DateTime, zone: string, sourceDay: string, label?: string): ZoneRow {
  const local = dt.setZone(zone);
  const delta = Math.round(local.startOf("day").diff(DateTime.fromISO(sourceDay, { zone }).startOf("day"), "days").days);
  return {
    zone,
    label: label ?? zone,
    localTime: local.toISO({ suppressMilliseconds: true })!,
    display: local.toFormat("ccc d LLL, HH:mm"),
    abbreviation: local.toFormat("ZZZZ"),
    offset: `UTC${local.toFormat("Z")}`,
    dayDelta: delta,
  };
}

export function convertTime(time: string, fromZoneInput: string, toZoneInputs: string[]) {
  const fromZone = resolveZone(fromZoneInput);
  const dt = parseLocal(time, fromZone);
  const sourceDay = dt.toISODate()!;
  const rows = [zoneRow(dt, fromZone, sourceDay, fromZoneInput.trim()), ...toZoneInputs.map((z) => zoneRow(dt, resolveZone(z), sourceDay, z.trim()))];
  return { source: rows[0], rows: rows.slice(1), utc: dt.toUTC().toISO({ suppressMilliseconds: true })! };
}

export interface MeetingSlot {
  startUtc: string;
  score: number; // 1 = everyone fully inside working hours
  rows: ZoneRow[];
}

export function findMeetingTimes(
  zoneInputs: string[],
  date: string,
  durationMinutes = 60,
  workStart = 9,
  workEnd = 17,
  maxResults = 6,
): { slots: MeetingSlot[]; zones: string[] } {
  if (zoneInputs.length < 2) throw new Error("Provide at least two time zones");
  const zones = zoneInputs.map(resolveZone);
  const day = parseDate(date);
  const anchor = DateTime.fromISO(day.toISODate()!, { zone: zones[0] }).startOf("day").toUTC();
  const slots: MeetingSlot[] = [];
  for (let m = 0; m < 24 * 60; m += 30) {
    const start = anchor.plus({ minutes: m });
    const end = start.plus({ minutes: durationMinutes });
    let score = 0;
    let anyOutside = false;
    for (const z of zones) {
      const s = start.setZone(z);
      const e = end.setZone(z);
      const sh = s.hour + s.minute / 60;
      const eh = e.hour + e.minute / 60 + (e.toISODate() !== s.toISODate() ? 24 : 0);
      const inside = sh >= workStart && eh <= workEnd;
      const tolerable = sh >= workStart - 2 && eh <= workEnd + 2;
      if (inside) score += 1;
      else if (tolerable) score += 0.5;
      else anyOutside = true;
    }
    if (anyOutside) continue;
    slots.push({ startUtc: start.toISO({ suppressMilliseconds: true })!, score: score / zones.length, rows: zones.map((z, i) => zoneRow(start, z, day.toISODate()!, zoneInputs[i].trim())) });
  }
  slots.sort((a, b) => b.score - a.score || a.startUtc.localeCompare(b.startUtc));
  return { slots: slots.slice(0, maxResults), zones };
}

export function humanDuration(minutes: number): string {
  const d = Duration.fromObject({ minutes }).shiftTo("hours", "minutes").toObject();
  const h = Math.round(d.hours ?? 0);
  const m = Math.round(d.minutes ?? 0);
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ") || "0 min";
}
