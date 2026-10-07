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
    stack,
    useFonts,
    useStill,
    useLive,
    useSize,
    useReduced,
    onTick,
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
    Stars,
    useOn,
    Head,
    Eyebrow,
    rise,
    SEED,
    pick,
    imgOr,
    useCMS,
    useSite,
    listOf,
} from "@/lib/rw"

// ===== RwReviews =====
interface ReviewsProps extends Pal {
    customFonts: boolean
    displayFont: any
    bodyFont: any
    monoFont: any
    bpHint: string
    eyebrow: string
    heading: string
    subCopy: string
    rating: string
    reviewsLabel: string
    badges: string
    button: string
    buttonLink: string
    clock: string
    date: string
    appName: string
    times: string
    style?: CSSProperties
}
// ---- THE NOTIFICATIONS: a lock screen where client reviews arrive one by one as scroll advances: each drops in from the top with a spring
// and pushes the stack down; older ones compress into a pile (scale, fade). Hover a notification: it opens to the full quote. ----
const RvMark = () => (
    <svg viewBox="0 0 32 32" aria-hidden>
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
export default function RwReviews(props: ReviewsProps) {
    const {
        eyebrow = "Client reviews",
        heading = "Clients who|*stayed*.",
        subCopy = "",
        rating = "",
        reviewsLabel = "client reviews",
        badges = "Google 4.9;Clutch 5.0;G2 4.8",
        button = "Read case studies",
        buttonLink = "/work",
        clock = "09:41",
        date = "Tuesday, 29 September",
        appName = "Reachwise",
        times = "now;2m ago;9m ago;26m ago;1h ago;3h ago",
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
    const { w } = useSize(root, bpHint)
    const phone = w < 810,
        tab = w >= 810 && w < 1100
    const on = useOn(root, live, rm)
    useMagnet(root, live)
    const rows = useCMS("reviews", SEED.reviews || [])
    const n = rows.length
    // arrivals: none while the lock screen comes up the viewport, then one by one until all have landed as it reaches the upper third
    const [got, setGot] = useState(0)
    const gotRef = useRef(0)
    const kbIn = useRef(false)
    // progress follows the LOCK SCREEN itself (it sits under the copy on tablet/phone): 0 when its top clears the bottom 10% of the viewport → 1 when it is in the upper third
    const lockEl = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!live || rm || !lockEl.current) return
        const el = lockEl.current
        let top = 0,
            vh = 1,
            vis = true
        const io = new IntersectionObserver(
            (es) => {
                vis = es[0].isIntersecting
            },
            { rootMargin: "30% 0px 30% 0px" }
        )
        io.observe(el)
        const off = onTick(
            () => {
                if (!vis || kbIn.current) return
                const p = clamp01((vh * 0.9 - top) / (vh * 0.62))
                const k = Math.max(0, Math.min(n, Math.floor(p * n + 0.35)))
                if (k !== gotRef.current) {
                    gotRef.current = k
                    setGot(k)
                }
            },
            () => {
                if (!vis) return
                top = el.getBoundingClientRect().top
                vh = window.innerHeight || 1
            }
        )
        return () => {
            off()
            io.disconnect()
        }
    }, [live, rm, n])
    // focus inside the lock screen: the stack holds still while it is tabbed (a focused notification never gets pushed down and faded out)
    useEffect(() => {
        const el = lockEl.current
        if (!live || !el) return
        const fin = () => {
            kbIn.current = true
        }
        const fout = (e: any) => {
            if (!el.contains(e.relatedTarget as Node)) kbIn.current = false
        }
        el.addEventListener("focusin", fin)
        el.addEventListener("focusout", fout)
        return () => {
            el.removeEventListener("focusin", fin)
            el.removeEventListener("focusout", fout)
        }
    }, [live, n])
    const all = still || rm || !live
    const G = all ? n : got
    const TM = listOf(times)
    const rate = pick(rating, site.rating || "4.9")
    const cnt = site.reviews || "126"
    const sub = pick(
        subCopy,
        "Our average client has been with us for 3.4 years. These are the messages that land in our inbox when the numbers move."
    )
    const step = phone ? 158 : 168
    const stackH = step * 2 + 30 + (phone ? 150 : 156)
    return (
        <section
            ref={root as any}
            className={`rw rw-sec rwrv${phone ? " is-ph" : tab ? " is-tab" : ""}${on ? " is-on" : ""}`}
            style={{ ...cssVars(c), ...B, ...(props.style || {}) }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html:
                        CSS_REVIEWS +
                        siteFontCss(props),
                }}
            />
            <div className="rw-wrap">
                <div className="rwrv-panel">
                    <div className="rwrv-left">
                        <Eyebrow text={eyebrow} on={on} M={M} />
                        <div className="rwrv-score" style={rise(on, 120)}>
                            <p className="rwrv-big" style={D}>
                                {rate}
                            </p>
                            <div className="rwrv-of">
                                <span className="rwrv-stars">
                                    <Stars v={parseFloat(rate) || 5} s={18} />
                                </span>
                                <p className="rwrv-cnt" style={M}>
                                    {cnt} {reviewsLabel}
                                </p>
                            </div>
                        </div>
                        {badges && (
                            <ul
                                className="rwrv-badges"
                                style={{ ...M, ...rise(on, 220) }}
                            >
                                {listOf(badges).map((b, i) => (
                                    <li key={i}>
                                        <i aria-hidden />
                                        {b}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <Head
                            text={heading}
                            on={on}
                            D={D}
                            size="clamp(40px,4.6vw,68px)"
                            lh={0.95}
                            delay={260}
                            className="rwrv-h2"
                        />
                        {sub && (
                            <p className="rwrv-sub" style={rise(on, 480)}>
                                {sub}
                            </p>
                        )}
                        {button && (
                            <div style={rise(on, 560)}>
                                <Btn
                                    href={buttonLink || "/work"}
                                    label={button}
                                    kind="ghost"
                                />
                            </div>
                        )}
                    </div>
                    <div
                        ref={lockEl}
                        className="rwrv-lock"
                        style={rise(on, 200, 40)}
                    >
                        <div className="rwrv-glow" aria-hidden>
                            <i />
                            <i />
                            <i />
                        </div>
                        <div className="rwrv-status" style={M} aria-hidden>
                            <span>{clock}</span>
                            <span className="rwrv-isl" />
                            <span className="rwrv-bat">
                                <i />
                            </span>
                        </div>
                        <div className="rwrv-time" aria-hidden>
                            <svg className="rwrv-lk" viewBox="0 0 24 24">
                                <rect
                                    x="5"
                                    y="10.5"
                                    width="14"
                                    height="10"
                                    rx="2.5"
                                    fill="currentColor"
                                />
                                <path
                                    d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                />
                            </svg>
                            <p className="rwrv-date" style={M}>
                                {date}
                            </p>
                            <p className="rwrv-clock" style={D}>
                                {clock}
                            </p>
                        </div>
                        <p className="rwrv-new" style={M} aria-hidden>
                            <b>{G}</b> {G === 1 ? "new review" : "new reviews"}
                        </p>
                        <ol className="rwrv-stack" style={{ height: stackH }}>
                            {rows
                                .map((r, i) => [r, i] as const)
                                .reverse()
                                .map(([r, i]) => {
                                    const arrived = i < G
                                    const s = arrived ? G - 1 - i : -1
                                    const pile = Math.max(0, s - 2)
                                    const y =
                                        s < 0
                                            ? -70
                                            : Math.min(s, 2) * step +
                                              Math.min(pile, 3) * 12
                                    const sc =
                                        s < 0
                                            ? 0.9
                                            : 1 - Math.min(pile, 3) * 0.045
                                    const op =
                                        s < 0
                                            ? 0
                                            : pile > 2
                                              ? 0
                                              : 1 - pile * 0.28
                                    return (
                                        <li
                                            key={r.slug || i}
                                            className={`rwrv-note${arrived ? " is-in" : ""}${s === 0 ? " is-new" : ""}`}
                                            tabIndex={
                                                arrived && s <= 2 ? 0 : -1
                                            }
                                            aria-hidden={
                                                !arrived || op === 0
                                                    ? true
                                                    : undefined
                                            }
                                            style={{
                                                transform: `translate3d(0,${y}px,0) scale(${sc})`,
                                                opacity: op,
                                                zIndex: 20 - Math.max(0, s),
                                            }}
                                        >
                                            <div className="rwrv-app" style={M}>
                                                <i className="rwrv-ico">
                                                    <RvMark />
                                                </i>
                                                <span>{appName}</span>
                                                <span className="rwrv-when">
                                                    {TM[Math.max(0, s)] ||
                                                        TM[TM.length - 1] ||
                                                        "now"}
                                                </span>
                                            </div>
                                            <div className="rwrv-who">
                                                <img
                                                    {...RS(imgOr(r), "48px")}
                                                    alt=""
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="rwrv-av"
                                                />
                                                <p className="rwrv-nm">
                                                    <b style={D}>{r.f1}</b>
                                                    <span>
                                                        {[r.f2, r.f3]
                                                            .filter(Boolean)
                                                            .join(" · ")}
                                                    </span>
                                                </p>
                                                {r.f5 && (
                                                    <span
                                                        className="rwrv-res"
                                                        style={M}
                                                    >
                                                        {r.f5}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="rwrv-q">“{r.f4}”</p>
                                        </li>
                                    )
                                })}
                        </ol>
                        <div className="rwrv-foot" aria-hidden>
                            <i>
                                <svg viewBox="0 0 24 24">
                                    <path
                                        d="M9 3h6l-1 6h3l-7 12 1-8H8z"
                                        fill="currentColor"
                                    />
                                </svg>
                            </i>
                            <span className="rwrv-home" />
                            <i>
                                <svg viewBox="0 0 24 24">
                                    <rect
                                        x="3"
                                        y="7"
                                        width="18"
                                        height="13"
                                        rx="3"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    />
                                    <circle
                                        cx="12"
                                        cy="13.5"
                                        r="3.4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    />
                                    <path
                                        d="M8.5 7l1.4-2.5h4.2L15.5 7"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    />
                                </svg>
                            </i>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
const CSS_REVIEWS = `
.rwrv{background:var(--rw-bone);color:var(--rw-ink);padding:clamp(40px,4vw,64px) 0 clamp(96px,10vw,160px)}
.rwrv .rw-eb i{border:1px solid var(--rw-ink);animation:rwrv-eb 1.8s cubic-bezier(.2,.6,.3,1) infinite} @keyframes rwrv-eb{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--rw-ink) 35%,transparent)}100%{box-shadow:0 0 0 8px transparent}}
.rwrv .rw-hd{letter-spacing:-.045em}
.rwrv .rw-it{color:var(--rw-ink);font-weight:inherit;padding:0 .08em;margin:0 -.04em;isolation:isolate;display:inline-block}
.rwrv .rw-it::before{content:"";position:absolute;z-index:-1;left:0;right:0;top:.12em;bottom:.04em;border-radius:.16em;background:var(--rw-brass);transform:scaleX(0);transform-origin:left;transition:transform .9s cubic-bezier(.7,0,.2,1) .8s}
.rwrv .rw-hd.is-on .rw-it::before{transform:none}
.rwrv-panel{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,480px);gap:48px clamp(40px,6vw,120px);align-items:center;padding:clamp(40px,5vw,80px);border-radius:32px;background:color-mix(in srgb,var(--rw-fog) 62%,var(--rw-bone));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-ink) 6%,transparent)}
.rwrv-left{display:flex;flex-direction:column;align-items:flex-start;gap:26px}
.rwrv-score{display:flex;align-items:flex-end;gap:22px}
.rwrv-big{margin:0;font-size:clamp(96px,9vw,132px);line-height:.8;letter-spacing:-.06em;font-weight:700}
.rwrv-of{display:flex;flex-direction:column;gap:10px;padding-bottom:4px}
.rwrv-stars{color:var(--rw-ink)} .rwrv-stars .rw-stars{display:inline-flex;gap:3px}
.rwrv-cnt{margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--rw-mut)}
.rwrv-badges{display:flex;flex-wrap:wrap;gap:6px;list-style:none;margin:0;padding:0;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase}
.rwrv-badges li{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;background:var(--rw-bone);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-ink) 14%,transparent)}
.rwrv-badges i{width:6px;height:6px;border-radius:50%;background:var(--rw-brass);box-shadow:0 0 0 1px var(--rw-ink)}
.rwrv-h2{margin-top:10px!important}
.rwrv-sub{margin:0;max-width:440px;font-size:17px;line-height:1.55;color:var(--rw-mut)}
/* the lock screen */
.rwrv-lock{position:relative;display:flex;flex-direction:column;width:100%;max-width:480px;justify-self:end;padding:14px 18px 16px;border-radius:52px;background:var(--rw-night);color:var(--rw-cloud);box-shadow:0 0 0 6px color-mix(in srgb,var(--rw-ink) 88%,var(--rw-stone)),0 50px 90px -40px rgba(13,14,16,.6);overflow:hidden;isolation:isolate}
.rwrv-glow{position:absolute;z-index:-1;left:50%;top:150px;width:0;height:0}
.rwrv-glow i{position:absolute;left:0;top:0;width:560px;height:560px;margin:-280px 0 0 -280px;border-radius:50%;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 7%,transparent)} .rwrv-glow i:nth-child(2){scale:.66} .rwrv-glow i:nth-child(3){scale:1.4}
.rwrv-lock::before{content:"";position:absolute;z-index:-1;left:-20%;right:-20%;bottom:-30%;height:70%;background:radial-gradient(50% 50% at 50% 50%,color-mix(in srgb,var(--rw-brass) 30%,transparent),transparent 70%);filter:blur(10px)}
.rwrv-status{display:flex;align-items:center;justify-content:space-between;padding:6px 12px 0;font-size:13px;font-weight:600}
.rwrv-isl{width:96px;height:28px;border-radius:999px;background:#000}
.rwrv-bat{position:relative;width:24px;height:12px;border-radius:4px;box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--rw-cloud) 60%,transparent)} .rwrv-bat i{position:absolute;left:3px;top:3px;bottom:3px;width:62%;border-radius:2px;background:var(--rw-brass)}
.rwrv-time{display:flex;flex-direction:column;align-items:center;padding:18px 0 6px;text-align:center}
.rwrv-lk{width:16px;height:16px;opacity:.85}
.rwrv-date{margin:8px 0 0;font-size:13px;letter-spacing:.04em;color:color-mix(in srgb,var(--rw-cloud) 80%,transparent)}
.rwrv-clock{margin:2px 0 0;font-size:clamp(76px,7vw,96px);line-height:1;letter-spacing:-.04em;font-weight:600;font-variant-numeric:tabular-nums}
.rwrv-new{display:flex;align-items:center;gap:6px;margin:16px 4px 10px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 70%,transparent)} .rwrv-new b{display:grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#FF3E88;color:#0D0E10;font-weight:600;letter-spacing:0}
.rwrv-stack{position:relative;list-style:none;margin:0;padding:0}
.rwrv-note{position:absolute;left:0;right:0;top:0;display:flex;flex-direction:column;gap:10px;min-height:150px;padding:14px 16px 15px;border-radius:24px;background:color-mix(in srgb,var(--rw-cloud) 90%,transparent);color:var(--rw-ink);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);box-shadow:0 18px 40px -22px rgba(0,0,0,.7);transform-origin:50% 0;transition:transform .95s cubic-bezier(.34,1.42,.5,1),opacity .55s ease,box-shadow .4s,background .3s;outline:none}
.rwrv-app{display:flex;align-items:center;gap:8px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-ink) 62%,transparent)}
.rwrv-ico{display:block;width:20px;height:20px;border-radius:6px;overflow:hidden} .rwrv-ico svg{display:block;width:100%;height:100%}
.rwrv-when{margin-left:auto;letter-spacing:.04em;text-transform:none}
.rwrv-who{display:flex;align-items:center;gap:10px}
.rwrv-av{flex:none;width:36px;height:36px;border-radius:50%;object-fit:cover;object-position:50% 22%;background:var(--rw-fog)}
.rwrv-nm{display:flex;flex-direction:column;flex:1;margin:0;font-size:12.5px;line-height:1.3;color:var(--rw-mut)} .rwrv-nm b{font-size:15px;color:var(--rw-ink);font-weight:700;letter-spacing:-.01em}
.rwrv-res{flex:none;padding:5px 10px;border-radius:999px;background:var(--rw-brass);color:var(--rw-ink);font-size:11px;letter-spacing:.02em;white-space:nowrap}
.rwrv-q{margin:0;font-size:14.5px;line-height:1.42;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.rwrv-note.is-new .rwrv-ico{box-shadow:0 0 0 0 var(--rw-brass);animation:rwrv-ping 1.2s cubic-bezier(.2,.6,.3,1) .5s}
@keyframes rwrv-ping{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--rw-brass) 90%,transparent)}100%{box-shadow:0 0 0 12px transparent}}
.rwrv-note:hover,.rwrv-note:focus-visible{z-index:40!important;background:var(--rw-cloud);box-shadow:0 30px 60px -20px rgba(0,0,0,.8),0 0 0 2px var(--rw-brass)} .rwrv-note:hover .rwrv-q,.rwrv-note:focus-visible .rwrv-q{-webkit-line-clamp:12}
.rwrv-foot{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 4px}
.rwrv-foot i{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:color-mix(in srgb,var(--rw-cloud) 12%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)} .rwrv-foot svg{width:20px;height:20px}
.rwrv-home{align-self:flex-end;width:130px;height:5px;border-radius:999px;background:color-mix(in srgb,var(--rw-cloud) 80%,transparent)}
/* tablet */
.rwrv.is-tab .rwrv-panel{grid-template-columns:1fr;padding:48px 40px} .rwrv.is-tab .rwrv-lock{justify-self:center}
/* phone */
.rwrv.is-ph{padding:24px 0 80px} .rwrv.is-ph .rw-wrap{--pad:12px}
.rwrv.is-ph .rwrv-panel{grid-template-columns:1fr;padding:40px 16px 16px;border-radius:26px;gap:40px} .rwrv.is-ph .rwrv-left{padding:0 6px}
.rwrv.is-ph .rwrv-big{font-size:96px} .rwrv.is-ph .rwrv-sub{font-size:16px}
.rwrv.is-ph .rwrv-lock{padding:12px 12px 14px;border-radius:40px;box-shadow:0 0 0 5px color-mix(in srgb,var(--rw-ink) 88%,var(--rw-stone)),0 40px 70px -40px rgba(13,14,16,.6)}
.rwrv.is-ph .rwrv-clock{font-size:78px} .rwrv.is-ph .rwrv-note{padding:13px 13px 14px;border-radius:22px} .rwrv.is-ph .rwrv-res{font-size:10.5px;padding:4px 8px} .rwrv.is-ph .rwrv-q{font-size:14px}
@media (prefers-reduced-motion:reduce){.rwrv-note{transition:none}}
`
addPropertyControls(RwReviews, {
    ...COLOR_CONTROLS,
    ...FONT_CONTROLS,
    ...BP_CONTROL,
    eyebrow: {
        type: ControlType.String,
        title: "Eyebrow",
        defaultValue: "Client reviews",
    },
    heading: {
        type: ControlType.String,
        title: "Heading",
        description: "| = line break, *words* = lime highlight",
        defaultValue: "Clients who|*stayed*.",
        displayTextArea: true,
    },
    subCopy: {
        type: ControlType.String,
        title: "Text",
        defaultValue:
            "Our average client has been with us for 3.4 years. These are the messages that land in our inbox when the numbers move.",
        displayTextArea: true,
    },
    rating: {
        type: ControlType.String,
        title: "Rating",
        description: "Empty = the Rating on the Site CMS row",
        defaultValue: "",
    },
    reviewsLabel: {
        type: ControlType.String,
        title: "Reviews label",
        description: "Shown after the Reviews Count from the Site CMS row",
        defaultValue: "client reviews",
    },
    badges: {
        type: ControlType.String,
        title: "Badges",
        description: "Separate with ;",
        defaultValue: "Google 4.9;Clutch 5.0;G2 4.8",
    },
    button: {
        type: ControlType.String,
        title: "Button",
        defaultValue: "Read case studies",
    },
    buttonLink: {
        type: ControlType.Link,
        title: "Button link",
        defaultValue: "/work",
    },
    clock: { type: ControlType.String, title: "Clock", defaultValue: "09:41" },
    date: {
        type: ControlType.String,
        title: "Date",
        defaultValue: "Tuesday, 29 September",
    },
    appName: {
        type: ControlType.String,
        title: "App name",
        defaultValue: "Reachwise",
    },
    times: {
        type: ControlType.String,
        title: "Times",
        description: "Newest first, separate with ;",
        defaultValue: "now;2m ago;9m ago;26m ago;1h ago;3h ago",
    },
})
