"use client"
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
} from "react"
import { addPropertyControls, ControlType } from "@/lib/controls"
import {
    type Pal,
    srcOf,
    RS,
    colorsOf,
    fontsOf,
    useFonts,
    useLive,
    useReduced,
    useStill,
    useSize,
    useOn,
    useMagnet,
    useScrollVars,
    useCMS,
    SEED,
    onTick,
    clamp01,
    listOf,
    rise,
    cssVars,
    siteFontCss,
    Btn,
    Eyebrow,
    Head,
    COLOR_CONTROLS,
    FONT_CONTROLS,
    BP_CONTROL,
} from "@/lib/rw"

// ===== RwServices =====
interface ServicesProps extends Pal {
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
    fromLabel: string
    exploreLabel: string
    includesLabel: string
    hint: string
    seoQuery: string
    socialHandle: string
    socialPhoto: any
    adsHeadline: string
    articleTitle: string
    webUrl: string
    brandName: string
    style?: CSSProperties
}
// ---- THE CHANNEL SWITCHER: six tall panels side by side, one per service. A collapsed panel is a spine (number, the title set vertically, a "+");
// the open one fills the row with a LIVE mini-UI of that channel (search rank climbing, a post collecting likes, ad gauges ticking, an article typing,
// a landing page scrolling, a brand system flipping) + the offer. The OPEN panel follows scroll across the section; hover / click / keys take over for 4 s.
// Tablet / phone: the same six as a vertical accordion; one row open at a time and the open slot has a FIXED height, so the page length never changes. ----
const SV_PHOTO =
    "/images/xbfdpTvZzzafiJOwtXCs0luyp2I.webp"
const SV_TONES = ["mist", "ink", "sage", "lime", "pine", "cloud"]
const SV_DARK = new Set(["ink", "pine"])
// step counter: 0 → n over time while `run`, else the final step at once
function useSvStep(n: number, ms: number, run: boolean, delay = 350) {
    const [s, setS] = useState(run ? 0 : n)
    useEffect(() => {
        if (!run) {
            setS(n)
            return
        }
        setS(0)
        let k = 0,
            iv = 0
        const t = window.setTimeout(() => {
            iv = window.setInterval(() => {
                k++
                setS(k)
                if (k >= n) window.clearInterval(iv)
            }, ms)
        }, delay)
        return () => {
            window.clearTimeout(t)
            window.clearInterval(iv)
        }
    }, [run, n, ms])
    return s
}
// eased count a → b while `run` (final value at once otherwise)
function useSvCount(
    a: number,
    b: number,
    dur: number,
    run: boolean,
    delay = 300
) {
    const [v, setV] = useState(run ? a : b)
    useEffect(() => {
        if (!run) {
            setV(b)
            return
        }
        setV(a)
        let raf = 0
        const t0 = performance.now() + delay
        const f = (t: number) => {
            const p = clamp01((t - t0) / dur)
            setV(a + (b - a) * (1 - Math.pow(1 - p, 3)))
            if (p < 1) raf = requestAnimationFrame(f)
        }
        raf = requestAnimationFrame(f)
        return () => cancelAnimationFrame(raf)
    }, [run, a, b, dur])
    return v
}
const SvHeart = () => (
    <svg viewBox="0 0 24 24" aria-hidden>
        <path
            fill="currentColor"
            d="M12 20.5S3.5 15.4 3.5 9.4A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 8.5 2.1c0 6-8.5 11.1-8.5 11.1z"
        />
    </svg>
)
const SvMark = ({ s = 26 }: { s?: number }) => (
    <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="15" fill="var(--rw-brass)" />
        <circle cx="16" cy="16" r="3.4" fill="var(--rw-ink)" />
        <path
            d="M10.2 21.8a8.2 8.2 0 0 1 0-11.6M21.8 10.2a8.2 8.2 0 0 1 0 11.6"
            fill="none"
            stroke="var(--rw-ink)"
            strokeWidth="2.4"
            strokeLinecap="round"
        />
    </svg>
)
type SvCfg = {
    seoQuery: string
    socialHandle: string
    photo: string
    adsHeadline: string
    articleTitle: string
    webUrl: string
    brandName: string
}
type SvP = { run: boolean; cfg: SvCfg; M: CSSProperties; D: CSSProperties }
const SvUI = ({ kind, ...p }: SvP & { kind: string }) => {
    const k = String(kind || "").toLowerCase()
    const C =
        k === "seo"
            ? SvSeo
            : k === "social"
              ? SvSoc
              : k === "ads"
                ? SvAds
                : k === "content"
                  ? SvCnt
                  : k === "web"
                    ? SvWeb
                    : SvBrd
    return <C {...p} />
}
// SEO: our result climbs from #5 to #1
const SvSeo = ({ run, cfg, M, D }: SvP) => {
    const st = useSvStep(4, 640, run, 420)
    const ours = 4 - st
    const others = [
        "citydentalcare.com",
        "yelp.com › dentists",
        "smilecentre.co",
        "healthgrades.com",
    ]
    return (
        <div className="rwsv-ui rwsv-seo">
            <div className="rwsv-q" style={M}>
                <svg viewBox="0 0 24 24" aria-hidden>
                    <circle
                        cx="10.5"
                        cy="10.5"
                        r="6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                    />
                    <path
                        d="M15 15l5 5"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                    />
                </svg>
                <span>{cfg.seoQuery}</span>
                <i />
            </div>
            <p className="rwsv-meta" style={M}>
                About 2,140,000 results · 0.42 s
            </p>
            <div className="rwsv-res">
                {[0, 1, 2, 3, 4].map((i) => {
                    const me = i === 4
                    const slot = me ? ours : i < ours ? i : i + 1
                    return (
                        <div
                            key={i}
                            className={`rwsv-r${me ? " is-me" : ""}${me && ours === 0 ? " is-top" : ""}`}
                            style={{ top: `${Math.min(4, slot) * 20}%` }}
                        >
                            <i className="rwsv-fav" />
                            <span className="rwsv-rt">
                                <b style={M}>
                                    {me ? "yoursite.com" : others[i]}
                                </b>
                                {me ? (
                                    <strong style={D}>
                                        Your brand · {cfg.seoQuery}
                                    </strong>
                                ) : (
                                    <em />
                                )}
                                <em className="rwsv-rt2" />
                            </span>
                            {me && (
                                <span className="rwsv-rank" style={M}>
                                    #{ours + 1}
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>
            <p className={`rwsv-toast${ours === 0 ? " is-on" : ""}`} style={M}>
                <i />
                Position 1 · clicks +212%
            </p>
        </div>
    )
}
// Social: a post collecting likes, heart pops, hearts float up
const SvSoc = ({ run, cfg, M, D }: SvP) => {
    const likes = useSvCount(1184, 1312, 2200, run, 500)
    const pop = useSvStep(1, 400, run, 700)
    return (
        <div className="rwsv-ui rwsv-soc">
            <div className="rwsv-phone">
                <div className="rwsv-ph-h">
                    <i className="rwsv-av" />
                    <span style={M}>{cfg.socialHandle}</span>
                    <b style={M}>···</b>
                </div>
                <div className="rwsv-ph">
                    <img
                        {...RS(cfg.photo, "360px")}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                    />
                    <span
                        className={`rwsv-float${pop ? " is-on" : ""}`}
                        aria-hidden
                    >
                        <i />
                        <i />
                        <i />
                    </span>
                    <span
                        className={`rwsv-toast rwsv-toast-s${pop ? " is-on" : ""}`}
                        style={M}
                    >
                        <i />
                        +128 likes in 1 h
                    </span>
                </div>
                <div className="rwsv-pb">
                    <span className={`rwsv-hrt${pop ? " is-pop" : ""}`}>
                        <SvHeart />
                        <i />
                    </span>
                    <svg className="rwsv-ic" viewBox="0 0 24 24" aria-hidden>
                        <path
                            d="M4 12a8 8 0 1 1 3.3 6.5L4 20l1.2-3.6A8 8 0 0 1 4 12z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <svg className="rwsv-ic" viewBox="0 0 24 24" aria-hidden>
                        <path
                            d="M21 4L10 14M21 4l-7 17-4-7-7-4z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                <p className="rwsv-likes" style={D}>
                    {Math.round(likes).toLocaleString("en-US")} likes
                </p>
                <p className="rwsv-cap">
                    <b>{cfg.socialHandle.replace(/^@/, "")}</b> Monday mornings,
                    sorted ☕
                </p>
            </div>
        </div>
    )
}
// Ads: an ad card + two gauges ticking + revenue bars growing
const SvGauge = ({
    v,
    max,
    label,
    text,
    M,
    D,
}: {
    v: number
    max: number
    label: string
    text: string
    M: CSSProperties
    D: CSSProperties
}) => {
    const f = clamp01(v / max)
    return (
        <span className="rwsv-g">
            <svg viewBox="0 0 120 70" aria-hidden>
                <path
                    d="M10 62a50 50 0 0 1 100 0"
                    className="rwsv-g0"
                    pathLength={1}
                />
                <path
                    d="M10 62a50 50 0 0 1 100 0"
                    className="rwsv-g1"
                    pathLength={1}
                    style={{ strokeDashoffset: 1 - f }}
                />
            </svg>
            <b style={D}>{text}</b>
            <small style={M}>{label}</small>
        </span>
    )
}
const SvAds = ({ run, cfg, M, D }: SvP) => {
    const ctr = useSvCount(0.9, 4.8, 1900, run)
    const roas = useSvCount(1.4, 6.2, 2100, run, 450)
    const bars = [0.28, 0.36, 0.34, 0.5, 0.58, 0.74, 0.96]
    return (
        <div className="rwsv-ui rwsv-ads">
            <div className="rwsv-ad">
                <span className="rwsv-spon" style={M}>
                    <i className="rwsv-av" />
                    Sponsored
                </span>
                <b style={D}>{cfg.adsHeadline}</b>
                <span className="rwsv-adimg" aria-hidden>
                    <i />
                </span>
                <span className="rwsv-adbtn" style={M}>
                    Book now
                </span>
            </div>
            <div className="rwsv-gs">
                <SvGauge
                    v={ctr}
                    max={6}
                    label="CTR"
                    text={`${ctr.toFixed(1)}%`}
                    M={M}
                    D={D}
                />
                <SvGauge
                    v={roas}
                    max={8}
                    label="ROAS"
                    text={`${roas.toFixed(1)}×`}
                    M={M}
                    D={D}
                />
            </div>
            <span className={`rwsv-bars${run ? " is-run" : ""}`} aria-hidden>
                {bars.map((h, i) => (
                    <i
                        key={i}
                        style={{
                            height: `${h * 100}%`,
                            animationDelay: `${0.3 + i * 0.09}s`,
                        }}
                    />
                ))}
            </span>
        </div>
    )
}
// Content: an article typing itself, the read counter climbing
const SvCnt = ({ run, cfg, M, D }: SvP) => {
    const full = cfg.articleTitle
    const n = useSvStep(full.length, 40, run, 350)
    const reads = useSvCount(0, 2410, 2600, run, 600)
    return (
        <div className="rwsv-ui rwsv-cnt">
            <div className="rwsv-art">
                <span className="rwsv-kick" style={M}>
                    Guide · 6 min read
                </span>
                <b className="rwsv-type" style={D}>
                    {full.slice(0, n)}
                    <i className={n < full.length ? "is-typing" : ""} />
                </b>
                <span className="rwsv-by" style={M}>
                    <i className="rwsv-av" />
                    Shilly editorial
                </span>
                <span className="rwsv-lines" aria-hidden>
                    {Array.from({ length: 14 }, (_, i) => (
                        <i key={i} />
                    ))}
                </span>
                <span className="rwsv-prog" aria-hidden>
                    <i
                        style={{
                            transform: `scaleX(${(reads / 2410).toFixed(3)})`,
                        }}
                    />
                </span>
                <span className="rwsv-reads" style={M}>
                    <em />
                    {Math.round(reads).toLocaleString("en-US")} reads this week
                </span>
            </div>
        </div>
    )
}
// Web: a browser whose landing page scrolls, a cursor clicks the CTA
const SvWeb = ({ cfg, M }: SvP) => (
    <div className="rwsv-ui rwsv-web">
        <div className="rwsv-br">
            <div className="rwsv-chrome">
                <i />
                <i />
                <i />
                <span style={M}>{cfg.webUrl}</span>
            </div>
            <div className="rwsv-vp">
                <div className="rwsv-page">
                    <span className="rwsv-pg-nav">
                        <i />
                        <i />
                        <i />
                        <i />
                    </span>
                    <span className="rwsv-pg-h">
                        <i />
                        <i />
                        <i />
                    </span>
                    <span className="rwsv-pg-b" />
                    <span className="rwsv-pg-img" />
                    <span className="rwsv-pg-row">
                        <i />
                        <i />
                        <i />
                    </span>
                    <span className="rwsv-pg-h">
                        <i />
                        <i />
                    </span>
                    <span className="rwsv-pg-q" />
                    <span className="rwsv-pg-row">
                        <i />
                        <i />
                    </span>
                    <span className="rwsv-pg-b" />
                </div>
                <i className="rwsv-cur" aria-hidden />
            </div>
            <span className="rwsv-conv" style={M}>
                Conversion 4.1% ▲
            </span>
        </div>
    </div>
)
// Brand: the logo, four swatches flipping to a second palette, the type
const SvBrd = ({ cfg, M, D }: SvP) => (
    <div className="rwsv-ui rwsv-brd">
        <div className="rwsv-logo">
            <SvMark s={44} />
            <b style={D}>{cfg.brandName}</b>
        </div>
        <div className="rwsv-sw">
            {["#2D3A47", "#F7C8D3", "#B46A72", "#FFF7E6"].map((hx, i) => (
                <span
                    key={i}
                    className={`rwsv-s rwsv-s${i}`}
                    style={{ animationDelay: `${i * 0.16}s` }}
                >
                    <i>
                        <small style={M}>{hx}</small>
                    </i>
                    <i>
                        <small style={M}>
                            {["#A8B58A", "#A9B7C6", "#FFF7E6", "#2D3A47"][i]}
                        </small>
                    </i>
                </span>
            ))}
        </div>
        <div className="rwsv-spec">
            <span style={D}>Aa</span>
            <span style={M}>
                Display · Sans · Mono
                <br />
                Guidelines v1.0
            </span>
        </div>
        <div className="rwsv-apps" aria-hidden>
            <i className="rwsv-app1">
                <SvMark s={22} />
            </i>
            <i className="rwsv-app2" style={D}>
                {cfg.brandName}
            </i>
            <i className="rwsv-app3" />
        </div>
    </div>
)
export default function RwServices(props: ServicesProps) {
    const {
        eyebrow = "(02) Services",
        heading = "Five channels.|*One* growth plan.",
        intro = "Social, ads, content, web and brand under one retainer, one team and one monthly report.",
        button = "All services",
        buttonLink = "/services",
        fromLabel = "From",
        exploreLabel = "Explore",
        includesLabel = "What's included",
        hint = "Scroll to switch channels, or pick one",
        seoQuery = "dentist near me",
        socialHandle = "@kinfolk.coffee",
        socialPhoto,
        adsHeadline = "Free whitening with every new-patient visit",
        articleTitle = "How to rank #1 for “near me” searches",
        webUrl = "yoursite.com/offer",
        brandName = "Kinfolk",
        bpHint = "auto",
    } = props
    const c = colorsOf(props)
    const { D, B, M } = fontsOf(props)
    useFonts()
    const live = useLive()
    const rm = useReduced()
    const still = useStill()
    const rows = useCMS("services", SEED.services || [])
    const n = rows.length
    const root = useRef<HTMLElement>(null)
    const acc = useRef<HTMLDivElement>(null)
    const { w } = useSize(root, bpHint)
    const phone = w < 810,
        tab = w >= 810 && w < 1100,
        horiz = w >= 1240
    const on = useOn(root, live, rm)
    useScrollVars(root, live, rm)
    useMagnet(root, live)
    const final = still || rm || !live
    const [act, setAct0] = useState(0)
    const actR = useRef(0)
    const [prev, setPrev] = useState(-1)
    const setAct = (i: number) => {
        if (i === actR.current || i < 0 || i >= n) return
        setPrev(actR.current)
        actR.current = i
        setAct0(i)
    }
    const hold = useRef(0) // performance.now() until which the visitor's pick holds (Infinity while hovering)
    const hovT = useRef(0)
    const cfg: SvCfg = {
        seoQuery,
        socialHandle,
        photo: srcOf(socialPhoto, SV_PHOTO),
        adsHeadline,
        articleTitle,
        webUrl,
        brandName,
    }
    useEffect(() => {
        if (actR.current >= n && n > 0) {
            actR.current = 0
            setAct0(0)
        }
    }, [n])
    // ---- geometry: the open panel's content is laid out at its FINAL width (no reflow while it grows); the vertical open slot = tallest content ----
    useLayoutEffect(() => {
        const A = acc.current
        if (!A) return
        const m = () => {
            if (horiz) {
                const cw =
                    parseFloat(getComputedStyle(A).getPropertyValue("--cw")) ||
                    92
                const gap = 8
                A.style.setProperty(
                    "--ow",
                    `${Math.max(320, A.clientWidth - (n - 1) * (cw + gap) - cw)}px`
                )
            } else {
                let mx = 0
                A.querySelectorAll<HTMLElement>(".rwsv-pin").forEach((el) => {
                    mx = Math.max(mx, el.scrollHeight)
                })
                if (mx > 0) A.style.setProperty("--oh", `${Math.ceil(mx)}px`)
            }
        }
        m()
        const ro = new ResizeObserver(m)
        ro.observe(A)
        A.querySelectorAll(".rwsv-pin").forEach((el) => ro.observe(el))
        return () => ro.disconnect()
    }, [horiz, n, w])
    // ---- the scroll walk: the accordion's pass through the viewport is split into n segments; entering a new segment opens that channel (unless a pick holds) ----
    useEffect(() => {
        if (final || !acc.current || n < 2) return
        const A = acc.current
        let top = 0,
            h = 1,
            vh = 1,
            fresh = false,
            vis = true,
            lastIdx = -1,
            lastP = -1
        const io = new IntersectionObserver(
            (es) => {
                vis = es[0].isIntersecting
            },
            { rootMargin: "20% 0px 20% 0px" }
        )
        io.observe(A)
        const read = () => {
            if (!vis) {
                fresh = false
                return
            }
            const r = A.getBoundingClientRect()
            top = r.top
            h = r.height
            vh = window.innerHeight || 1
            fresh = true
        }
        const off = onTick(() => {
            if (!fresh) return
            const p = clamp01((vh * 0.72 - top) / (h + vh * 0.54))
            if (Math.abs(p - lastP) > 0.002) {
                lastP = p
                A.style.setProperty("--ap", p.toFixed(3))
            }
            const idx = Math.min(n - 1, Math.floor(p * n))
            if (idx !== lastIdx) {
                lastIdx = idx
                if (performance.now() > hold.current) setAct(idx)
            }
        }, read)
        return () => {
            off()
            io.disconnect()
        }
    }, [final, n])
    // a keyboard visitor's pick holds until the pointer takes over again (the scroll walk must not re-open panels under their focus)
    const kb = useRef(false)
    const pickHold = (i: number, ms = 4000) => {
        hold.current = kb.current ? Infinity : performance.now() + ms
        setAct(i)
    }
    const onKey = (e: any, i: number) => {
        const k = e.key
        let j = -1
        if (k === "ArrowRight" || k === "ArrowDown") j = (i + 1) % n
        else if (k === "ArrowLeft" || k === "ArrowUp") j = (i - 1 + n) % n
        else if (k === "Home") j = 0
        else if (k === "End") j = n - 1
        if (j < 0) return
        e.preventDefault()
        pickHold(j)
        const b = acc.current?.querySelectorAll<HTMLElement>(".rwsv-sp")[j]
        b?.focus()
    }
    const fine = useRef(false)
    useEffect(() => {
        if (live)
            fine.current = window.matchMedia(
                "(hover:hover) and (pointer:fine)"
            ).matches
    }, [live])
    // hover takes over only on REAL pointer movement (content scrolling under a still pointer fires enter events too — that must not freeze the scroll walk)
    const hovI = useRef(-1)
    const moveOn = (e: any, i: number) => {
        if (!fine.current || !horiz || (!e.movementX && !e.movementY)) return
        kb.current = false
        hold.current = performance.now() + 4000
        if (i === actR.current) {
            hovI.current = i
            window.clearTimeout(hovT.current)
            return
        }
        if (hovI.current === i) return
        hovI.current = i
        window.clearTimeout(hovT.current)
        hovT.current = window.setTimeout(() => {
            if (hovI.current === i) setAct(i)
        }, 140)
    }
    const leaveAcc = () => {
        window.clearTimeout(hovT.current)
        hovI.current = -1
    }
    // closed panels are inert (their Explore link can't take focus)
    useEffect(() => {
        const A = acc.current
        if (!A) return
        A.querySelectorAll<HTMLElement>(".rwsv-pc").forEach((el, i) => {
            ;(el as any).inert = i !== act
        })
    }, [act, n, horiz])
    const mode = horiz ? "is-h" : "is-v"
    return (
        <section
            ref={root as any}
            className={`rw rw-sec rwsv ${mode}${phone ? " is-ph" : tab ? " is-tab" : ""}${on ? " is-on" : ""}${final ? " is-fin" : ""}`}
            style={{ ...cssVars(c), ...B, ...(props.style || {}) }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html: CSS_SV + siteFontCss(props),
                }}
            />
            <div className="rw-wrap">
                <header className="rwsv-head">
                    <div className="rwsv-hl">
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
                    <div className="rwsv-hr" style={rise(on, 300, 14)}>
                        {intro && <p>{intro}</p>}
                        {button && (
                            <Btn
                                href={buttonLink || "/services"}
                                label={button}
                                kind="ghost"
                            />
                        )}
                    </div>
                </header>
                {n > 0 && (
                    <div
                        ref={acc}
                        className="rwsv-acc"
                        style={rise(on, 380, 28)}
                        onPointerLeave={leaveAcc}
                    >
                        {rows.map((r, i) => {
                            const open = i === act
                            const tone = SV_TONES[i % SV_TONES.length]
                            const dk = SV_DARK.has(tone)
                            const inc = listOf(r.f5)
                            const id = `rwsv-${r.slug || i}`
                            const showUI = open || i === prev || still
                            return (
                                <div
                                    key={r.slug || i}
                                    className={`rwsv-p t-${tone}${dk ? " is-dk" : ""}${open ? " is-open" : ""}`}
                                    onPointerMove={(e) => moveOn(e, i)}
                                >
                                    <button
                                        type="button"
                                        className="rwsv-sp"
                                        id={`${id}-b`}
                                        aria-expanded={open}
                                        aria-controls={`${id}-c`}
                                        onClick={() => pickHold(i)}
                                        onKeyDown={(e) => onKey(e, i)}
                                        onFocus={(e) => {
                                            if (
                                                (
                                                    e.target as HTMLElement
                                                ).matches(":focus-visible")
                                            ) {
                                                kb.current = true
                                                hold.current = Infinity
                                            }
                                        }}
                                    >
                                        <span className="rwsv-num" style={M}>
                                            {String(i + 1).padStart(2, "0")}
                                        </span>
                                        <span className="rwsv-vt" style={D}>
                                            {r.f1}
                                        </span>
                                        {!horiz && (
                                            <span className="rwsv-rs">
                                                {r.f2}
                                            </span>
                                        )}
                                        <span className="rwsv-plus" aria-hidden>
                                            <i />
                                            <i />
                                        </span>
                                    </button>
                                    <div
                                        className="rwsv-pc"
                                        id={`${id}-c`}
                                        role="region"
                                        aria-labelledby={`${id}-b`}
                                    >
                                        <div className="rwsv-pin">
                                            <div className="rwsv-stage">
                                                {showUI && (
                                                    <SvUI
                                                        key={
                                                            open
                                                                ? `o${act}`
                                                                : `c${i}`
                                                        }
                                                        kind={r.f6}
                                                        run={
                                                            open && on && !final
                                                        }
                                                        cfg={cfg}
                                                        M={M}
                                                        D={D}
                                                    />
                                                )}
                                            </div>
                                            <div className="rwsv-tx">
                                                {horiz && (
                                                    <h3
                                                        className="rwsv-tt"
                                                        style={D}
                                                    >
                                                        {r.f1}
                                                    </h3>
                                                )}
                                                {r.f3 && (
                                                    <p className="rwsv-body">
                                                        {r.f3}
                                                    </p>
                                                )}
                                                {inc.length > 0 && (
                                                    <div className="rwsv-inc">
                                                        <p
                                                            className="rwsv-il"
                                                            style={M}
                                                        >
                                                            {includesLabel}
                                                        </p>
                                                        <ul>
                                                            {inc.map((x, j) => (
                                                                <li key={j}>
                                                                    {x}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                <div className="rwsv-foot">
                                                    {r.f7 && (
                                                        <span
                                                            className="rwsv-stat"
                                                            style={M}
                                                        >
                                                            <i />
                                                            {r.f7}
                                                        </span>
                                                    )}
                                                    {r.f4 && (
                                                        <span
                                                            className="rwsv-pr"
                                                            style={M}
                                                        >
                                                            <small>
                                                                {fromLabel}
                                                            </small>
                                                            {r.f4}
                                                        </span>
                                                    )}
                                                    <Btn
                                                        href={`/services/${r.slug || ""}`}
                                                        label={exploreLabel}
                                                        kind="solid"
                                                        sub={r.f1}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
                {n > 1 && (
                    <div
                        className="rwsv-rail"
                        style={rise(on, 520, 10)}
                        aria-hidden
                    >
                        <span className="rwsv-seg">
                            {rows.map((r, i) => (
                                <i
                                    key={i}
                                    className={
                                        i === act
                                            ? "is-on"
                                            : i < act
                                              ? "is-past"
                                              : ""
                                    }
                                />
                            ))}
                        </span>
                        <span className="rwsv-now" style={M}>
                            <b>
                                {String(act + 1).padStart(2, "0")} /{" "}
                                {String(n).padStart(2, "0")}
                            </b>
                            {rows[act] ? rows[act].f1 : ""}
                        </span>
                        {hint && (
                            <span className="rwsv-hint" style={M}>
                                <i />
                                {hint}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </section>
    )
}
const CSS_SV = `
.rwsv{background:var(--rw-bone);color:var(--rw-ink);padding:clamp(88px,9vw,150px) 0 clamp(96px,10vw,160px);overflow-x:clip}
.rwsv .rw-eb i{position:relative} .rwsv .rw-eb i::after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 1.5px var(--rw-brass);animation:rwsv-ping 1.8s cubic-bezier(.2,.6,.3,1) infinite} @keyframes rwsv-ping{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(2.8)}}
/* headline accent = lime marker that wipes in */
.rwsv .rw-hd{font-weight:var(--rw-font-dw,700);letter-spacing:-.045em}
.rwsv .rw-it{position:relative;isolation:isolate;font-weight:inherit;color:var(--rw-ink);padding:0 .06em;margin:0 -.02em}
.rwsv .rw-it::before{content:"";position:absolute;z-index:-1;left:0;right:0;top:.1em;bottom:.02em;border-radius:.14em;background:var(--rw-brass);transform:scaleX(0);transform-origin:left;transition:transform .9s cubic-bezier(.7,0,.2,1) var(--pd,.6s)}
.rwsv .rw-hd.is-on .rw-it::before{transform:none}
.rwsv-head{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:end;gap:40px;margin-bottom:clamp(44px,4.6vw,72px)}
.rwsv-hl{display:flex;flex-direction:column;gap:26px;align-items:flex-start}
.rwsv-hr{display:flex;flex-direction:column;align-items:flex-start;gap:24px;justify-self:end;max-width:400px} .rwsv-hr p{margin:0;font-size:17px;line-height:1.5;color:var(--rw-mut)}
/* ---- panels (both modes) ---- */
.rwsv-acc{position:relative;--cw:92px;--ease:cubic-bezier(.65,0,.25,1)}
.rwsv-p{position:relative;overflow:hidden;border-radius:22px;background:var(--pbg);color:var(--pfg);--pbg:var(--rw-fog);--pfg:var(--rw-ink);--line:color-mix(in srgb,var(--rw-ink) 14%,transparent);--mut:color-mix(in srgb,var(--rw-ink) 62%,transparent);--stg:color-mix(in srgb,var(--rw-ink) 6%,transparent);isolation:isolate}
.rwsv-p.t-cloud{--pbg:var(--rw-cloud);--stg:var(--rw-bone)}
.rwsv-p.t-lime{--pbg:color-mix(in srgb,var(--rw-brass) 58%,var(--rw-bone));--stg:color-mix(in srgb,var(--rw-cloud) 55%,transparent)}
.rwsv-p.t-bone{--pbg:var(--rw-bone);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-ink) 16%,transparent)} .t-mist{--pbg:#A9B7C6;--stg:color-mix(in srgb,var(--rw-cloud) 45%,transparent)} .t-sage{--pbg:#A8B58A;--stg:color-mix(in srgb,var(--rw-cloud) 45%,transparent)}
.rwsv-p.t-ink{--pbg:var(--rw-ink)} .rwsv-p.t-pine{--pbg:var(--rw-pine)}
.rwsv-p.is-dk{--pfg:var(--rw-cloud);--line:color-mix(in srgb,var(--rw-cloud) 16%,transparent);--mut:color-mix(in srgb,var(--rw-cloud) 66%,transparent);--stg:color-mix(in srgb,var(--rw-cloud) 7%,transparent)}
.rwsv-sp{all:unset;box-sizing:border-box;position:absolute;z-index:3;cursor:pointer;color:inherit;-webkit-tap-highlight-color:transparent}
.rwsv-sp:focus-visible{outline-offset:-4px!important;box-shadow:none!important;border-radius:22px} .rwsv-p.is-dk .rwsv-sp:focus-visible{outline-color:var(--rw-cloud)!important}
.rwsv-num{display:inline-grid;place-items:center;min-width:42px;height:28px;padding:0 9px;border-radius:999px;font-size:11.5px;letter-spacing:.08em;box-shadow:inset 0 0 0 1px var(--line);transition:background .45s,color .45s,box-shadow .45s}
.rwsv-p.is-open .rwsv-num{background:var(--rw-brass);color:var(--rw-ink);box-shadow:none} .rwsv-p.t-lime.is-open .rwsv-num{background:var(--rw-ink);color:var(--rw-brass)}
.rwsv-vt{font-weight:var(--rw-font-dw,700);letter-spacing:-.04em;line-height:1;white-space:nowrap}
.rwsv-plus{position:relative;display:block;flex:none;width:40px;height:40px;border-radius:50%;box-shadow:inset 0 0 0 1px var(--line);transition:rotate .6s cubic-bezier(.34,1.56,.64,1),background .35s,box-shadow .35s}
.rwsv-plus i{position:absolute;left:50%;top:50%;width:13px;height:1.6px;border-radius:2px;background:currentColor;translate:-50% -50%} .rwsv-plus i+i{rotate:90deg;transition:scale .45s}
.rwsv-p.is-open .rwsv-plus{background:var(--rw-brass);color:var(--rw-ink);box-shadow:none} .rwsv-p.is-open .rwsv-plus i+i{scale:0 1} .rwsv-p.t-lime.is-open .rwsv-plus{background:var(--rw-ink);color:var(--rw-brass)}
.rwsv-p:not(.is-open) .rwsv-sp:hover .rwsv-plus{rotate:90deg;background:var(--pfg);color:var(--pbg);box-shadow:none}
.rwsv-stage{position:relative;overflow:hidden;border-radius:18px;background:var(--stg)}
.rwsv-tx{display:flex;flex-direction:column;align-items:flex-start;gap:18px;min-width:0}
.rwsv-tt{margin:0;font-size:48px;line-height:.98;letter-spacing:-.045em;font-weight:var(--rw-font-dw,700)}
.rwsv-body{margin:0;font-size:16.5px;line-height:1.5;max-width:40ch}
.rwsv-il{margin:0 0 10px;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}
.rwsv-inc ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px} .rwsv-inc li{position:relative;padding-left:27px;font-size:15px;line-height:1.35}
.rwsv-inc li::before{content:"";position:absolute;left:0;top:0;width:18px;height:18px;border-radius:50%;background:var(--rw-brass) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M6 12.5l4 4 8-9' fill='none' stroke='%230D0E10' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/></svg>") center/11px no-repeat}
.rwsv-p.t-lime .rwsv-inc li::before{background:var(--rw-ink) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M6 12.5l4 4 8-9' fill='none' stroke='%23D4FF3A' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/></svg>") center/11px no-repeat}
.rwsv-foot{display:flex;flex-wrap:wrap;align-items:center;gap:12px 18px;margin-top:auto;padding-top:6px}
.rwsv-stat{display:inline-flex;align-items:center;gap:8px;padding:8px 13px;border-radius:999px;background:var(--rw-brass);color:var(--rw-ink);font-size:12px;letter-spacing:.02em;font-weight:500} .rwsv-stat i{width:7px;height:7px;border-radius:50%;background:#B46A72}
.rwsv-p.t-lime .rwsv-stat{background:var(--rw-ink);color:var(--rw-brass)}
.rwsv-pr{display:flex;flex-direction:column;gap:3px;font-size:14px} .rwsv-pr small{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}
.rwsv-foot .rw-btn{--ring:var(--pbg)}
.rwsv-p.is-dk .rw-btn.rw-solid{--face:var(--rw-brass);--fg:var(--rw-ink);--fill:var(--rw-cloud);--fg2:var(--rw-ink);--chip:var(--rw-ink);--chipfg:var(--rw-brass);--chip2:var(--rw-ink);--chipfg2:var(--rw-cloud)}
/* the open panel's copy settles in after the panel has grown; a closing panel's copy leaves at once */
.rwsv-pin{transition:opacity .25s ease,translate .25s ease} .rwsv-p:not(.is-open) .rwsv-pin{opacity:0;translate:0 14px}
.rwsv-p.is-open .rwsv-pin{opacity:1;translate:0 0;transition:opacity .6s ease .32s,translate .8s cubic-bezier(.2,.8,.2,1) .32s}
/* ---- HORIZONTAL (desktop) ---- */
.rwsv.is-h .rwsv-acc{display:flex;gap:8px;height:560px}
.rwsv.is-h .rwsv-p{flex:0 0 var(--cw);transition:flex-grow .95s var(--ease),background .5s}
.rwsv.is-h .rwsv-p.is-open{flex-grow:1}
.rwsv.is-h .rwsv-sp{left:0;top:0;bottom:0;width:var(--cw);display:flex;flex-direction:column;align-items:center;padding:24px 0 24px}
.rwsv.is-h .rwsv-p:not(.is-open) .rwsv-sp{right:0;width:auto}
.rwsv.is-h .rwsv-vt{margin-top:auto;margin-bottom:22px;writing-mode:vertical-rl;rotate:180deg;font-size:30px;transition:opacity .4s,translate .6s cubic-bezier(.2,.8,.2,1)}
.rwsv.is-h .rwsv-p.is-open .rwsv-vt{opacity:0;translate:0 20px}
.rwsv.is-h .rwsv-p:not(.is-open):hover{background:color-mix(in srgb,var(--pbg) 90%,var(--pfg))}
.rwsv.is-h .rwsv-pc{position:absolute;top:0;bottom:0;left:var(--cw);width:var(--ow,760px)}
.rwsv.is-h .rwsv-pin{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(24px,2.6vw,40px);height:100%;padding:24px 32px 28px 0}
.rwsv.is-h .rwsv-tx{padding-top:8px}
/* scroll rail */
.rwsv-rail{display:flex;align-items:center;gap:22px;margin-top:22px}
.rwsv-seg{display:flex;gap:6px;flex:none} .rwsv-seg i{display:block;width:28px;height:4px;border-radius:4px;background:color-mix(in srgb,var(--rw-ink) 14%,transparent);transition:background .4s,width .6s cubic-bezier(.2,.8,.2,1)} .rwsv-seg i.is-past{background:color-mix(in srgb,var(--rw-ink) 42%,transparent)} .rwsv-seg i.is-on{width:56px;background:var(--rw-ink);box-shadow:inset 0 0 0 1px var(--rw-ink)}
.rwsv-now{display:flex;align-items:center;gap:12px;font-size:12px;letter-spacing:.06em;text-transform:uppercase} .rwsv-now b{font-weight:500;padding:4px 9px;border-radius:999px;background:var(--rw-brass)}
.rwsv-hint{display:flex;align-items:center;gap:8px;margin-left:auto;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--rw-mut)} .rwsv-hint i{width:7px;height:7px;border-radius:50%;background:#B46A72;animation:rw-blink 1.4s ease-in-out infinite}
/* ---- VERTICAL (tablet / phone): the open slot has a fixed height (--oh), so one opening while another closes never changes the page length ---- */
.rwsv.is-v .rwsv-acc{display:flex;flex-direction:column;gap:6px}
.rwsv.is-v .rwsv-sp{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;column-gap:16px;width:100%;min-height:76px;padding:0 16px 0 18px}
.rwsv.is-v .rwsv-vt{font-size:30px}
.rwsv.is-v .rwsv-rs{grid-column:2;grid-row:2;margin:-12px 0 16px;font-size:14px;line-height:1.35;color:var(--mut);display:none}
.rwsv.is-v .rwsv-pc{height:0;overflow:hidden;transition:height .8s var(--ease)}
.rwsv.is-v .rwsv-p.is-open .rwsv-pc{height:var(--oh,640px)}
.rwsv.is-v .rwsv-pin{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;padding:4px 18px 22px}
.rwsv.is-v .rwsv-stage{height:340px}
.rwsv.is-v .rwsv-rail{margin-top:18px} .rwsv.is-v .rwsv-hint{display:none}
.rwsv.is-v .rwsv-tt{display:none}
/* tablet */
.rwsv.is-tab .rwsv-head{grid-template-columns:1fr;align-items:start} .rwsv.is-tab .rwsv-hr{justify-self:start;max-width:560px}
/* phone */
.rwsv.is-ph{padding:80px 0 88px}
.rwsv.is-ph .rwsv-head{grid-template-columns:1fr;gap:24px;margin-bottom:36px} .rwsv.is-ph .rwsv-hr{justify-self:stretch;max-width:none} .rwsv.is-ph .rwsv-hr p{font-size:16px}
.rwsv.is-ph .rwsv-sp{min-height:68px;column-gap:12px;padding:0 12px 0 14px} .rwsv.is-ph .rwsv-vt{font-size:25px} .rwsv.is-ph .rwsv-num{min-width:36px;height:24px;font-size:10.5px;padding:0 7px} .rwsv.is-ph .rwsv-plus{width:36px;height:36px}
.rwsv.is-ph .rwsv-pin{grid-template-columns:1fr;gap:18px;padding:2px 12px 18px} .rwsv.is-ph .rwsv-stage{height:300px}
.rwsv.is-ph .rwsv-body{font-size:15.5px} .rwsv.is-ph .rwsv-inc li{font-size:14.5px} .rwsv.is-ph .rwsv-foot .rw-btn{width:100%}
.rwsv.is-ph .rwsv-rail{gap:14px} .rwsv.is-ph .rwsv-seg i{width:16px} .rwsv.is-ph .rwsv-seg i.is-on{width:32px}
/* ================= mini UIs ================= */
.rwsv-ui{position:absolute;inset:0;display:flex;flex-direction:column;gap:12px;padding:20px;color:var(--rw-ink);font-size:12px}
.rwsv-av{display:inline-block;flex:none;width:22px;height:22px;border-radius:50%;background:conic-gradient(from 200deg,var(--rw-brass),#B46A72,var(--rw-brass))}
.rwsv-toast{position:absolute;display:inline-flex;align-items:center;gap:8px;margin:0;padding:8px 13px 8px 9px;border-radius:999px;background:var(--rw-cloud);color:var(--rw-ink);font-size:11.5px;white-space:nowrap;box-shadow:0 14px 30px -12px rgba(0,0,0,.45),0 0 0 1px color-mix(in srgb,var(--rw-ink) 8%,transparent);opacity:0;scale:.6;translate:0 10px;transition:opacity .35s,scale .55s cubic-bezier(.34,1.56,.64,1),translate .55s cubic-bezier(.34,1.56,.64,1)}
.rwsv-toast i{width:18px;height:18px;border-radius:50%;background:var(--rw-brass);box-shadow:inset 0 0 0 5px var(--rw-brass),inset 0 0 0 9px var(--rw-ink)} .rwsv-toast::after{content:"";position:absolute;right:-2px;top:-2px;width:9px;height:9px;border-radius:50%;background:#B46A72;box-shadow:0 0 0 2px var(--rw-cloud)}
.rwsv-toast.is-on{opacity:1;scale:1;translate:0 0}
/* seo */
.rwsv-q{display:flex;align-items:center;gap:10px;height:44px;padding:0 16px;border-radius:999px;background:var(--rw-cloud);box-shadow:0 1px 0 color-mix(in srgb,var(--rw-ink) 8%,transparent),0 10px 24px -16px rgba(0,0,0,.4);font-size:13.5px} .rwsv-q svg{width:16px;height:16px;flex:none;color:var(--rw-mut)} .rwsv-q span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .rwsv-q>i{width:3px;height:16px;border-radius:2px;background:var(--rw-ink);animation:rw-blink 1s steps(1) infinite}
.rwsv-meta{margin:0 4px;font-size:10.5px;letter-spacing:.04em;color:var(--mut)}
.rwsv-res{position:relative;flex:1;min-height:0}
.rwsv-r{position:absolute;left:0;right:0;height:calc(20% - 6px);display:flex;align-items:center;gap:11px;padding:0 12px;border-radius:12px;background:color-mix(in srgb,var(--rw-cloud) 55%,transparent);transition:top .6s cubic-bezier(.34,1.25,.64,1),background .4s,box-shadow .4s}
.rwsv-fav{width:22px;height:22px;flex:none;border-radius:50%;background:color-mix(in srgb,var(--rw-ink) 12%,transparent)}
.rwsv-rt{display:flex;flex-direction:column;gap:5px;flex:1;min-width:0} .rwsv-rt b{font-size:10.5px;font-weight:400;color:color-mix(in srgb,var(--rw-ink) 72%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .rwsv-rt em{display:block;height:6px;width:82%;border-radius:4px;background:color-mix(in srgb,var(--rw-ink) 16%,transparent)} .rwsv-rt em.rwsv-rt2{width:58%;height:5px;background:color-mix(in srgb,var(--rw-ink) 9%,transparent)}
.rwsv-rt strong{font-size:14px;line-height:1.1;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rwsv-r.is-me{z-index:2;background:var(--rw-cloud);box-shadow:0 0 0 1.5px var(--rw-ink),0 12px 26px -14px rgba(0,0,0,.55)} .rwsv-r.is-me .rwsv-fav{background:var(--rw-brass);box-shadow:inset 0 0 0 5px var(--rw-cloud),0 0 0 1px var(--rw-ink)} .rwsv-r.is-me .rwsv-rt b{color:var(--rw-ink)}
.rwsv-r.is-top{box-shadow:0 0 0 1.5px var(--rw-ink),0 0 0 6px color-mix(in srgb,var(--rw-brass) 70%,transparent),0 12px 26px -14px rgba(0,0,0,.55)}
.rwsv-rank{flex:none;padding:4px 9px;border-radius:999px;background:var(--rw-ink);color:var(--rw-brass);font-size:12px}
.rwsv-seo .rwsv-toast{right:18px;bottom:18px}
/* social */
.rwsv-soc{align-items:center;justify-content:center;padding:18px}
.rwsv-phone{position:relative;display:flex;flex-direction:column;width:min(100%,270px);height:100%;max-height:470px;border-radius:30px;padding:10px;background:var(--rw-cloud);box-shadow:0 0 0 1px color-mix(in srgb,var(--rw-ink) 10%,transparent),0 30px 60px -30px rgba(0,0,0,.6)}
.rwsv-ph-h{display:flex;align-items:center;gap:8px;padding:4px 4px 10px;font-size:11.5px} .rwsv-ph-h b{margin-left:auto;font-weight:400;color:var(--rw-mut)}
.rwsv-ph{position:relative;flex:1;min-height:0;border-radius:18px;overflow:hidden;background:var(--rw-ink)} .rwsv-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.rwsv-float{position:absolute;right:18px;bottom:10px;width:24px;height:80px;pointer-events:none} .rwsv-float i{position:absolute;left:0;bottom:0;width:18px;height:18px;opacity:0;background:#B46A72;clip-path:path('M9 16.5S1 11.8 1 6.3A3.9 3.9 0 0 1 9 4.6 3.9 3.9 0 0 1 17 6.3c0 5.5-8 10.2-8 10.2z')}
.rwsv-float.is-on i{animation:rwsv-fl 2.2s cubic-bezier(.2,.7,.3,1) infinite} .rwsv-float.is-on i:nth-child(2){animation-delay:.5s;left:8px} .rwsv-float.is-on i:nth-child(3){animation-delay:1.1s;left:-6px}
@keyframes rwsv-fl{0%{opacity:0;transform:translateY(0) scale(.5)}15%{opacity:1}100%{opacity:0;transform:translateY(-78px) scale(1.1) rotate(-12deg)}}
.rwsv-toast-s{left:10px;top:10px}
.rwsv-pb{display:flex;align-items:center;gap:12px;padding:10px 4px 4px} .rwsv-ic{width:21px;height:21px}
.rwsv-hrt{position:relative;display:grid;place-items:center;width:23px;height:23px;transition:color .3s} .rwsv-hrt svg{width:23px;height:23px}
.rwsv-hrt i{position:absolute;inset:-3px;border-radius:50%;box-shadow:0 0 0 2px var(--rw-brass);opacity:0}
.rwsv-hrt.is-pop{color:#B46A72} .rwsv-hrt.is-pop svg{animation:rwsv-hp .6s cubic-bezier(.34,1.56,.64,1)} .rwsv-hrt.is-pop i{animation:rwsv-ping 1s cubic-bezier(.2,.6,.3,1)}
@keyframes rwsv-hp{0%{scale:1}45%{scale:1.45}100%{scale:1}}
.rwsv-likes{margin:4px 4px 0;font-size:15px;letter-spacing:-.02em;font-weight:700;font-variant-numeric:tabular-nums}
.rwsv-cap{margin:2px 4px 4px;font-size:12px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .rwsv-cap b{font-weight:600}
/* ads */
.rwsv-ad{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 88px;grid-template-rows:auto 1fr auto;gap:8px 14px;padding:16px;border-radius:16px;background:var(--rw-ink);color:var(--rw-cloud)}
.rwsv-spon{display:flex;align-items:center;gap:8px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 62%,transparent)} .rwsv-spon .rwsv-av{width:18px;height:18px}
.rwsv-ad b{grid-column:1;font-size:19px;line-height:1.08;letter-spacing:-.03em;font-weight:700}
.rwsv-adimg{grid-column:2;grid-row:1/4;border-radius:12px;background:radial-gradient(circle at 35% 30%,var(--rw-brass),color-mix(in srgb,var(--rw-brass) 30%,var(--rw-ink)) 70%);overflow:hidden;position:relative} .rwsv-adimg i{position:absolute;left:50%;top:56%;width:46px;height:46px;border-radius:50%;translate:-50% -50%;background:var(--rw-cloud);box-shadow:0 0 0 10px color-mix(in srgb,var(--rw-cloud) 26%,transparent)}
.rwsv-adbtn{grid-column:1;justify-self:start;padding:7px 12px;border-radius:999px;background:var(--rw-brass);color:var(--rw-ink);font-size:11px}
.rwsv-gs{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rwsv-g{position:relative;display:flex;flex-direction:column;align-items:center;padding:12px 10px 10px;border-radius:14px;background:var(--rw-cloud)} .rwsv-g svg{width:100%;max-width:140px;height:auto;overflow:visible}
.rwsv-g0,.rwsv-g1{fill:none;stroke-width:11;stroke-linecap:round} .rwsv-g0{stroke:color-mix(in srgb,var(--rw-ink) 9%,transparent)} .rwsv-g1{stroke:var(--rw-brass);stroke-dasharray:1 1;filter:drop-shadow(0 0 .6px var(--rw-ink))}
.rwsv-g b{margin-top:-30px;font-size:24px;line-height:1;letter-spacing:-.03em;font-weight:700;font-variant-numeric:tabular-nums} .rwsv-g small{margin-top:5px;font-size:10px;letter-spacing:.14em;color:var(--rw-mut)}
.rwsv-bars{flex:1;min-height:30px;display:flex;align-items:flex-end;gap:6px;padding:0 4px} .rwsv-bars i{flex:1;border-radius:5px 5px 2px 2px;background:color-mix(in srgb,var(--pfg) 11%,transparent);transform-origin:bottom} .rwsv-bars i:last-child{background:var(--rw-brass);box-shadow:inset 0 0 0 1px var(--rw-ink)}
.rwsv-bars.is-run i{animation:rwsv-bar .9s cubic-bezier(.2,.8,.2,1) backwards} @keyframes rwsv-bar{from{transform:scaleY(0)}}
/* content */
.rwsv-cnt{padding:18px}
.rwsv-art{position:relative;flex:1;display:flex;flex-direction:column;gap:12px;padding:22px;border-radius:16px;background:var(--rw-cloud);box-shadow:0 20px 40px -26px rgba(0,0,0,.5)}
.rwsv-kick{align-self:flex-start;padding:5px 10px;border-radius:999px;background:var(--rw-brass);font-size:10px;letter-spacing:.1em;text-transform:uppercase}
.rwsv-type{min-height:3.3em;font-size:26px;line-height:1.08;letter-spacing:-.035em;font-weight:700} .rwsv-type i{display:inline-block;width:3px;height:.9em;margin-left:3px;vertical-align:-.08em;background:var(--rw-ink);animation:rw-blink 1s steps(1) infinite} .rwsv-type i.is-typing{animation:none}
.rwsv-by{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--rw-mut)}
.rwsv-lines{display:flex;flex-direction:column;gap:8px;flex:1;min-height:0;overflow:hidden} .rwsv-lines i{flex:none;height:6px;border-radius:4px;background:color-mix(in srgb,var(--rw-ink) 10%,transparent)} .rwsv-lines i:nth-child(3n+2){width:92%} .rwsv-lines i:nth-child(3n){width:70%}
.rwsv-prog{height:4px;border-radius:4px;background:color-mix(in srgb,var(--rw-ink) 8%,transparent);overflow:hidden} .rwsv-prog i{display:block;height:100%;background:var(--rw-ink);transform-origin:left}
.rwsv-reads{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--rw-ink);font-variant-numeric:tabular-nums} .rwsv-reads em{width:7px;height:7px;border-radius:50%;background:#B46A72}
/* web */
.rwsv-web{padding:18px}
.rwsv-br{position:relative;flex:1;display:flex;flex-direction:column;border-radius:14px;overflow:hidden;background:var(--rw-cloud);box-shadow:0 24px 44px -26px rgba(0,0,0,.55),0 0 0 1px color-mix(in srgb,var(--rw-ink) 8%,transparent)}
.rwsv-chrome{display:flex;align-items:center;gap:6px;height:34px;flex:none;padding:0 12px;border-bottom:1px solid var(--rw-fog)} .rwsv-chrome>i{width:8px;height:8px;border-radius:50%;background:var(--rw-fog)} .rwsv-chrome>i:first-child{background:#B46A72} .rwsv-chrome span{margin-left:8px;flex:1;padding:4px 12px;border-radius:999px;background:var(--rw-bone);font-size:10.5px;color:var(--rw-mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rwsv-vp{position:relative;flex:1;min-height:0;overflow:hidden}
.rwsv-page{display:flex;flex-direction:column;gap:14px;padding:16px;animation:rwsv-scroll 8s cubic-bezier(.65,0,.35,1) infinite}
@keyframes rwsv-scroll{0%,14%{transform:translateY(0)}46%,62%{transform:translateY(-46%)}90%,100%{transform:translateY(0)}}
.rwsv-pg-nav{display:flex;gap:8px;align-items:center} .rwsv-pg-nav i{height:6px;width:28px;border-radius:4px;background:color-mix(in srgb,var(--rw-ink) 14%,transparent)} .rwsv-pg-nav i:first-child{width:18px;height:18px;border-radius:50%;background:var(--rw-brass);box-shadow:inset 0 0 0 1px var(--rw-ink);margin-right:auto}
.rwsv-pg-h{display:flex;flex-direction:column;gap:7px} .rwsv-pg-h i{height:16px;width:88%;border-radius:5px;background:var(--rw-ink)} .rwsv-pg-h i+i{width:64%} .rwsv-pg-h i+i+i{width:40%}
.rwsv-pg-b{align-self:flex-start;width:108px;height:30px;flex:none;border-radius:999px;background:var(--rw-brass);box-shadow:inset 0 0 0 1px var(--rw-ink)}
.rwsv-pg-img{height:120px;flex:none;border-radius:12px;background:linear-gradient(135deg,var(--rw-ink),color-mix(in srgb,var(--rw-ink) 60%,var(--rw-brass)))}
.rwsv-pg-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px} .rwsv-pg-row i{height:64px;border-radius:10px;background:var(--rw-bone)} .rwsv-pg-row:has(i:nth-child(2):last-child){grid-template-columns:1fr 1fr}
.rwsv-pg-q{height:70px;flex:none;border-radius:12px;background:color-mix(in srgb,var(--rw-brass) 40%,var(--rw-cloud))}
.rwsv-cur{position:absolute;left:62%;top:58%;width:18px;height:18px;border-radius:50%;background:var(--rw-ink);box-shadow:0 0 0 3px var(--rw-cloud);animation:rwsv-cur 8s cubic-bezier(.65,0,.35,1) infinite}
@keyframes rwsv-cur{0%,10%{transform:translate(0,0)}22%{transform:translate(-90px,-60px) scale(.8)}26%{transform:translate(-90px,-60px) scale(1.1)}40%,100%{transform:translate(0,0)}}
.rwsv-conv{position:absolute;right:12px;bottom:12px;display:inline-flex;align-items:center;padding:7px 11px;border-radius:999px;background:var(--rw-ink);color:var(--rw-brass);font-size:11px}
/* brand */
.rwsv-brd{justify-content:space-between;padding:24px}
.rwsv-logo{display:flex;align-items:center;gap:12px} .rwsv-logo b{font-size:38px;letter-spacing:-.055em;font-weight:800;line-height:1}
.rwsv-p.is-dk .rwsv-brd,.rwsv-p.is-dk .rwsv-spec{color:var(--rw-cloud)}
.rwsv-sw{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;perspective:500px}
.rwsv-s{position:relative;height:86px;transform-style:preserve-3d;animation:rwsv-flip 4.4s cubic-bezier(.7,0,.2,1) infinite}
.rwsv-s i{position:absolute;inset:0;display:flex;align-items:flex-end;padding:8px;border-radius:12px;backface-visibility:hidden;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-ink) 14%,transparent)} .rwsv-s i+i{transform:rotateY(180deg)} .rwsv-s small{font-size:9px;letter-spacing:.06em;mix-blend-mode:difference;color:#fff}
.rwsv-s0 i:first-child{background:#2D3A47} .rwsv-s0 i+i{background:#A8B58A} .rwsv-s1 i:first-child{background:#F7C8D3} .rwsv-s1 i+i{background:#A9B7C6} .rwsv-s2 i:first-child{background:#B46A72} .rwsv-s2 i+i{background:#FFF7E6} .rwsv-s3 i:first-child{background:#FFF7E6} .rwsv-s3 i+i{background:#2D3A47}
@keyframes rwsv-flip{0%,35%{transform:rotateY(0)}50%,85%{transform:rotateY(180deg)}100%{transform:rotateY(360deg)}}
.rwsv-spec{display:flex;align-items:center;gap:16px;font-size:10.5px;line-height:1.5;letter-spacing:.1em;text-transform:uppercase;color:var(--rw-ink)} .rwsv-spec span:first-child{font-size:64px;line-height:1;letter-spacing:-.05em;text-transform:none;font-weight:700}
.rwsv-apps{display:flex;gap:10px;align-items:center} .rwsv-apps i{display:grid;place-items:center;height:44px;border-radius:12px;font-style:normal}
.rwsv-app1{width:44px;background:var(--rw-ink)} .rwsv-app2{padding:0 16px;background:var(--rw-brass);color:var(--rw-ink);font-size:15px;font-weight:700;letter-spacing:-.03em;border-radius:999px!important} .rwsv-app3{flex:1;background:repeating-linear-gradient(90deg,#B46A72 0 12px,var(--rw-ink) 12px 24px);opacity:.9}
.rwsv.is-fin .rwsv-s,.rwsv.is-fin .rwsv-page,.rwsv.is-fin .rwsv-cur,.rwsv.is-fin .rwsv-float i{animation:none!important}
.rwsv.is-ph .rwsv-ui{padding:14px} .rwsv.is-ph .rwsv-bars{display:none} .rwsv.is-ph .rwsv-type{font-size:21px} .rwsv.is-ph .rwsv-s{height:64px} .rwsv.is-ph .rwsv-spec span:first-child{font-size:46px} .rwsv.is-ph .rwsv-logo b{font-size:30px} .rwsv.is-ph .rwsv-brd{padding:16px} .rwsv.is-ph .rwsv-apps{display:none}
.rwsv.is-v .rwsv-ad b{font-size:16px} .rwsv.is-v .rwsv-g b{font-size:20px;margin-top:-26px}
@media (prefers-reduced-motion:reduce){.rwsv-s,.rwsv-page,.rwsv-cur,.rwsv-float i{animation:none!important}}
`
addPropertyControls(RwServices, {
    ...COLOR_CONTROLS,
    ...FONT_CONTROLS,
    ...BP_CONTROL,
    eyebrow: {
        type: ControlType.String,
        title: "Eyebrow",
        defaultValue: "(02) Services",
    },
    heading: {
        type: ControlType.String,
        title: "Heading",
        description: "| = line break, *word* = lime marker",
        defaultValue: "Five channels.|*One* growth plan.",
    },
    intro: {
        type: ControlType.String,
        title: "Intro",
        displayTextArea: true,
        defaultValue:
            "Social, ads, content, web and brand under one retainer, one team and one monthly report.",
    },
    button: {
        type: ControlType.String,
        title: "Button",
        defaultValue: "All services",
    },
    buttonLink: {
        type: ControlType.Link,
        title: "Button link",
        defaultValue: "/services",
    },
    fromLabel: {
        type: ControlType.String,
        title: "Price label",
        defaultValue: "From",
    },
    exploreLabel: {
        type: ControlType.String,
        title: "Panel button",
        defaultValue: "Explore",
    },
    includesLabel: {
        type: ControlType.String,
        title: "Includes label",
        defaultValue: "What's included",
    },
    hint: {
        type: ControlType.String,
        title: "Hint",
        defaultValue: "Scroll to switch channels, or pick one",
    },
    seoQuery: {
        type: ControlType.String,
        title: "SEO search",
        defaultValue: "dentist near me",
    },
    socialHandle: {
        type: ControlType.String,
        title: "Social handle",
        defaultValue: "@kinfolk.coffee",
    },
    socialPhoto: { type: ControlType.ResponsiveImage, title: "Social photo" },
    adsHeadline: {
        type: ControlType.String,
        title: "Ad headline",
        defaultValue: "Free whitening with every new-patient visit",
    },
    articleTitle: {
        type: ControlType.String,
        title: "Article title",
        defaultValue: "How to rank #1 for “near me” searches",
    },
    webUrl: {
        type: ControlType.String,
        title: "Web address",
        defaultValue: "yoursite.com/offer",
    },
    brandName: {
        type: ControlType.String,
        title: "Brand name",
        defaultValue: "Kinfolk",
    },
})
