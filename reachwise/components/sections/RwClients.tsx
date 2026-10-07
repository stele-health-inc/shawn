"use client"
import { useEffect, useRef, type CSSProperties } from "react"
import { addPropertyControls, ControlType } from "@/lib/framer"
import {
    type Pal,
    colorsOf,
    fontsOf,
    useFonts,
    useLive,
    useReduced,
    useStill,
    useSite,
    useSize,
    useOn,
    useMagnet,
    useScrollVars,
    onTick,
    pick,
    listOf,
    rise,
    cssVars,
    siteFontCss,
    Eyebrow,
    Head,
    COLOR_CONTROLS,
    FONT_CONTROLS,
    BP_CONTROL,
} from "@/lib/rw"

// ===== RwClients =====
interface ClientsProps extends Pal {
    customFonts: boolean
    displayFont: any
    bodyFont: any
    monoFont: any
    bpHint: string
    eyebrow: string
    heading: string
    line: string
    clientsCount: string
    ratingLine: string
    clients: string
    badges: string
    rings: string
    readout: string
    style?: CSSProperties
}
// ---- THE RADAR: a sonar screen on chalk. Client names sit as blips at fixed polar positions; a lime sweep turns with the scroll (~1.5 turns across
// the section's pass) plus a slow idle drift. Every blip the sweep crosses PINGS: a lime ring expands out of its dot, the name goes to full ink and a pink
// growth badge pops, then it relaxes over ~1.5 s. Hover a blip = the same ping. Reduced motion: sweep parked at 40°, the three blips it just passed lit. ----
const CL_STYLE = ["grot", "round", "cond", "mono"]
// hand-placed for the default ten (no label collisions; the west axis is kept free for the ring labels); any other count falls back to an even spiral
const CL_TEN: [number, number, number][] = [
    [18, 0.6, 1],
    [87, 0.86, 1],
    [108, 0.58, 1],
    [136, 0.82, 1],
    [160, 0.42, 0],
    [198, 0.84, 0],
    [244, 0.78, 0],
    [290, 0.74, 0],
    [215, 0.34, 0],
    [330, 0.84, 0],
]
const clPolar = (n: number) =>
    n === 10
        ? CL_TEN.map(([a, r, l]) => ({ a, r, l: !!l }))
        : Array.from({ length: n }, (_, i) => {
              const a =
                  ((i * 360) / Math.max(1, n) +
                      14 +
                      (((i * 53) % 23) - 11) +
                      360) %
                  360
              const r = 0.36 + ((i * 0.618034) % 1) * 0.5
              return { a, r, l: Math.sin((a * Math.PI) / 180) > 0.15 }
          })
const clNorm = (a: number) => ((a % 360) + 360) % 360
export default function RwClients(props: ClientsProps) {
    const {
        eyebrow = "(00) Clients",
        heading = "{n} brands|*on our radar*.",
        line = "Local clinics, cafés and online shops to national brands. Every one of them came to us to be found by more of the right people.",
        clientsCount = "",
        ratingLine = "",
        clients = "Northside Dental, Kinfolk Coffee, Fitloop, Haven Realty, Lumen Skin, Orbit Legal, Parcel & Co, Verde Studio, Tallow, Brightline",
        badges = "+212%;+96k;6.2×;+122;$142k;57 consults;+88%;+3.1×;+64%;+41k",
        rings = "Local;Regional;National;Global",
        readout = "Last ping",
        bpHint = "auto",
    } = props
    const c = colorsOf(props)
    const { D, B, M } = fontsOf(props)
    useFonts()
    const live = useLive()
    const rm = useReduced()
    const still = useStill()
    const site = useSite()
    const root = useRef<HTMLElement>(null)
    const scope = useRef<HTMLDivElement>(null)
    const sweep = useRef<HTMLDivElement>(null)
    const rd = useRef<HTMLSpanElement>(null)
    const { w } = useSize(root, bpHint)
    const phone = w < 810,
        tab = w >= 810 && w < 1100
    const on = useOn(root, live, rm)
    useMagnet(root, live)
    const n = pick(clientsCount, site.clients || "140+")
    const head = String(heading).replace("{n}", n)
    const names = String(clients)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    const nums = listOf(badges)
    const RG = listOf(rings)
    const pol = clPolar(names.length)
    const spR = useRef(0.5)
    useScrollVars(root, live, rm, (sp) => {
        spR.current = sp
    })
    // parked state (reduced motion): sweep at 40°, the 3 blips closest behind it are lit
    const PARK = 40
    const parked = new Set(
        pol
            .map((p, i) => ({ i, d: clNorm(PARK - p.a) }))
            .sort((a, b) => a.d - b.d)
            .slice(0, 3)
            .map((x) => x.i)
    )
    const moving = live && !rm && !still
    useEffect(() => {
        if (!moving || !root.current || !scope.current) return
        const el = scope.current
        const blips = Array.from(el.querySelectorAll<HTMLElement>(".rwcl-blip"))
        const hit = blips.map(() => -99)
        const lit = blips.map(() => false)
        let vis = false
        const io = new IntersectionObserver(
            (es) => {
                vis = es[0].isIntersecting
            },
            { rootMargin: "10% 0px 10% 0px" }
        )
        io.observe(el)
        let drift = 0,
            prev = 0,
            has = false,
            lastT = 0,
            cur = 0
        const off = onTick((t) => {
            if (!vis) {
                lastT = t
                return
            }
            const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0
            lastT = t
            drift += dt * 9
            const target = spR.current * 540 + drift - 120
            cur = has ? cur + (target - cur) * 0.2 : target
            const a = cur
            if (sweep.current)
                sweep.current.style.transform = `rotate(${a.toFixed(2)}deg)`
            if (has) {
                const lo = Math.min(prev, a),
                    hi = Math.max(prev, a)
                pol.forEach((p, i) => {
                    if (i >= blips.length) return
                    let x = false
                    if (hi - lo >= 360) x = true
                    else {
                        const k = Math.ceil((lo - p.a) / 360)
                        const v = p.a + 360 * k
                        x = v > lo && v <= hi
                    }
                    if (x) {
                        hit[i] = t
                        if (rd.current) {
                            const txt = `${names[i]} · ${nums[i % Math.max(1, nums.length)] || ""}`
                            if (rd.current.textContent !== txt)
                                rd.current.textContent = txt
                        }
                    }
                })
            }
            prev = a
            has = true
            blips.forEach((b, i) => {
                const want = t - hit[i] < 1500
                if (want !== lit[i]) {
                    lit[i] = want
                    b.classList.toggle("is-hit", want)
                }
            })
        })
        return () => {
            off()
            io.disconnect()
        }
    }, [moving, names.length, clients, badges])
    const rating = pick(
        ratingLine,
        `★ ${site.rating || "4.9"} · ${site.reviews || "126"} reviews`
    )
    return (
        <section
            ref={root as any}
            className={`rw rw-sec rwcl${phone ? " is-ph" : tab ? " is-tab" : ""}${on ? " is-on" : ""}${moving ? " is-mv" : " is-park"}`}
            style={{ ...cssVars(c), ...B, ...(props.style || {}) }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html: CSS_CL + siteFontCss(props),
                }}
            />
            <div className="rw-wrap rwcl-in">
                <div className="rwcl-copy">
                    <Eyebrow text={eyebrow} on={on} M={M} />
                    <Head
                        text={head}
                        on={on}
                        D={D}
                        size={
                            phone
                                ? "clamp(40px,11vw,52px)"
                                : "clamp(40px,4.6vw,68px)"
                        }
                        lh={0.95}
                        delay={80}
                        className="rwcl-hd"
                    />
                    {line && (
                        <p className="rwcl-line" style={rise(on, 380, 14)}>
                            {line}
                        </p>
                    )}
                    <div
                        className="rwcl-meta"
                        style={{ ...M, ...rise(on, 480, 12) }}
                    >
                        <p className="rwcl-rate">
                            <span className="rwcl-stars" aria-hidden>
                                ★★★★★
                            </span>
                            {rating.replace(/^★\s*/, "")}
                        </p>
                        <p className="rwcl-read" aria-live="off">
                            <i className="rwcl-live" aria-hidden />
                            <span className="rwcl-read-l">{readout}</span>
                            <span ref={rd} className="rwcl-read-v">
                                {names[[...parked][0] ?? 0]
                                    ? `${names[[...parked][0] ?? 0]} · ${nums[([...parked][0] ?? 0) % Math.max(1, nums.length)] || ""}`
                                    : ""}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="rwcl-stage" style={rise(on, 200, 20)}>
                    <div
                        ref={scope}
                        className="rwcl-scope"
                        role="img"
                        aria-label={`Client radar: ${names.join(", ")}`}
                    >
                        <div className="rwcl-grid" aria-hidden />
                        <svg
                            className="rwcl-svg"
                            viewBox="0 0 200 200"
                            aria-hidden
                        >
                            {[0.25, 0.5, 0.75, 1].map((f, i) => (
                                <circle
                                    key={i}
                                    cx="100"
                                    cy="100"
                                    r={92 * f}
                                    className={
                                        i === 3
                                            ? "rwcl-ring rwcl-ring-o"
                                            : "rwcl-ring"
                                    }
                                />
                            ))}
                            <path
                                d="M100 6V194M6 100H194"
                                className="rwcl-cross"
                            />
                            <path
                                d="M34.9 34.9L165.1 165.1M165.1 34.9L34.9 165.1"
                                className="rwcl-cross rwcl-diag"
                            />
                            {Array.from({ length: 72 }, (_, i) => {
                                const a = (i * 5 * Math.PI) / 180
                                const long = i % 6 === 0
                                const r1 = 92,
                                    r2 = long ? 97 : 94.5
                                return (
                                    <line
                                        key={i}
                                        x1={100 + Math.sin(a) * r1}
                                        y1={100 - Math.cos(a) * r1}
                                        x2={100 + Math.sin(a) * r2}
                                        y2={100 - Math.cos(a) * r2}
                                        className={
                                            long
                                                ? "rwcl-tick rwcl-tick-l"
                                                : "rwcl-tick"
                                        }
                                    />
                                )
                            })}
                        </svg>
                        {!phone &&
                            ["000", "090", "180", "270"].map((d, i) => (
                                <span
                                    key={d}
                                    className={`rwcl-deg rwcl-deg-${i}`}
                                    style={M}
                                    aria-hidden
                                >
                                    {d}°
                                </span>
                            ))}
                        {RG.slice(0, 4).map((r, i) => (
                            <span
                                key={i}
                                className="rwcl-rl"
                                style={{
                                    ...M,
                                    left: `${50 + Math.sin(0.698) * 46 * (0.25 * (i + 1))}%`,
                                    top: `${50 - Math.cos(0.698) * 46 * (0.25 * (i + 1))}%`,
                                }}
                                aria-hidden
                            >
                                {r}
                            </span>
                        ))}
                        <div
                            ref={sweep}
                            className="rwcl-sweep"
                            style={{ transform: `rotate(${PARK}deg)` }}
                            aria-hidden
                        >
                            <i className="rwcl-edge" />
                        </div>
                        <span className="rwcl-core" aria-hidden>
                            <i />
                        </span>
                        {names.map((nm, i) => {
                            const p = pol[i]
                            const rad = (p.a * Math.PI) / 180
                            const x = 50 + Math.sin(rad) * p.r * 46,
                                y = 50 - Math.cos(rad) * p.r * 46
                            const left = p.l
                            const st = CL_STYLE[i % 4]
                            return (
                                <div
                                    key={i}
                                    className={`rwcl-blip rwcl-${st}${left ? " is-l" : ""}${!moving && parked.has(i) ? " is-hit" : ""}`}
                                    style={{ left: `${x}%`, top: `${y}%` }}
                                >
                                    <i className="rwcl-dot" aria-hidden />
                                    <span
                                        className="rwcl-nm"
                                        style={
                                            st === "mono"
                                                ? M
                                                : st === "grot" || st === "cond"
                                                  ? B
                                                  : D
                                        }
                                    >
                                        {nm}
                                    </span>
                                    {nums[i % Math.max(1, nums.length)] && (
                                        <b className="rwcl-bdg" style={M}>
                                            {nums[i % Math.max(1, nums.length)]}
                                        </b>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </section>
    )
}
const CSS_CL = `
.rwcl{background:var(--rw-bone);color:var(--rw-ink);padding:clamp(56px,4.8vw,80px) 0;overflow-x:clip}
.rwcl-in{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);align-items:center;gap:clamp(32px,4vw,72px)}
.rwcl-copy{display:flex;flex-direction:column;align-items:flex-start;gap:22px;max-width:520px}
.rwcl .rw-it{position:relative;color:var(--rw-ink);font-weight:inherit;padding:0 .06em;isolation:isolate}
.rwcl .rw-it::before{content:"";position:absolute;z-index:-1;left:0;right:0;top:.12em;bottom:.02em;border-radius:.16em;background:var(--rw-brass);transform:scaleX(0);transform-origin:left;transition:transform .9s cubic-bezier(.7,0,.2,1) var(--pd,.6s)}
.rwcl .rw-hd.is-on .rw-it::before{transform:none}
.rwcl-line{margin:0;font-size:17px;line-height:1.5;color:var(--rw-mut);max-width:440px}
.rwcl-meta{display:flex;flex-direction:column;gap:10px;padding-top:18px;border-top:1px solid var(--rw-fog);width:100%;max-width:440px}
.rwcl-meta p{display:flex;align-items:center;gap:10px;margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.rwcl-stars{letter-spacing:.12em}
.rwcl-read{color:var(--rw-mut)} .rwcl-read-l{flex:none} .rwcl-read-v{color:var(--rw-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rwcl-live{position:relative;flex:none;width:8px;height:8px;border-radius:50%;background:var(--rw-brass);box-shadow:0 0 0 1px color-mix(in srgb,var(--rw-ink) 35%,transparent)} .rwcl-live::after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 1.5px var(--rw-brass);animation:rwcl-p 1.8s cubic-bezier(.2,.6,.3,1) infinite}
.rwcl-stage{display:flex;justify-content:flex-end}
.rwcl-scope{position:relative;width:min(500px,100%);aspect-ratio:1;border-radius:50%;flex:none;--nm:14px}
.rwcl-grid{position:absolute;inset:4%;border-radius:50%;background:radial-gradient(circle at 50% 50%,color-mix(in srgb,var(--rw-cloud) 70%,transparent),color-mix(in srgb,var(--rw-cloud) 20%,transparent) 70%),radial-gradient(color-mix(in srgb,var(--rw-ink) 16%,transparent) 1px,transparent 1.3px) 0 0/14px 14px;-webkit-mask:radial-gradient(circle,#000 62%,transparent 71%);mask:radial-gradient(circle,#000 62%,transparent 71%)}
.rwcl-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.rwcl-ring{fill:none;stroke:color-mix(in srgb,var(--rw-ink) 16%,transparent);stroke-width:.35} .rwcl-ring-o{stroke:color-mix(in srgb,var(--rw-ink) 38%,transparent);stroke-width:.5}
.rwcl-cross{fill:none;stroke:color-mix(in srgb,var(--rw-ink) 14%,transparent);stroke-width:.3} .rwcl-diag{stroke-dasharray:1 2.2}
.rwcl-tick{stroke:color-mix(in srgb,var(--rw-ink) 30%,transparent);stroke-width:.3} .rwcl-tick-l{stroke:color-mix(in srgb,var(--rw-ink) 60%,transparent);stroke-width:.45}
.rwcl-deg{position:absolute;font-size:10px;letter-spacing:.1em;color:var(--rw-mut)} .rwcl-deg-0{left:50%;top:-4px;translate:-50% -100%} .rwcl-deg-1{right:-6px;top:50%;translate:100% -50%} .rwcl-deg-2{left:50%;bottom:-4px;translate:-50% 100%} .rwcl-deg-3{left:-6px;top:50%;translate:-100% -50%}
.rwcl-rl{position:absolute;translate:5px -50%;padding:1px 3px;border-radius:3px;background:color-mix(in srgb,var(--rw-bone) 80%,transparent);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-ink) 42%,transparent);pointer-events:none}
.rwcl-sweep{position:absolute;inset:4%;border-radius:50%;will-change:transform;background:conic-gradient(from 285deg,transparent 0deg,color-mix(in srgb,var(--rw-brass) 8%,transparent) 30deg,color-mix(in srgb,var(--rw-brass) 58%,transparent) 68deg,color-mix(in srgb,var(--rw-brass) 90%,transparent) 75deg,transparent 75.2deg);pointer-events:none;opacity:0;transition:opacity 1.2s ease .3s}
.rwcl.is-on .rwcl-sweep,.rwcl.is-park .rwcl-sweep{opacity:1}
.rwcl-edge{position:absolute;left:50%;top:0;width:1.5px;height:50%;translate:-50% 0;background:linear-gradient(0deg,color-mix(in srgb,var(--rw-ink) 10%,transparent),var(--rw-ink))}
.rwcl-core{position:absolute;left:50%;top:50%;width:14px;height:14px;translate:-50% -50%;border-radius:50%;background:var(--rw-ink);box-shadow:0 0 0 4px var(--rw-brass),0 0 0 5px color-mix(in srgb,var(--rw-ink) 30%,transparent)} .rwcl-core i{position:absolute;inset:-4px;border-radius:50%;box-shadow:0 0 0 1.5px var(--rw-ink);animation:rwcl-p 2.4s cubic-bezier(.2,.6,.3,1) infinite}
@keyframes rwcl-p{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(3.2)}}
/* blips */
.rwcl-blip{position:absolute;width:0;height:0;z-index:2}
.rwcl-dot{position:absolute;left:-4px;top:-4px;width:8px;height:8px;border-radius:50%;background:color-mix(in srgb,var(--rw-ink) 45%,transparent);transition:background .5s,scale .5s cubic-bezier(.34,1.56,.64,1)}
.rwcl-dot::after{content:"";position:absolute;inset:-3px;border-radius:50%;box-shadow:0 0 0 2px var(--rw-brass),0 0 14px 2px color-mix(in srgb,var(--rw-brass) 70%,transparent);opacity:0}
.rwcl-nm{position:absolute;left:12px;top:0;translate:0 -50%;white-space:nowrap;font-size:var(--nm);line-height:1;color:color-mix(in srgb,var(--rw-ink) 40%,transparent);transition:color 1.4s ease,translate .6s cubic-bezier(.2,.8,.2,1);cursor:default}
.rwcl-blip.is-l .rwcl-nm{left:auto;right:12px}
.rwcl-grot .rwcl-nm{font-weight:800;letter-spacing:-.04em;font-size:calc(var(--nm) * 1.08)}
.rwcl-round .rwcl-nm{font-weight:500;letter-spacing:-.02em;text-transform:lowercase;font-size:calc(var(--nm) * 1.12)}
.rwcl-cond .rwcl-nm{font-weight:700;text-transform:uppercase;letter-spacing:.02em;font-size:calc(var(--nm) * .92);transform:scaleX(.84);transform-origin:left center} .rwcl-cond.is-l .rwcl-nm{transform-origin:right center}
.rwcl-mono .rwcl-nm{text-transform:uppercase;letter-spacing:.14em;font-size:calc(var(--nm) * .8)}
.rwcl-bdg{position:absolute;left:0;top:-14px;translate:-50% -100%;padding:4px 8px;border-radius:999px;background:#FF3E88;color:#0D0E10;font-size:11px;font-weight:600;letter-spacing:.02em;white-space:nowrap;box-shadow:0 0 0 2.5px var(--rw-bone),0 10px 20px -10px rgba(0,0,0,.5);scale:.3;opacity:0;transform-origin:50% 100%;transition:scale .5s cubic-bezier(.34,1.56,.64,1),opacity .4s,translate .5s cubic-bezier(.2,.8,.2,1);pointer-events:none}
.rwcl-blip:hover,.rwcl-blip.is-hit{z-index:4}
.rwcl-blip:hover .rwcl-nm,.rwcl-blip.is-hit .rwcl-nm{color:var(--rw-ink);transition-duration:.25s}
.rwcl-blip:hover .rwcl-dot,.rwcl-blip.is-hit .rwcl-dot{background:var(--rw-ink);scale:1.25;transition-duration:.2s}
.rwcl-blip:hover .rwcl-dot::after,.rwcl-blip.is-hit .rwcl-dot::after{animation:rwcl-ping 1.5s cubic-bezier(.2,.6,.3,1) both}
.rwcl-blip:hover .rwcl-bdg,.rwcl-blip.is-hit .rwcl-bdg{scale:1;opacity:1;translate:-50% calc(-100% - 4px);transition-duration:.5s,.2s,.5s}
.rwcl.is-park .rwcl-blip.is-hit .rwcl-dot::after{animation:none;opacity:.9;transform:scale(1.6)}
@keyframes rwcl-ping{0%{opacity:1;transform:scale(.6)}100%{opacity:0;transform:scale(4.2)}}
/* tablet */
.rwcl.is-tab .rwcl-in{grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:32px} .rwcl.is-tab .rwcl-scope{--nm:12px} .rwcl.is-tab .rwcl-line{font-size:16px}
/* phone: radar full width under the copy */
.rwcl.is-ph{padding:64px 0 56px} .rwcl.is-ph .rwcl-in{grid-template-columns:1fr;gap:40px} .rwcl.is-ph .rwcl-copy{max-width:none;gap:18px} .rwcl.is-ph .rwcl-line{font-size:16px}
.rwcl.is-ph .rwcl-stage{justify-content:center} .rwcl.is-ph .rwcl-scope{width:min(350px,100%);--nm:11px} .rwcl.is-ph .rwcl-rl{font-size:8.5px} .rwcl.is-ph .rwcl-bdg{font-size:10px;padding:3px 7px}
.rwcl.is-ph .rwcl-grid{background-size:auto,11px 11px}
`
addPropertyControls(RwClients, {
    ...COLOR_CONTROLS,
    ...FONT_CONTROLS,
    ...BP_CONTROL,
    eyebrow: {
        type: ControlType.String,
        title: "Eyebrow",
        defaultValue: "(00) Clients",
    },
    heading: {
        type: ControlType.String,
        title: "Heading",
        description:
            "{n} = Clients Count on the Site CMS row, | = line break, *words* = lime marker",
        defaultValue: "{n} brands|*on our radar*.",
    },
    line: {
        type: ControlType.String,
        title: "Line",
        displayTextArea: true,
        defaultValue:
            "Local clinics, cafés and online shops to national brands. Every one of them came to us to be found by more of the right people.",
    },
    clientsCount: {
        type: ControlType.String,
        title: "Clients count",
        description: "Empty = Clients Count on the Site CMS row",
        defaultValue: "",
    },
    ratingLine: {
        type: ControlType.String,
        title: "Rating line",
        description: "Empty = Rating + Reviews Count on the Site CMS row",
        defaultValue: "",
    },
    clients: {
        type: ControlType.String,
        title: "Client names",
        description: "Comma list — each becomes a blip on the radar",
        displayTextArea: true,
        defaultValue:
            "Northside Dental, Kinfolk Coffee, Fitloop, Haven Realty, Lumen Skin, Orbit Legal, Parcel & Co, Verde Studio, Tallow, Brightline",
    },
    badges: {
        type: ControlType.String,
        title: "Growth badges",
        description: "; list, same order as the names",
        displayTextArea: true,
        defaultValue:
            "+212%;+96k;6.2×;+122;$142k;57 consults;+88%;+3.1×;+64%;+41k",
    },
    rings: {
        type: ControlType.String,
        title: "Ring labels",
        description: "; list, inside → out",
        defaultValue: "Local;Regional;National;Global",
    },
    readout: {
        type: ControlType.String,
        title: "Readout label",
        defaultValue: "Last ping",
    },
})
