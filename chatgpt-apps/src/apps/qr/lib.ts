import QRCode from "qrcode";

export type ErrorCorrection = "L" | "M" | "Q" | "H";

export interface QrStyle {
  size: number; // px, PNG only
  errorCorrection: ErrorCorrection;
  foreground: string; // hex
  background: string; // hex
  margin: number; // modules
}

export const DEFAULT_STYLE: QrStyle = {
  size: 512,
  errorCorrection: "M",
  foreground: "#000000",
  background: "#ffffff",
  margin: 2,
};

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeStyle(partial: Partial<QrStyle> | undefined): QrStyle {
  const s = { ...DEFAULT_STYLE, ...partial };
  if (!HEX.test(s.foreground)) throw new Error(`foreground must be a hex color like #1a1a1a, got "${s.foreground}"`);
  if (!HEX.test(s.background)) throw new Error(`background must be a hex color like #ffffff, got "${s.background}"`);
  s.size = Math.min(2048, Math.max(64, Math.round(s.size)));
  s.margin = Math.min(10, Math.max(0, Math.round(s.margin)));
  return s;
}

/** Escape a value for the WIFI:/MECARD-style payloads (RFC-ish: \ ; , : "). */
function escapeWifi(v: string): string {
  return v.replace(/([\\;,:"])/g, "\\$1");
}

export function wifiPayload(o: {
  ssid: string;
  password?: string;
  encryption: "WPA" | "WEP" | "nopass";
  hidden?: boolean;
}): string {
  if (!o.ssid.trim()) throw new Error("ssid is required");
  if (o.encryption !== "nopass" && !o.password) throw new Error("password is required unless encryption is \"nopass\"");
  const parts = [`T:${o.encryption}`, `S:${escapeWifi(o.ssid)}`];
  if (o.encryption !== "nopass") parts.push(`P:${escapeWifi(o.password ?? "")}`);
  if (o.hidden) parts.push("H:true");
  return `WIFI:${parts.join(";")};;`;
}

/** Escape a vCard 3.0 text value. */
function escapeVcard(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export interface VcardInput {
  firstName: string;
  lastName?: string;
  organization?: string;
  title?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  address?: string;
  note?: string;
}

export function vcardPayload(c: VcardInput): string {
  if (!c.firstName.trim() && !c.lastName?.trim() && !c.organization?.trim()) {
    throw new Error("At least a first name, last name or organization is required");
  }
  const fn = [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || c.organization || "";
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVcard(c.lastName ?? "")};${escapeVcard(c.firstName)};;;`,
    `FN:${escapeVcard(fn)}`,
  ];
  if (c.organization) lines.push(`ORG:${escapeVcard(c.organization)}`);
  if (c.title) lines.push(`TITLE:${escapeVcard(c.title)}`);
  if (c.phone) lines.push(`TEL;TYPE=WORK,VOICE:${escapeVcard(c.phone)}`);
  if (c.mobile) lines.push(`TEL;TYPE=CELL:${escapeVcard(c.mobile)}`);
  if (c.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVcard(c.email)}`);
  if (c.website) lines.push(`URL:${escapeVcard(c.website)}`);
  if (c.address) lines.push(`ADR;TYPE=WORK:;;${escapeVcard(c.address)};;;;`);
  if (c.note) lines.push(`NOTE:${escapeVcard(c.note)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export type ContentType = "auto" | "url" | "text" | "phone" | "sms" | "email" | "geo";

/** Turn a human input into the exact string encoded in the QR code. */
export function genericPayload(type: ContentType, content: string, extra?: { subject?: string; body?: string }): {
  type: Exclude<ContentType, "auto">;
  payload: string;
} {
  const c = content.trim();
  if (!c) throw new Error("content is required");
  let t = type;
  if (t === "auto") {
    if (/^(https?:\/\/|www\.)/i.test(c) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(c)) t = "url";
    else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) t = "email";
    else if (/^\+?[\d\s().-]{7,}$/.test(c)) t = "phone";
    else t = "text";
  }
  switch (t) {
    case "url": {
      const url = /^https?:\/\//i.test(c) ? c : `https://${c}`;
      return { type: "url", payload: url };
    }
    case "phone":
      return { type: "phone", payload: `tel:${c.replace(/[\s().-]/g, "")}` };
    case "sms": {
      const q = extra?.body ? `?body=${encodeURIComponent(extra.body)}` : "";
      return { type: "sms", payload: `sms:${c.replace(/[\s().-]/g, "")}${q}` };
    }
    case "email": {
      const params = new URLSearchParams();
      if (extra?.subject) params.set("subject", extra.subject);
      if (extra?.body) params.set("body", extra.body);
      const qs = params.toString();
      return { type: "email", payload: `mailto:${c}${qs ? `?${qs.replace(/\+/g, "%20")}` : ""}` };
    }
    case "geo": {
      const m = c.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (!m) throw new Error('geo content must be "latitude,longitude"');
      return { type: "geo", payload: `geo:${m[1]},${m[2]}` };
    }
    default:
      return { type: "text", payload: c };
  }
}

export async function renderSvg(payload: string, style: QrStyle): Promise<string> {
  return QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: style.errorCorrection,
    margin: style.margin,
    color: { dark: style.foreground, light: style.background },
  });
}

export async function renderPng(payload: string, style: QrStyle): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    type: "png",
    width: style.size,
    errorCorrectionLevel: style.errorCorrection,
    margin: style.margin,
    color: { dark: style.foreground, light: style.background },
  });
}

/** Version/size info so the model can explain scan reliability. */
export function describe(payload: string, style: QrStyle): { version: number; modules: number; bytes: number } {
  const qr = QRCode.create(payload, { errorCorrectionLevel: style.errorCorrection });
  return { version: qr.version, modules: qr.modules.size, bytes: Buffer.byteLength(payload, "utf8") };
}
