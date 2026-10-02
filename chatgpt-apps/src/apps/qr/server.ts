import { z } from "zod";
import { defineApp } from "../../kit/app.js";
import { READ_ONLY, fail, ok, registerWidget, uiToolMeta } from "../../kit/meta.js";
import { widgetHtml } from "../../kit/widget.js";
import { safeFilename } from "../../kit/files.js";
import {
  type QrStyle,
  describe,
  genericPayload,
  normalizeStyle,
  renderPng,
  renderSvg,
  vcardPayload,
  wifiPayload,
} from "./lib.js";

const WIDGET_URI = "ui://qr-code-studio/qr-v1.html";
const STATUS = { invoking: "Generating QR code", invoked: "QR code ready" };

const styleInput = {
  size: z.number().int().min(64).max(2048).optional()
    .describe("PNG size in pixels (default 512). SVG output is resolution-independent."),
  errorCorrection: z.enum(["L", "M", "Q", "H"]).optional()
    .describe("Error-correction level. M (default) suits screens; use H if the code will be printed small or have a logo placed over it."),
  foreground: z.string().optional().describe("Module color as hex, default #000000"),
  background: z.string().optional().describe("Background color as hex, default #ffffff"),
  margin: z.number().int().min(0).max(10).optional().describe("Quiet-zone width in modules, default 2"),
};

const outputSchema = {
  kind: z.enum(["url", "text", "phone", "sms", "email", "geo", "wifi", "vcard"]),
  summary: z.string().describe("Human-readable description of what the code contains"),
  payload: z.string().describe("Exact string encoded in the QR code"),
  version: z.number().describe("QR symbol version 1–40 (higher = denser)"),
  modules: z.number().describe("Modules per side"),
  errorCorrection: z.string(),
  downloads: z.object({ png: z.string().url(), svg: z.string().url() }),
  tip: z.string().optional(),
};

type Payload = { payload: string; style: QrStyle; name: string };

async function build(
  ctx: { fileUrl(kind: string, payload: unknown, filename: string): string },
  kind: z.infer<typeof outputSchema.kind>,
  summary: string,
  payload: string,
  stylePartial: Partial<QrStyle> | undefined,
  name: string,
) {
  const style = normalizeStyle(stylePartial);
  const info = describe(payload, style);
  const svg = await renderSvg(payload, style);
  const filePayload: Payload = { payload, style, name };
  const downloads = {
    png: ctx.fileUrl("png", filePayload, safeFilename(name, "png")),
    svg: ctx.fileUrl("svg", filePayload, safeFilename(name, "svg")),
  };
  let tip: string | undefined;
  if (info.version >= 15) tip = "This is a dense code. Print it at least 3 cm wide or shorten the content (a short URL helps) for reliable scanning.";
  else if (style.errorCorrection === "L") tip = "Error correction is set to L; switch to M or H if the code will be printed or partially covered.";
  const structured = {
    kind, summary, payload,
    version: info.version, modules: info.modules, errorCorrection: style.errorCorrection,
    downloads, ...(tip ? { tip } : {}),
  };
  return ok(
    `${summary} QR code generated (version ${info.version}, ${info.modules}×${info.modules} modules). Downloads: PNG ${downloads.png} — SVG ${downloads.svg}. The widget shows the code; keep your reply short.`,
    structured,
    { svg },
  );
}

export const qrApp = defineApp({
  slug: "qr",
  name: "QR Code Studio",
  version: "1.0.0",
  subtitle: "QR codes for links & Wi-Fi",
  category: "PRODUCTIVITY",
  description:
    "Generates standards-compliant QR codes for links, text, Wi-Fi networks and contact cards, shown instantly in the chat with PNG and SVG downloads. Unlike image-generation, every code is encoded by a real QR library so it scans.",
  files: {
    png: async (p: Payload) => ({ body: await renderPng(p.payload, p.style), contentType: "image/png", filename: safeFilename(p.name, "png") }),
    svg: async (p: Payload) => ({ body: await renderSvg(p.payload, p.style), contentType: "image/svg+xml", filename: safeFilename(p.name, "svg") }),
  },
  samples: [
    { tool: "create_qr_code", args: { content: "https://example.com/menu" } },
    { tool: "create_qr_code", args: { content: "hello@example.com", type: "email", subject: "Hi" } },
    { tool: "create_wifi_qr_code", args: { ssid: "CoffeeShop", password: "latte123", encryption: "WPA" } },
    { tool: "create_vcard_qr_code", args: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", phone: "+44 20 7946 0958" } },
    { tool: "create_qr_code", args: { content: "" }, expectError: true },
  ],
  register(server, ctx) {
    registerWidget(server, {
      uri: WIDGET_URI,
      name: "QR code preview",
      html: widgetHtml("qr"),
      description: "Shows the generated QR code with its encoded content and PNG/SVG download buttons. Do not describe the image or repeat the download links.",
    });

    server.registerTool(
      "create_qr_code",
      {
        title: "Create QR code",
        description:
          "Use this when the user wants a QR code for a link/URL, plain text, a phone number, an SMS, an email address or GPS coordinates — e.g. \"make a QR code for my website\", \"QR code for this link\", \"QR code that calls my number\". Returns a scannable code with PNG and SVG downloads. Not for Wi-Fi networks (use create_wifi_qr_code) or contact cards (use create_vcard_qr_code).",
        inputSchema: {
          content: z.string().min(1).max(2900).describe("The URL, text, phone number, email address or \"lat,lng\" to encode"),
          type: z.enum(["auto", "url", "text", "phone", "sms", "email", "geo"]).optional()
            .describe("What the content is. Default auto-detects URL / email / phone, otherwise text."),
          subject: z.string().max(200).optional().describe("Email subject (type=email only)"),
          body: z.string().max(500).optional().describe("Prefilled email or SMS body"),
          label: z.string().max(60).optional().describe("Short name used for the download filename"),
          ...styleInput,
        },
        outputSchema,
        annotations: READ_ONLY,
        _meta: uiToolMeta(WIDGET_URI, STATUS),
      },
      async ({ content, type, subject, body, label, ...style }) => {
        try {
          const g = genericPayload(type ?? "auto", content, { subject, body });
          const summaries: Record<string, string> = {
            url: `Link to ${g.payload}`, text: "Text", phone: `Call ${content.trim()}`,
            sms: `Text message to ${content.trim()}`, email: `Email to ${content.trim()}`, geo: `Location ${content.trim()}`,
          };
          return await build(ctx, g.type, summaries[g.type], g.payload, style, label ?? `qr-${g.type}`);
        } catch (e) {
          return fail((e as Error).message);
        }
      },
    );

    server.registerTool(
      "create_wifi_qr_code",
      {
        title: "Create Wi-Fi QR code",
        description:
          "Use this when the user wants guests to join a Wi-Fi network by scanning — e.g. \"QR code for my wifi\", \"make a wifi QR code for the guest network\", \"wifi password QR code\". Encodes the standard WIFI: payload that iPhone and Android cameras recognize. Needs the network name (SSID) and password.",
        inputSchema: {
          ssid: z.string().min(1).max(64).describe("Network name exactly as broadcast"),
          password: z.string().max(128).optional().describe("Network password. Omit only if encryption is nopass."),
          encryption: z.enum(["WPA", "WEP", "nopass"]).optional().describe("Security type; WPA (default) covers WPA/WPA2/WPA3"),
          hidden: z.boolean().optional().describe("True if the SSID is hidden"),
          ...styleInput,
        },
        outputSchema,
        annotations: READ_ONLY,
        _meta: uiToolMeta(WIDGET_URI, STATUS),
      },
      async ({ ssid, password, encryption, hidden, ...style }) => {
        try {
          const payload = wifiPayload({ ssid, password, encryption: encryption ?? "WPA", hidden });
          return await build(ctx, "wifi", `Wi-Fi network "${ssid}"`, payload, style, `wifi-${ssid}`);
        } catch (e) {
          return fail((e as Error).message);
        }
      },
    );

    server.registerTool(
      "create_vcard_qr_code",
      {
        title: "Create contact (vCard) QR code",
        description:
          "Use this when the user wants a QR code that adds a contact to someone's phone — e.g. \"QR code for my business card\", \"contact QR code with my name, phone and email\", \"vCard QR\". Encodes a vCard 3.0 so scanning opens \"Add contact\".",
        inputSchema: {
          firstName: z.string().max(80).describe("First name (may be empty for an organization-only card)"),
          lastName: z.string().max(80).optional(),
          organization: z.string().max(120).optional(),
          title: z.string().max(120).optional().describe("Job title"),
          phone: z.string().max(40).optional().describe("Work phone"),
          mobile: z.string().max(40).optional(),
          email: z.string().max(120).optional(),
          website: z.string().max(200).optional(),
          address: z.string().max(200).optional().describe("Single-line postal address"),
          note: z.string().max(200).optional(),
          ...styleInput,
        },
        outputSchema,
        annotations: READ_ONLY,
        _meta: uiToolMeta(WIDGET_URI, STATUS),
      },
      async ({ firstName, lastName, organization, title, phone, mobile, email, website, address, note, ...style }) => {
        try {
          const payload = vcardPayload({ firstName, lastName, organization, title, phone, mobile, email, website, address, note });
          const name = [firstName, lastName].filter(Boolean).join(" ") || organization || "contact";
          return await build(ctx, "vcard", `Contact card for ${name}`, payload, style, `contact-${name}`);
        } catch (e) {
          return fail((e as Error).message);
        }
      },
    );
  },
});
