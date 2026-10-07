"use client"
import {
    useEffect,
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
    onTick,
    clamp01,
    type Pal,
    colorsOf,
    cssRgb,
    cssVars,
    COLOR_CONTROLS,
    FONT_CONTROLS,
    siteFontCss,
    fontsOf,
    BP_CONTROL,
    useMagnet,
    useScrollVars,
    useOn,
    Head,
    Eyebrow,
    rise,
    listOf,
} from "@/lib/rw"

// ===== RwFunnel =====
interface FunnelProps extends Pal {
    customFonts: boolean
    displayFont: any
    bodyFont: any
    monoFont: any
    bpHint: string
    eyebrow: string
    heading: string
    intro: string
    stages: string
    steps: string
    foot: string
    style?: CSSProperties
}
// ---- THE FUNNEL: four bands narrowing downwards (Reach → Clicks → Leads → Clients). Desktop pins; as --pp advances stage by stage the active band
// fills lime left→right, its counter rolls up, particles (people) pour down through the funnel — many at the top, fewer past every band — and the
// matching step of the process lights up. Phone / tablet: no pin, every stage is a row whose bar fills and whose counter rolls when it enters the view. ----
const FN_IN = [0, 7, 14, 21, 27] // wall inset per band edge, % of the funnel width
const FN_SURV = [0.34, 0.3, 0.36] // share of particles that make it through each lower edge (visual, not the real rate)
const fnParse = (s: string) => {
    const m = String(s || "")
        .trim()
        .match(/^([^\d.-]*)(-?[\d,]*\.?\d+)(.*)$/)
    if (!m) return null
    const raw = m[2]
    return {
        pre: m[1],
        n: parseFloat(raw.replace(/,/g, "")),
        dec: (raw.split(".")[1] || "").length,
        grp: raw.includes(","),
        suf: m[3],
    }
}
const fnFmt = (n: number, dec: number, grp: boolean) =>
    n.toLocaleString("en-US", {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
        useGrouping: grp || Math.abs(n) >= 10000,
    })
function FnCount({
    value,
    on,
    live,
    rm,
}: {
    value: string
    on: boolean
    live: boolean
    rm: boolean
}) {
    const el = useRef<HTMLSpanElement>(null)
    const A = fnParse(value)
    useEffect(() => {
        if (!live || rm || !el.current || !A) return
        if (!on) {
            el.current.textContent = `${A.pre}${fnFmt(0, A.dec, A.grp)}${A.suf}`
            return
        }
        const t0 = performance.now(),
            dur = 1400
        let raf = 0
        const step = (t: number) => {
            const k = clamp01((t - t0) / dur)
            const e = 1 - Math.pow(1 - k, 4)
            if (el.current)
                el.current.textContent = `${A.pre}${fnFmt(A.n * e, A.dec, A.grp)}${A.suf}`
            if (k < 1) raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
        return () => cancelAnimationFrame(raf)
    }, [on, live, rm, value])
    return <span ref={el}>{value}</span>
}
const FnRow = ({
    s,
    st,
    i,
    live,
    rm,
    D,
    M,
    tip,
}: {
    s: { l: string; v: string }
    st: { t: string; w: string; b: string } | undefined
    i: number
    live: boolean
    rm: boolean
    D: CSSProperties
    M: CSSProperties
    tip: string
}) => {
    const el = useRef<HTMLLIElement>(null)
    const on = useOn(el, live, rm, 0.5)
    return (
        <li
            ref={el}
            className={`rwfn-row${on ? " is-on" : ""}`}
            style={{ ["--i" as any]: i }}
        >
            <div className="rwfn-row-top" style={M}>
                <span className="rwfn-row-n">
                    {String(i + 1).padStart(2, "0")}
                </span>
                <span>{s.l}</span>
                <b style={D}>
                    <FnCount value={s.v} on={on} live={live} rm={rm} />
                </b>
            </div>
            <div className="rwfn-row-bar">
                <i />
            </div>
            {tip && (
                <p className="rwfn-row-tip" style={M}>
                    {tip}
                </p>
            )}
            {st && (
                <div className="rwfn-row-step">
                    <h3 style={D}>
                        {st.t}
                        {st.w && <span style={M}>{st.w}</span>}
                    </h3>
                    <p>{st.b}</p>
                </div>
            )}
        </li>
    )
}
export default function RwFunnel(props: FunnelProps) {
    const {
        eyebrow = "(04) How we work",
        heading = "From attention|to *clients*.",
        intro = "",
        foot = "",
        bpHint = "auto",
        stages = "Reach:1,284,300;Clicks:48,120;Leads:2,940;Clients:312",
        steps = "Audit · Week 1: We study your site, ads and competitors and find the fastest wins.;Launch · Week 2–3: Campaigns, content and fixes go live.;Optimise · Month 2: We test creatives, keywords and pages every week.;Scale · Month 3+: We put more budget and content behind what works.",
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
    const pin = useRef<HTMLDivElement>(null)
    const fun = useRef<HTMLDivElement>(null)
    const cv = useRef<HTMLCanvasElement>(null)
    const { w } = useSize(root, bpHint)
    const phone = w < 810,
        tab = w >= 810 && w < 1100
    const on = useOn(root, live, rm)
    useMagnet(root, live)
    const ST = listOf(stages)
        .slice(0, 4)
        .map((x) => {
            const i = x.indexOf(":")
            return i < 0
                ? { l: x, v: "" }
                : { l: x.slice(0, i).trim(), v: x.slice(i + 1).trim() }
        })
    const SP = listOf(steps).map((x) => {
        const i = x.indexOf(":")
        const head = i < 0 ? x : x.slice(0, i)
        const [t, wn] = head.split("·").map((y) => y.trim())
        return {
            t: t || head.trim(),
            w: wn || "",
            b: i < 0 ? "" : x.slice(i + 1).trim(),
        }
    })
    const nb = ST.length
    const tips = ST.map((s, i) => {
        const a = fnParse(s.v),
            b = ST[i + 1] ? fnParse(ST[i + 1].v) : null
        if (!a || !a.n) return ""
        if (b)
            return `${((b.n / a.n) * 100).toFixed(b.n / a.n < 0.1 ? 1 : 0)}% become ${ST[i + 1].l.toLowerCase()}`
        const r0 = fnParse(ST[0].v)
        return i > 0 && r0
            ? `1 in ${Math.round(r0.n / a.n).toLocaleString("en-US")} people reached`
            : ""
    })
    const pinned = !phone && !tab && !still && !rm && nb > 0
    const [stage, setStage] = useState(pinned ? -1 : nb - 1)
    const stRef = useRef(-2)
    const tRef = useRef(rm || still ? nb : 0)
    useEffect(() => {
        if (!pinned) setStage(nb - 1)
    }, [pinned, nb])
    const paint = (pp: number) => {
        const f = fun.current
        if (!f) return
        const t = clamp01((pp - 0.04) / 0.86) * nb
        tRef.current = t
        const bands = f.querySelectorAll<HTMLElement>(".rwfn-band")
        bands.forEach((b, k) =>
            b.style.setProperty("--f", clamp01((t - k) * 1.25).toFixed(4))
        )
        const s = t <= 0.02 ? -1 : Math.min(nb - 1, Math.floor(t))
        if (s !== stRef.current) {
            stRef.current = s
            setStage(s)
        }
    }
    useScrollVars(pin, live && pinned, rm, (_sp, pp) => paint(pp))
    // ---- particles: people poured into the funnel ----
    useEffect(() => {
        if (!live || !pinned || !fun.current || !cv.current) return
        const box = fun.current,
            canvas = cv.current
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const ink = cssRgb(box, c.ink, "13,14,16")
        let W = 1,
            H = 1,
            dpr = 1,
            vis = false,
            edges: number[][] = [],
            last = 0,
            acc = 0
        type P = {
            u: number
            y: number
            v: number
            k: number
            die: number
            s: number
            ph: number
        }
        const ps: P[] = []
        const size = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            W = box.clientWidth
            H = box.clientHeight
            canvas.width = Math.round(W * dpr)
            canvas.height = Math.round(H * dpr)
            const br = box.getBoundingClientRect()
            edges = Array.from(
                box.querySelectorAll<HTMLElement>(".rwfn-band")
            ).map((b) => {
                const r = b.getBoundingClientRect()
                return [r.top - br.top, r.bottom - br.top]
            })
        }
        size()
        const ro = new ResizeObserver(size)
        ro.observe(box)
        const io = new IntersectionObserver(
            (es) => {
                vis = es[0].isIntersecting
            },
            { rootMargin: "10% 0px" }
        )
        io.observe(box)
        const inset = (y: number) => {
            for (let k = 0; k < edges.length; k++) {
                const [a, b] = edges[k]
                if (y <= b) {
                    if (y < a) return FN_IN[k] / 100
                    return (
                        (FN_IN[k] +
                            (FN_IN[k + 1] - FN_IN[k]) *
                                ((y - a) / Math.max(1, b - a))) /
                        100
                    )
                }
            }
            return FN_IN[edges.length] / 100
        }
        const off = onTick((now) => {
            if (!vis || !edges.length) {
                last = now
                return
            }
            const dt = Math.min(0.05, (now - (last || now)) / 1000)
            last = now
            const t = tRef.current
            const reach = Math.min(edges.length - 1, Math.floor(Math.max(0, t)))
            const full = t >= edges.length - 0.02
            acc += dt * (26 + 30 * clamp01(t))
            while (acc > 1) {
                acc -= 1
                ps.push({
                    u: 0.04 + Math.random() * 0.92,
                    y: edges[0][0] - 6,
                    v: 70 + Math.random() * 60,
                    k: 0,
                    die: 0,
                    s: 1.6 + Math.random() * 1.2,
                    ph: Math.random() * 6.28,
                })
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, W, H)
            for (let i = ps.length - 1; i >= 0; i--) {
                const p = ps[i]
                p.y += p.v * dt * (1 + p.k * 0.25)
                p.u +=
                    Math.sin(now / 500 + p.ph) * 0.0009 +
                    (0.5 - p.u) * dt * 0.08 * p.k
                const b = edges[Math.min(p.k, edges.length - 1)]
                if (!p.die && p.y > b[1]) {
                    const lim = full ? edges.length - 1 : reach
                    if (p.k >= lim) {
                        if (p.k === edges.length - 1 && full) {
                            p.die = 0.001
                            p.k = 9
                        } else p.die = 0.001
                    } else if (Math.random() < FN_SURV[p.k]) p.k++
                    else p.die = 0.001
                }
                if (p.die) p.die += dt * 2.2
                if (p.die > 1 || p.y > H + 10) {
                    ps.splice(i, 1)
                    continue
                }
                const L = inset(p.y)
                const x = W * (L + p.u * (1 - 2 * L))
                const a = (1 - (p.die || 0)) * (0.35 + 0.15 * Math.min(3, p.k))
                ctx.beginPath()
                ctx.arc(x, p.y, p.s + (p.k >= 3 ? 1.4 : p.k * 0.3), 0, 6.283)
                ctx.fillStyle =
                    p.k >= 3
                        ? `rgba(255,62,136,${Math.min(1, a + 0.4)})`
                        : `rgba(${ink},${a})`
                ctx.fill()
            }
            if (ps.length > 420) ps.splice(0, ps.length - 420)
        })
        return () => {
            off()
            ro.disconnect()
            io.disconnect()
        }
    }, [live, pinned, c.ink, nb])
    const band = (s: { l: string; v: string }, i: number) => {
        const a = FN_IN[i],
            b = FN_IN[i + 1]
        const clip = `polygon(${a}% 0, ${100 - a}% 0, ${100 - b}% 100%, ${b}% 100%)`
        return (
            <div
                key={i}
                className={`rwfn-band${i <= stage ? " is-on" : ""}${i === stage ? " is-act" : ""}`}
                style={{ ["--i" as any]: i }}
                tabIndex={0}
                aria-label={`${s.l}: ${s.v}${tips[i] ? ". " + tips[i] : ""}`}
            >
                <div
                    className="rwfn-shape"
                    style={{ clipPath: clip, WebkitClipPath: clip }}
                >
                    <i className="rwfn-fill" />
                </div>
                <div className="rwfn-band-c">
                    <span className="rwfn-band-l" style={M}>
                        <em>{String(i + 1).padStart(2, "0")}</em>
                        {s.l}
                    </span>
                    <b className="rwfn-band-v" style={D}>
                        <FnCount
                            value={s.v}
                            on={still || rm || i <= stage}
                            live={live && pinned}
                            rm={rm}
                        />
                    </b>
                </div>
                {tips[i] && (
                    <span
                        className="rwfn-tip"
                        style={{ ...M, right: `calc(${FN_IN[i + 1]}% + 10px)` }}
                    >
                        <i />
                        {tips[i]}
                    </span>
                )}
            </div>
        )
    }
    return (
        <section
            ref={root as any}
            className={`rw rw-sec rwfn${phone ? " is-ph" : tab ? " is-tab" : ""}${pinned ? " is-pin" : ""}${on ? " is-in" : ""}${live && !rm && !still ? " is-live" : ""}`}
            style={{
                ...cssVars(c),
                ...B,
                ["--nb" as any]: nb,
                ...(props.style || {}),
            }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html:
                        CSS_FUNNEL + siteFontCss(props),
                }}
            />
            {pinned ? (
                <div ref={pin} className="rwfn-pin">
                    <div className="rwfn-sticky">
                        <div className="rw-wrap rwfn-grid">
                            <div className="rwfn-l">
                                <Eyebrow text={eyebrow} on={on} M={M} />
                                <Head
                                    text={heading}
                                    on={on}
                                    D={DH}
                                    size="clamp(40px,4.6vw,68px)"
                                    lh={0.95}
                                    delay={120}
                                />
                                {intro && (
                                    <p
                                        className="rwfn-intro"
                                        style={rise(on, 300)}
                                    >
                                        {intro}
                                    </p>
                                )}
                                <ol
                                    className="rwfn-steps"
                                    style={rise(on, 420)}
                                >
                                    {SP.map((s, i) => (
                                        <li
                                            key={i}
                                            className={`rwfn-step${i === stage ? " is-act" : ""}${i < stage ? " is-done" : ""}`}
                                        >
                                            <span
                                                className="rwfn-step-n"
                                                style={M}
                                            >
                                                {String(i + 1).padStart(2, "0")}
                                            </span>
                                            <div>
                                                <h3 style={D}>
                                                    {s.t}
                                                    {s.w && (
                                                        <span style={M}>
                                                            {s.w}
                                                        </span>
                                                    )}
                                                </h3>
                                                <p>{s.b}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                            <div className="rwfn-r" style={rise(on, 240, 30)}>
                                <div ref={fun} className="rwfn-fun">
                                    {ST.map((s, i) => band(s, i))}
                                    <canvas
                                        ref={cv}
                                        className="rwfn-cv"
                                        aria-hidden
                                    />
                                </div>
                                {foot && (
                                    <p className="rwfn-foot" style={M}>
                                        <i className="rw-port" aria-hidden />
                                        {foot}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="rw-wrap rwfn-flat">
                    <div className="rwfn-l">
                        <Eyebrow text={eyebrow} on={on} M={M} />
                        <Head
                            text={heading}
                            on={on}
                            D={DH}
                            size={
                                phone
                                    ? "clamp(38px,10.6vw,52px)"
                                    : "clamp(44px,6.4vw,64px)"
                            }
                            lh={0.95}
                            delay={120}
                        />
                        {intro && (
                            <p className="rwfn-intro" style={rise(on, 300)}>
                                {intro}
                            </p>
                        )}
                    </div>
                    <ol className="rwfn-rows">
                        {ST.map((s, i) => (
                            <FnRow
                                key={i}
                                s={s}
                                st={SP[i]}
                                i={i}
                                live={live}
                                rm={rm || still}
                                D={D}
                                M={M}
                                tip={tips[i]}
                            />
                        ))}
                    </ol>
                    {foot && (
                        <p className="rwfn-foot" style={M}>
                            <i className="rw-port" aria-hidden />
                            {foot}
                        </p>
                    )}
                </div>
            )}
        </section>
    )
}
const CSS_FUNNEL = `
.rwfn{background:var(--rw-bone);color:var(--rw-ink)}
.rwfn .rw-hd{letter-spacing:-.045em}
.rwfn .rw-hd-w.is-accw{padding-left:.1em;padding-right:.1em;margin-left:-.1em;margin-right:-.1em}
.rwfn .rw-it{position:relative;z-index:0;font-weight:inherit;color:var(--rw-ink);padding:0 .06em}
.rwfn .rw-it::before{content:"";position:absolute;z-index:-1;left:0;right:0;top:.12em;bottom:.02em;border-radius:.16em;background:var(--rw-brass);transform:scaleX(0);transform-origin:left;transition:transform .9s cubic-bezier(.7,0,.2,1) var(--pd,.6s)}
.rwfn .rw-hd.is-on .rw-it::before{transform:none}
.rwfn .rw-eb i{animation:rwfn-live 1.8s infinite} @keyframes rwfn-live{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--rw-ink) 30%,transparent)}100%{box-shadow:0 0 0 9px transparent}}
.rwfn-intro{margin:0;max-width:44ch;font-size:17px;line-height:1.5;color:var(--rw-mut)}
/* pinned */
.rwfn-pin{position:relative;height:320vh;height:320svh}
.rwfn-sticky{position:sticky;top:0;height:100vh;height:100svh;display:flex;align-items:center;overflow:clip}
.rwfn-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(40px,5vw,96px);align-items:center;height:100%;padding-top:6svh;padding-bottom:6svh}
.rwfn-l{display:flex;flex-direction:column;gap:22px;min-height:0}
.rwfn-steps{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;border-top:1px solid var(--rw-fog)}
.rwfn-step{position:relative;display:grid;grid-template-columns:44px 1fr;gap:12px;padding:16px 0;border-bottom:1px solid var(--rw-fog);opacity:.35;transition:opacity .5s}
.rwfn-step::before{content:"";position:absolute;left:0;bottom:-1px;height:2px;width:100%;background:var(--rw-ink);transform:scaleX(0);transform-origin:left;transition:transform .8s cubic-bezier(.7,0,.2,1)}
.rwfn-step.is-act,.rwfn-step.is-done{opacity:1} .rwfn-step.is-done{opacity:.6} .rwfn-step.is-act::before{transform:none}
.rwfn-step-n{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;font-size:11.5px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-ink) 25%,transparent);transition:background .4s,box-shadow .4s}
.rwfn-step.is-act .rwfn-step-n{background:var(--rw-brass);box-shadow:none}
.rwfn-step h3,.rwfn-row-step h3{display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;margin:3px 0 6px;font-size:24px;line-height:1.05;letter-spacing:-.035em;font-weight:var(--rw-font-dw,700)}
.rwfn-step h3 span,.rwfn-row-step h3 span{font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:500;padding:4px 9px;border-radius:999px;background:color-mix(in srgb,var(--rw-ink) 7%,transparent)}
.rwfn-step p,.rwfn-row-step p{margin:0;font-size:16px;line-height:1.45;color:var(--rw-mut)}
.rwfn-r{display:flex;flex-direction:column;gap:16px;height:100%;max-height:760px;min-height:0;justify-content:center}
.rwfn-fun{position:relative;flex:1;min-height:0;max-height:640px;display:flex;flex-direction:column;gap:10px}
.rwfn-cv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3}
.rwfn-band{position:relative;flex:1;min-height:0;outline-offset:4px;cursor:default}
.rwfn-shape{position:absolute;inset:0;background:color-mix(in srgb,var(--rw-ink) 6%,transparent);overflow:hidden;transition:background .5s}
.rwfn-band:hover .rwfn-shape{background:color-mix(in srgb,var(--rw-ink) 10%,transparent)}
.rwfn-fill{position:absolute;inset:0;background:var(--rw-brass);transform-origin:left;transform:scaleX(var(--f,0))}
.rwfn.is-live .rwfn-band.is-act .rwfn-fill{background:linear-gradient(90deg,var(--rw-brass) 0,var(--rw-brass) calc(100% - 3px),var(--rw-ink) calc(100% - 3px))}
.rwfn:not(.is-live) .rwfn-fill{transform:none}
.rwfn-fill{transition:background-color .6s} .rwfn.is-live .rwfn-band.is-on:not(.is-act) .rwfn-fill{background:color-mix(in srgb,var(--rw-brass) 45%,var(--rw-bone))}
.rwfn-band-c{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:6px;text-align:center;pointer-events:none}
.rwfn-band-l{display:inline-flex;align-items:center;gap:8px;font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;padding:5px 11px 5px 6px;border-radius:999px;background:var(--rw-bone)}
.rwfn-band-l em{font-style:normal;display:grid;place-items:center;min-width:22px;height:22px;border-radius:999px;background:var(--rw-ink);color:var(--rw-brass);font-size:10px}
.rwfn-band-v{font-size:clamp(34px,3.4vw,56px);line-height:.9;letter-spacing:-.05em;font-weight:var(--rw-font-dw,700);font-variant-numeric:tabular-nums}
.rwfn-tip{position:absolute;z-index:4;top:50%;display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:var(--rw-ink);color:var(--rw-cloud);font-size:11.5px;letter-spacing:.04em;white-space:nowrap;translate:0 -30%;opacity:0;transition:opacity .3s,translate .45s cubic-bezier(.34,1.56,.64,1);pointer-events:none;box-shadow:0 12px 30px -12px rgba(0,0,0,.5)}
.rwfn-tip i{width:7px;height:7px;border-radius:50%;background:#FF3E88}
.rwfn-band:hover .rwfn-tip,.rwfn-band:focus-visible .rwfn-tip{opacity:1;translate:0 -50%}
.rwfn-foot{display:flex;align-items:center;justify-content:center;gap:10px;margin:0;font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--rw-mut)}
@media (max-height:760px){.rwfn.is-pin .rwfn-step p{display:none} .rwfn.is-pin .rwfn-intro{display:none}}
/* flat (tablet / phone / reduced motion / canvas) */
.rwfn-flat{display:flex;flex-direction:column;gap:40px;padding-top:clamp(80px,10vw,120px);padding-bottom:clamp(80px,10vw,120px)}
.rwfn-rows{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.rwfn.is-ph .rwfn-rows{grid-template-columns:1fr}
.rwfn-row{display:flex;flex-direction:column;gap:14px;padding:22px;border-radius:22px;background:color-mix(in srgb,var(--rw-ink) 5%,transparent);box-shadow:inset 0 0 0 1px var(--rw-fog)}
.rwfn-row-top{display:flex;align-items:center;gap:10px;font-size:11.5px;letter-spacing:.12em;text-transform:uppercase}
.rwfn-row-n{display:grid;place-items:center;flex:none;width:26px;height:24px;border-radius:999px;background:var(--rw-ink);color:var(--rw-brass);font-size:10px;align-self:center}
.rwfn-row-top b{margin-left:auto;font-size:clamp(32px,8vw,44px);line-height:.9;letter-spacing:-.05em;text-transform:none;font-weight:var(--rw-font-dw,700);font-variant-numeric:tabular-nums}
.rwfn-row-bar{position:relative;height:14px;border-radius:999px;background:color-mix(in srgb,var(--rw-ink) 8%,transparent);overflow:hidden;width:calc(100% - var(--i) * 12%)}
.rwfn-row-bar i{position:absolute;inset:0;border-radius:inherit;background:var(--rw-brass);transform:scaleX(0);transform-origin:left;transition:transform 1.3s cubic-bezier(.7,0,.2,1) .15s}
.rwfn-row.is-on .rwfn-row-bar i{transform:none}
.rwfn-row-tip{margin:0;display:flex;align-items:center;gap:8px;font-size:11.5px;letter-spacing:.06em;color:var(--rw-mut)} .rwfn-row-tip::before{content:"";width:6px;height:6px;border-radius:50%;background:#FF3E88}
.rwfn-row-step{padding-top:14px;border-top:1px solid var(--rw-fog)}
`
addPropertyControls(RwFunnel, {
    ...COLOR_CONTROLS,
    ...FONT_CONTROLS,
    ...BP_CONTROL,
    eyebrow: {
        type: ControlType.String,
        title: "Eyebrow",
        defaultValue: "(04) How we work",
    },
    heading: {
        type: ControlType.String,
        title: "Heading",
        description: "| = line break, *words* = lime marker",
        defaultValue: "From attention|to *clients*.",
        displayTextArea: true,
    },
    intro: {
        type: ControlType.String,
        title: "Intro",
        defaultValue:
            "Every retainer runs the same four steps. You see the funnel fill in your report every week.",
        displayTextArea: true,
    },
    stages: {
        type: ControlType.String,
        title: "Funnel stages",
        description: "Label:number; … (4, top to bottom)",
        defaultValue: "Reach:1,284,300;Clicks:48,120;Leads:2,940;Clients:312",
        displayTextArea: true,
    },
    steps: {
        type: ControlType.String,
        title: "Steps",
        description: "Title · When: text; …",
        defaultValue:
            "Audit · Week 1: We study your site, ads and competitors and find the fastest wins.;Launch · Week 2–3: Campaigns, content and fixes go live.;Optimise · Month 2: We test creatives, keywords and pages every week.;Scale · Month 3+: We put more budget and content behind what works.",
        displayTextArea: true,
    },
    foot: {
        type: ControlType.String,
        title: "Note",
        defaultValue: "A typical client funnel · last 90 days",
    },
})
