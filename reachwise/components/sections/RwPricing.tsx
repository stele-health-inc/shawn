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
    useScrollVars,
    useOn,
    Head,
    Eyebrow,
    rise,
    SEED,
    pick,
    useCMS,
    useSite,
    listOf,
} from "@/lib/rw"

// ===== RwPricing =====
interface PricingProps extends Pal {
    customFonts: boolean
    displayFont: any
    bodyFont: any
    monoFont: any
    bpHint: string
    eyebrow: string
    heading: string
    sub: string
    monthly: string
    quarterly: string
    saveTag: string
    perMonth: string
    billedQ: string
    billedM: string
    featuredChip: string
    currency: string
    note: string
    compare: string
    compareLink: string
    buttonLink: string
    style?: CSSProperties
}
// ---- THE RETAINERS: three plan cards dealt from one stack into a row as the section scrolls in (--f), prices roll on the Monthly / Quarterly toggle,
// the featured card carries a live pulse ring, and the Includes ticks draw one by one with the scroll. ----
const RwprRoll = ({ text }: { text: string }) => {
    const a = String(text).split("")
    return (
        <span className="rwpr-roll" aria-label={text}>
            {a.map((ch, i) =>
                /\d/.test(ch) ? (
                    <span key={a.length - i} className="rwpr-rd" aria-hidden>
                        <span
                            style={{
                                transform: `translateY(${-Number(ch) * 10}%)`,
                            }}
                        >
                            {"0123456789".split("").map((d) => (
                                <i key={d}>{d}</i>
                            ))}
                        </span>
                    </span>
                ) : (
                    <span key={a.length - i} aria-hidden>
                        {ch}
                    </span>
                )
            )}
        </span>
    )
}
const rwprFmt = (v: string) => {
    const n = parseFloat(String(v || "").replace(/[^\d.]/g, ""))
    return isFinite(n) ? Math.round(n).toLocaleString("en-US") : String(v || "")
}
export default function RwPricing(props: PricingProps) {
    const {
        eyebrow = "(08) Pricing",
        heading = "Simple monthly|*retainers*.",
        sub = "",
        monthly = "Monthly",
        quarterly = "Quarterly",
        saveTag = "−10%",
        perMonth = "/mo",
        billedQ = "Billed every 3 months",
        billedM = "Billed monthly · cancel anytime",
        featuredChip = "Most picked",
        currency = "$",
        note = "No long contracts · 30 days notice · ad spend paid to the platforms directly",
        compare = "Compare plans",
        compareLink = "/pricing",
        buttonLink = "",
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
    const rows = useCMS("plans", SEED.plans || [])
    const [q, setQ] = useState(false)
    const book = pick(buttonLink, site.book || "/contact")
    // fan: 0 = stacked on the middle card, 1 = dealt into the row. Ticks draw a little later (--k).
    useScrollVars(root, live && !phone, rm, (sp) => {
        const el = root.current
        if (!el) return
        el.style.setProperty("--f", easeIO((sp - 0.08) / 0.3).toFixed(4))
        el.style.setProperty("--k", clamp01((sp - 0.22) / 0.26).toFixed(4))
    })
    const settled = still || rm || phone || !live
    let order = rows.map((r, i) => ({ r, i }))
    if (phone)
        order = [
            ...order.filter((o) => /^y/i.test(o.r.f7 || "")),
            ...order.filter((o) => !/^y/i.test(o.r.f7 || "")),
        ]
    const n = order.length,
        mid = (n - 1) / 2
    return (
        <section
            ref={root as any}
            className={`rw rw-sec rw-dark rwpr${phone ? " is-ph" : tab ? " is-tab" : ""}${on ? " is-on" : ""}${settled ? " is-set" : ""}`}
            style={{ ...cssVars(c), ...B, ...(props.style || {}) }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html:
                        CSS_PRICING +
                        siteFontCss(props),
                }}
            />
            <i className="rwpr-glow" aria-hidden />
            <div className="rw-wrap rwpr-in">
                <div className="rwpr-top">
                    <div className="rwpr-hd">
                        <Eyebrow text={eyebrow} on={on} M={M} />
                        <Head
                            text={heading}
                            on={on}
                            D={Dh}
                            size="clamp(40px,4.6vw,68px)"
                            lh={0.95}
                            delay={120}
                        />
                        {sub && (
                            <p className="rwpr-sub" style={rise(on, 380)}>
                                {sub}
                            </p>
                        )}
                    </div>
                    <div
                        className="rwpr-tg"
                        role="group"
                        aria-label="Billing period"
                        style={{ ...M, ...rise(on, 320) }}
                    >
                        <button
                            type="button"
                            className={`rwpr-tb${!q ? " is-act" : ""}`}
                            aria-pressed={!q}
                            onClick={() => setQ(false)}
                        >
                            {monthly}
                        </button>
                        <button
                            type="button"
                            className={`rwpr-tb${q ? " is-act" : ""}`}
                            aria-pressed={q}
                            onClick={() => setQ(true)}
                        >
                            {quarterly}
                            <b className="rwpr-save">{saveTag}</b>
                        </button>
                        <i
                            className="rwpr-tk"
                            aria-hidden
                            style={{ translate: q ? "100% 0" : "0 0" }}
                        />
                    </div>
                </div>
                <div className="rwpr-row" style={{ ["--n" as any]: n }}>
                    {order.map(({ r, i }, k) => {
                        const feat = /^y/i.test(r.f7 || "")
                        const d = phone ? 0 : k - mid
                        const inc = listOf(r.f5 || "")
                        const price = rwprFmt(q ? r.f3 || r.f2 : r.f2)
                        return (
                            <article
                                key={r.slug || i}
                                className={`rwpr-card${feat ? " is-feat" : ""}`}
                                style={{
                                    ["--d" as any]: d,
                                    ["--z" as any]: feat
                                        ? 5
                                        : 3 - Math.abs(Math.round(d)),
                                    ...(phone
                                        ? rise(on, 120 + k * 90, 30)
                                        : {}),
                                }}
                            >
                                {feat && (
                                    <i className="rwpr-ring" aria-hidden />
                                )}
                                {feat && (
                                    <i className="rwpr-pulse" aria-hidden />
                                )}
                                <div className="rwpr-cin">
                                    <div className="rwpr-ch">
                                        <span className="rwpr-no" style={M}>
                                            {String(k + 1).padStart(2, "0")}
                                        </span>
                                        {feat && featuredChip && (
                                            <span
                                                className="rwpr-chip"
                                                style={M}
                                            >
                                                <i
                                                    className="rwpr-chip-i"
                                                    aria-hidden
                                                >
                                                    ★
                                                </i>
                                                {featuredChip}
                                                <i
                                                    className="rwpr-chip-p"
                                                    aria-hidden
                                                />
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="rwpr-name" style={Dh}>
                                        {r.f1}
                                    </h3>
                                    {r.f4 && <p className="rwpr-tag">{r.f4}</p>}
                                    <p className="rwpr-price" style={Dh}>
                                        <span className="rwpr-cur">
                                            {currency}
                                        </span>
                                        <RwprRoll text={price} />
                                        <span className="rwpr-per" style={M}>
                                            {perMonth}
                                        </span>
                                    </p>
                                    <p className="rwpr-bill" style={M}>
                                        <i
                                            aria-hidden
                                            className={q ? "is-q" : ""}
                                        />
                                        {q ? billedQ : billedM}
                                    </p>
                                    <ul className="rwpr-inc">
                                        {inc.map((t, j) => (
                                            <li
                                                key={j}
                                                style={{ ["--j" as any]: j }}
                                            >
                                                <svg
                                                    viewBox="0 0 20 20"
                                                    aria-hidden
                                                >
                                                    <circle
                                                        cx="10"
                                                        cy="10"
                                                        r="9"
                                                    />
                                                    <path
                                                        d="M5.6 10.4l3 3 5.8-6.6"
                                                        pathLength={1}
                                                    />
                                                </svg>
                                                <span>{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Btn
                                        href={book}
                                        label={r.f6 || "Get started"}
                                        kind={feat ? "solid" : "ghost"}
                                        icon="cal"
                                        className="rwpr-btn"
                                        sub={r.f1}
                                    />
                                </div>
                            </article>
                        )
                    })}
                </div>
                <div className="rwpr-foot" style={rise(on, 500)}>
                    <p className="rwpr-note" style={M}>
                        <i className="rw-port" aria-hidden />
                        {note}
                    </p>
                    <Btn
                        href={compareLink || "/pricing"}
                        label={compare}
                        kind="ghost"
                    />
                </div>
            </div>
        </section>
    )
}
const CSS_PRICING = `
@property --rwpr-a{syntax:"<angle>";inherits:false;initial-value:0deg}
.rwpr{--f:1;--k:1;background:var(--rw-night);color:var(--rw-cloud);padding:clamp(96px,10vw,150px) 0 clamp(88px,9vw,130px);overflow:hidden;overflow:clip}
.rwpr:not(.is-set){--f:0;--k:0}
.rwpr .rw-btn{--ring:var(--rw-night)}
.rwpr .rw-it{color:var(--rw-brass);font-weight:inherit}
.rwpr-glow{position:absolute;left:50%;top:58%;width:min(1100px,90vw);height:520px;translate:-50% -50%;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--rw-brass) 9%,transparent),transparent);pointer-events:none;opacity:calc(.3 + var(--f)*.7)}
.rwpr-in{position:relative}
.rwpr-top{display:flex;align-items:flex-end;justify-content:space-between;gap:32px;margin-bottom:clamp(44px,5vw,72px)}
.rwpr-hd{display:flex;flex-direction:column;gap:22px;max-width:760px}
.rwpr-sub{margin:0;max-width:520px;font-size:17px;line-height:1.5;color:var(--rw-mut)}
.rwpr-tg{position:relative;display:inline-grid;grid-template-columns:1fr 1fr;padding:5px;border-radius:999px;background:color-mix(in srgb,var(--rw-cloud) 7%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 14%,transparent);flex:none}
.rwpr-tb{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 22px;border:0;border-radius:999px;background:none;color:color-mix(in srgb,var(--rw-cloud) 70%,transparent);font:inherit;font-size:12px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:color .4s}
.rwpr-tb.is-act{color:var(--rw-ink)}
.rwpr-save{padding:3px 7px;border-radius:999px;background:#FF3E88;color:#0D0E10;font-size:10px;font-weight:600;letter-spacing:.04em}
.rwpr-tk{position:absolute;z-index:0;left:5px;top:5px;bottom:5px;width:calc(50% - 5px);border-radius:999px;background:var(--rw-brass);transition:translate .6s cubic-bezier(.7,0,.2,1)}
.rwpr-row{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:20px;align-items:stretch;perspective:1600px}
.rwpr-card{--gx:calc(100% + 20px);position:relative;z-index:var(--z,1);border-radius:24px;background:var(--rw-pine);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 10%,transparent),0 40px 80px -40px rgba(0,0,0,.8);
  transform:translate3d(calc(var(--d)*var(--gx)*(var(--f) - 1)),calc((1 - var(--f))*90px),0) rotate(calc(var(--d)*(1 - var(--f))*-7deg));transform-origin:50% 120%;
  transition:translate .55s cubic-bezier(.2,.8,.2,1),box-shadow .5s}
.rwpr-card:hover{translate:0 -10px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-brass) 45%,transparent),0 30px 90px -30px color-mix(in srgb,var(--rw-brass) 38%,transparent)}
.rwpr-card.is-feat{background:color-mix(in srgb,var(--rw-pine) 88%,var(--rw-brass));box-shadow:inset 0 0 0 1.5px var(--rw-brass),0 40px 90px -40px color-mix(in srgb,var(--rw-brass) 40%,transparent)}
.rwpr-ring{position:absolute;inset:-1px;border-radius:25px;padding:2px;background:conic-gradient(from var(--rwpr-a),transparent 0 55%,var(--rw-brass) 75%,var(--rw-cloud) 80%,var(--rw-brass) 85%,transparent 100%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);animation:rwpr-spin 4.2s linear infinite;pointer-events:none}
@keyframes rwpr-spin{to{--rwpr-a:360deg}}
.rwpr-pulse{position:absolute;inset:0;border-radius:24px;pointer-events:none;box-shadow:0 0 0 1.5px var(--rw-brass);opacity:0;animation:rwpr-pulse 2.8s cubic-bezier(.2,.6,.3,1) infinite}
@keyframes rwpr-pulse{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.07,1.045)}}
.rwpr-cin{position:relative;display:flex;flex-direction:column;height:100%;padding:clamp(24px,2.4vw,36px)}
.rwpr-ch{display:flex;align-items:center;justify-content:space-between;min-height:30px;margin-bottom:26px}
.rwpr-no{font-size:11px;letter-spacing:.14em;color:color-mix(in srgb,var(--rw-cloud) 55%,transparent)}
.rwpr-chip{position:relative;display:inline-flex;align-items:center;gap:8px;padding:5px 12px 5px 5px;border-radius:999px;background:var(--rw-cloud);color:var(--rw-ink);font-size:11px;letter-spacing:.06em;text-transform:uppercase}
.rwpr-chip-i{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--rw-brass);font-style:normal;font-size:10px}
.rwpr-chip-p{position:absolute;right:-3px;top:-3px;width:10px;height:10px;border-radius:50%;background:#FF3E88;box-shadow:0 0 0 2px var(--rw-pine);animation:rw-blink 1.4s ease-in-out infinite}
.rwpr-name{margin:0;font-size:clamp(28px,2.4vw,36px);letter-spacing:-.04em;line-height:1}
.rwpr-tag{margin:10px 0 0;font-size:16px;line-height:1.45;color:var(--rw-mut)}
.rwpr-price{display:flex;align-items:baseline;gap:2px;margin:34px 0 0;font-size:clamp(56px,5.2vw,84px);line-height:1;letter-spacing:-.05em;font-variant-numeric:tabular-nums}
.rwpr-cur{font-size:.46em;align-self:flex-start;margin-top:.12em;margin-right:4px;color:color-mix(in srgb,var(--rw-cloud) 70%,transparent)}
.rwpr-per{font-size:13px;letter-spacing:.06em;margin-left:8px;color:color-mix(in srgb,var(--rw-cloud) 60%,transparent)}
.rwpr-roll{display:inline-flex} .rwpr-rd{display:inline-block;height:1em;overflow:hidden;clip-path:inset(0);line-height:1;vertical-align:top} .rwpr-rd>span{display:flex;flex-direction:column;transition:transform .8s cubic-bezier(.2,.8,.2,1)} .rwpr-rd i{display:block;height:1em;font-style:normal}
.rwpr-rd:nth-last-child(2)>span{transition-delay:.05s} .rwpr-rd:nth-last-child(3)>span{transition-delay:.1s} .rwpr-rd:nth-last-child(5)>span{transition-delay:.15s}
.rwpr-bill{display:flex;align-items:center;gap:8px;margin:12px 0 0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 60%,transparent)}
.rwpr-bill i{width:7px;height:7px;border-radius:50%;background:color-mix(in srgb,var(--rw-cloud) 40%,transparent);transition:background .4s} .rwpr-bill i.is-q{background:var(--rw-brass)}
.rwpr-inc{list-style:none;margin:28px 0 32px;padding:26px 0 0;border-top:1px solid color-mix(in srgb,var(--rw-cloud) 12%,transparent);display:flex;flex-direction:column;gap:13px;flex:1}
.rwpr-inc li{display:flex;align-items:flex-start;gap:12px;font-size:15.5px;line-height:1.4;color:color-mix(in srgb,var(--rw-cloud) 88%,transparent)}
.rwpr-inc svg{flex:none;width:20px;height:20px;margin-top:0;fill:none;stroke-linecap:round;stroke-linejoin:round}
.rwpr-inc circle{fill:color-mix(in srgb,var(--rw-brass) calc(var(--t)*100%),transparent);stroke:color-mix(in srgb,var(--rw-cloud) 20%,transparent);stroke-width:1}
.rwpr-inc li{--t:clamp(0,calc((var(--k) - var(--j)*.12)*3.2),1)}
.rwpr-inc path{stroke:var(--rw-ink);stroke-width:2.2;stroke-dasharray:1;stroke-dashoffset:calc(1 - var(--t))}
.rwpr-btn{align-self:stretch;justify-content:stretch} .rwpr-btn .rw-face{justify-content:space-between}
.rwpr-foot{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:clamp(40px,4vw,60px);padding-top:26px;border-top:1px solid color-mix(in srgb,var(--rw-cloud) 12%,transparent)}
.rwpr-note{display:flex;align-items:center;gap:10px;margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 72%,transparent)}
.rwpr.is-tab .rwpr-row{gap:14px} .rwpr.is-tab .rwpr-card{--gx:calc(100% + 14px)} .rwpr.is-tab .rwpr-price{font-size:52px} .rwpr.is-tab .rwpr-top{flex-direction:column;align-items:flex-start}
.rwpr.is-tab .rwpr-inc li{font-size:14.5px} .rwpr.is-tab .rwpr-btn{font-size:13px} .rwpr.is-tab .rwpr-btn .rw-face{padding-left:18px;gap:8px} .rwpr.is-tab .rwpr-cin{padding:22px}
.rwpr.is-ph .rwpr-top{flex-direction:column;align-items:stretch;gap:28px} .rwpr.is-ph .rwpr-tg{width:100%} .rwpr.is-ph .rwpr-tb{padding:0 10px}
.rwpr.is-ph .rwpr-row{grid-template-columns:1fr;gap:16px} .rwpr.is-ph .rwpr-card{transform:none}
.rwpr.is-ph .rwpr-foot{flex-direction:column;align-items:flex-start} .rwpr.is-ph .rwpr-note{line-height:1.6;align-items:flex-start} .rwpr.is-ph .rwpr-note .rw-port{margin-top:6px}
@media (prefers-reduced-motion:reduce){.rwpr-card{transform:none!important} .rwpr-ring,.rwpr-pulse{animation:none!important}}`
addPropertyControls(RwPricing, {
    ...COLOR_CONTROLS,
    ...FONT_CONTROLS,
    ...BP_CONTROL,
    eyebrow: {
        type: ControlType.String,
        title: "Eyebrow",
        defaultValue: "(08) Pricing",
    },
    heading: {
        type: ControlType.String,
        title: "Heading",
        description: "| = line break, *words* = accent",
        defaultValue: "Simple monthly|*retainers*.",
        displayTextArea: true,
    },
    sub: {
        type: ControlType.String,
        title: "Sub copy",
        defaultValue:
            "Pick the channels you need. Every plan comes with a strategist, a live dashboard and plain-number reports.",
        displayTextArea: true,
    },
    monthly: {
        type: ControlType.String,
        title: "Monthly label",
        defaultValue: "Monthly",
    },
    quarterly: {
        type: ControlType.String,
        title: "Quarterly label",
        defaultValue: "Quarterly",
    },
    saveTag: {
        type: ControlType.String,
        title: "Saving tag",
        defaultValue: "−10%",
    },
    currency: {
        type: ControlType.String,
        title: "Currency",
        defaultValue: "$",
    },
    perMonth: {
        type: ControlType.String,
        title: "Per month",
        defaultValue: "/mo",
    },
    billedM: {
        type: ControlType.String,
        title: "Monthly note",
        defaultValue: "Billed monthly · cancel anytime",
    },
    billedQ: {
        type: ControlType.String,
        title: "Quarterly note",
        defaultValue: "Billed every 3 months",
    },
    featuredChip: {
        type: ControlType.String,
        title: "Featured chip",
        defaultValue: "Most picked",
    },
    buttonLink: {
        type: ControlType.Link,
        title: "Plan button link",
        description: "Empty = Booking Link on the Site CMS row",
    },
    note: {
        type: ControlType.String,
        title: "Note",
        defaultValue:
            "No long contracts · 30 days notice · ad spend paid to the platforms directly",
        displayTextArea: true,
    },
    compare: {
        type: ControlType.String,
        title: "Button",
        defaultValue: "Compare plans",
    },
    compareLink: {
        type: ControlType.Link,
        title: "Button link",
        defaultValue: "/pricing",
    },
})
