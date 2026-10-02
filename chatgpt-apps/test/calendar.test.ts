import { test } from "node:test";
import assert from "node:assert/strict";
import { addToDate, buildIcs, convertTime, dateDifference, findMeetingTimes, googleCalendarUrl, resolveEvent, resolveZone } from "../src/apps/calendar/lib.js";

test("resolveZone handles aliases, IANA names and offsets", () => {
  assert.equal(resolveZone("PST"), "America/Los_Angeles");
  assert.equal(resolveZone("Bangalore"), "Asia/Kolkata");
  assert.equal(resolveZone("Europe/Paris"), "Europe/Paris");
  assert.equal(resolveZone("UTC+5:30"), "UTC+5:30");
  assert.throws(() => resolveZone("Narnia"), /Unknown time zone/);
});

test("ICS uses UTC timestamps, escapes text and folds long lines", () => {
  const ev = resolveEvent({ title: "Dinner; with, friends", start: "2026-10-09T14:30", durationMinutes: 90, timeZone: "New York", description: "x".repeat(120), reminderMinutes: 15 });
  const ics = buildIcs(ev);
  assert.match(ics, /DTSTART:20261009T183000Z/); // EDT = UTC-4
  assert.match(ics, /DTEND:20261009T200000Z/);
  assert.match(ics, /SUMMARY:Dinner\\; with\\, friends/);
  assert.match(ics, /TRIGGER:-PT15M/);
  for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75, `line too long: ${line.length}`);
});

test("all-day and recurring events", () => {
  const ev = resolveEvent({ title: "Rent", start: "2026-11-01", allDay: true, timeZone: "UTC", recurrence: { frequency: "monthly", count: 12 } });
  const ics = buildIcs(ev);
  assert.match(ics, /DTSTART;VALUE=DATE:20261101/);
  assert.match(ics, /DTEND;VALUE=DATE:20261102/);
  assert.match(ics, /RRULE:FREQ=MONTHLY;COUNT=12/);
  assert.match(googleCalendarUrl(ev), /dates=20261101%2F20261102/);
});

test("business-day arithmetic skips weekends and holidays", () => {
  assert.equal(addToDate("2026-10-02", 1, "business_days").result.toISODate(), "2026-10-05"); // Fri → Mon
  assert.equal(addToDate("2026-10-02", 1, "business_days", { holidays: ["2026-10-05"] }).result.toISODate(), "2026-10-06");
  assert.equal(addToDate("2026-10-02", -1, "business_days").result.toISODate(), "2026-10-01");
  assert.equal(addToDate("2026-01-31", 1, "months").result.toISODate(), "2026-02-28");
});

test("date difference", () => {
  const d = dateDifference("2026-10-02", "2026-10-09");
  assert.equal(d.totalDays, 7);
  assert.equal(d.weeks, 1);
  assert.equal(d.businessDays, 5);
  assert.equal(dateDifference("2026-10-09", "2026-10-02").totalDays, -7);
});

test("time-zone conversion respects DST and day rollover", () => {
  const r = convertTime("2026-10-09T14:30", "PST", ["London", "Tokyo"]);
  assert.equal(r.rows[0].display, "Fri 9 Oct, 22:30");
  assert.equal(r.rows[0].dayDelta, 0);
  assert.equal(r.rows[1].display, "Sat 10 Oct, 06:30");
  assert.equal(r.rows[1].dayDelta, 1);
});

test("meeting finder returns slots inside working hours for everyone", () => {
  const r = findMeetingTimes(["New York", "London"], "2026-10-13", 60);
  assert.ok(r.slots.length > 0);
  for (const row of r.slots[0].rows) {
    const h = Number(row.display.split(", ")[1].slice(0, 2));
    assert.ok(h >= 9 && h < 17, `${row.label} at ${row.display}`);
  }
  assert.equal(findMeetingTimes(["Los_Angeles".replace("_", " "), "Tokyo"], "2026-10-13", 60, 9, 17).slots.every((s) => s.score < 1), true);
});
