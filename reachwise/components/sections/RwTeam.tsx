"use client"
import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from "react"
import { addPropertyControls, ControlType } from "@/lib/controls"
import {
    RS,
    useFonts,
    useStill,
    useLive,
    useSize,
    useReduced,
    clamp01,
    type Pal,
    colorsOf,
    cssVars,
    COLOR_CONTROLS,
    FONT_CONTROLS,
    siteFontCss,
    fontsOf,
    BP_CONTROL,
    Btn,
    useMagnet,
    useScrollVars,
    useOn,
    Head,
    Eyebrow,
    rise,
    SEED,
    pick,
    imgOr,
    useCMS,
} from "@/lib/rw"

// ===== RwTeam =====
interface TeamProps extends Pal {
    customFonts: boolean
    displayFont: any
    bodyFont: any
    monoFont: any
    bpHint: string
    eyebrow: string
    heading: string
    subCopy: string
    button: string
    buttonLink: string
    signalLabel: string
    linkedinLabel: string
    style?: CSSProperties
}
// ---- THE CREW: six specialists start in greyscale. A lime SIGNAL RING travels along the row with scroll; every portrait it passes is "reached":
// it blooms into colour, its Focus pill pops with a pink dot and the readout counts up. Hover: the card lifts, the portrait zooms, a LinkedIn chip slides up. ----
export default function RwTeam(props: TeamProps) {
    const {
        eyebrow = "(07) Team",
        heading = "Specialists,|not *generalists*.",
        subCopy = "",
        button = "Meet the team",
        buttonLink = "/about",
        signalLabel = "Specialists reached",
        linkedinLabel = "LinkedIn",
        bpHint = "auto",
    } = props
    const c = colorsOf(props)
    const { D, B, M } = fontsOf(props)
    useFonts()
    const live = useLive()
    const rm = useReduced()
    const still = useStill()
    const root = useRef<HTMLElement>(null)
    const { w } = useSize(root, bpHint)
    const phone = w < 810,
        tab = w >= 810 && w < 1100
    const on = useOn(root, live, rm)
    useMagnet(root, live)
    const rows = useCMS("team", SEED.team || [])
    const n = rows.length
    // ring progress rp: 0 as the row comes up the screen → 1 once it sits in the upper half. Desktop = one pass; tablet = a serpentine pass per row;
    // phone = the ring crosses the visible strip (first card), the rest are reached as they are swiped into view.
    const ringEl = useRef<HTMLDivElement>(null)
    const rowEl = useRef<HTMLUListElement>(null)
    // phone scroll row: a focused card snaps fully into the row (to its own snap point, so scroll-snap keeps it) and into the viewport
    useEffect(() => {
        const R = rowEl.current
        if (!live || !R) return
        const f = (e: FocusEvent) => {
            const li = (e.target as HTMLElement).closest?.(
                "li"
            ) as HTMLElement | null
            if (!li || !R.contains(li)) return
            if (R.scrollWidth > R.clientWidth + 1) {
                const pl = parseFloat(getComputedStyle(R).paddingLeft) || 0
                R.scrollTo({
                    left: Math.max(0, li.offsetLeft - pl),
                    behavior: "auto",
                })
            }
            try {
                li.scrollIntoView({ block: "nearest", inline: "nearest" })
            } catch (x) {}
        }
        R.addEventListener("focusin", f)
        return () => R.removeEventListener("focusin", f)
    }, [live])
    const cols = phone ? 1 : tab ? 3 : Math.max(1, n)
    const rowsN = phone ? 1 : Math.max(1, Math.ceil(n / cols))
    const geo = useRef({ cols, rowsN, phone, n })
    geo.current = { cols, rowsN, phone, n }
    const [mask, setMask] = useState("")
    const maskRef = useRef("")
    const place = (rp: number) => {
        const g = geo.current
        let x = 0,
            y = 0.44
        const lit: boolean[] = []
        if (g.phone) {
            x = 0.02 + rp * 0.96
            y = 0.4
            for (let i = 0; i < g.n; i++) lit.push(i === 0 && x >= 0.4)
        } else {
            const t = rp * g.rowsN
            const seg = Math.min(g.rowsN - 1, Math.floor(t))
            const loc = rp >= 1 ? 1 : t - seg
            const lx = seg % 2 ? 1 - loc : loc
            x = -0.04 + lx * 1.08
            y = g.rowsN > 1 ? (seg + 0.5) / g.rowsN : 0.44
            for (let i = 0; i < g.n; i++) {
                const r = Math.floor(i / g.cols),
                    cI = i % g.cols,
                    cx = (cI + 0.5) / g.cols
                lit.push(
                    r < seg ||
                        (r === seg &&
                            (seg % 2 ? x <= cx + 0.03 : x >= cx - 0.03))
                )
            }
        }
        const el = ringEl.current
        if (el) {
            el.style.setProperty("--rx", `${(x * 100).toFixed(2)}%`)
            el.style.setProperty("--ry", `${(y * 100).toFixed(1)}%`)
        }
        const m = lit.map((b) => (b ? "1" : "0")).join("")
        if (m !== maskRef.current) {
            maskRef.current = m
            setMask(m)
        }
    }
    useScrollVars(root, live, rm, (sp) => place(clamp01((sp - 0.2) / 0.42)))
    // phone: a card swiped into view is reached too
    const [seen, setSeen] = useState<number[]>([])
    useEffect(() => {
        if (!live || !phone || !rowEl.current) return
        const row = rowEl.current
        const io = new IntersectionObserver(
            (es) => {
                const add: number[] = []
                es.forEach((e) => {
                    if (e.isIntersecting)
                        add.push(Number((e.target as HTMLElement).dataset.i))
                })
                if (add.length)
                    setSeen((s) => Array.from(new Set([...s, ...add])))
            },
            { root: row, threshold: 0.6 }
        )
        Array.from(row.children).forEach((c, i) => {
            if (i > 0) io.observe(c)
        })
        return () => io.disconnect()
    }, [live, phone, n])
    const all = still || rm || !live
    useEffect(() => {
        const el = ringEl.current
        if (!el || !all) return
        const last = Math.max(0, n - 1)
        const cx = phone ? 0.42 : ((last % cols) + 0.5) / cols
        const cy = phone
            ? 0.4
            : rowsN > 1
              ? (Math.floor(last / cols) + 0.5) / rowsN
              : 0.44
        el.style.setProperty("--rx", `${cx * 100}%`)
        el.style.setProperty("--ry", `${cy * 100}%`)
    }, [all, n, cols, rowsN, phone])
    const isLit = (i: number) =>
        all || mask.charAt(i) === "1" || (phone && on && seen.includes(i))
    let L = 0
    for (let i = 0; i < n; i++) if (isLit(i)) L++
    const sub = pick(
        subCopy,
        "Every account gets a senior lead for each channel you buy. No juniors learning on your budget, no hand-offs."
    )
    return (
        <section
            ref={root as any}
            className={`rw rw-sec rwtm${phone ? " is-ph" : tab ? " is-tab" : ""}${on ? " is-on" : ""}${all ? " is-still" : ""}`}
            style={{
                ...cssVars(c),
                ...B,
                ["--n" as any]: Math.max(1, n),
                ...(props.style || {}),
            }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html:
                        CSS_TEAM + siteFontCss(props),
                }}
            />
            <div className="rw-wrap">
                <div className="rwtm-top">
                    <div className="rwtm-hl">
                        <Eyebrow text={eyebrow} on={on} M={M} />
                        <Head
                            text={heading}
                            on={on}
                            D={D}
                            size="clamp(40px,4.6vw,68px)"
                            lh={0.95}
                            delay={120}
                        />
                    </div>
                    <div className="rwtm-side" style={rise(on, 360)}>
                        {sub && <p className="rwtm-sub">{sub}</p>}
                        <div className="rwtm-act">
                            {button && (
                                <Btn
                                    href={buttonLink || "/about"}
                                    label={button}
                                    kind="ghost"
                                />
                            )}
                            {n > 0 && (
                                <p className="rwtm-read" style={M} aria-hidden>
                                    <i className="rwtm-read-r" />
                                    <span>{signalLabel}</span>
                                    <b style={D}>
                                        <span className="rwtm-read-n">
                                            {String(L).padStart(2, "0")}
                                        </span>
                                        <span className="rwtm-read-d">
                                            /{String(n).padStart(2, "0")}
                                        </span>
                                    </b>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                {n > 0 && (
                    <div className="rwtm-stage">
                        <div ref={ringEl} className="rwtm-ring" aria-hidden>
                            <i />
                            <i />
                            <i />
                        </div>
                        <ul ref={rowEl} className="rwtm-row" role="list">
                            {rows.map((r, i) => {
                                const reached = isLit(i)
                                const href = `/team/${r.slug}`
                                return (
                                    <li
                                        key={r.slug || i}
                                        data-i={i}
                                        className={`rwtm-card${reached ? " is-lit" : ""}`}
                                        style={{
                                            ["--i" as any]: i,
                                            ...rise(on, 200 + i * 80, 34),
                                        }}
                                    >
                                        <figure className="rwtm-ph">
                                            <img
                                                {...RS(
                                                    imgOr(r),
                                                    "(max-width: 809px) 72vw, (max-width: 1099px) 31vw, 16vw"
                                                )}
                                                alt={
                                                    r.f1
                                                        ? `${r.f1}, ${r.f2}`
                                                        : ""
                                                }
                                                loading="lazy"
                                                decoding="async"
                                                draggable={false}
                                            />
                                            <span
                                                className="rwtm-flash"
                                                aria-hidden
                                            />
                                            {r.f4 && (
                                                <span
                                                    className="rwtm-focus"
                                                    style={M}
                                                >
                                                    <i
                                                        className="rwtm-focus-i"
                                                        aria-hidden
                                                    >
                                                        <svg viewBox="0 0 24 24">
                                                            <path
                                                                d="M5 12.5l4.2 4.2L19 7"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="3"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    </i>
                                                    {r.f4}
                                                    <b
                                                        className="rwtm-dot"
                                                        aria-hidden
                                                    />
                                                </span>
                                            )}
                                            <span
                                                className="rwtm-idx"
                                                style={M}
                                                aria-hidden
                                            >
                                                {String(i + 1).padStart(2, "0")}
                                            </span>
                                        </figure>
                                        <div className="rwtm-cap">
                                            <h3 className="rwtm-name" style={D}>
                                                <a
                                                    className="rwtm-link"
                                                    href={href}
                                                >
                                                    {r.f1}
                                                </a>
                                            </h3>
                                            <p className="rwtm-role">{r.f2}</p>
                                        </div>
                                        {r.f5 && (
                                            <a
                                                className="rwtm-in"
                                                href={r.f5}
                                                target="_blank"
                                                rel="noopener"
                                                style={M}
                                                aria-label={`${r.f1} on ${linkedinLabel}`}
                                            >
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    aria-hidden
                                                >
                                                    <path
                                                        fill="currentColor"
                                                        d="M6.9 8.8H3.6V20h3.3V8.8zM5.2 3.5a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM20.4 13.4c0-3-1.6-4.9-4.2-4.9-1.4 0-2.4.7-2.9 1.5V8.8H10V20h3.3v-5.7c0-1.5.6-2.6 2-2.6 1.3 0 1.8 1 1.8 2.6V20h3.3v-6.6z"
                                                    />
                                                </svg>
                                                {linkedinLabel}
                                            </a>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </section>
    )
}
const CSS_TEAM = `
.rwtm{background:var(--rw-bone);color:var(--rw-ink);padding:clamp(96px,10vw,160px) 0 clamp(96px,10vw,160px);overflow:hidden;overflow:clip}
.rwtm .rw-eb i{border:1px solid var(--rw-ink);animation:rwtm-eb 1.8s cubic-bezier(.2,.6,.3,1) infinite} @keyframes rwtm-eb{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--rw-ink) 35%,transparent)}100%{box-shadow:0 0 0 8px transparent}}
.rwtm .rw-hd{letter-spacing:-.045em}
.rwtm .rw-it{color:var(--rw-ink);font-weight:inherit;padding:0 .08em;margin:0 -.04em;isolation:isolate;display:inline-block}
.rwtm .rw-it::before{content:"";position:absolute;z-index:-1;left:0;right:0;top:.12em;bottom:.04em;border-radius:.16em;background:var(--rw-brass);transform:scaleX(0);transform-origin:left;transition:transform .9s cubic-bezier(.7,0,.2,1) .7s}
.rwtm .rw-hd.is-on .rw-it::before{transform:none}
.rwtm-top{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:32px 64px;align-items:end}
.rwtm-hl{display:flex;flex-direction:column;gap:26px}
.rwtm-side{display:flex;flex-direction:column;gap:24px;padding-bottom:6px}
.rwtm-sub{margin:0;max-width:440px;font-size:17px;line-height:1.55;color:var(--rw-mut)}
.rwtm-act{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
.rwtm-read{display:flex;align-items:center;gap:10px;margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--rw-mut)}
.rwtm-read b{display:inline-flex;align-items:baseline;font-size:30px;letter-spacing:-.04em;color:var(--rw-ink);font-weight:700;text-transform:none;font-variant-numeric:tabular-nums}
.rwtm-read-d{font-size:15px;color:var(--rw-mut);margin-left:2px}
.rwtm-read-r{position:relative;width:12px;height:12px;border-radius:50%;background:var(--rw-brass);box-shadow:0 0 0 1px var(--rw-ink)} .rwtm-read-r::after{content:"";position:absolute;inset:-1px;border-radius:50%;box-shadow:0 0 0 1.5px var(--rw-ink);animation:rwtm-ping 1.8s cubic-bezier(.2,.6,.3,1) infinite}
@keyframes rwtm-ping{0%{opacity:.8;transform:scale(1)}100%{opacity:0;transform:scale(2.6)}}
/* stage + ring */
.rwtm-stage{position:relative;margin-top:clamp(56px,6vw,96px)}
.rwtm-ring{position:absolute;z-index:3;left:var(--rx,-4%);top:var(--ry,44%);width:clamp(260px,26vw,420px);aspect-ratio:1;translate:-50% -50%;border-radius:50%;pointer-events:none;box-shadow:0 0 0 2px var(--rw-brass),0 0 40px 2px color-mix(in srgb,var(--rw-brass) 55%,transparent),inset 0 0 40px 0 color-mix(in srgb,var(--rw-brass) 35%,transparent);opacity:0;transition:opacity .8s,top .9s cubic-bezier(.6,0,.2,1)}
.rwtm.is-on .rwtm-ring{opacity:1}
.rwtm-ring i{position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 1.5px var(--rw-brass);opacity:0;animation:rwtm-wave 2.6s cubic-bezier(.2,.6,.3,1) infinite} .rwtm-ring i:nth-child(2){animation-delay:.85s} .rwtm-ring i:nth-child(3){animation-delay:1.7s}
@keyframes rwtm-wave{0%{opacity:.7;transform:scale(.55)}100%{opacity:0;transform:scale(1.25)}}
/* the row */
.rwtm-row{position:relative;z-index:1;display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:clamp(12px,1.2vw,20px);list-style:none;margin:0;padding:0 0 56px}
.rwtm-card{position:relative;display:grid;grid-template-rows:auto auto;row-gap:14px;align-content:start} .rwtm-ph{grid-area:1/1}
.rwtm-card:nth-child(even){margin-top:56px;margin-bottom:-56px}
.rwtm-ph{position:relative;margin:0;aspect-ratio:3/4;border-radius:22px;overflow:hidden;background:color-mix(in srgb,var(--rw-stone) 22%,transparent);transition:translate .6s cubic-bezier(.2,.8,.2,1),box-shadow .6s}
.rwtm-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 30%;display:block;filter:grayscale(1) contrast(1.06) brightness(.94);transition:filter 1.1s cubic-bezier(.2,.8,.2,1),scale 1s cubic-bezier(.2,.8,.2,1);user-select:none}
.rwtm-card.is-lit .rwtm-ph img{filter:grayscale(0) contrast(1) brightness(1)}
.rwtm-flash{position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 3px var(--rw-brass);opacity:0;pointer-events:none}
.rwtm-card.is-lit .rwtm-flash{animation:rwtm-flash 1.1s ease-out}
@keyframes rwtm-flash{0%{opacity:1}100%{opacity:0}}
.rwtm-focus{position:absolute;left:10px;top:10px;display:inline-flex;align-items:center;gap:7px;padding:5px 11px 5px 5px;border-radius:999px;background:var(--rw-cloud);color:var(--rw-ink);font-size:11px;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 10px 24px -12px rgba(0,0,0,.45);transform-origin:0 50%;scale:.86;opacity:.72;transition:scale .5s cubic-bezier(.34,1.56,.64,1),opacity .4s}
.rwtm-focus-i{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:color-mix(in srgb,var(--rw-ink) 10%,transparent);color:transparent;transition:background .4s,color .4s} .rwtm-focus-i svg{width:11px;height:11px}
.rwtm-dot{position:absolute;right:-3px;top:-3px;width:10px;height:10px;border-radius:50%;background:#A2C2BE;box-shadow:0 0 0 2px var(--rw-cloud);scale:0;transition:scale .45s cubic-bezier(.34,1.56,.64,1) .15s}
.rwtm-card.is-lit .rwtm-focus{scale:1;opacity:1} .rwtm-card.is-lit .rwtm-focus-i{background:var(--rw-brass);color:var(--rw-ink)} .rwtm-card.is-lit .rwtm-dot{scale:1}
.rwtm-idx{position:absolute;right:12px;top:12px;font-size:11px;letter-spacing:.1em;color:var(--rw-cloud);text-shadow:0 1px 8px rgba(0,0,0,.5)}
.rwtm-cap{grid-area:2/1;display:flex;flex-direction:column;gap:4px;padding:0 4px}
.rwtm-name{margin:0;font-size:clamp(19px,1.5vw,23px);line-height:1.1;letter-spacing:-.03em;font-weight:700}
.rwtm-link{text-decoration:none;color:inherit} .rwtm-link::after{content:"";position:absolute;inset:0;z-index:1;border-radius:22px}
.rwtm-role{margin:0;font-size:14.5px;line-height:1.35;color:var(--rw-mut)}
.rwtm-in{position:relative;z-index:2;grid-area:1/1;align-self:end;justify-self:center;margin-bottom:14px;display:inline-flex;align-items:center;gap:7px;padding:8px 14px 8px 10px;border-radius:999px;background:var(--rw-ink);color:var(--rw-cloud);font-size:11px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;white-space:nowrap;translate:0 14px;opacity:0;transition:translate .5s cubic-bezier(.2,.8,.2,1),opacity .35s,background .3s,color .3s}
.rwtm-in svg{width:13px;height:13px} .rwtm-in:hover{background:var(--rw-brass);color:var(--rw-ink)}
.rwtm-card:focus-within .rwtm-in{translate:0 0;opacity:1}
@media (hover:hover) and (pointer:fine){
.rwtm-card:hover .rwtm-ph{translate:0 -8px;box-shadow:0 30px 50px -28px rgba(13,14,16,.55)}
.rwtm-card:hover .rwtm-ph img{scale:1.05}
.rwtm-card:hover .rwtm-in{translate:0 -8px;opacity:1}
.rwtm-card:hover .rwtm-name{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:4px;text-decoration-color:var(--rw-brass)}}
/* tablet: 3 columns, ring travels over each row pair */
.rwtm.is-tab .rwtm-top{grid-template-columns:1fr;align-items:start}
.rwtm.is-tab .rwtm-row{grid-template-columns:repeat(3,minmax(0,1fr));row-gap:40px;padding-bottom:0}
.rwtm.is-tab .rwtm-card:nth-child(even){margin:0} .rwtm.is-tab .rwtm-card:nth-child(3n+2){margin-top:40px;margin-bottom:-40px}
.rwtm.is-tab .rwtm-row{padding-bottom:40px}
.rwtm.is-tab .rwtm-ring{width:300px}
/* phone: horizontal scroll-snap row */
.rwtm.is-ph{padding:88px 0 80px} .rwtm.is-ph .rwtm-top{grid-template-columns:1fr;gap:24px} .rwtm.is-ph .rwtm-sub{font-size:16px}
.rwtm.is-ph .rwtm-stage{margin:40px -20px 0}
.rwtm.is-ph .rwtm-row{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 20px 8px;scroll-padding:0 20px;scrollbar-width:none;-webkit-overflow-scrolling:touch} .rwtm.is-ph .rwtm-row::-webkit-scrollbar{display:none}
.rwtm.is-ph .rwtm-card{flex:0 0 72vw;scroll-snap-align:start;margin:0}
.rwtm.is-ph .rwtm-ring{width:240px}
.rwtm.is-ph .rwtm-name{font-size:21px} .rwtm.is-ph .rwtm-in{translate:0 0;opacity:1}
@media (prefers-reduced-motion:reduce){.rwtm-ring i{animation:none}}
`
addPropertyControls(RwTeam, {
    ...COLOR_CONTROLS,
    ...FONT_CONTROLS,
    ...BP_CONTROL,
    eyebrow: {
        type: ControlType.String,
        title: "Eyebrow",
        defaultValue: "(07) Team",
    },
    heading: {
        type: ControlType.String,
        title: "Heading",
        description: "| = line break, *words* = lime highlight",
        defaultValue: "Specialists,|not *generalists*.",
        displayTextArea: true,
    },
    subCopy: {
        type: ControlType.String,
        title: "Text",
        defaultValue:
            "Every account gets a senior lead for each channel you buy. No juniors learning on your budget, no hand-offs.",
        displayTextArea: true,
    },
    button: {
        type: ControlType.String,
        title: "Button",
        defaultValue: "Meet the team",
    },
    buttonLink: {
        type: ControlType.Link,
        title: "Button link",
        defaultValue: "/about",
    },
    signalLabel: {
        type: ControlType.String,
        title: "Counter label",
        defaultValue: "Specialists reached",
    },
    linkedinLabel: {
        type: ControlType.String,
        title: "LinkedIn label",
        defaultValue: "LinkedIn",
    },
})
