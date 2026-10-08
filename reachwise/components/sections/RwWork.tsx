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
    onTick,
    clamp01,
    easeIO,
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
    IcoArrow,
    useScrollVars,
    useOn,
    Head,
    Eyebrow,
    SEED,
    imgOr,
    useCMS,
    listOf,
    type CmsRow,
    rise,
} from "@/lib/rw"

// ===== RwWork =====
interface WorkProps extends Pal {
    customFonts: boolean
    displayFont: any
    bodyFont: any
    monoFont: any
    bpHint: string
    eyebrow: string
    heading: string
    intro: string
    button: string
    buttonLink: string
    readLabel: string
    dragLabel: string
    beforeLabel: string
    afterLabel: string
    sliderLabel: string
    autoplay: boolean
    style?: CSSProperties
}
// ---- THE BEFORE / AFTER: one big case viewer. The cover photo is shown twice — BEFORE (greyscale, dark, a flat line, the old number as a ghost) and
// AFTER (full colour, a rising line, the new number huge in lime) — split by a draggable divider. As the viewer crosses the viewport the divider slides
// from 85% to 15% (AFTER takes over) and the AFTER number counts from Before to After in step with it. Drag / arrow keys take over. Client chips switch
// the case (crossfade + the divider replays); the next case plays every 7 s while the viewer is in view and not hovered. NOT pinned. ----
const wkParse = (s: string) => {
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
const wkFmt = (n: number, dec: number, grp: boolean) =>
    n.toLocaleString("en-US", {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
        useGrouping: grp || Math.abs(n) >= 10000,
    })
const wkHash = (s: string) => {
    let h = 7
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
    return h
}
// a growth line across the whole viewer (viewBox 1000 × 300): low on the left, high on the right, a seeded wiggle so it never reads as a ramp
const wkRise = (slug: string) => {
    const h = wkHash(slug)
    const N = 13
    const pts: [number, number][] = []
    for (let i = 0; i < N; i++) {
        const t = i / (N - 1)
        const base = 276 - Math.pow(t, 1.7) * 236
        const wig =
            i === 0 || i === N - 1 ? 0 : (((h >> ((i % 10) * 3)) & 7) - 3.5) * 7
        pts.push([t * 1000, Math.max(22, Math.min(290, base + wig))])
    }
    let d = `M${pts[0][0]},${pts[0][1]}`
    for (let i = 1; i < N; i++) {
        const [x0, y0] = pts[i - 1],
            [x1, y1] = pts[i]
        const cx = (x0 + x1) / 2
        d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`
    }
    return { d, end: pts[N - 1] }
}
const wkFlat = (slug: string) => {
    const h = wkHash(slug + "b")
    let d = "M0,262"
    for (let i = 1; i <= 12; i++) {
        const y = 262 + (((h >> ((i % 10) * 3)) & 7) - 3.5) * 2.2
        d += ` L${(i / 12) * 1000},${y.toFixed(1)}`
    }
    return d
}
const DV0 = 0.85,
    DV1 = 0.15
export default function RwWork(props: WorkProps) {
    const {
        eyebrow = "(03) Case studies",
        heading = "Results you can|*count*.",
        intro = "Six clients, five channels, one habit: we report the number that pays the bills, before and after.",
        button = "All case studies",
        buttonLink = "/work",
        readLabel = "Read the case",
        dragLabel = "Drag",
        beforeLabel = "Before",
        afterLabel = "After",
        sliderLabel = "Compare before and after",
        autoplay = true,
        bpHint = "auto",
    } = props
    const c = colorsOf(props)
    const { D, B, M } = fontsOf(props)
    useFonts()
    const live = useLive()
    const rm = useReduced()
    const still = useStill()
    const rows = useCMS("work", SEED.work || [])
    const n = rows.length
    const root = useRef<HTMLElement>(null)
    const view = useRef<HTMLDivElement>(null)
    const handle = useRef<HTMLDivElement>(null)
    const numEl = useRef<HTMLSpanElement>(null)
    const chip = useRef<HTMLDivElement>(null)
    const { w } = useSize(root, bpHint)
    const phone = w < 810,
        tab = w >= 810 && w < 1100
    const on = useOn(root, live, rm)
    useScrollVars(root, live, rm)
    useMagnet(root, live)
    const final = still || rm || !live
    const [cur, setCur] = useState(0)
    const curR = useRef(0)
    const [prev, setPrev] = useState<{ i: number; dv: number } | null>(null)
    useEffect(() => {
        if (curR.current >= n && n > 0) {
            curR.current = 0
            setCur(0)
        }
    }, [n])
    // engine state (refs: written by the rAF, never by React)
    const E = useRef({
        mode: "scroll" as "scroll" | "replay" | "manual" | "hold",
        dv: final ? 0.5 : DV0,
        man: 0.5,
        r0: 0,
        st: 0,
        inView: false,
    })
    const [run, setRun] = useState(false) // auto-advance clock running (in view, past the reveal, not paused)
    const [paused, setPaused] = useState(false)
    const hovV = useRef(false)
    const focV = useRef(false)
    const row = rows[cur] || ({} as CmsRow)
    const A = wkParse(row.f7),
        Bn = wkParse(row.f6)
    const unit = row.f8 || ""
    const txtAt = (t: number) => {
        if (!A) return `${row.f7 || ""}${unit}`
        const from = Bn ? Bn.n : 0
        return `${A.pre}${wkFmt(from + (A.n - from) * t, A.dec, A.grp)}${A.suf}${unit}`
    }
    const go = (i: number) => {
        if (n < 1) return
        const j = ((i % n) + n) % n
        if (j === curR.current) return
        const dvNow = E.current.dv
        setPrev({ i: curR.current, dv: dvNow })
        curR.current = j
        setCur(j)
        const e = E.current
        if (!final) {
            e.mode = "replay"
            e.r0 = performance.now()
            e.dv = DV0
        }
    }
    useEffect(() => {
        if (!prev) return
        const t = window.setTimeout(() => setPrev(null), 900)
        return () => window.clearTimeout(t)
    }, [prev])
    // ---- the divider engine ----
    useEffect(() => {
        const V = view.current
        if (!V) return
        const e = E.current
        let top = 0,
            h = 1,
            vh = 1,
            fresh = false,
            vis = true,
            lastDv = -1,
            lastTxt = "",
            lastAria = -1,
            lastRun = false
        if (final) {
            V.style.setProperty("--dv", "0.5")
            V.style.setProperty("--dt", "1")
            if (numEl.current)
                numEl.current.textContent = `${row.f7 || ""}${unit}`
            handle.current?.setAttribute("aria-valuenow", "50")
            return
        }
        const io = new IntersectionObserver(
            (es) => {
                vis = es[0].isIntersecting
                e.inView = es[0].intersectionRatio > 0.35
                if (!vis && e.mode !== "scroll") e.mode = "scroll"
            },
            { threshold: [0, 0.35, 0.6], rootMargin: "10% 0px 10% 0px" }
        )
        io.observe(V)
        const read = () => {
            if (!vis) {
                fresh = false
                return
            }
            const r = V.getBoundingClientRect()
            top = r.top
            h = r.height
            vh = window.innerHeight || 1
            fresh = true
        }
        const off = onTick((now) => {
            if (!fresh) return
            // scroll: 0 when the viewer's top is at 88% of the viewport, 1 when it is at 12% (or when its bottom reaches 70% on short screens)
            const span = Math.max(
                80,
                Math.min(vh * 0.76, vh * 0.88 - (vh * 0.7 - h))
            )
            e.st = clamp01((vh * 0.88 - top) / span)
            let want: number
            if (e.mode === "manual") want = e.man
            else if (e.mode === "replay") {
                const k = clamp01((now - e.r0) / 1700)
                want = DV0 + (DV1 - DV0) * easeIO(k)
                if (k >= 1) e.mode = "hold"
            } else if (e.mode === "hold") want = DV1
            else want = DV0 + (DV1 - DV0) * e.st
            e.dv =
                e.mode === "manual" || e.mode === "replay" || lastDv < 0
                    ? want
                    : e.dv + (want - e.dv) * 0.2
            if (Math.abs(e.dv - want) < 0.0006) e.dv = want
            if (
                Math.abs(e.dv - lastDv) > 0.0004 ||
                (e.dv === want && e.dv !== lastDv)
            ) {
                lastDv = e.dv
                V.style.setProperty("--dv", e.dv.toFixed(4))
                const t = clamp01((DV0 - e.dv) / (DV0 - DV1))
                V.style.setProperty("--dt", t.toFixed(4))
                const tx = txtAt(t)
                if (tx !== lastTxt && numEl.current) {
                    lastTxt = tx
                    numEl.current.textContent = tx
                }
                const a = Math.round(e.dv * 100)
                if (a !== lastAria && handle.current) {
                    lastAria = a
                    handle.current.setAttribute("aria-valuenow", String(a))
                    handle.current.setAttribute(
                        "aria-valuetext",
                        `${100 - a}% after`
                    )
                }
            }
            const r =
                autoplay &&
                n > 1 &&
                e.inView &&
                (e.mode !== "scroll" || e.st > 0.94)
            if (r !== lastRun) {
                lastRun = r
                setRun(r)
            }
        }, read)
        return () => {
            off()
            io.disconnect()
        }
    }, [final, cur, n, row.f6, row.f7, unit, autoplay])
    // ---- drag (pointer; horizontal intent only, so a phone can still scroll the page vertically) + DRAG cursor chip ----
    useEffect(() => {
        const V = view.current
        if (!V || !live) return
        let id = -1,
            x0 = 0,
            y0 = 0,
            drag = false,
            cx = 0,
            cy = 0,
            tx = 0,
            ty = 0,
            inside = false
        const fine = window.matchMedia(
            "(hover:hover) and (pointer:fine)"
        ).matches
        const setFrom = (x: number) => {
            const r = V.getBoundingClientRect()
            const e = E.current
            e.mode = "manual"
            e.man = Math.min(0.97, Math.max(0.03, (x - r.left) / r.width))
            if (finalR.current) putStatic(e.man)
        }
        const dn = (ev: PointerEvent) => {
            if ((ev.target as HTMLElement).closest?.("a")) return
            id = ev.pointerId
            x0 = ev.clientX
            y0 = ev.clientY
            drag =
                ev.pointerType === "mouse" ||
                (ev.target as HTMLElement).closest?.(".rwwk-handle") !== null
            if (drag) {
                try {
                    V.setPointerCapture(id)
                } catch (x) {}
                setFrom(ev.clientX)
                V.classList.add("is-drag")
            }
        }
        const mv = (ev: PointerEvent) => {
            const r = V.getBoundingClientRect()
            tx = ev.clientX - r.left
            ty = ev.clientY - r.top
            if (!inside) {
                cx = tx
                cy = ty
            }
            inside = true
            if (ev.pointerId !== id) return
            if (
                !drag &&
                Math.abs(ev.clientX - x0) > 8 &&
                Math.abs(ev.clientX - x0) > Math.abs(ev.clientY - y0)
            ) {
                drag = true
                try {
                    V.setPointerCapture(id)
                } catch (x) {}
                V.classList.add("is-drag")
            }
            if (drag) setFrom(ev.clientX)
        }
        const up = () => {
            id = -1
            drag = false
            V.classList.remove("is-drag")
        }
        const lv = () => {
            inside = false
        }
        V.addEventListener("pointerdown", dn)
        V.addEventListener("pointermove", mv)
        V.addEventListener("pointerup", up)
        V.addEventListener("pointercancel", up)
        V.addEventListener("pointerleave", lv)
        const off = fine
            ? onTick(() => {
                  const ch = chip.current
                  if (!ch || !inside) return
                  cx += (tx - cx) * 0.22
                  cy += (ty - cy) * 0.22
                  ch.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`
              })
            : () => {}
        return () => {
            off()
            V.removeEventListener("pointerdown", dn)
            V.removeEventListener("pointermove", mv)
            V.removeEventListener("pointerup", up)
            V.removeEventListener("pointercancel", up)
            V.removeEventListener("pointerleave", lv)
        }
    }, [live])
    // reduced motion / static: no engine runs — a drag or a key moves the divider directly (the AFTER number stays final)
    const finalR = useRef(final)
    finalR.current = final
    const putStatic = (v: number) => {
        const V = view.current
        if (!V) return
        V.style.setProperty("--dv", v.toFixed(3))
        const a = Math.round(v * 100)
        handle.current?.setAttribute("aria-valuenow", String(a))
        handle.current?.setAttribute("aria-valuetext", `${100 - a}% after`)
    }
    const onHandleKey = (ev: any) => {
        const e = E.current
        const k = ev.key
        let v = e.mode === "manual" ? e.man : e.dv
        if (k === "ArrowLeft" || k === "ArrowDown") v -= 0.05
        else if (k === "ArrowRight" || k === "ArrowUp") v += 0.05
        else if (k === "Home") v = 0.03
        else if (k === "End") v = 0.97
        else if (k === "PageDown") v -= 0.2
        else if (k === "PageUp") v += 0.2
        else return
        ev.preventDefault()
        e.mode = "manual"
        e.man = Math.min(0.97, Math.max(0.03, v))
        if (final) putStatic(e.man)
    }
    const onTabKey = (ev: any, i: number) => {
        const k = ev.key
        const j =
            k === "ArrowRight" || k === "ArrowDown"
                ? i + 1
                : k === "ArrowLeft" || k === "ArrowUp"
                  ? i - 1
                  : k === "Home"
                    ? 0
                    : k === "End"
                      ? n - 1
                      : null
        if (j === null) return
        ev.preventDefault()
        const t = ((j % n) + n) % n
        go(t)
        root.current?.querySelectorAll<HTMLElement>(".rwwk-tab")[t]?.focus()
    }
    const pauseOn = () => {
        const p = hovV.current || focV.current
        setPaused(p)
    }
    const hoverProps = {
        onPointerEnter: (e: any) => {
            if (e.pointerType === "mouse") {
                hovV.current = true
                pauseOn()
            }
        },
        onPointerLeave: () => {
            hovV.current = false
            pauseOn()
        },
        onFocus: () => {
            focV.current = true
            pauseOn()
        },
        onBlur: (e: any) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
                focV.current = false
                pauseOn()
            }
        },
    }
    const layer = (
        r: CmsRow,
        i: number,
        key: string,
        cls: string,
        style?: CSSProperties,
        numRef?: boolean
    ) => {
        const img = RS(
            imgOr(r),
            phone ? "100vw" : "(max-width: 1099px) 100vw, 92vw"
        )
        const rise = wkRise(r.slug || String(i))
        const flat = wkFlat(r.slug || String(i))
        return (
            <div
                key={key}
                className={`rwwk-case ${cls}`}
                style={style}
                aria-hidden={cls.includes("is-out") ? true : undefined}
            >
                <div className="rwwk-lay rwwk-after">
                    <img
                        src={img.src}
                        srcSet={(img as any).srcSet}
                        sizes={(img as any).sizes}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                    />
                    <i className="rwwk-scrim" />
                    <svg
                        className="rwwk-ch rwwk-ch-a"
                        viewBox="0 0 1000 300"
                        preserveAspectRatio="none"
                        aria-hidden
                    >
                        <defs>
                            <linearGradient
                                id={`rwwk-g-${key}`}
                                x1="0"
                                x2="0"
                                y1="0"
                                y2="1"
                            >
                                <stop
                                    offset="0"
                                    stopColor="var(--rw-brass)"
                                    stopOpacity=".42"
                                />
                                <stop
                                    offset="1"
                                    stopColor="var(--rw-brass)"
                                    stopOpacity="0"
                                />
                            </linearGradient>
                        </defs>
                        <path
                            d={`${rise.d} L1000,300 L0,300 Z`}
                            fill={`url(#rwwk-g-${key})`}
                        />
                        <path
                            d={rise.d}
                            className="rwwk-ln"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                    <div className="rwwk-num rwwk-num-a">
                        <span className="rwwk-pill is-a" style={M}>
                            <i />
                            {afterLabel}
                        </span>
                        <span className="rwwk-big" style={D}>
                            {numRef ? (
                                <span
                                    ref={numEl}
                                >{`${r.f7 || ""}${r.f8 || ""}`}</span>
                            ) : (
                                `${r.f7 || ""}${r.f8 || ""}`
                            )}
                        </span>
                    </div>
                </div>
                <div className="rwwk-lay rwwk-before">
                    <img
                        src={img.src}
                        srcSet={(img as any).srcSet}
                        sizes={(img as any).sizes}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                    />
                    <i className="rwwk-scrim" />
                    <svg
                        className="rwwk-ch rwwk-ch-b"
                        viewBox="0 0 1000 300"
                        preserveAspectRatio="none"
                        aria-hidden
                    >
                        <path
                            d={flat}
                            className="rwwk-fl"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                    <div className="rwwk-num rwwk-num-b">
                        <span className="rwwk-pill" style={M}>
                            {beforeLabel}
                        </span>
                        <span
                            className="rwwk-ghost"
                            style={D}
                        >{`${r.f6 || ""}${r.f8 || ""}`}</span>
                    </div>
                </div>
            </div>
        )
    }
    return (
        <section
            ref={root as any}
            className={`rw rw-dark rw-sec rwwk${phone ? " is-ph" : tab ? " is-tab" : ""}${on ? " is-on" : ""}${final ? " is-fin" : ""}`}
            style={{ ...cssVars(c), ...B, ...(props.style || {}) }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html: CSS_WK + siteFontCss(props),
                }}
            />
            <div className="rw-wrap">
                <header className="rwwk-head">
                    <div className="rwwk-hl">
                        <Eyebrow text={eyebrow} on={on} M={M} />
                        <Head
                            text={heading}
                            on={on}
                            D={D}
                            size={
                                phone
                                    ? "clamp(40px,11vw,48px)"
                                    : "clamp(40px,4.6vw,68px)"
                            }
                            lh={0.95}
                            delay={80}
                        />
                    </div>
                    <div className="rwwk-hr" style={rise(on, 300, 14)}>
                        {intro && <p>{intro}</p>}
                        {button && (
                            <Btn
                                href={buttonLink || "/work"}
                                label={button}
                                kind="ghost"
                            />
                        )}
                    </div>
                </header>
                {n > 0 && (
                    <div className="rwwk-main" {...hoverProps}>
                        {n > 1 && (
                            <div
                                className="rwwk-tabs"
                                role="tablist"
                                aria-label="Case studies"
                                style={rise(on, 360, 16)}
                                onFocus={(e: any) => {
                                    const sc = e.currentTarget as HTMLElement
                                    if (sc.scrollWidth > sc.clientWidth + 1)
                                        try {
                                            ;(
                                                e.target as HTMLElement
                                            ).scrollIntoView({
                                                block: "nearest",
                                                inline: "nearest",
                                            })
                                        } catch (x) {}
                                }}
                            >
                                {rows.map((r, i) => {
                                    const sel = i === cur
                                    const im = RS(imgOr(r), "40px")
                                    return (
                                        <button
                                            key={r.slug || i}
                                            type="button"
                                            role="tab"
                                            id={`rwwk-t-${i}`}
                                            aria-selected={sel}
                                            aria-controls="rwwk-panel"
                                            tabIndex={sel ? 0 : -1}
                                            className={`rwwk-tab${sel ? " is-sel" : ""}`}
                                            onClick={() => go(i)}
                                            onKeyDown={(e) => onTabKey(e, i)}
                                        >
                                            <img
                                                src={im.src}
                                                srcSet={(im as any).srcSet}
                                                sizes="40px"
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                                draggable={false}
                                            />
                                            <span className="rwwk-tab-t">
                                                <b>{r.f1}</b>
                                                <small style={M}>
                                                    {r.f6}
                                                    {r.f8} → {r.f7}
                                                    {r.f8}
                                                </small>
                                            </span>
                                            {sel && (
                                                <i
                                                    key={`p${cur}`}
                                                    className={`rwwk-prog${run && !paused && !final ? " is-run" : ""}`}
                                                    onAnimationEnd={() =>
                                                        go(cur + 1)
                                                    }
                                                    aria-hidden
                                                />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                        <div
                            ref={view}
                            className="rwwk-view"
                            style={{
                                ...rise(on, 420, 30),
                                ["--dv" as any]: final ? 0.5 : DV0,
                                ["--dt" as any]: final ? 1 : 0,
                            }}
                        >
                            {prev &&
                                rows[prev.i] &&
                                layer(
                                    rows[prev.i],
                                    prev.i,
                                    `o${prev.i}`,
                                    "is-out",
                                    {
                                        ["--dv" as any]: prev.dv.toFixed(3),
                                        ["--dt" as any]: clamp01(
                                            (DV0 - prev.dv) / (DV0 - DV1)
                                        ).toFixed(3),
                                    } as any
                                )}
                            {layer(
                                row,
                                cur,
                                `c${cur}`,
                                prev ? "is-in" : "",
                                undefined,
                                true
                            )}
                            <div className="rwwk-top" style={M}>
                                <span className="rwwk-cl">
                                    <i className="rw-port" />
                                    {row.f1}
                                    {row.f9 ? ` · ${row.f9}` : ""}
                                </span>
                                <span className="rwwk-ml">{row.f5}</span>
                            </div>
                            <div className="rwwk-div" aria-hidden>
                                <i />
                            </div>
                            <div
                                ref={handle}
                                className="rwwk-handle"
                                role="slider"
                                tabIndex={0}
                                aria-label={sliderLabel}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={
                                    final ? 50 : Math.round(DV0 * 100)
                                }
                                aria-valuetext={final ? "50% after" : undefined}
                                onKeyDown={onHandleKey}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden>
                                    <path
                                        d="M9 7l-5 5 5 5M15 7l5 5-5 5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            <div ref={chip} className="rwwk-cur" aria-hidden>
                                <b style={M}>{dragLabel}</b>
                            </div>
                        </div>
                        <div
                            className="rwwk-info"
                            id="rwwk-panel"
                            role={n > 1 ? "tabpanel" : undefined}
                            aria-labelledby={
                                n > 1 ? `rwwk-t-${cur}` : undefined
                            }
                            style={rise(on, 480, 18)}
                        >
                            <div key={`i${cur}`} className="rwwk-info-in">
                                <div className="rwwk-il">
                                    <p className="rwwk-meta" style={M}>
                                        <span>{row.f3}</span>
                                        {row.f9 && <span>{row.f9}</span>}
                                    </p>
                                    <h3 className="rwwk-title" style={D}>
                                        <a href={`/work/${row.slug || ""}`}>
                                            {row.f2}
                                        </a>
                                    </h3>
                                </div>
                                <div className="rwwk-ir">
                                    {row.f10 && (
                                        <p className="rwwk-sum">{row.f10}</p>
                                    )}
                                    <div className="rwwk-foot">
                                        <span className="rwwk-svs" style={M}>
                                            {listOf(row.f4).map((s, k) => (
                                                <span key={k}>{s}</span>
                                            ))}
                                        </span>
                                        <a
                                            className="rwwk-read"
                                            href={`/work/${row.slug || ""}`}
                                            style={M}
                                        >
                                            {readLabel}
                                            <IcoArrow s={14} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}
const CSS_WK = `
.rwwk{background:var(--rw-night);color:var(--rw-cloud);padding:clamp(88px,9vw,150px) 0 clamp(96px,10vw,160px);overflow-x:clip}
.rwwk .rw-eb i{position:relative} .rwwk .rw-eb i::after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 1.5px var(--rw-brass);animation:rwwk-ping 1.8s cubic-bezier(.2,.6,.3,1) infinite} @keyframes rwwk-ping{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(2.8)}}
.rwwk .rw-hd{font-weight:var(--rw-font-dw,700);letter-spacing:-.045em} .rwwk .rw-it{font-weight:inherit;color:var(--rw-brass)}
.rwwk-head{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:end;gap:40px;margin-bottom:clamp(40px,4.4vw,64px)}
.rwwk-hl{display:flex;flex-direction:column;gap:26px;align-items:flex-start}
.rwwk-hr{display:flex;flex-direction:column;align-items:flex-start;gap:24px;justify-self:end;max-width:400px} .rwwk-hr p{margin:0;font-size:17px;line-height:1.5;color:var(--rw-mut)} .rwwk-hr .rw-btn{--ring:var(--rw-night)}
/* tabs */
.rwwk-tabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-bottom:12px}
.rwwk-tab{all:unset;box-sizing:border-box;position:relative;display:flex;align-items:center;gap:11px;min-width:0;padding:8px 12px 8px 8px;border-radius:999px;cursor:pointer;color:var(--rw-cloud);background:color-mix(in srgb,var(--rw-cloud) 6%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 12%,transparent);overflow:hidden;transition:background .35s,box-shadow .35s,color .35s}
.rwwk-tab img{width:40px;height:40px;flex:none;border-radius:50%;object-fit:cover;filter:grayscale(1) brightness(.8);transition:filter .5s}
.rwwk-tab-t{display:flex;flex-direction:column;gap:3px;min-width:0} .rwwk-tab-t b{font-size:13.5px;font-weight:600;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .rwwk-tab-t small{font-size:10.5px;letter-spacing:.02em;color:color-mix(in srgb,var(--rw-cloud) 60%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rwwk-tab:hover{background:color-mix(in srgb,var(--rw-cloud) 11%,transparent)} .rwwk-tab:hover img{filter:none}
.rwwk-tab.is-sel{background:var(--rw-cloud);color:var(--rw-ink);box-shadow:none} .rwwk-tab.is-sel img{filter:none} .rwwk-tab.is-sel small{color:color-mix(in srgb,var(--rw-ink) 62%,transparent)}
.rwwk-prog{position:absolute;left:16px;right:16px;bottom:0;height:3px;border-radius:3px;background:var(--rw-brass);box-shadow:0 0 0 .5px var(--rw-ink);transform:scaleX(0);transform-origin:left;animation:rwwk-prog 7s linear forwards;animation-play-state:paused}
.rwwk-prog.is-run{animation-play-state:running} @keyframes rwwk-prog{to{transform:scaleX(1)}}
.rwwk.is-fin .rwwk-prog{display:none}
/* the viewer */
.rwwk-view{position:relative;aspect-ratio:16/8;max-height:78svh;width:100%;border-radius:24px;overflow:hidden;background:var(--rw-pine);touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:ew-resize;isolation:isolate;--dv:.85;--dt:0}
.rwwk-case{position:absolute;inset:0}
.rwwk-case.is-in{animation:rwwk-in .8s ease both} .rwwk-case.is-out{z-index:2;animation:rwwk-out .8s ease both;pointer-events:none} @keyframes rwwk-in{from{opacity:0}} @keyframes rwwk-out{to{opacity:0}}
.rwwk-lay{position:absolute;inset:0;overflow:hidden}
.rwwk-lay img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
.rwwk-after img{scale:calc(1.08 - var(--dt)*.08);transition:scale .2s linear}
.rwwk-before{clip-path:inset(0 calc((1 - var(--dv))*100%) 0 0)}
.rwwk-before img{filter:grayscale(1) brightness(.46) contrast(1.08)}
.rwwk-scrim{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.42),transparent 26%,transparent 46%,rgba(0,0,0,.72))}
.rwwk-before .rwwk-scrim{background:linear-gradient(180deg,rgba(0,0,0,.4),transparent 30%,rgba(0,0,0,.55))}
.rwwk-ch{position:absolute;left:0;right:0;bottom:0;width:100%;height:58%;overflow:visible;pointer-events:none}
.rwwk-ch-a{transform-origin:50% 100%;transform:scaleY(calc(.14 + var(--dt)*.86))}
.rwwk-ln{fill:none;stroke:var(--rw-brass);stroke-width:3;stroke-linejoin:round;filter:drop-shadow(0 0 10px color-mix(in srgb,var(--rw-brass) 70%,transparent))}
.rwwk-fl{fill:none;stroke:color-mix(in srgb,var(--rw-cloud) 55%,transparent);stroke-width:2;stroke-dasharray:6 7}
.rwwk-num{position:absolute;bottom:clamp(22px,3vw,40px);display:flex;flex-direction:column;gap:12px}
.rwwk-num-a{right:clamp(22px,3vw,44px);align-items:flex-end;text-align:right}
.rwwk-num-b{left:clamp(22px,3vw,44px);bottom:clamp(76px,8vw,118px);align-items:flex-start}
.rwwk-pill{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 80%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 34%,transparent);background:color-mix(in srgb,var(--rw-night) 30%,transparent);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.rwwk-pill.is-a{background:var(--rw-brass);color:var(--rw-ink);box-shadow:none} .rwwk-pill.is-a i{width:7px;height:7px;border-radius:50%;background:#A2C2BE}
.rwwk-big{font-size:clamp(84px,10.4vw,176px);line-height:.84;letter-spacing:-.06em;font-weight:var(--rw-font-dw,700);color:var(--rw-brass);font-variant-numeric:tabular-nums;white-space:nowrap;text-shadow:0 6px 50px rgba(0,0,0,.35)}
.rwwk-ghost{font-size:clamp(44px,4.8vw,80px);line-height:.9;letter-spacing:-.05em;font-weight:var(--rw-font-dw,700);color:transparent;-webkit-text-stroke:1.4px color-mix(in srgb,var(--rw-cloud) 70%,transparent);white-space:nowrap}
.rwwk-top{position:absolute;z-index:4;left:clamp(16px,2vw,26px);right:clamp(16px,2vw,26px);top:clamp(16px,2vw,24px);display:flex;justify-content:space-between;gap:12px;pointer-events:none;font-size:11.5px;letter-spacing:.06em}
.rwwk-cl{display:inline-flex;align-items:center;gap:9px;padding:8px 14px 8px 12px;border-radius:999px;background:var(--rw-cloud);color:var(--rw-ink);white-space:nowrap}
.rwwk-ml{display:inline-flex;align-items:center;padding:8px 14px;border-radius:999px;text-transform:uppercase;letter-spacing:.12em;font-size:10.5px;background:color-mix(in srgb,var(--rw-night) 40%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 22%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rwwk-div{position:absolute;z-index:3;top:0;bottom:0;left:calc(var(--dv)*100%);width:0;pointer-events:none} .rwwk-div i{position:absolute;top:0;bottom:0;left:-1px;width:2px;background:var(--rw-cloud);box-shadow:0 0 0 1px rgba(0,0,0,.12),0 0 24px 2px color-mix(in srgb,var(--rw-brass) 55%,transparent)}
.rwwk-handle{position:absolute;z-index:5;top:50%;left:calc(var(--dv)*100%);width:64px;height:64px;translate:-50% -50%;display:grid;place-items:center;border-radius:50%;color:var(--rw-cloud);background:color-mix(in srgb,var(--rw-night) 55%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:inset 0 0 0 2px var(--rw-brass),0 12px 30px -8px rgba(0,0,0,.6);cursor:ew-resize;transition:scale .5s cubic-bezier(.34,1.56,.64,1),background .3s}
.rwwk-handle::after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 2px var(--rw-brass);animation:rwwk-hp 2.2s cubic-bezier(.2,.6,.3,1) infinite} @keyframes rwwk-hp{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.75)}}
.rwwk-handle svg{width:24px;height:24px}
.rwwk-view:hover .rwwk-handle,.rwwk-view.is-drag .rwwk-handle,.rwwk-handle:focus-visible{scale:1.22;background:var(--rw-brass);color:var(--rw-ink)}
.rwwk-cur{position:absolute;z-index:6;left:0;top:0;pointer-events:none;opacity:0;transition:opacity .25s} .rwwk-cur b{display:block;translate:18px 18px;padding:7px 12px;border-radius:999px;background:var(--rw-cloud);color:var(--rw-ink);font-size:10.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;box-shadow:0 10px 24px -10px rgba(0,0,0,.6)}
@media (hover:hover) and (pointer:fine){.rwwk-view:hover .rwwk-cur{opacity:1}}
/* info */
.rwwk-info{margin-top:clamp(24px,2.6vw,36px)}
.rwwk-info-in{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:clamp(28px,4vw,72px);align-items:start;animation:rwwk-info .8s cubic-bezier(.2,.8,.2,1) both} @keyframes rwwk-info{from{opacity:0;translate:0 12px}}
.rwwk-meta{display:flex;gap:10px;margin:0 0 14px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--rw-mut)} .rwwk-meta span+span::before{content:"·";margin-right:10px}
.rwwk-title{margin:0;font-size:clamp(28px,2.6vw,40px);line-height:1.04;letter-spacing:-.04em;font-weight:var(--rw-font-dw,700);text-wrap:balance} .rwwk-title a{text-decoration:none;background:linear-gradient(var(--rw-brass),var(--rw-brass)) 0 100%/0 2px no-repeat;transition:background-size .6s cubic-bezier(.2,.8,.2,1)} .rwwk-title a:hover{background-size:100% 2px}
.rwwk-sum{margin:0 0 20px;font-size:17px;line-height:1.5;color:color-mix(in srgb,var(--rw-cloud) 80%,transparent);max-width:46ch}
.rwwk-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px}
.rwwk-svs{display:flex;flex-wrap:wrap;gap:6px} .rwwk-svs span{padding:6px 12px;border-radius:999px;font-size:11px;letter-spacing:.06em;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 24%,transparent)}
.rwwk-read{display:inline-flex;align-items:center;gap:10px;padding:12px 18px;border-radius:999px;background:var(--rw-brass);color:var(--rw-ink);font-size:12px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;transition:gap .4s cubic-bezier(.34,1.56,.64,1)} .rwwk-read:hover{gap:16px}
/* tablet */
.rwwk.is-tab .rwwk-head{grid-template-columns:1fr;align-items:start} .rwwk.is-tab .rwwk-hr{justify-self:start;max-width:560px}
.rwwk.is-tab .rwwk-tabs{grid-template-columns:repeat(3,minmax(0,1fr))} .rwwk.is-tab .rwwk-view{aspect-ratio:4/3} .rwwk.is-tab .rwwk-info-in{grid-template-columns:1fr;gap:18px}
/* phone */
.rwwk.is-ph{padding:80px 0 88px}
.rwwk.is-ph .rwwk-head{grid-template-columns:1fr;gap:24px;margin-bottom:32px} .rwwk.is-ph .rwwk-hr{justify-self:stretch;max-width:none} .rwwk.is-ph .rwwk-hr p{font-size:16px}
.rwwk.is-ph .rwwk-tabs{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;margin:-4px -20px 8px;padding:6px 20px;scroll-padding:0 20px} .rwwk.is-ph .rwwk-tabs::-webkit-scrollbar{display:none}
.rwwk.is-ph .rwwk-tab{flex:none;width:auto;max-width:240px;scroll-snap-align:start}
.rwwk.is-ph .rwwk-view{aspect-ratio:4/5;max-height:none;border-radius:20px}
.rwwk.is-ph .rwwk-ch{height:46%} .rwwk.is-ph .rwwk-big{font-size:clamp(56px,17vw,76px)} .rwwk.is-ph .rwwk-ghost{font-size:32px;-webkit-text-stroke-width:1.1px}
.rwwk.is-ph .rwwk-num{bottom:18px;gap:8px} .rwwk.is-ph .rwwk-num-a{right:16px} .rwwk.is-ph .rwwk-num-b{left:16px;bottom:auto;top:66px}
.rwwk.is-ph .rwwk-ml{display:none} .rwwk.is-ph .rwwk-handle{width:54px;height:54px}
.rwwk.is-ph .rwwk-info-in{grid-template-columns:1fr;gap:16px} .rwwk.is-ph .rwwk-title{font-size:28px} .rwwk.is-ph .rwwk-sum{font-size:16px}
@media (prefers-reduced-motion:reduce){.rwwk-case.is-in,.rwwk-case.is-out,.rwwk-info-in{animation:none!important}}
`
addPropertyControls(RwWork, {
    ...COLOR_CONTROLS,
    ...FONT_CONTROLS,
    ...BP_CONTROL,
    eyebrow: {
        type: ControlType.String,
        title: "Eyebrow",
        defaultValue: "(03) Case studies",
    },
    heading: {
        type: ControlType.String,
        title: "Heading",
        description: "| = line break, *words* = lime",
        defaultValue: "Results you can|*count*.",
        displayTextArea: true,
    },
    intro: {
        type: ControlType.String,
        title: "Intro",
        defaultValue:
            "Six clients, five channels, one habit: we report the number that pays the bills, before and after.",
        displayTextArea: true,
    },
    button: {
        type: ControlType.String,
        title: "Button",
        defaultValue: "All case studies",
    },
    buttonLink: {
        type: ControlType.Link,
        title: "Button link",
        defaultValue: "/work",
    },
    readLabel: {
        type: ControlType.String,
        title: "Case link",
        defaultValue: "Read the case",
    },
    dragLabel: {
        type: ControlType.String,
        title: "Cursor chip",
        defaultValue: "Drag",
    },
    beforeLabel: {
        type: ControlType.String,
        title: "Before label",
        defaultValue: "Before",
    },
    afterLabel: {
        type: ControlType.String,
        title: "After label",
        defaultValue: "After",
    },
    sliderLabel: {
        type: ControlType.String,
        title: "Slider name",
        description: "Read out by screen readers",
        defaultValue: "Compare before and after",
    },
    autoplay: {
        type: ControlType.Boolean,
        title: "Auto-advance",
        description: "Next case every 7 s while in view",
        defaultValue: true,
    },
})
