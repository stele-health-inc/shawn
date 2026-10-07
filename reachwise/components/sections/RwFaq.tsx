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
    cssVars,
    COLOR_CONTROLS,
    FONT_CONTROLS,
    siteFontCss,
    fontsOf,
    BP_CONTROL,
    Btn,
    useMagnet,
    SCRUB_K,
    useOn,
    Head,
    Eyebrow,
    rise,
    SEED,
    pick,
    useCMS,
    useSite,
} from "@/lib/rw"

// ===== RwFaq =====
interface FaqProps extends Pal {
    customFonts: boolean
    displayFont: any
    bodyFont: any
    monoFont: any
    bpHint: string
    eyebrow: string
    heading: string
    cardLabel: string
    cardTitle: string
    cardBody: string
    button: string
    buttonLink: string
    emailLabel: string
    replyNote: string
    firstOpen: boolean
    style?: CSSProperties
}
// ---- THE ANSWERS: a sticky left column (heading + an ink "Still unsure?" card) and an accordion on the right. A lime signal line fills down the
// left edge of the list with the scroll; each question it reaches lights a lime dot (reached). ----
export default function RwFaq(props: FaqProps) {
    const {
        eyebrow = "(09) FAQ",
        heading = "Questions,|*answered*.",
        cardLabel = "Still unsure?",
        cardTitle = "Ask us on a free 30-minute call.",
        cardBody = "",
        button = "Book a call",
        buttonLink = "",
        emailLabel = "Or write to",
        replyNote = "We reply within 2 hours",
        firstOpen = true,
        bpHint = "auto",
    } = props
    const c = colorsOf(props)
    const { D, B, M } = fontsOf(props)
    useFonts()
    const live = useLive()
    const rm = useReduced()
    const still = useStill()
    const site = useSite()
    const Dh: CSSProperties = {
        ...D,
        fontWeight: props.customFonts
            ? D.fontWeight
            : ("var(--rw-font-dw, 700)" as any),
    }
    const root = useRef<HTMLElement>(null)
    const list = useRef<HTMLDivElement>(null)
    const { w } = useSize(root, bpHint)
    const phone = w < 810,
        tab = w >= 810 && w < 1100
    useMagnet(root, live)
    const on = useOn(root, live, rm)
    const rows = useCMS("faq", SEED.faq || [])
    const [open, setOpen] = useState<number>(firstOpen ? 0 : -1)
    const book = pick(buttonLink, site.book || "/contact")
    const settled = still || rm || !live
    // the signal line: 0 at the list top → 1 at its bottom, measured against a reading line at 62% of the viewport. Rows at or above the line are "reached".
    useEffect(() => {
        if (!live || rm || !list.current) return
        const el = list.current
        let top = 0,
            h = 1,
            vh = 1,
            vis = true,
            last = -1,
            lastK = -2
        const io = new IntersectionObserver(
            (es) => {
                vis = es[0].isIntersecting
            },
            { rootMargin: "20% 0px 20% 0px" }
        )
        io.observe(el)
        let marks: number[] = []
        const read = () => {
            if (!vis) return
            const r = el.getBoundingClientRect()
            top = r.top
            h = r.height || 1
            vh = window.innerHeight
            marks = Array.from(
                el.querySelectorAll<HTMLElement>(".rwfq-row")
            ).map((x) => (x.offsetTop + 34) / h)
        }
        let cur = -1
        const off = onTick(() => {
            if (!vis) return
            const f = clamp01((vh * 0.62 - top) / h)
            cur = cur < 0 ? f : cur + (f - cur) * SCRUB_K
            if (Math.abs(cur - f) < 0.0005) cur = f
            if (Math.abs(cur - last) < 0.0004) return
            last = cur
            el.style.setProperty("--f", cur.toFixed(4))
            let k = -1
            marks.forEach((m, i) => {
                if (cur >= m) k = i
            })
            if (k !== lastK) {
                lastK = k
                el.querySelectorAll<HTMLElement>(".rwfq-row").forEach((x, i) =>
                    x.toggleAttribute("data-hit", i <= k)
                )
            }
        }, read)
        return () => {
            off()
            io.disconnect()
        }
    }, [live, rm, rows.length])
    const mail = site.email
    return (
        <section
            id="faq"
            ref={root as any}
            className={`rw rw-sec rwfq${phone ? " is-ph" : tab ? " is-tab" : ""}${on ? " is-on" : ""}${settled ? " is-set" : ""}`}
            style={{ ...cssVars(c), ...B, ...(props.style || {}) }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html:
                        CSS_FAQ + siteFontCss(props),
                }}
            />
            <div className="rw-wrap rwfq-in">
                <div className="rwfq-side">
                    <div className="rwfq-stick">
                        <Eyebrow text={eyebrow} on={on} M={M} />
                        <Head
                            text={heading}
                            on={on}
                            D={Dh}
                            size="clamp(40px,4.6vw,68px)"
                            lh={0.95}
                            delay={120}
                            className="rwfq-h"
                        />
                        <div
                            className="rwfq-card rw-dark"
                            style={rise(on, 420, 26)}
                        >
                            <p className="rwfq-cl" style={M}>
                                <i className="rwfq-ring" aria-hidden />
                                {cardLabel}
                            </p>
                            <p className="rwfq-ct" style={Dh}>
                                {cardTitle}
                            </p>
                            {cardBody && <p className="rwfq-cb">{cardBody}</p>}
                            <Btn
                                href={book}
                                label={button}
                                kind="solid"
                                icon="cal"
                                className="rwfq-btn"
                            />
                            {mail && (
                                <p className="rwfq-mail">
                                    {emailLabel}{" "}
                                    <a href={`mailto:${mail}`}>{mail}</a>
                                </p>
                            )}
                            {replyNote && (
                                <p className="rwfq-rep" style={M}>
                                    <i className="rw-port" aria-hidden />
                                    {replyNote}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div ref={list} className="rwfq-list">
                    <i className="rwfq-line" aria-hidden>
                        <b />
                    </i>
                    {rows.map((r, i) => {
                        const isO = open === i
                        const id = `rwfq-a-${r.slug || i}`
                        return (
                            <div
                                key={r.slug || i}
                                className={`rwfq-row${isO ? " is-open" : ""}`}
                                style={rise(on, 200 + i * 60, 18)}
                            >
                                <i className="rwfq-dot" aria-hidden />
                                <h3 className="rwfq-q">
                                    <button
                                        type="button"
                                        aria-expanded={isO}
                                        aria-controls={id}
                                        onClick={() => setOpen(isO ? -1 : i)}
                                    >
                                        <span className="rwfq-no" style={M}>
                                            {String(i + 1).padStart(2, "0")}
                                        </span>
                                        <span className="rwfq-qt" style={Dh}>
                                            {r.f1}
                                        </span>
                                        {r.f3 && (
                                            <span className="rwfq-g" style={M}>
                                                {r.f3}
                                            </span>
                                        )}
                                        <span className="rwfq-pl" aria-hidden>
                                            <i />
                                            <i />
                                        </span>
                                    </button>
                                </h3>
                                <div
                                    className="rwfq-a"
                                    id={id}
                                    role="region"
                                    aria-hidden={!isO}
                                >
                                    <div>
                                        <p>{r.f2}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
const CSS_FAQ = `
.rwfq{background:var(--rw-bone);color:var(--rw-ink);padding:clamp(96px,10vw,150px) 0}
.rwfq .rw-it{position:relative;color:var(--rw-ink);font-weight:inherit;padding:0 .06em;isolation:isolate}
.rwfq .rw-it::before{content:"";position:absolute;z-index:-1;left:0;right:0;top:.1em;bottom:.02em;border-radius:.14em;background:var(--rw-brass);transform:scaleX(0);transform-origin:left;transition:transform .9s cubic-bezier(.7,0,.2,1) .7s}
.rwfq .rw-hd.is-on .rw-it::before{transform:none}
.rwfq-in{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(40px,6vw,110px);align-items:start}
.rwfq-side{align-self:stretch}
.rwfq-stick{position:sticky;top:110px;display:flex;flex-direction:column;align-items:flex-start;gap:24px}
.rwfq-card{width:100%;max-width:440px;margin-top:22px;padding:28px;border-radius:24px;background:var(--rw-ink);color:var(--rw-cloud);box-shadow:0 30px 60px -30px rgba(0,0,0,.45)}
.rwfq-cl{display:flex;align-items:center;gap:10px;margin:0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 70%,transparent)}
.rwfq-ring{position:relative;width:12px;height:12px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--rw-brass)} .rwfq-ring::after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 1.5px var(--rw-brass);animation:rwfq-ping 1.8s cubic-bezier(.2,.6,.3,1) infinite}
@keyframes rwfq-ping{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(2.8)}}
.rwfq-ct{margin:14px 0 0;font-size:clamp(24px,2vw,30px);line-height:1.05;letter-spacing:-.035em}
.rwfq-cb{margin:10px 0 0;font-size:15px;line-height:1.5;color:color-mix(in srgb,var(--rw-cloud) 72%,transparent)}
.rwfq-btn{margin-top:22px;--ring:var(--rw-ink)}
.rwfq-card .rw-btn.rw-solid{--face:var(--rw-brass);--fg:var(--rw-ink);--fill:var(--rw-cloud);--fg2:var(--rw-ink);--chip:var(--rw-ink);--chipfg:var(--rw-brass);--chip2:var(--rw-ink);--chipfg2:var(--rw-brass)}
.rwfq-mail{margin:18px 0 0;font-size:15px;color:color-mix(in srgb,var(--rw-cloud) 70%,transparent)} .rwfq-mail a{color:var(--rw-cloud);text-decoration:none;background:linear-gradient(var(--rw-brass),var(--rw-brass)) 0 100%/100% 1.5px no-repeat;padding-bottom:2px}
.rwfq-rep{display:flex;align-items:center;gap:9px;margin:10px 0 0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 60%,transparent)}
.rwfq-list{--f:1;position:relative;padding-left:34px;border-top:1px solid var(--rw-fog)}
.rwfq:not(.is-set) .rwfq-list{--f:0}
.rwfq-line{position:absolute;left:0;top:0;bottom:0;width:2px;border-radius:2px;background:var(--rw-fog)}
.rwfq-line b{position:absolute;inset:0;border-radius:inherit;background:var(--rw-brass);transform-origin:top;transform:scaleY(var(--f));box-shadow:0 0 12px color-mix(in srgb,var(--rw-brass) 80%,transparent)}
.rwfq-line b::after{content:"";position:absolute;left:50%;bottom:0;width:10px;height:10px;border-radius:50%;background:var(--rw-brass);translate:-50% 50%;transform:scaleY(calc(1 / max(var(--f),.01)));box-shadow:0 0 0 4px color-mix(in srgb,var(--rw-brass) 30%,transparent)}
.rwfq-row{position:relative;border-bottom:1px solid var(--rw-fog)}
.rwfq-row::before{content:"";position:absolute;left:-34px;right:0;top:0;bottom:0;border-radius:14px;background:color-mix(in srgb,var(--rw-ink) 4%,transparent);opacity:0;transition:opacity .35s;pointer-events:none}
.rwfq-row:hover::before{opacity:1}
.rwfq-dot{position:absolute;left:-39px;top:31px;width:12px;height:12px;border-radius:50%;background:var(--rw-bone);box-shadow:inset 0 0 0 2px var(--rw-fog);transition:background .4s,box-shadow .4s,scale .5s cubic-bezier(.34,1.56,.64,1);z-index:1}
.rwfq-row[data-hit] .rwfq-dot,.rwfq.is-set .rwfq-dot{background:var(--rw-brass);box-shadow:inset 0 0 0 2px var(--rw-ink);scale:1.15}
.rwfq-q{margin:0;font:inherit}
.rwfq-q button{position:relative;display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:18px;width:100%;padding:24px 4px 24px 0;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
.rwfq-no{font-size:12px;letter-spacing:.1em;color:var(--rw-mut)}
.rwfq-qt{font-size:clamp(20px,1.7vw,25px);line-height:1.15;letter-spacing:-.03em;transition:translate .5s cubic-bezier(.2,.8,.2,1)}
.rwfq-row:hover .rwfq-qt{translate:6px 0}
.rwfq-g{padding:5px 10px;border-radius:999px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;box-shadow:inset 0 0 0 1px var(--rw-fog);color:var(--rw-mut)}
.rwfq-pl{position:relative;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-ink) 22%,transparent);transition:background .4s,rotate .5s cubic-bezier(.7,0,.2,1),box-shadow .4s}
.rwfq-pl i{position:absolute;width:14px;height:1.8px;border-radius:2px;background:currentColor} .rwfq-pl i+i{rotate:90deg}
.rwfq-row:hover .rwfq-pl{box-shadow:inset 0 0 0 1px var(--rw-ink)}
.rwfq-row.is-open .rwfq-pl{rotate:135deg;background:var(--rw-brass);box-shadow:none}
.rwfq-a{display:grid;grid-template-rows:0fr;transition:grid-template-rows .55s cubic-bezier(.7,0,.2,1)} .rwfq-a>div{overflow:hidden}
.rwfq-row.is-open .rwfq-a{grid-template-rows:1fr}
.rwfq-a p{margin:0;padding:0 70px 28px 44px;max-width:720px;font-size:17px;line-height:1.55;color:color-mix(in srgb,var(--rw-ink) 76%,var(--rw-bone));opacity:0;translate:0 -6px;transition:opacity .4s,translate .5s}
.rwfq-row.is-open .rwfq-a p{opacity:1;translate:0 0;transition-delay:.12s}
.rwfq.is-tab .rwfq-in{grid-template-columns:1fr;gap:48px} .rwfq.is-tab .rwfq-stick{position:relative;top:auto}
.rwfq.is-tab .rwfq-card{max-width:none;display:grid;grid-template-columns:1fr auto;column-gap:24px;align-items:center} .rwfq.is-tab .rwfq-card>*{grid-column:1} .rwfq.is-tab .rwfq-btn{grid-column:2;grid-row:1/span 3;margin:0}
.rwfq.is-ph .rwfq-in{grid-template-columns:1fr;gap:40px} .rwfq.is-ph .rwfq-stick{position:relative;top:auto} .rwfq.is-ph .rwfq-card{padding:22px;max-width:none}
.rwfq.is-ph .rwfq-list{padding-left:24px} .rwfq.is-ph .rwfq-dot{left:-29px;top:25px} .rwfq.is-ph .rwfq-row::before{left:-24px}
.rwfq.is-ph .rwfq-q button{grid-template-columns:1fr auto;gap:10px 14px;padding:18px 0} .rwfq.is-ph .rwfq-no{grid-column:1;grid-row:1} .rwfq.is-ph .rwfq-g{display:none} .rwfq.is-ph .rwfq-qt{grid-column:1;grid-row:2;font-size:19px} .rwfq.is-ph .rwfq-pl{grid-column:2;grid-row:1/span 2;width:36px;height:36px}
.rwfq.is-ph .rwfq-a p{padding:0 8px 22px 0;font-size:16px}
.rwfq.is-ph .rwfq-btn{width:100%} .rwfq.is-ph .rwfq-btn .rw-face{justify-content:space-between}`
addPropertyControls(RwFaq, {
    ...COLOR_CONTROLS,
    ...FONT_CONTROLS,
    ...BP_CONTROL,
    eyebrow: {
        type: ControlType.String,
        title: "Eyebrow",
        defaultValue: "(09) FAQ",
    },
    heading: {
        type: ControlType.String,
        title: "Heading",
        description: "| = line break, *words* = lime marker",
        defaultValue: "Questions,|*answered*.",
        displayTextArea: true,
    },
    cardLabel: {
        type: ControlType.String,
        title: "Card label",
        defaultValue: "Still unsure?",
    },
    cardTitle: {
        type: ControlType.String,
        title: "Card title",
        defaultValue: "Ask us on a free 30-minute call.",
        displayTextArea: true,
    },
    cardBody: {
        type: ControlType.String,
        title: "Card text",
        defaultValue:
            "We look at your site, socials and ads live, and you keep the plan either way.",
        displayTextArea: true,
    },
    button: {
        type: ControlType.String,
        title: "Button",
        defaultValue: "Book a call",
    },
    buttonLink: {
        type: ControlType.Link,
        title: "Button link",
        description: "Empty = Booking Link on the Site CMS row",
    },
    emailLabel: {
        type: ControlType.String,
        title: "Email label",
        defaultValue: "Or write to",
    },
    replyNote: {
        type: ControlType.String,
        title: "Reply note",
        defaultValue: "We reply within 2 hours",
    },
    firstOpen: {
        type: ControlType.Boolean,
        title: "First open",
        defaultValue: true,
    },
})
