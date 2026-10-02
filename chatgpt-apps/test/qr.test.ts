import { test } from "node:test";
import assert from "node:assert/strict";
import { describe, genericPayload, normalizeStyle, renderSvg, vcardPayload, wifiPayload } from "../src/apps/qr/lib.js";

test("generic payload auto-detects type", () => {
  assert.deepEqual(genericPayload("auto", "example.com/menu"), { type: "url", payload: "https://example.com/menu" });
  assert.deepEqual(genericPayload("auto", "hi@example.com"), { type: "email", payload: "mailto:hi@example.com" });
  assert.deepEqual(genericPayload("auto", "+1 (415) 555-0100"), { type: "phone", payload: "tel:+14155550100" });
  assert.deepEqual(genericPayload("auto", "just some words"), { type: "text", payload: "just some words" });
  assert.equal(genericPayload("email", "a@b.co", { subject: "Hi there", body: "x y" }).payload, "mailto:a@b.co?subject=Hi%20there&body=x%20y");
  assert.equal(genericPayload("geo", "37.77, -122.42").payload, "geo:37.77,-122.42");
  assert.throws(() => genericPayload("geo", "nope"));
});

test("Wi-Fi payload escapes special characters", () => {
  assert.equal(wifiPayload({ ssid: "Cafe;Net", password: 'p:w,d"1', encryption: "WPA" }), 'WIFI:T:WPA;S:Cafe\\;Net;P:p\\:w\\,d\\"1;;');
  assert.equal(wifiPayload({ ssid: "Open", encryption: "nopass", hidden: true }), "WIFI:T:nopass;S:Open;H:true;;");
  assert.throws(() => wifiPayload({ ssid: "X", encryption: "WPA" }), /password is required/);
});

test("vCard payload", () => {
  const v = vcardPayload({ firstName: "Ada", lastName: "Lovelace", organization: "Analytical, Inc", email: "ada@example.com" });
  assert.match(v, /^BEGIN:VCARD\r\nVERSION:3.0\r\nN:Lovelace;Ada;;;\r\nFN:Ada Lovelace\r\n/);
  assert.match(v, /ORG:Analytical\\, Inc/);
  assert.match(v, /END:VCARD$/);
});

test("style validation and rendering", async () => {
  assert.throws(() => normalizeStyle({ foreground: "red" }), /hex color/);
  const style = normalizeStyle({ size: 10 });
  assert.equal(style.size, 64);
  const svg = await renderSvg("https://example.com", style);
  assert.match(svg, /^<svg xmlns/);
  const info = describe("https://example.com", style);
  assert.equal(info.version, 2);
});
