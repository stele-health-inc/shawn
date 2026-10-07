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
    easeIO,
    type Pal,
    colorsOf,
    cssVars,
    COLOR_CONTROLS,
    FONT_CONTROLS,
    siteFontCss,
    fontsOf,
    BP_CONTROL,
    Glyph,
    Btn,
    useMagnet,
    useScrollVars,
    useOn,
    Head,
    Eyebrow,
    rise,
    SEED,
    pick,
    imgOf,
    useCMS,
    useSite,
} from "@/lib/rw"

// ===== RwCta =====
interface CtaProps extends Pal {
    customFonts: boolean
    displayFont: any
    bodyFont: any
    monoFont: any
    bpHint: string
    eyebrow: string
    heading: string
    sub: string
    emailPlaceholder: string
    budgetLabel: string
    budgets: string
    button: string
    buttonLink: string
    cardLabel: string
    spotsTitle: string
    spotsTotal: number
    spotsLeft: number
    spotsNote: string
    clockLabel: string
    teamNote: string
    privacy: string
    style?: CSSProperties
}
// ---- THE LAUNCH: a giant "Ready to be seen?" with a mini audit form. Scroll mechanic: three lime PULSE RINGS grow out from behind the submit button
// with --f (concentric, scaling out and fading) — the campaign launching. Right: live availability card (spots bar, local clock, team stack). ----
const rwctInit = (n: string) =>
    String(n || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0])
        .join("")
        .toUpperCase()
export default function RwCta(props: CtaProps) {
    const {
        eyebrow = "(11) Free audit",
        heading = "Ready to be|*seen?*",
        sub = "",
        emailPlaceholder = "Work email",
        budgetLabel = "Monthly budget",
        budgets = "Under $2k/mo, $2k–$5k/mo, $5k–$10k/mo, $10k+/mo",
        button = "Get my free audit",
        buttonLink = "",
        cardLabel = "Availability",
        spotsTitle = "3 spots left for Q4",
        spotsTotal = 8,
        spotsLeft = 3,
        spotsNote = "New clients start on the 1st of each month",
        clockLabel = "Our time",
        teamNote = "38 specialists on the team",
        privacy = "No spam. We reply within 2 hours.",
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
    const { w } = useSize(root, bpHint)
    const phone = w < 810,
        tab = w >= 810 && w < 1100
    useMagnet(root, live)
    const on = useOn(root, live, rm)
    const launch = useRef<HTMLDivElement>(null)
    // the rings sit on the section (behind all copy) and are centred on the submit button: measured on resize, never per frame
    useEffect(() => {
        const el = root.current,
            b = launch.current
        if (!el || !b) return
        const m = () => {
            const a = el.getBoundingClientRect(),
                r = b.getBoundingClientRect()
            el.style.setProperty(
                "--bx",
                `${Math.round(r.left - a.left + r.width / 2)}px`
            )
            el.style.setProperty(
                "--by",
                `${Math.round(r.top - a.top + r.height / 2)}px`
            )
        }
        m()
        const ro = new ResizeObserver(m)
        ro.observe(el)
        const t = window.setTimeout(m, 700),
            t2 = window.setTimeout(m, 2200)
        return () => {
            ro.disconnect()
            window.clearTimeout(t)
            window.clearTimeout(t2)
        }
    }, [phone, tab])
    const team = useCMS("team", SEED.team || [])
    const book = pick(buttonLink, site.book || "/contact")
    const opts = String(budgets)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    const [email, setEmail] = useState("")
    const [budget, setBudget] = useState("")
    const [now, setNow] = useState("--:--:--")
    useEffect(() => {
        if (!live) return
        const f = () => {
            try {
                setNow(
                    new Intl.DateTimeFormat("en-US", {
                        timeZone: site.tz || "America/New_York",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                    }).format(new Date())
                )
            } catch (e) {
                setNow(new Date().toTimeString().slice(0, 8))
            }
        }
        f()
        const id = window.setInterval(f, 1000)
        return () => window.clearInterval(id)
    }, [live, site.tz])
    const settled = still || rm || !live
    useScrollVars(root, live, rm, (sp) => {
        const el = root.current
        if (!el) return
        el.style.setProperty(
            "--f",
            easeIO((sp - (phone ? 0.2 : 0.14)) / 0.44).toFixed(4)
        )
    })
    const go = (e?: any) => {
        if (e && e.preventDefault) e.preventDefault()
        const q = new URLSearchParams()
        if (email.trim()) q.set("email", email.trim())
        if (budget) q.set("budget", budget)
        const s = q.toString()
        const url = s ? `${book}${book.includes("?") ? "&" : "?"}${s}` : book
        try {
            if (/^https?:\/\//.test(book))
                window.open(url, "_blank", "noopener")
            else window.location.href = url
        } catch (x) {}
    }
    const tot = Math.max(1, Math.round(spotsTotal || 8)),
        left = Math.min(tot, Math.max(0, Math.round(spotsLeft || 0)))
    return (
        <section
            ref={root as any}
            className={`rw rw-sec rw-dark rwct${phone ? " is-ph" : tab ? " is-tab" : ""}${on ? " is-on" : ""}${settled ? " is-set" : ""}`}
            style={{ ...cssVars(c), ...B, ...(props.style || {}) }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html:
                        CSS_CTA + siteFontCss(props),
                }}
            />
            <span className="rwct-rings" aria-hidden>
                <i style={{ ["--r" as any]: 0 }} />
                <i style={{ ["--r" as any]: 1 }} />
                <i style={{ ["--r" as any]: 2 }} />
                <b />
            </span>
            <div className="rw-wrap rwct-in">
                <div className="rwct-main">
                    <Eyebrow text={eyebrow} on={on} M={M} />
                    <Head
                        text={heading}
                        on={on}
                        D={Dh}
                        size={
                            phone
                                ? "clamp(56px,16vw,76px)"
                                : "clamp(64px,9vw,150px)"
                        }
                        lh={0.88}
                        delay={100}
                        step={70}
                        className="rwct-h"
                    />
                    {sub && (
                        <p className="rwct-sub" style={rise(on, 420)}>
                            {sub}
                        </p>
                    )}
                    <form
                        className="rwct-form"
                        onSubmit={go}
                        style={rise(on, 540, 18)}
                        aria-label="Free audit request"
                    >
                        <label className="rwct-f rwct-em">
                            <span className="rw-sr">{emailPlaceholder}</span>
                            <Glyph k="mail" />
                            <input
                                type="email"
                                name="email"
                                autoComplete="email"
                                placeholder={emailPlaceholder}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </label>
                        <label className="rwct-f rwct-bd">
                            <span className="rw-sr">{budgetLabel}</span>
                            <select
                                name="budget"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                style={M}
                            >
                                <option value="">{budgetLabel}</option>
                                {opts.map((o) => (
                                    <option key={o} value={o}>
                                        {o}
                                    </option>
                                ))}
                            </select>
                            <svg viewBox="0 0 24 24" aria-hidden>
                                <path
                                    d="M6 9l6 6 6-6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </label>
                        <div ref={launch} className="rwct-launch">
                            <Btn
                                href={book}
                                label={button}
                                kind="solid"
                                className="rwct-go"
                                onClick={go}
                            />
                        </div>
                        <button
                            type="submit"
                            className="rw-sr"
                            tabIndex={-1}
                            aria-hidden
                        >
                            {button}
                        </button>
                    </form>
                    {privacy && (
                        <p
                            className="rwct-priv"
                            style={{ ...M, ...rise(on, 620) }}
                        >
                            {privacy}
                        </p>
                    )}
                </div>
                <aside
                    className="rwct-card"
                    style={rise(on, 380, 30)}
                    aria-label={cardLabel}
                >
                    <p className="rwct-cl" style={M}>
                        <i className="rw-port" aria-hidden />
                        {cardLabel}
                    </p>
                    <p className="rwct-ct" style={Dh}>
                        {spotsTitle}
                    </p>
                    <div className="rwct-bar" aria-hidden>
                        {Array.from({ length: tot }).map((_, i) => (
                            <i
                                key={i}
                                className={
                                    i < tot - left ? "is-full" : "is-free"
                                }
                                style={{ ["--i" as any]: i }}
                            />
                        ))}
                    </div>
                    <p className="rwct-cn" style={M}>
                        {spotsNote}
                    </p>
                    <div className="rwct-clock">
                        <p style={M}>
                            <span>
                                {clockLabel}
                                {site.city ? ` · ${site.city}` : ""}
                            </span>
                            <b style={Dh}>{now}</b>
                        </p>
                    </div>
                    <div className="rwct-team">
                        <span className="rwct-av" aria-hidden>
                            {team.slice(0, 5).map((t, i) => {
                                const im = imgOf(t)
                                return (
                                    <i
                                        key={t.slug || i}
                                        style={{ ["--k" as any]: i }}
                                    >
                                        {im ? (
                                            <img
                                                {...RS(im, "48px")}
                                                alt=""
                                                loading="lazy"
                                            />
                                        ) : (
                                            <b style={M}>{rwctInit(t.f1)}</b>
                                        )}
                                    </i>
                                )
                            })}
                        </span>
                        <span className="rwct-tn">{teamNote}</span>
                    </div>
                </aside>
            </div>
        </section>
    )
}
const CSS_CTA = `
.rwct{--f:1;background:var(--rw-night);color:var(--rw-cloud);padding:clamp(110px,11vw,170px) 0 clamp(100px,10vw,150px);overflow:hidden;overflow:clip;isolation:isolate;min-height:min(100svh,980px);display:flex;align-items:center}
.rwct:not(.is-set){--f:0}
.rwct .rw-btn{--ring:var(--rw-night)}
.rwct .rw-it{color:var(--rw-brass);font-weight:inherit}
.rwct-in{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);gap:clamp(40px,5vw,90px);align-items:end}
.rwct-main{display:flex;flex-direction:column;align-items:flex-start;gap:26px;min-width:0}
.rwct-h{letter-spacing:-.06em!important;margin-top:6px}
.rwct-sub{margin:0;max-width:560px;font-size:18px;line-height:1.5;color:color-mix(in srgb,var(--rw-cloud) 78%,transparent)}
.rwct-form{position:relative;display:flex;align-items:center;gap:10px;width:100%;max-width:820px;margin-top:10px;padding:8px;border-radius:999px;background:color-mix(in srgb,var(--rw-cloud) 7%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 16%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.rwct-f{position:relative;display:flex;align-items:center;gap:10px;min-height:56px;border-radius:999px;padding:0 20px;background:color-mix(in srgb,var(--rw-cloud) 6%,transparent);transition:background .3s,box-shadow .3s}
.rwct-f:hover{background:color-mix(in srgb,var(--rw-cloud) 10%,transparent)} .rwct-f:focus-within{box-shadow:inset 0 0 0 1.5px var(--rw-brass)}
.rwct-f>svg{width:17px;height:17px;flex:none;color:color-mix(in srgb,var(--rw-cloud) 60%,transparent)}
.rwct-em{flex:1.3}
.rwct-bd{flex:1} .rwct-bd>svg{position:absolute;right:16px;pointer-events:none}
.rwct-f input,.rwct-f select{width:100%;min-width:0;height:56px;border:0;outline:0;background:none;color:var(--rw-cloud);font:inherit;font-size:16px;-webkit-appearance:none;appearance:none}
.rwct-f input::placeholder{color:color-mix(in srgb,var(--rw-cloud) 55%,transparent)}
.rwct-f select{font-size:13px;letter-spacing:.04em;padding-right:26px;cursor:pointer;color:color-mix(in srgb,var(--rw-cloud) 85%,transparent)} .rwct-f select option{color:#0D0E10;background:#fff}
.rwct-launch{position:relative;flex:none}
.rwct .rwct-go.rw-solid{--face:var(--rw-brass);--fg:var(--rw-ink);--fill:var(--rw-cloud);--fg2:var(--rw-ink);--chip:var(--rw-ink);--chipfg:var(--rw-brass);--chip2:var(--rw-ink);--chipfg2:var(--rw-brass)}
.rwct-rings{position:absolute;left:var(--bx,62%);top:var(--by,72%);width:0;height:0;z-index:0;pointer-events:none}
.rwct-rings i,.rwct-rings b{position:absolute;left:0;top:0;width:1100px;height:1100px;margin:-550px 0 0 -550px;border-radius:50%}
.rwct-rings i{box-shadow:inset 0 0 0 calc(1.5px / max(var(--s),.1)) var(--rw-brass);--s:calc(.12 + var(--f)*(.42 + var(--r)*.34));transform:scale(var(--s));opacity:calc((1 - var(--f)*.72)*(1 - var(--r)*.24))}
.rwct-rings b{background:radial-gradient(closest-side,color-mix(in srgb,var(--rw-brass) 22%,transparent),color-mix(in srgb,var(--rw-brass) 6%,transparent) 55%,transparent);transform:scale(calc(.1 + var(--f)*.6));opacity:calc(.35 + var(--f)*.65)}
.rwct-priv{margin:0;padding-left:8px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 55%,transparent)}
.rwct-card{position:relative;display:flex;flex-direction:column;gap:16px;padding:clamp(24px,2.4vw,34px);border-radius:24px;background:color-mix(in srgb,var(--rw-pine) 92%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 12%,transparent),0 50px 100px -50px rgba(0,0,0,.9);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}
.rwct-cl{display:flex;align-items:center;gap:10px;margin:0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 66%,transparent)}
.rwct-ct{margin:0;font-size:clamp(30px,2.6vw,40px);line-height:1;letter-spacing:-.04em}
.rwct-bar{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));grid-auto-flow:column;gap:5px;margin-top:4px}
.rwct-bar i{height:10px;border-radius:999px;background:color-mix(in srgb,var(--rw-cloud) 14%,transparent)}
.rwct-bar i.is-free{background:var(--rw-brass);animation:rwct-blink 2.2s ease-in-out infinite;animation-delay:calc(var(--i)*.18s)}
@keyframes rwct-blink{50%{opacity:.45}}
.rwct-cn{margin:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 55%,transparent)}
.rwct-clock{padding:16px 0;border-top:1px solid color-mix(in srgb,var(--rw-cloud) 12%,transparent);border-bottom:1px solid color-mix(in srgb,var(--rw-cloud) 12%,transparent)}
.rwct-clock p{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 66%,transparent)}
.rwct-clock b{font-size:28px;letter-spacing:-.02em;color:var(--rw-cloud);font-variant-numeric:tabular-nums;text-transform:none}
.rwct-team{display:flex;align-items:center;gap:14px}
.rwct-av{display:flex;padding-left:8px}
.rwct-av i{display:grid;place-items:center;width:40px;height:40px;margin-left:-10px;border-radius:50%;overflow:hidden;background:hsl(calc(70 + var(--k)*48) 30% 26%);box-shadow:0 0 0 2.5px var(--rw-pine);transition:translate .4s cubic-bezier(.34,1.56,.64,1)}
.rwct-av i:nth-child(1){background:var(--rw-brass);color:var(--rw-ink)}
.rwct-av img{width:100%;height:100%;object-fit:cover}
.rwct-av i{font-style:normal} .rwct-av b{font-size:11px;font-weight:600;letter-spacing:.04em}
.rwct-team:hover .rwct-av i{translate:0 -3px} .rwct-team:hover .rwct-av i:nth-child(2n){translate:0 3px}
.rwct-tn{font-size:15px;color:color-mix(in srgb,var(--rw-cloud) 78%,transparent)}
.rwct.is-tab .rwct-in{grid-template-columns:1fr;align-items:start} .rwct.is-tab .rwct-card{max-width:520px}
.rwct.is-ph .rwct-in{grid-template-columns:1fr;gap:48px}
.rwct.is-ph .rwct-form{flex-direction:column;align-items:stretch;border-radius:26px;padding:8px} .rwct.is-ph .rwct-f{flex:none}
.rwct.is-ph .rwct-launch,.rwct.is-ph .rwct-go{width:100%} .rwct.is-ph .rwct-go .rw-face{justify-content:space-between}
.rwct.is-ph .rwct-rings i,.rwct.is-ph .rwct-rings b{width:700px;height:700px;margin:-350px 0 0 -350px}
.rwct.is-ph .rwct-sub{font-size:16px}
@media (prefers-reduced-motion:reduce){.rwct-bar i{animation:none!important}}`
addPropertyControls(RwCta, {
    ...COLOR_CONTROLS,
    ...FONT_CONTROLS,
    ...BP_CONTROL,
    eyebrow: {
        type: ControlType.String,
        title: "Eyebrow",
        defaultValue: "(11) Free audit",
    },
    heading: {
        type: ControlType.String,
        title: "Heading",
        description: "| = line break, *words* = lime",
        defaultValue: "Ready to be|*seen?*",
        displayTextArea: true,
    },
    sub: {
        type: ControlType.String,
        title: "Sub copy",
        defaultValue:
            "Get a free 30-minute audit of your site, socials and ads. You keep the plan, whether we work together or not.",
        displayTextArea: true,
    },
    emailPlaceholder: {
        type: ControlType.String,
        title: "Email field",
        defaultValue: "Work email",
    },
    budgetLabel: {
        type: ControlType.String,
        title: "Budget field",
        defaultValue: "Monthly budget",
    },
    budgets: {
        type: ControlType.String,
        title: "Budget options",
        description: "Comma list",
        defaultValue: "Under $2k/mo, $2k–$5k/mo, $5k–$10k/mo, $10k+/mo",
    },
    button: {
        type: ControlType.String,
        title: "Button",
        defaultValue: "Get my free audit",
    },
    buttonLink: {
        type: ControlType.Link,
        title: "Button link",
        description:
            "Empty = Booking Link on the Site CMS row. ?email=…&budget=… is added",
    },
    privacy: {
        type: ControlType.String,
        title: "Form note",
        defaultValue: "No spam. We reply within 2 hours.",
    },
    cardLabel: {
        type: ControlType.String,
        title: "Card label",
        defaultValue: "Availability",
    },
    spotsTitle: {
        type: ControlType.String,
        title: "Spots title",
        defaultValue: "3 spots left for Q4",
    },
    spotsTotal: {
        type: ControlType.Number,
        title: "Spots total",
        min: 1,
        max: 20,
        step: 1,
        displayStepper: true,
        defaultValue: 8,
    },
    spotsLeft: {
        type: ControlType.Number,
        title: "Spots left",
        min: 0,
        max: 20,
        step: 1,
        displayStepper: true,
        defaultValue: 3,
    },
    spotsNote: {
        type: ControlType.String,
        title: "Spots note",
        defaultValue: "New clients start on the 1st of each month",
    },
    clockLabel: {
        type: ControlType.String,
        title: "Clock label",
        defaultValue: "Our time",
    },
    teamNote: {
        type: ControlType.String,
        title: "Team note",
        defaultValue: "38 specialists on the team",
    },
})
