"use client"
import {
    useRef,
    useState,
    type CSSProperties,
} from "react"
import { addPropertyControls, ControlType } from "@/lib/framer"
import {
    useFonts,
    useStill,
    useLive,
    useSize,
    useReduced,
    type Pal,
    colorsOf,
    cssVars,
    COLOR_CONTROLS,
    FONT_CONTROLS,
    siteFontCss,
    fontsOf,
    BP_CONTROL,
    useScrollVars,
    useOn,
    Head,
    Eyebrow,
    rise,
    listOf,
} from "@/lib/rw"

// ===== RwNumbers =====
interface NumbersProps extends Pal {
    customFonts: boolean
    displayFont: any
    bodyFont: any
    monoFont: any
    bpHint: string
    eyebrow: string
    heading: string
    intro: string
    reportLabel: string
    liveLabel: string
    tabs: string
    range: string
    kpis: string
    deltaLabel: string
    months: string
    events: string
    style?: CSSProperties
}
// ---- THE REPORT: the lime sheet rises over the funnel like a client report opening. An ink dashboard holds 4 KPI tiles: each number is an odometer
// that spins into place when the report enters view, each sparkline DRAWS with the scroll (--sp, staggered), and a live ticker of events runs
// along the bottom. Hover a sparkline: a point + tooltip with that month's value. ----
const nmParse = (s: string) => {
    const m = String(s || "")
        .trim()
        .match(/^([^\d.-]*)(-?[\d,]*\.?\d+)(.*)$/)
    if (!m) return null
    const raw = m[2]
    return {
        pre: m[1],
        n: parseFloat(raw.replace(/,/g, "")),
        dec: (raw.split(".")[1] || "").length,
        suf: m[3],
    }
}
const nmHash = (s: string) => {
    let h = 11
    for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0
    return h
}
// 12 monthly values that end at the KPI (seeded, so server and client agree)
const nmSeries = (v: string, key: string, up: boolean) => {
    const p = nmParse(v)
    if (!p) return null
    const h = nmHash(key)
    const out: number[] = []
    for (let i = 0; i < 12; i++) {
        const t = i / 11
        const base = up
            ? 0.3 + 0.7 * Math.pow(t, 1.35)
            : 1 - 0.55 * Math.pow(t, 1.2)
        const wig = i === 11 ? 0 : ((((h >> (i * 2)) & 7) - 3.5) / 3.5) * 0.06
        out.push(p.n * Math.max(0.05, base + wig))
    }
    return { vals: out, p }
}
const nmFmt = (n: number, p: { pre: string; dec: number; suf: string }) =>
    `${p.pre}${n.toLocaleString("en-US", { minimumFractionDigits: p.dec, maximumFractionDigits: p.dec })}${p.suf}`
// odometer: every digit is a 20-row column that spins a full turn before it lands (keyed from the right)
const NmOdo = ({ text, on }: { text: string; on: boolean }) => {
    const a = String(text).split("")
    let dk = 0
    return (
        <span className="rwnm-odo" aria-label={text}>
            {a.map((ch, i) =>
                /\d/.test(ch) ? (
                    <span key={a.length - i} className="rwnm-od" aria-hidden>
                        <span
                            style={{
                                transform: `translateY(${on ? -(10 + Number(ch)) * 5 : 0}%)`,
                                transitionDelay: `${dk++ * 90}ms`,
                            }}
                        >
                            {"01234567890123456789".split("").map((d, k) => (
                                <i key={k}>{d}</i>
                            ))}
                        </span>
                    </span>
                ) : (
                    <span key={a.length - i} className="rwnm-oc" aria-hidden>
                        {ch}
                    </span>
                )
            )}
        </span>
    )
}
export default function RwNumbers(props: NumbersProps) {
    const {
        eyebrow = "(05) The numbers",
        heading = "What our clients|*got* last year.",
        intro = "",
        reportLabel = "Client report · 2025",
        liveLabel = "Live",
        tabs = "Overview, SEO, Social, Ads",
        range = "Last 12 months",
        kpis = "212%:average organic growth:up;6.2×:return on ad spend:up;38M:people reached in 2025:up;140+:brands grown since 2016:up",
        deltaLabel = "vs last year",
        months = "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec",
        events = "",
        bpHint = "auto",
    } = props
    const c = colorsOf(props)
    const { D, B, M } = fontsOf(props)
    useFonts()
    const live = useLive()
    const rm = useReduced()
    const still = useStill()
    const DH: CSSProperties = {
        ...D,
        fontWeight: props.customFonts
            ? D.fontWeight
            : ("var(--rw-font-dw, 700)" as any),
    }
    const root = useRef<HTMLElement>(null)
    const dash = useRef<HTMLDivElement>(null)
    const { w } = useSize(root, bpHint)
    const phone = w < 810,
        tab = w >= 810 && w < 1100
    const on = useOn(root, live, rm)
    const dOn = useOn(dash, live, rm, 0.3)
    useScrollVars(root, live, rm)
    const K = listOf(kpis)
        .slice(0, 4)
        .map((x) => {
            const [v, l, d] = x.split(":").map((y) => (y || "").trim())
            return {
                v: v || "",
                l: l || "",
                up: (d || "up").toLowerCase() !== "down",
            }
        })
    const MO = String(months)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    const TB = String(tabs)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    const EV = listOf(events)
    const [hv, setHv] = useState<{ k: number; i: number } | null>(null)
    const moveOn = (k: number) => (e: any) => {
        const r = (e.currentTarget as SVGElement).getBoundingClientRect()
        const i = Math.max(
            0,
            Math.min(
                11,
                Math.round(((e.clientX - r.left) / Math.max(1, r.width)) * 11)
            )
        )
        if (!hv || hv.k !== k || hv.i !== i) setHv({ k, i })
    }
    const PW = 300,
        PH = 80
    return (
        <section
            ref={root as any}
            className={`rw rw-sec rw-lt rwnm${phone ? " is-ph" : tab ? " is-tab" : ""}${live && !rm && !still ? " is-live" : ""}${on ? " is-in" : ""}`}
            style={{ ...cssVars(c), ...B, ...(props.style || {}) }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html:
                        CSS_NUMBERS +
                        siteFontCss(props),
                }}
            />
            <div className="rw-wrap">
                <div className="rwnm-head">
                    <div className="rwnm-hl">
                        <Eyebrow text={eyebrow} on={on} M={M} />
                        <Head
                            text={heading}
                            on={on}
                            D={DH}
                            size="clamp(40px,4.6vw,68px)"
                            lh={0.95}
                            delay={120}
                        />
                    </div>
                    <div className="rwnm-hr" style={rise(on, 360)}>
                        {intro && <p className="rwnm-intro">{intro}</p>}
                    </div>
                </div>
                <div
                    ref={dash}
                    className={`rwnm-dash${dOn ? " is-on" : ""}`}
                    style={rise(on, 200, 40)}
                >
                    <div className="rwnm-top" style={M}>
                        <span className="rwnm-rep">
                            <i className="rwnm-live" aria-hidden />
                            {reportLabel}
                            <b>{liveLabel}</b>
                        </span>
                        {!phone && (
                            <span className="rwnm-tabs" aria-hidden>
                                {TB.map((t, i) => (
                                    <span
                                        key={i}
                                        className={i === 0 ? "is-act" : ""}
                                    >
                                        {t}
                                    </span>
                                ))}
                            </span>
                        )}
                        {!phone && <span className="rwnm-range">{range}</span>}
                    </div>
                    <ul className="rwnm-grid">
                        {K.map((k, ki) => {
                            const S = nmSeries(k.v, k.l + ki, k.up)
                            const pts = S
                                ? S.vals.map((v, i) => {
                                      const mx = Math.max(...S.vals),
                                          mn = Math.min(...S.vals) * 0.9
                                      return [
                                          (i / 11) * PW,
                                          PH -
                                              6 -
                                              ((v - mn) /
                                                  Math.max(1e-6, mx - mn)) *
                                                  (PH - 14),
                                      ]
                                  })
                                : []
                            const d = pts
                                .map(
                                    (p, i) =>
                                        (i ? "L" : "M") +
                                        p[0].toFixed(1) +
                                        "," +
                                        p[1].toFixed(1)
                                )
                                .join(" ")
                            const hi = hv && hv.k === ki ? hv.i : -1
                            return (
                                <li
                                    key={ki}
                                    className="rwnm-tile"
                                    style={{ ["--i" as any]: ki }}
                                >
                                    <p className="rwnm-lab" style={M}>
                                        <span>
                                            {String(ki + 1).padStart(2, "0")}
                                        </span>
                                        {k.l}
                                    </p>
                                    <p className="rwnm-num" style={D}>
                                        <NmOdo text={k.v} on={dOn} />
                                    </p>
                                    <p className="rwnm-delta" style={M}>
                                        <b aria-hidden>{k.up ? "▲" : "▼"}</b>
                                        {deltaLabel}
                                    </p>
                                    {S && (
                                        <div className="rwnm-sp">
                                            <svg
                                                viewBox={`0 -4 ${PW} ${PH + 8}`}
                                                preserveAspectRatio="none"
                                                onPointerMove={moveOn(ki)}
                                                onPointerLeave={() =>
                                                    setHv(null)
                                                }
                                                aria-hidden
                                            >
                                                <path
                                                    className="rwnm-area"
                                                    d={`${d} L${PW},${PH} L0,${PH} Z`}
                                                />
                                                <path
                                                    className="rwnm-ln"
                                                    d={d}
                                                    pathLength={1}
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                            </svg>
                                            {hi >= 0 && (
                                                <>
                                                    <i
                                                        className="rwnm-pt"
                                                        style={{
                                                            left: `${(pts[hi][0] / PW) * 100}%`,
                                                            top: `${((pts[hi][1] + 4) / (PH + 8)) * 100}%`,
                                                        }}
                                                    />
                                                    <span
                                                        className="rwnm-tt"
                                                        style={{
                                                            ...M,
                                                            left: `${(pts[hi][0] / PW) * 100}%`,
                                                            top: `${((pts[hi][1] + 4) / (PH + 8)) * 100}%`,
                                                        }}
                                                    >
                                                        {MO[
                                                            hi %
                                                                Math.max(
                                                                    1,
                                                                    MO.length
                                                                )
                                                        ] || ""}{" "}
                                                        ·{" "}
                                                        {nmFmt(S.vals[hi], S.p)}
                                                    </span>
                                                </>
                                            )}
                                            <p
                                                className="rwnm-ax"
                                                style={M}
                                                aria-hidden
                                            >
                                                <span>{MO[0]}</span>
                                                <span>{MO[MO.length - 1]}</span>
                                            </p>
                                        </div>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </div>
            {EV.length > 0 && (
                <div
                    className="rwnm-tick"
                    style={M}
                    aria-label="Recent client events"
                >
                    <div className="rwnm-tick-in">
                        {[0, 1].map((r) => (
                            <ul key={r} aria-hidden={r === 1 || undefined}>
                                {EV.map((e, i) => (
                                    <li key={i}>
                                        <i />
                                        {e}
                                    </li>
                                ))}
                            </ul>
                        ))}
                    </div>
                </div>
            )}
        </section>
    )
}
const CSS_NUMBERS = `
.rwnm{margin-top:-32px;z-index:12;border-radius:32px 32px 0 0;background:var(--rw-brass);color:var(--rw-ink);padding:clamp(88px,9vw,136px) 0 0;overflow:hidden}
.rwnm .rw-hd{letter-spacing:-.045em}
.rwnm .rw-it{position:relative;font-weight:inherit;color:var(--rw-ink)}
.rwnm .rw-it::after{content:"";position:absolute;left:0;right:.02em;bottom:.02em;height:.085em;border-radius:.05em;background:var(--rw-ink);transform:scaleX(0);transform-origin:left;transition:transform .9s cubic-bezier(.7,0,.2,1) var(--pd,.6s)}
.rwnm .rw-hd.is-on .rw-it::after{transform:none}
.rwnm .rw-eb{background:var(--rw-ink);color:var(--rw-cloud);box-shadow:none}
.rwnm .rw-eb i{background:var(--rw-brass);animation:rwnm-pulse 1.8s infinite} @keyframes rwnm-pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--rw-brass) 80%,transparent)}100%{box-shadow:0 0 0 8px transparent}}
.rwnm-head{display:flex;align-items:flex-end;justify-content:space-between;gap:40px;margin-bottom:clamp(36px,4vw,56px)}
.rwnm-hl{display:flex;flex-direction:column;gap:24px} .rwnm-intro{margin:0;max-width:36ch;font-size:17px;line-height:1.5;color:color-mix(in srgb,var(--rw-ink) 78%,transparent)}
.rwnm-dash{border-radius:24px;background:var(--rw-ink);color:var(--rw-cloud);box-shadow:0 40px 80px -40px color-mix(in srgb,var(--rw-ink) 60%,transparent);overflow:hidden}
.rwnm-top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 22px;border-bottom:1px solid color-mix(in srgb,var(--rw-cloud) 12%,transparent);font-size:11.5px;letter-spacing:.1em;text-transform:uppercase}
.rwnm-rep{display:inline-flex;align-items:center;gap:10px} .rwnm-rep b{font-weight:500;padding:4px 9px;border-radius:999px;background:color-mix(in srgb,#FF3E88 18%,transparent);color:#FF8AB5}
.rwnm-live{width:8px;height:8px;border-radius:50%;background:#FF3E88;animation:rw-blink 1.4s ease-in-out infinite}
.rwnm-tabs{display:flex;gap:4px;padding:4px;border-radius:999px;background:color-mix(in srgb,var(--rw-cloud) 7%,transparent)} .rwnm-tabs span{padding:6px 12px;border-radius:999px;color:color-mix(in srgb,var(--rw-cloud) 60%,transparent)} .rwnm-tabs .is-act{background:var(--rw-brass);color:var(--rw-ink)}
.rwnm-range{color:color-mix(in srgb,var(--rw-cloud) 70%,transparent)}
.rwnm-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}
.rwnm-tile{position:relative;display:flex;flex-direction:column;gap:14px;padding:clamp(22px,2.2vw,34px);border-left:1px solid color-mix(in srgb,var(--rw-cloud) 12%,transparent);transition:background .4s}
.rwnm-tile:first-child{border-left:0} .rwnm-tile:hover{background:color-mix(in srgb,var(--rw-cloud) 4%,transparent)}
.rwnm-lab{display:flex;align-items:center;gap:10px;margin:0;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 72%,transparent);min-height:2.6em}
.rwnm-lab span{color:var(--rw-brass)}
.rwnm-num{margin:6px 0 0;font-size:clamp(56px,5.6vw,96px);line-height:.88;letter-spacing:-.055em;font-weight:var(--rw-font-dw,700)}
.rwnm-odo{display:inline-flex} .rwnm-od{display:inline-block;height:1em;overflow:hidden;clip-path:inset(0);line-height:1;vertical-align:top}
.rwnm-od>span{display:flex;flex-direction:column;transition:transform 1.6s cubic-bezier(.2,.8,.1,1)} .rwnm-od i{display:block;height:1em;font-style:normal}
.rwnm-oc{display:inline-block;line-height:1}
.rwnm-delta{display:inline-flex;align-items:center;gap:8px;width:max-content;margin:0;padding:5px 10px 5px 6px;border-radius:999px;background:color-mix(in srgb,var(--rw-brass) 14%,transparent);color:var(--rw-brass);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.rwnm-delta b{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--rw-brass);color:var(--rw-ink);font-size:8px;font-weight:600}
.rwnm-sp{position:relative;margin-top:auto;padding-top:10px}
.rwnm-sp svg{display:block;width:100%;height:84px;overflow:visible;cursor:crosshair}
.rwnm-ln{fill:none;stroke:var(--rw-brass);stroke-width:2.4;stroke-linejoin:round;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:calc(1 - clamp(0, (var(--sp) - .2 - var(--i) * .035) * 3.4, 1))}
.rwnm-area{fill:color-mix(in srgb,var(--rw-brass) 12%,transparent);opacity:clamp(0, (var(--sp) - .3 - var(--i) * .035) * 4, 1)}
.rwnm:not(.is-live) .rwnm-ln{stroke-dashoffset:0} .rwnm:not(.is-live) .rwnm-area{opacity:1}
.rwnm-pt{position:absolute;width:11px;height:11px;margin:-5.5px 0 0 -5.5px;border-radius:50%;background:var(--rw-brass);box-shadow:0 0 0 4px color-mix(in srgb,var(--rw-brass) 25%,transparent);pointer-events:none}
.rwnm-tt{position:absolute;translate:-50% calc(-100% - 14px);padding:6px 10px;border-radius:999px;background:var(--rw-cloud);color:var(--rw-ink);font-size:11px;letter-spacing:.04em;white-space:nowrap;pointer-events:none;box-shadow:0 10px 24px -10px rgba(0,0,0,.6)}
.rwnm-tile:first-child .rwnm-tt{translate:-20% calc(-100% - 14px)} .rwnm-tile:last-child .rwnm-tt{translate:-80% calc(-100% - 14px)}
.rwnm-ax{display:flex;justify-content:space-between;margin:8px 0 0;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 50%,transparent)}
/* ticker */
.rwnm-tick{margin-top:clamp(36px,4vw,56px);border-top:1px solid color-mix(in srgb,var(--rw-ink) 18%,transparent);padding:18px 0 20px;overflow:hidden;font-size:12px;letter-spacing:.08em;text-transform:uppercase;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.rwnm-tick-in{display:flex;width:max-content;animation:rwnm-mq 48s linear infinite} .rwnm-tick:hover .rwnm-tick-in{animation-play-state:paused}
.rwnm-tick ul{display:flex;list-style:none;margin:0;padding:0} .rwnm-tick li{display:inline-flex;align-items:center;gap:10px;padding-right:48px;white-space:nowrap}
.rwnm-tick li i{width:7px;height:7px;border-radius:50%;background:#FF3E88;box-shadow:0 0 0 2px var(--rw-ink)}
@keyframes rwnm-mq{to{transform:translateX(-50%)}}
/* tablet / phone */
.rwnm.is-tab .rwnm-grid{grid-template-columns:repeat(2,minmax(0,1fr))} .rwnm.is-tab .rwnm-tile:nth-child(odd){border-left:0} .rwnm.is-tab .rwnm-tile:nth-child(n+3){border-top:1px solid color-mix(in srgb,var(--rw-cloud) 12%,transparent)}
.rwnm.is-ph .rwnm-grid{grid-template-columns:1fr} .rwnm.is-ph .rwnm-tile{border-left:0;padding:22px 20px} .rwnm.is-ph .rwnm-tile+.rwnm-tile{border-top:1px solid color-mix(in srgb,var(--rw-cloud) 12%,transparent)}
.rwnm.is-ph .rwnm-head{flex-direction:column;align-items:flex-start;gap:20px} .rwnm.is-ph .rwnm-num{font-size:64px} .rwnm.is-ph .rwnm-lab{min-height:0}
.rwnm.is-ph .rwnm-top{padding:14px 18px} .rwnm.is-ph{padding-top:72px;border-radius:24px 24px 0 0;margin-top:-24px}
.rwnm.is-ph .rwnm-tile .rwnm-tt{translate:-50% calc(-100% - 14px)}
@media (prefers-reduced-motion:reduce){.rwnm-tick-in{animation:none} .rwnm-ln{stroke-dashoffset:0} .rwnm-area{opacity:1}}
`
addPropertyControls(RwNumbers, {
    ...COLOR_CONTROLS,
    ...FONT_CONTROLS,
    ...BP_CONTROL,
    eyebrow: {
        type: ControlType.String,
        title: "Eyebrow",
        defaultValue: "(05) The numbers",
    },
    heading: {
        type: ControlType.String,
        title: "Heading",
        description: "| = line break, *words* = underlined",
        defaultValue: "What our clients|*got* last year.",
        displayTextArea: true,
    },
    intro: {
        type: ControlType.String,
        title: "Intro",
        defaultValue:
            "Every client gets this report each month. These are the averages across all of them.",
        displayTextArea: true,
    },
    reportLabel: {
        type: ControlType.String,
        title: "Report label",
        defaultValue: "Client report · 2025",
    },
    liveLabel: {
        type: ControlType.String,
        title: "Live label",
        defaultValue: "Live",
    },
    tabs: {
        type: ControlType.String,
        title: "Report tabs",
        description: "Comma list, first one is shown active",
        defaultValue: "Overview, SEO, Social, Ads",
    },
    range: {
        type: ControlType.String,
        title: "Date range",
        defaultValue: "Last 12 months",
    },
    kpis: {
        type: ControlType.String,
        title: "Numbers",
        description: "Number:label:up|down; … (4)",
        defaultValue:
            "212%:average organic growth:up;6.2×:return on ad spend:up;38M:people reached in 2025:up;140+:brands grown since 2016:up",
        displayTextArea: true,
    },
    deltaLabel: {
        type: ControlType.String,
        title: "Change label",
        defaultValue: "vs last year",
    },
    months: {
        type: ControlType.String,
        title: "Months",
        defaultValue: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec",
    },
    events: {
        type: ControlType.String,
        title: "Ticker events",
        description: "; separated",
        displayTextArea: true,
        defaultValue:
            "New lead · Haven Realty · 2 min ago;Call booked · Northside Dental · 6 min ago;Reel passed 48k views · Kinfolk Coffee · 11 min ago;ROAS 6.4× today · Fitloop · 18 min ago;#1 for “skin clinic near me” · Lumen Skin · 26 min ago;5-star review · Orbit Legal · 34 min ago;New lead · Northside Dental · 41 min ago;212 new followers · Lumen Skin · 1 h ago",
    },
})
