"use client"
// ===== REACHWISE shared scaffold (THE REACH: chalk ground, ink type, signal-lime pulses, ping-pink dots, PING buttons) =====
// In Framer every code file had to inline this; here it is one module every section imports from.
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
} from "react"
import { ControlType, RenderTarget, useIsStaticRenderer } from "./controls"
import { CONTENT, type CmsRow } from "../content/site"
import { FONTS, MAXW } from "./rw-css"

export { FONTS, MAXW }
export type { CmsRow }

// Token-safe alpha: Styles-bound colours arrive as var(--token-…) so hex-alpha breaks; color-mix keeps a palette flip working. Never 0% (hue drops) — floor at 0.4%.
export const A = (c: string, a: number) =>
    `color-mix(in srgb, ${c} ${Math.max(0.4, Math.round(a * 1000) / 10)}%, transparent)`
export const MIX = (a: string, b: string, t: number) =>
    `color-mix(in srgb, ${a} ${Math.round((1 - t) * 100)}%, ${b})`
export const srcOf = (v: any, fallback: string) =>
    v && typeof v === "object" && v.src
        ? String(v.src).split("?")[0]
        : typeof v === "string" && v.trim()
          ? v.trim().split("?")[0]
          : fallback
export const T = (s: string | undefined, fb: string) =>
    s && s.trim() ? s.trim() : fb
// ink or white text on a CMS brand colour (luminance test; the brand colour is data, not a palette token)
export const onBrand = (hex: string) => {
    const m = String(hex || "")
        .replace("#", "")
        .match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
    if (!m) return "var(--rw-cloud)"
    const [r, g, b] = [m[1], m[2], m[3]].map((x) => {
        const v = parseInt(x, 16) / 255
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    })
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return L > 0.2 ? "var(--rw-ink)" : "var(--rw-cloud)"
}
export const cleanTel = (s: string) => s.replace(/[^\d+]/g, "")
// Responsive delivery. Framer uploads: the resizer serves ?scale-down-to=N. Unsplash stand-ins: ?w=N. The src is already the smallest width that covers the slot (a 52px avatar never pulls a 1600px photo), so a big image is never decoded for a small box — decode is what stalls scrolling.
const RS_W = [160, 320, 480, 800, 1200, 1600]
const rsTarget = (sizes: string) => {
    const t =
        String(sizes || "")
            .trim()
            .split(",")
            .pop() || ""
    const px = t.match(/(\d+(?:\.\d+)?)px/)
    const vw = t.match(/(\d+(?:\.\d+)?)vw/)
    const want = px
        ? parseFloat(px[1]) * 2
        : vw
          ? (parseFloat(vw[1]) / 100) * 1600 * 1.25
          : 1600
    return RS_W.find((w) => w >= want) || 1600
}
export const RS = (
    u: string,
    sizes: string
): { src: string; srcSet?: string; sizes?: string } => {
    const s = String(u || "")
    const b = s.split("?")[0]
    // Images in /public: Next's built-in optimizer (Vercel Image Optimization in production) resizes them on demand.
    if (/^\/[^/].*\.(webp|jpe?g|png|avif|gif)$/i.test(b)) {
        const w = rsTarget(sizes)
        const opt = (n: number) => `/_next/image?url=${encodeURIComponent(b)}&w=${n}&q=75`
        const ws = [384, 640, 828, 1200, 2048]
        return {
            src: opt(ws.find((n) => n >= w) || 2048),
            srcSet: ws.map((n) => `${opt(n)} ${n}w`).join(", "),
            sizes,
        }
    }
    if (/framerusercontent\.com\/images\//.test(s)) {
        const w = rsTarget(sizes)
        const d = w <= 512 ? 512 : w <= 1024 ? 1024 : 2048
        return {
            src: `${b}?scale-down-to=${d}`,
            srcSet: `${b}?scale-down-to=512 512w, ${b}?scale-down-to=1024 1024w, ${b}?scale-down-to=2048 2048w`,
            sizes,
        }
    }
    if (/images\.unsplash\.com\//.test(s)) {
        const w = rsTarget(sizes)
        const q = (n: number) => `${b}?w=${n}&q=70&fm=jpg&auto=format`
        return {
            src: q(w),
            srcSet: RS_W.filter((n) => n <= Math.max(w * 2, 480))
                .map((n) => `${q(n)} ${n}w`)
                .join(", "),
            sizes,
        }
    }
    return { src: s }
}

// A Framer Font control stores a selector (GF;Family-700), not a CSS family — derive one, reject anything with ';'
export const famOf = (f: any): string => {
    if (!f) return ""
    if (typeof f === "string") return f.includes(";") ? "" : f
    if (f.fontFamily && !String(f.fontFamily).includes(";"))
        return String(f.fontFamily)
    const sel = String(f.fontSelector || "")
    if (!sel) return ""
    const n = sel.split(";").pop() || ""
    return n
        .replace(/-(regular|italic|bold|\d{3}(italic)?)$/i, "")
        .replace(/-/g, " ")
}
export const wOf = (f: any, fb: number): number => {
    if (!f) return fb
    if (f.fontWeight) return Number(f.fontWeight) || fb
    const m = String(f.fontSelector || "").match(/-(\d{3})/)
    return m ? Number(m[1]) : fb
}
// famCss: Framer's Font `fontFamily` is ALREADY a stack — never wrap it in quotes (one fake family → fallback renders). A bare name gets quoted.
export const famCss = (f: any): string => {
    const fa = famOf(f).replace(/"/g, "'").trim()
    if (!fa) return ""
    return fa.includes(",") || fa.startsWith("'") ? fa : `'${fa}'`
}
export const stack = (custom: boolean, f: any, fb: string, tail: string) => {
    const fam = custom ? famCss(f) : ""
    return `${fam ? `${fam}, ` : ""}${fb}, ${tail}`
}

// The Google Fonts stylesheet is loaded once in app/layout.tsx (id="rw-fonts"); this only adds it if missing.
export function useFonts() {
    useEffect(() => {
        if (
            typeof document === "undefined" ||
            document.getElementById("rw-fonts")
        )
            return
        const l = document.createElement("link")
        l.id = "rw-fonts"
        l.rel = "stylesheet"
        l.href = FONTS
        document.head.appendChild(l)
    }, [])
}
// TRUE only in a static renderer (Framer canvas / export). In this Next.js site it is always false.
export function useStill() {
    const isStatic = useIsStaticRenderer()
    let t: any = null
    try {
        t = RenderTarget.current()
    } catch (e) {}
    return isStatic || (t !== null && t !== RenderTarget.preview)
}
// live = client after hydration. SSR and the first client render share the same markup.
export function useLive() {
    const isStatic = useIsStaticRenderer()
    const [live, setLive] = useState(false)
    useEffect(() => {
        if (
            !isStatic &&
            RenderTarget.current() !== RenderTarget.canvas &&
            typeof window !== "undefined"
        )
            setLive(true)
    }, [isStatic])
    return live
}
// Width/height of the root + viewport height. SSR starts from the breakpoint hint.
export function useSize(
    root: React.RefObject<HTMLElement | null>,
    hint?: string
) {
    const ov = String(hint || "").toLowerCase()
    const [w, setW] = useState(
            ov === "phone" ? 390 : ov === "tablet" ? 810 : 1440
        ),
        [vh, setVh] = useState(
            ov === "phone" ? 844 : ov === "tablet" ? 1080 : 900
        )
    useLayoutEffect(() => {
        const el = root.current
        if (!el) return
        const ro = new ResizeObserver(([e]) => {
            const x = Math.round(
                (e.borderBoxSize && e.borderBoxSize[0]
                    ? e.borderBoxSize[0].inlineSize
                    : 0) || el.offsetWidth
            )
            if (x > 0) setW(x)
        })
        ro.observe(el)
        const vv = () => setVh(window.innerHeight)
        vv()
        const read = () => {
            const x = Math.round(el.offsetWidth)
            if (x > 0) setW(x)
        }
        const t1 = window.setTimeout(read, 150),
            t2 = window.setTimeout(read, 700),
            t3 = window.setTimeout(read, 1600)
        window.addEventListener("resize", vv)
        window.addEventListener("load", read)
        return () => {
            ro.disconnect()
            window.clearTimeout(t1)
            window.clearTimeout(t2)
            window.clearTimeout(t3)
            window.removeEventListener("resize", vv)
            window.removeEventListener("load", read)
        }
    }, [])
    return { w, vh }
}
export const useReduced = () => {
    const [rm, setRm] = useState(false)
    useLayoutEffect(() => {
        setRm(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    }, [])
    return rm
}
type Sub = (t: number) => void
// One shared rAF for every section. Each frame runs ALL reads first (layout reads: getBoundingClientRect, offsetHeight), then ALL writes (CSS vars, transforms).
// Interleaving read → write → read made the browser recalc the whole page's style once per section per frame (layout thrashing: 20+ recalcs a frame).
export function onTick(fn: Sub, read?: Sub, pre?: Sub): () => void {
    if (typeof window === "undefined") return () => {}
    const w = window as any
    if (!w.__nuTick) {
        w.__nuTick = {
            pre: new Set<Sub>(),
            subs: new Set<Sub>(),
            reads: new Set<Sub>(),
            raf: 0,
        }
        const loop = (t: number) => {
            const T = w.__nuTick
            T.pre.forEach((r: Sub) => r(t))
            T.reads.forEach((r: Sub) => r(t))
            T.subs.forEach((s: Sub) => s(t))
            T.raf = requestAnimationFrame(loop)
        }
        w.__nuTick.raf = requestAnimationFrame(loop)
    }
    w.__nuTick.subs.add(fn)
    if (read) w.__nuTick.reads.add(read)
    if (pre) w.__nuTick.pre.add(pre)
    return () => {
        w.__nuTick.subs.delete(fn)
        if (read) w.__nuTick.reads.delete(read)
        if (pre) w.__nuTick.pre.delete(pre)
    }
}
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
export const easeIO = (t: number) => {
    const x = clamp01(t)
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

// ---- Palette (8 colour props on every section) ----
export type Pal = {
    bone: string
    ink: string
    brass: string
    pine: string
    fog: string
    stone: string
    cloud: string
    night: string
}
export const DEF: Pal = {
    bone: "#FFFFEB", // Powder: paper
    ink: "#0D0E10", // type
    brass: "#FF8A3D", // light Tangelo: accent
    pine: "#16181B", // cards on dark
    fog: "#DAE7D9", // Ash Gray over Powder: hairlines
    stone: "#75766F", // muted type
    cloud: "#FFFFFF",
    night: "#08090A", // dark sections
}
export const PINK = "#A2C2BE" // Ash Gray: notification dots only (a constant, not a token)
export const SAGE = "#A2C2BE" // Ash Gray: live / available signals
export const MIST = "#C9DCD7" // Ash Gray, lightened: cool secondary surfaces
export const colorsOf = (p: any): Pal => ({
    bone: p.bone || DEF.bone,
    ink: p.ink || DEF.ink,
    brass: p.brass || DEF.brass,
    pine: p.pine || DEF.pine,
    fog: p.fog || DEF.fog,
    stone: p.stone || DEF.stone,
    cloud: p.cloud || DEF.cloud,
    night: p.night || DEF.night,
})
// a colour may arrive as var(--token-…, #hex): let the browser resolve it to r,g,b for canvas drawing
export const cssRgb = (el: Element | null, col: string, fb: string) => {
    if (!el || typeof window === "undefined") return fb
    const p = document.createElement("i")
    p.style.display = "none"
    p.style.color = col
    el.appendChild(p)
    const v = getComputedStyle(p).color
    p.remove()
    const m = v.match(/(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/)
    return m
        ? `${Math.round(+m[1])},${Math.round(+m[2])},${Math.round(+m[3])}`
        : fb
}
export const cssVars = (c: Pal): any => ({
    "--rw-bone": c.bone,
    "--rw-ink": c.ink,
    "--rw-brass": c.brass,
    "--rw-pine": c.pine,
    "--rw-fog": c.fog,
    "--rw-stone": c.stone,
    "--rw-cloud": c.cloud,
    "--rw-night": c.night,
})
export const COLOR_CONTROLS = {
    bone: { type: ControlType.Color, title: "Paper", defaultValue: DEF.bone },
    ink: { type: ControlType.Color, title: "Ink", defaultValue: DEF.ink },
    brass: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: DEF.brass,
    },
    pine: { type: ControlType.Color, title: "Deep", defaultValue: DEF.pine },
    fog: { type: ControlType.Color, title: "Line", defaultValue: DEF.fog },
    stone: { type: ControlType.Color, title: "Muted", defaultValue: DEF.stone },
    cloud: { type: ControlType.Color, title: "White", defaultValue: DEF.cloud },
    night: { type: ControlType.Color, title: "Dark", defaultValue: DEF.night },
} as const
// ---- Fonts: Custom Fonts toggle → Font controls; off = Funnel Display / Funnel Sans / Geist Mono ----
export const FONT_CONTROLS = {
    customFonts: {
        type: ControlType.Boolean,
        title: "Custom Fonts",
        description:
            "Off = the site fonts. On = different fonts for this section only",
        defaultValue: false,
    },
    displayFont: {
        type: ControlType.Font,
        title: "Display Font",
        defaultFontType: "sans-serif",
        hidden: (p: any) => !p.customFonts,
    },
    bodyFont: {
        type: ControlType.Font,
        title: "Body Font",
        defaultFontType: "sans-serif",
        hidden: (p: any) => !p.customFonts,
    },
    monoFont: {
        type: ControlType.Font,
        title: "Mono Font",
        defaultFontType: "monospace",
        hidden: (p: any) => !p.customFonts,
    },
} as const
export type Fonts = { D: CSSProperties; B: CSSProperties; M: CSSProperties }
export const NUMF = "var(--rw-font-m, 'Geist Mono'), ui-monospace, monospace"
// Site-wide fonts: --rw-font-d/b/m (+ weights) on :root override the defaults when a section's Custom Fonts is on.
export const siteFontCss = (p: any): string => {
    if (!p || !p.customFonts) return ""
    const v: string[] = []
    const put = (k: string, f: any, w: number) => {
        const fam = famCss(f)
        if (fam) {
            v.push(`--rw-font-${k}:${fam}`)
            v.push(`--rw-font-${k}w:${wOf(f, w)}`)
        }
    }
    put("d", p.displayFont, 600)
    put("b", p.bodyFont, 400)
    put("m", p.monoFont, 400)
    put("a", p.accentFont, 400)
    return v.length ? `:root{${v.join(";")}}` : ""
}
export function fontsOf(p: any): Fonts {
    const on = !!p.customFonts
    const D: CSSProperties = {
        fontFamily: stack(
            on,
            p.displayFont,
            "var(--rw-font-d, 'Funnel Display')",
            "Inter, -apple-system, Arial, sans-serif"
        ),
        fontWeight: on
            ? wOf(p.displayFont, 600)
            : ("var(--rw-font-dw, 600)" as any),
        fontStyle:
            on && p.displayFont && p.displayFont.fontStyle
                ? p.displayFont.fontStyle
                : "normal",
    }
    const B: CSSProperties = {
        fontFamily: stack(
            on,
            p.bodyFont,
            "var(--rw-font-b, 'Funnel Sans')",
            "Inter, system-ui, -apple-system, Arial, sans-serif"
        ),
        fontWeight: on
            ? wOf(p.bodyFont, 400)
            : ("var(--rw-font-bw, 400)" as any),
    }
    const M: CSSProperties = {
        fontFamily: stack(
            on,
            p.monoFont,
            "var(--rw-font-m, 'Geist Mono')",
            "ui-monospace, SFMono-Regular, Menlo, monospace"
        ),
        fontWeight: on
            ? wOf(p.monoFont, 400)
            : ("var(--rw-font-mw, 400)" as any),
    }
    return { D, B, M }
}
export const BP_CONTROL: any = {
    bpHint: {
        type: ControlType.Enum,
        title: "Breakpoint Hint",
        description:
            "Set per breakpoint copy so the server render starts at the right width",
        options: ["auto", "desktop", "tablet", "phone"],
        optionTitles: ["Auto", "Desktop", "Tablet", "Phone"],
        defaultValue: "auto",
        hidden: () => true,
    },
}

// ---- Button system: THE PING — a pill. On hover a pink notification dot pops on its right edge with a rolling "+1", a lime ring pings out of the dot, the accent fill sweeps in from the left and the label rolls up. Magnetic on desktop, squish on press. Solid = ink (fill lime), ghost = glass/hairline (fill paper), quiet = small nav pill. ----
export const Glyph = ({ k }: { k?: string }) =>
    k === "mail" ? (
        <svg
            viewBox="0 0 24 24"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M4 7l8 6 8-6" />
        </svg>
    ) : k === "cal" ? (
        <svg
            viewBox="0 0 24 24"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3.5" y="5" width="17" height="15" rx="3" />
            <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
    ) : k === "play" ? (
        <svg viewBox="0 0 24 24" aria-hidden>
            <path fill="currentColor" d="M8 5.5v13l10.5-6.5z" />
        </svg>
    ) : (
        <svg
            viewBox="0 0 24 24"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M7 17L17 7M9 7h8v8" />
        </svg>
    )
// In-page CTA jumps ("#download", "/#download"): scroll to the section when it is on this page, otherwise go to it on the home page.
export function jumpTo(e: any, href: string) {
    try {
        const m = String(href || "").match(/^\/?#([\w-]+)$/)
        if (!m) return
        const el = document.getElementById(m[1])
        if (el) {
            e.preventDefault()
            const W = window as any
            const L = W.__ltLenis || W.__vcLenis || W.lenis
            if (L && L.scrollTo) L.scrollTo(el, { offset: -20 })
            else el.scrollIntoView({ behavior: "smooth", block: "start" })
            try {
                history.replaceState(null, "", "#" + m[1])
            } catch (x) {}
        } else if (href.startsWith("#")) {
            e.preventDefault()
            window.location.href = "/" + href
        }
    } catch (x) {}
}
export const Btn = ({
    href,
    label,
    kind = "solid",
    arrow = true,
    style,
    className,
    onClick,
    ariaLabel,
    cur,
    icon,
    sub,
}: {
    href: string
    label: string
    kind?: "solid" | "ghost" | "quiet"
    arrow?: boolean
    style?: CSSProperties
    className?: string
    onClick?: any
    ariaLabel?: string
    cur?: string
    icon?: string
    sub?: string
}) => (
    <a
        className={`rw-btn rw-${kind}${arrow ? "" : " rw-noarr"}${className ? " " + className : ""}`}
        data-mag
        data-cur={cur || "go"}
        href={href}
        target={/^https?:\/\//.test(href || "") ? "_blank" : undefined}
        rel={/^https?:\/\//.test(href || "") ? "noopener" : undefined}
        onClick={onClick || ((e: any) => jumpTo(e, href))}
        aria-label={ariaLabel || (sub ? `${sub} ${label}` : undefined)}
        style={style}
    >
        <span className="rw-face">
            <span className="rw-fill" aria-hidden />
            <span className="rw-lbl">
                <span className="rw-roll">
                    <span className="rw-l1">{label}</span>
                    <span className="rw-l2" aria-hidden>
                        {label}
                    </span>
                </span>
            </span>
            {arrow && (
                <span className="rw-arr" aria-hidden>
                    <span className="rw-a1">
                        <Glyph k={icon} />
                    </span>
                    <span className="rw-a2">
                        <Glyph k={icon} />
                    </span>
                </span>
            )}
        </span>
        <span className="rw-ping" aria-hidden>
            <i className="rw-ping-r" />
            <b>
                <span>1</span>
                <span>+1</span>
            </b>
        </span>
    </a>
)
export function useNearFocus(
    root: React.RefObject<HTMLElement | null>,
    live: boolean
) {
    useEffect(() => {
        if (!live || !root.current) return
        const el = root.current
        const f = (e: FocusEvent) => {
            const t = e.target as HTMLElement
            const sc = t.closest?.(".rw-inring") as HTMLElement | null
            if (!sc) return
            try {
                t.scrollIntoView({ block: "nearest", inline: "nearest" })
            } catch (x) {}
        }
        el.addEventListener("focusin", f)
        return () => el.removeEventListener("focusin", f)
    }, [live])
}
export function useMagnet(
    root: React.RefObject<HTMLElement | null>,
    live: boolean
) {
    useEffect(() => {
        if (
            !live ||
            !root.current ||
            !window.matchMedia("(hover:hover) and (pointer:fine)").matches
        )
            return
        const r = root.current
        const btns = () =>
            Array.from(r.querySelectorAll<HTMLElement>("[data-mag]"))
        const mv = (e: PointerEvent) => {
            for (const b of btns()) {
                const rc = b.getBoundingClientRect()
                const dx = e.clientX - (rc.left + rc.width / 2),
                    dy = e.clientY - (rc.top + rc.height / 2)
                const d = Math.hypot(dx, dy)
                const pull = d < 150 ? (1 - d / 150) * 8 : 0
                b.style.setProperty("--mx", `${(dx / (d || 1)) * pull}px`)
                b.style.setProperty("--my", `${(dy / (d || 1)) * pull}px`)
            }
        }
        const lv = () => {
            for (const b of btns()) {
                b.style.setProperty("--mx", "0px")
                b.style.setProperty("--my", "0px")
            }
        }
        r.addEventListener("pointermove", mv as any)
        r.addEventListener("pointerleave", lv)
        return () => {
            r.removeEventListener("pointermove", mv as any)
            r.removeEventListener("pointerleave", lv)
        }
    }, [live])
}

export const IcoArrow = ({ s = 15 }: { s?: number }) => (
    <svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
)
export const Stars = ({ v = 5, s = 13 }: { v?: number; s?: number }) => (
    <span className="rw-stars" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
            <svg
                key={i}
                width={s}
                height={s}
                viewBox="0 0 24 24"
                style={{ opacity: i < Math.round(v) ? 1 : 0.28 }}
            >
                <path
                    fill="currentColor"
                    d="M12 2.6l2.9 6.1 6.7.9-4.9 4.6 1.2 6.6L12 17.6 6.1 20.8l1.2-6.6L2.4 9.6l6.7-.9z"
                />
            </svg>
        ))}
    </span>
)

// ===== REACHWISE motion layer (THE FLOW) =====
// One shared rAF (onTick). Sections write --sp (0 = top edge enters the viewport bottom → 1 = bottom edge leaves the top) and,
// for tall pinned wrappers, --pp (0 = wrapper top hits the viewport top → 1 = wrapper bottom hits the viewport bottom). IO-gated.
export const SCRUB_K = 0.18
// Decode a section's photos while it is still a screen and a half away, so the first frame it is on screen never waits for a decode.
export function usePre(el: HTMLElement) {
    try {
        const io = new IntersectionObserver(
            (es) => {
                if (!es[0].isIntersecting) return
                io.disconnect()
                el.querySelectorAll("img").forEach((im) => {
                    try {
                        ;(im as HTMLImageElement).loading = "eager"
                        ;(im as HTMLImageElement).decode().catch(() => {})
                    } catch (e) {}
                })
            },
            { rootMargin: "150% 0px 150% 0px" }
        )
        io.observe(el)
    } catch (e) {}
}
export function focusTo(el: HTMLElement | null, frac: number) {
    if (!el || typeof window === "undefined") return
    if (window.innerWidth < 810) return
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight
    if (r.height <= vh * 1.05) return
    const y =
        r.top +
        window.scrollY +
        (r.height - vh) * Math.min(1, Math.max(0, frac))
    if (Math.abs(window.scrollY - y) < 8) return
    const w = window as any
    if (w.__ltLenis) w.__ltLenis.scrollTo(y, { immediate: true, force: true })
    else window.scrollTo(0, y)
}
export function useScrollVars(
    ref: React.RefObject<HTMLElement | null>,
    live: boolean,
    rm: boolean,
    cb?: (sp: number, pp: number) => void
) {
    useEffect(() => {
        if (!live || rm || !ref.current) return
        const el = ref.current
        let vis = true,
            last = -9,
            cs = -1,
            cp = -1,
            settled = false
        usePre(el)
        const io = new IntersectionObserver(
            (es) => {
                vis = es[0].isIntersecting
            },
            { rootMargin: "25% 0px 25% 0px" }
        )
        io.observe(el)
        // eased scrub: the values glide toward the true scroll position (K per frame), so wheel steps never jump a pinned scene
        let rt = 0,
            rh = 0,
            vh = 1,
            fresh = false
        const read = () => {
            if (!vis && settled) {
                fresh = false
                return
            }
            const r = el.getBoundingClientRect()
            rt = r.top
            rh = r.height
            vh = window.innerHeight || 1
            fresh = true
        }
        const off = onTick(() => {
            if (!fresh) return
            const sp = clamp01((vh - rt) / (vh + rh))
            const pp = rh > vh * 1.05 ? clamp01(-rt / (rh - vh)) : sp
            if (cs < 0) {
                cs = sp
                cp = pp
            } else {
                cs += (sp - cs) * SCRUB_K
                cp += (pp - cp) * SCRUB_K
                if (Math.abs(sp - cs) < 0.0005) cs = sp
                if (Math.abs(pp - cp) < 0.0005) cp = pp
            }
            settled = cs === sp && cp === pp
            if (Math.abs(cs + cp - last) < 0.0003) return
            last = cs + cp
            el.style.setProperty("--sp", cs.toFixed(4))
            el.style.setProperty("--pp", cp.toFixed(4))
            if (cb) cb(cs, cp)
        }, read)
        return () => {
            off()
            io.disconnect()
        }
    }, [live, rm])
}
// STAGE — false while a loader or page-transition cover is on screen (html.rw-hold-*), so first-screen intros play AFTER the cover lifts, never under it. 9 s safety.
export function useStage(live: boolean) {
    const [r, setR] = useState(false)
    useEffect(() => {
        if (!live) return
        const h = document.documentElement
        const ok = () => !/(^|\s)rw-hold/.test(h.className)
        if (ok()) {
            setR(true)
            return
        }
        const mo = new MutationObserver(() => {
            if (ok()) {
                mo.disconnect()
                setR(true)
            }
        })
        mo.observe(h, { attributes: true, attributeFilter: ["class"] })
        const t = window.setTimeout(() => {
            mo.disconnect()
            setR(true)
        }, 9000)
        return () => {
            mo.disconnect()
            window.clearTimeout(t)
        }
    }, [live])
    return r
}
// true once the element has entered the viewport (stays true) — and only once the stage is clear. Reduced motion = true at once.
export function useOn(
    ref: React.RefObject<HTMLElement | null>,
    live: boolean,
    rm: boolean,
    amount = 0.16
) {
    const [on, setOn] = useState(false)
    const still = useStill()
    const ready = useStage(live)
    useEffect(() => {
        if (!live) return
        if (rm) {
            setOn(true)
            return
        }
        if (!ready) return
        const el = ref.current
        if (!el) return
        let off = () => {}
        // keyboard focus: mark the section FIRST and flush styles, so the reveal that follows runs with instant transitions (a transition keeps the timing it started with)
        const fin = (e: Event) => {
            try {
                if ((e.target as Element).matches(":focus-visible")) {
                    el.setAttribute("data-kb", "")
                    void el.offsetWidth
                }
            } catch (x) {}
            setOn(true)
        }
        const fout = (e: any) => {
            if (!el.contains(e.relatedTarget as Node))
                el.removeAttribute("data-kb")
        }
        el.addEventListener("focusin", fin)
        el.addEventListener("focusout", fout)
        const io = new IntersectionObserver(
            (es) => {
                for (const e of es)
                    if (e.isIntersecting) {
                        io.disconnect()
                        // IO ignores occlusion: under a curtain (Reveal) wait until about a quarter of it is uncovered
                        off = onTick(() => {
                            const rev = el.closest(
                                ".rw-rev.is-act"
                            ) as HTMLElement | null
                            const rv = rev
                                ? parseFloat(
                                      rev.style.getPropertyValue("--rv") || "0"
                                  )
                                : 1
                            if (rv > 0.24) {
                                setOn(true)
                                off()
                            }
                        })
                    }
            },
            {
                threshold: Math.min(
                    amount,
                    Math.max(
                        0.005,
                        (window.innerHeight * 0.3) /
                            Math.max(1, el.offsetHeight)
                    )
                ),
                rootMargin: "0px 0px -6% 0px",
            }
        )
        io.observe(el)
        return () => {
            io.disconnect()
            off()
            el.removeEventListener("focusin", fin)
            el.removeEventListener("focusout", fout)
        }
    }, [live, rm, ready])
    return on || still
}
// CURTAIN REVEAL — the section is pinned BEHIND the one above it and is uncovered as that one lifts away (the footer movement, for any section).
// Wrapper = section + a spacer of T, pulled up by T (page length unchanged); the section is sticky for exactly T of scroll. T = min(section height, 100svh):
// a tall section pins at the top, a short one sits on the bottom edge of the viewport. The section ABOVE needs a higher Layer (z-index).
export function Reveal({
    on,
    layer = 9,
    style,
    children,
}: {
    on: boolean
    layer?: number
    style?: CSSProperties
    children: any
}) {
    const live = useLive()
    const rm = useReduced()
    const wrap = useRef<HTMLDivElement>(null)
    const inner = useRef<HTMLDivElement>(null)
    const sp = useRef<HTMLDivElement>(null)
    const [h, setH] = useState(0)
    const act = on && live && !rm && h > 0
    useEffect(() => {
        if (!on || !live || rm || !inner.current) return
        const el = inner.current
        const m = () => setH(el.offsetHeight)
        m()
        const ro = new ResizeObserver(m)
        ro.observe(el)
        return () => ro.disconnect()
    }, [on, live, rm])
    useEffect(() => {
        if (!act || !wrap.current) return
        const el = wrap.current
        let vis = true,
            last = -1
        const io = new IntersectionObserver(
            (es) => {
                vis = es[0].isIntersecting
            },
            { rootMargin: "30% 0px 30% 0px" }
        )
        io.observe(el)
        let cur = -1,
            T = 0,
            vh = 1,
            top = 0,
            fresh = false
        const read = () => {
            if (!vis) {
                fresh = false
                return
            }
            T = sp.current ? sp.current.offsetHeight : 0
            vh = window.innerHeight
            top = el.getBoundingClientRect().top
            fresh = true
        }
        const off = onTick(() => {
            if (!fresh || !T) return
            const rv = clamp01((vh - T - top) / T)
            if (cur < 0) cur = rv
            else {
                cur += (rv - cur) * SCRUB_K
                if (Math.abs(rv - cur) < 0.0005) cur = rv
            }
            if (Math.abs(cur - last) < 0.0004) return
            last = cur
            el.style.setProperty("--rv", cur.toFixed(4))
        }, read)
        return () => {
            off()
            io.disconnect()
        }
    }, [act])
    return (
        <div
            ref={wrap}
            className={`rw-rev${act ? " is-act" : ""}`}
            style={{
                ...(style || {}),
                ["--h" as any]: `${h}px`,
                ["--layer" as any]: layer,
            }}
            onFocusCapture={(e) => {
                if (!act || !wrap.current) return
                const t = e.target as HTMLElement
                const w = window as any
                const r = wrap.current.getBoundingClientRect()
                const T = sp.current ? sp.current.offsetHeight : 0
                const y = Math.max(
                    0,
                    Math.min(
                        document.documentElement.scrollHeight -
                            window.innerHeight,
                        r.top + window.scrollY - window.innerHeight + 2 * T
                    )
                )
                if (Math.abs(window.scrollY - y) > 4) {
                    if (w.__ltLenis)
                        w.__ltLenis.scrollTo(y, {
                            immediate: true,
                            force: true,
                        })
                    else window.scrollTo(0, y)
                }
                requestAnimationFrame(() => {
                    try {
                        t.scrollIntoView({ block: "nearest" })
                    } catch (x) {}
                })
            }}
        >
            <div ref={inner} className="rw-rev-in">
                {children}
            </div>
            <div ref={sp} className="rw-rev-sp" aria-hidden />
        </div>
    )
}
export const REVEAL_CONTROLS: any = {
    reveal: {
        type: ControlType.Boolean,
        title: "Reveal",
        description:
            "Curtain: this section waits behind the one above and is uncovered as that one lifts away",
        enabledTitle: "Curtain",
        disabledTitle: "Off",
        defaultValue: true,
    },
    layer: {
        type: ControlType.Number,
        title: "Layer",
        description:
            "Stacking order. Must be LOWER than the section above (sections default to 10)",
        min: 0,
        max: 20,
        step: 1,
        displayStepper: true,
        defaultValue: 9,
        hidden: (p: any) => p.reveal === false,
    },
}
export const splitWords = (s: string) =>
    String(s || "")
        .replace(/\*([^*]+)\*/g, (_m: string, g: string) =>
            g
                .trim()
                .split(/\s+/)
                .map((w: string) => {
                    const m = w.match(/^(.*?)([.,!?;:’']*)$/)
                    return m && m[1] ? `*${m[1]}*${m[2]}` : w
                })
                .join(" ")
        )
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => {
            const m = t.match(/^\*(.+?)\*([.,!?;:’']*)$/)
            return m
                ? { t: m[1], tail: m[2], acc: true }
                : { t: t.replace(/\*/g, ""), tail: "", acc: false }
        })
export const plainOf = (s: string) =>
    String(s || "")
        .replace(/\*/g, "")
        .replace(/\s*\|\s*/g, " ")
        .replace(/\s+/g, " ")
        .trim()
// Heading whose words rise out of masks. "|" forces a line break, *word* = the accent.
export const Head = ({
    text,
    on,
    D,
    tag = "h2",
    size = "clamp(40px,4.8vw,72px)",
    lh = 0.92,
    delay = 0,
    step = 55,
    style,
    className,
}: {
    text: string
    on: boolean
    D: CSSProperties
    tag?: any
    size?: string
    lh?: number
    delay?: number
    step?: number
    style?: CSSProperties
    className?: string
}) => {
    const Tag = tag
    let k = 0
    return (
        <Tag
            className={`rw-hd${on ? " is-on" : ""}${className ? " " + className : ""}`}
            aria-label={plainOf(text)}
            style={{ ...D, fontSize: size, lineHeight: lh, ...(style || {}) }}
        >
            {String(text)
                .split("|")
                .map((line, li) => (
                    <span key={li} className="rw-hd-l" aria-hidden>
                        {splitWords(line).map((w, i) => {
                            const d = delay + k++ * step
                            return (
                                <span
                                    key={i}
                                    className={`rw-hd-w${w.acc ? " is-accw" : ""}`}
                                >
                                    <span
                                        className={`rw-hd-i${w.acc ? " is-acc" : ""}`}
                                        style={{
                                            transitionDelay: `${d}ms`,
                                            ["--pd" as any]: `${d + 500}ms`,
                                        }}
                                    >
                                        {w.acc ? (
                                            <span className="rw-it">
                                                {w.t}
                                                {w.tail}
                                                <svg
                                                    className="rw-spark"
                                                    viewBox="0 0 24 24"
                                                    aria-hidden
                                                >
                                                    <path d="M12 1.5C12.9 8 16 11.1 22.5 12 16 12.9 12.9 16 12 22.5 11.1 16 8 12.9 1.5 12 8 11.1 11.1 8 12 1.5Z" />
                                                </svg>
                                            </span>
                                        ) : (
                                            <>
                                                {w.t}
                                                {w.tail}
                                            </>
                                        )}
                                    </span>{" "}
                                </span>
                            )
                        })}
                    </span>
                ))}
        </Tag>
    )
}
export const Eyebrow = ({
    text,
    on,
    M,
    delay = 0,
    style,
}: {
    text: string
    on: boolean
    M: CSSProperties
    delay?: number
    style?: CSSProperties
}) =>
    text ? (
        <p
            className={`rw-eb${on ? " is-on" : ""}`}
            style={{ ...M, transitionDelay: `${delay}ms`, ...(style || {}) }}
        >
            <i aria-hidden />
            {text}
        </p>
    ) : null
// one-shot rise for copy / rows
export const rise = (on: boolean, d = 0, y = 22): CSSProperties => ({
    opacity: on ? 1 : 0,
    translate: on ? "0 0" : `0 ${y}px`,
    transition: `opacity .9s ease ${d}ms, translate 1s cubic-bezier(.2,.8,.2,1) ${d}ms`,
})
// Image that UNMASKS through a shape as it enters, settles from a zoom, then drifts with scroll (needs --sp on an ancestor).
export const SHAPES: Record<string, [string, string]> = {
    up: ["inset(100% 0 0 0)", "inset(0 0 0 0)"],
    down: ["inset(0 0 100% 0)", "inset(0 0 0 0)"],
    left: ["inset(0 100% 0 0)", "inset(0 0 0 0)"],
    right: ["inset(0 0 0 100%)", "inset(0 0 0 0)"],
    diag: [
        "polygon(0 100%,0 100%,0 100%,0 100%)",
        "polygon(0 -160%,260% 100%,0 100%,0 100%)",
    ],
    iris: ["circle(0% at 50% 55%)", "circle(85% at 50% 55%)"],
    arch: [
        "inset(100% 0 0 0 round 999px 999px 0 0)",
        "inset(0 0 0 0 round 999px 999px 0 0)",
    ],
    slit: ["inset(0 50% 0 50%)", "inset(0 0 0 0)"],
}
export const Um = ({
    src,
    alt = "",
    on,
    shape = "up",
    ratio = "4/5",
    delay = 0,
    par = 1,
    focus = "50% 40%",
    radius = 4,
    sizes = "(max-width: 809px) 100vw, 50vw",
    style,
    className,
    eager = false,
}: {
    src: string
    alt?: string
    on: boolean
    shape?: string
    ratio?: string
    delay?: number
    par?: number
    focus?: string
    radius?: number
    sizes?: string
    style?: CSSProperties
    className?: string
    eager?: boolean
}) => {
    const sh = SHAPES[shape] || SHAPES.up
    const im = RS(src, sizes)
    return (
        <div
            className={`rw-um${on ? " is-on" : ""}${className ? " " + className : ""}`}
            style={{
                aspectRatio: ratio,
                borderRadius: radius,
                clipPath: on ? sh[1] : sh[0],
                WebkitClipPath: on ? sh[1] : sh[0],
                transitionDelay: `${delay}ms`,
                ["--par" as any]: par,
                ...(style || {}),
            }}
        >
            <img
                src={im.src}
                srcSet={im.srcSet}
                sizes={im.sizes}
                alt={alt}
                loading={eager ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
                style={{ objectPosition: focus, transitionDelay: `${delay}ms` }}
            />
        </div>
    )
}

// ===== CONTENT =====
// In Framer, hidden CMS Collection Lists were read from the DOM. Here content comes from content/site.ts.
// To plug in a real CMS later, change only useCMS (keep it returning rows in the same shape).
export const SEED: Record<string, CmsRow[]> = CONTENT
// An override control wins only when it holds real text; empty (or a single space) inherits from the CMS.
export const pick = (o: any, fb: string) =>
    o !== undefined && o !== null && String(o).trim() ? String(o).trim() : fb
export const imgOf = (r: CmsRow | undefined, k = "img") =>
    String((r && r[k]) || "").split("?")[0]
// A cleared CMS image draws this quiet placeholder — never a stock photo, and list positions stay aligned with their rows.
export const EMPTY_IMG =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500' preserveAspectRatio='xMidYMid slice'><rect width='400' height='500' fill='#C9DCD7'/><rect x='120' y='170' width='160' height='160' rx='8' fill='none' stroke='#AEB6C6' stroke-width='1.5'/><rect x='100' y='150' width='200' height='200' rx='10' fill='none' stroke='#C3CAD8' stroke-width='1' stroke-dasharray='2 6'/></svg>"
    )
export const imgOr = (r: CmsRow | undefined, k = "img") =>
    imgOf(r, k) || EMPTY_IMG
export const cmsNum = (r: CmsRow | undefined, k: string, fb = 0) => {
    const v = parseFloat(String((r && r[k]) ?? ""))
    return isFinite(v) ? v : fb
}
export function useCMS(kind: string, fallback: CmsRow[]): CmsRow[] {
    const rows = CONTENT[kind] || fallback || []
    return [...rows].sort(
        (a, b) => (parseFloat(a.n1) || 0) - (parseFloat(b.n1) || 0)
    )
}
// The one-row Site collection holds every agency-wide fact (name, contact, booking link, proof numbers). A section's "… Override" control only replaces it on that one section.
export function useSite() {
    const r = useCMS("site", SEED.site || [])
    const s = r[0] || (SEED.site || [])[0] || {}
    const g = (k: string) => String(s[k] ?? "").trim()
    return {
        name: g("f1") || "BOS Media Labs",
        role: g("f2"),
        tagline: g("f3"),
        email: g("f4"),
        phone: g("f5"),
        book: g("f6") || "/#contact",
        city: g("f7"),
        tz: g("f8") || "America/New_York",
        rating: g("f9") || "4.9",
        reviews: g("f10"),
        socials: g("f11"),
        announce: g("f12"),
        clients: g("f13"),
    }
}
export const linkList = (s: string) =>
    String(s || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => {
            const i = x.indexOf(":")
            return {
                l: i < 0 ? x : x.slice(0, i).trim(),
                h: i < 0 ? "/" : x.slice(i + 1).trim(),
            }
        })
export const listOf = (s: string) =>
    String(s || "")
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean)

// The row a CMS detail page is about: the Slug prop wins, else the last URL segment, else the first row.
export function useRow(kind: string, fallback: CmsRow[], slug?: string) {
    const rows = useCMS(kind, fallback)
    const [path, setPath] = useState("")
    useEffect(() => {
        try {
            setPath(
                decodeURIComponent(
                    window.location.pathname.split("/").filter(Boolean).pop() ||
                        ""
                )
            )
        } catch (e) {}
    }, [])
    const want = String(slug || "").trim() || path
    const row = rows.find((r) => r.slug === want) || rows[0] || ({} as CmsRow)
    return { row, rows }
}
export const crumbs = (s: string) => linkList(s)

// Open now? Open Hours = "1-6 07:00-19:00" (weekday numbers, Mon = 1 … Sun = 7) evaluated in the Site Time Zone.
export function openState(
    spec: string,
    tz: string
): { open: boolean; label: string } | null {
    try {
        const m = String(spec || "").match(
            /(\d)\s*-\s*(\d)\s+(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/
        )
        if (!m) return null
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: tz || "UTC",
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).formatToParts(new Date())
        const g = (t: string) =>
            (parts.find((p) => p.type === t) || { value: "" }).value
        const wd =
            ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(
                g("weekday")
            ) + 1
        const mins = (Number(g("hour")) % 24) * 60 + Number(g("minute"))
        const d1 = Number(m[1]),
            d2 = Number(m[2]),
            a = Number(m[3]) * 60 + Number(m[4]),
            b = Number(m[5]) * 60 + Number(m[6])
        const open = wd >= d1 && wd <= d2 && mins >= a && mins < b
        return {
            open,
            label: open
                ? `Open · till ${m[5].padStart(2, "0")}:${m[6]}`
                : `Closed · opens ${m[3].padStart(2, "0")}:${m[4]}`,
        }
    } catch (e) {
        return null
    }
}
