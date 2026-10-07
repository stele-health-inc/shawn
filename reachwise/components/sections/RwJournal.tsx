"use client"
import {
    useRef,
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
    Btn,
    useMagnet,
    IcoArrow,
    useScrollVars,
    useOn,
    Head,
    Eyebrow,
    rise,
    SEED,
    imgOr,
    useCMS,
} from "@/lib/rw"

// ===== RwJournal =====
interface JournalProps extends Pal {
    customFonts: boolean
    displayFont: any
    bodyFont: any
    monoFont: any
    bpHint: string
    eyebrow: string
    heading: string
    sub: string
    button: string
    buttonLink: string
    readSuffix: string
    chip: string
    count: number
    style?: CSSProperties
}
// ---- THE INSIGHTS: the three latest posts — one lead story (tall) + two stacked side stories. Scroll mechanic: each cover UNMASKS from a 12% inset
// and settles from a 1.12 zoom, staggered by --u0/--u1/--u2. Hover: cover zoom, title underline draws, the read-time chip turns lime. ----
export default function RwJournal(props: JournalProps) {
    const {
        eyebrow = "(10) Insights",
        heading = "Ideas we|*test* first.",
        sub = "",
        button = "All articles",
        buttonLink = "/blog",
        readSuffix = "read",
        chip = "▲|2.4k reads this week",
        count = 3,
        bpHint = "auto",
    } = props
    const c = colorsOf(props)
    const { D, B, M } = fontsOf(props)
    useFonts()
    const live = useLive()
    const rm = useReduced()
    const still = useStill()
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
    const rows = useCMS("posts", SEED.posts || []).slice(
        0,
        Math.max(1, Math.round(count || 3))
    )
    const settled = still || rm || !live
    useScrollVars(root, live, rm, (sp) => {
        const el = root.current
        if (!el) return
        for (let i = 0; i < 3; i++)
            el.style.setProperty(
                `--u${i}`,
                easeIO(
                    (sp - (phone ? 0.04 : 0.14) - i * (phone ? 0.09 : 0.07)) /
                        0.34
                ).toFixed(4)
            )
    })
    const ci = chip.indexOf("|")
    const chI = ci < 0 ? "▲" : chip.slice(0, ci).trim(),
        chT = ci < 0 ? chip : chip.slice(ci + 1).trim()
    return (
        <section
            ref={root as any}
            className={`rw rw-sec rwjr${phone ? " is-ph" : tab ? " is-tab" : ""}${on ? " is-on" : ""}${settled ? " is-set" : ""}`}
            style={{ ...cssVars(c), ...B, ...(props.style || {}) }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html:
                        CSS_JOURNAL +
                        siteFontCss(props),
                }}
            />
            <div className="rw-wrap">
                <div className="rwjr-top">
                    <div className="rwjr-hd">
                        <Eyebrow text={eyebrow} on={on} M={M} />
                        <Head
                            text={heading}
                            on={on}
                            D={Dh}
                            size="clamp(40px,4.6vw,68px)"
                            lh={0.95}
                            delay={120}
                        />
                    </div>
                    <div className="rwjr-side" style={rise(on, 360)}>
                        {sub && <p className="rwjr-sub">{sub}</p>}
                        <Btn
                            href={buttonLink || "/blog"}
                            label={button}
                            kind="ghost"
                        />
                    </div>
                </div>
                <div className={`rwjr-grid rwjr-n${rows.length}`}>
                    {rows.map((r, i) => {
                        const big = i === 0 && !phone
                        const src = imgOr(r)
                        return (
                            <a
                                key={r.slug || i}
                                href={`/blog/${r.slug}`}
                                className={`rwjr-card${i === 0 ? " is-lead" : ""}`}
                                style={{
                                    ["--u" as any]: `var(--u${Math.min(i, 2)})`,
                                    ...rise(on, 160 + i * 110, 26),
                                }}
                            >
                                <div className="rwjr-cov">
                                    <img
                                        {...RS(
                                            src,
                                            big
                                                ? "(max-width: 809px) 100vw, 56vw"
                                                : "(max-width: 809px) 100vw, 20vw"
                                        )}
                                        alt=""
                                        loading="lazy"
                                        decoding="async"
                                        draggable={false}
                                    />
                                    {i === 0 && chT && (
                                        <span className="rwjr-note" style={M}>
                                            <b style={Dh}>{chI}</b>
                                            {chT}
                                            <i aria-hidden />
                                        </span>
                                    )}
                                </div>
                                <div className="rwjr-txt">
                                    <p className="rwjr-meta" style={M}>
                                        {r.f2 && (
                                            <span className="rwjr-kick">
                                                {r.f2}
                                            </span>
                                        )}
                                        <span>{r.f3}</span>
                                        {r.f4 && (
                                            <span className="rwjr-read">
                                                {r.f4} {readSuffix}
                                            </span>
                                        )}
                                    </p>
                                    <h3 className="rwjr-t" style={Dh}>
                                        <span>{r.f1}</span>
                                    </h3>
                                    {r.f5 && <p className="rwjr-ex">{r.f5}</p>}
                                    <span className="rwjr-go" aria-hidden>
                                        <IcoArrow s={16} />
                                    </span>
                                </div>
                            </a>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
const CSS_JOURNAL = `
.rwjr{--u0:1;--u1:1;--u2:1;background:var(--rw-bone);color:var(--rw-ink);padding:clamp(96px,10vw,150px) 0}
.rwjr:not(.is-set){--u0:0;--u1:0;--u2:0}
.rwjr .rw-it{position:relative;color:var(--rw-ink);font-weight:inherit;padding:0 .06em;isolation:isolate}
.rwjr .rw-it::before{content:"";position:absolute;z-index:-1;left:0;right:0;top:.1em;bottom:.02em;border-radius:.14em;background:var(--rw-brass);transform:scaleX(0);transform-origin:left;transition:transform .9s cubic-bezier(.7,0,.2,1) .7s}
.rwjr .rw-hd.is-on .rw-it::before{transform:none}
.rwjr-top{display:flex;align-items:flex-end;justify-content:space-between;gap:32px;margin-bottom:clamp(44px,5vw,72px)}
.rwjr-hd{display:flex;flex-direction:column;gap:22px}
.rwjr-side{display:flex;flex-direction:column;align-items:flex-end;gap:18px;max-width:380px;text-align:right}
.rwjr-sub{margin:0;font-size:17px;line-height:1.5;color:var(--rw-mut)}
.rwjr-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);grid-template-rows:auto auto;gap:clamp(20px,2.2vw,32px) clamp(24px,3vw,48px)}
.rwjr-card{position:relative;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1fr);gap:24px;align-items:start;text-decoration:none;color:inherit}
.rwjr-card.is-lead{grid-row:1/span 2;grid-template-columns:1fr;gap:26px}
.rwjr-n1 .rwjr-card.is-lead{grid-column:1/-1}
.rwjr-card:not(.is-lead)+.rwjr-card:not(.is-lead){padding-top:clamp(20px,2.2vw,32px);border-top:1px solid var(--rw-fog)}
.rwjr-cov{position:relative;overflow:hidden;aspect-ratio:4/3.1;border-radius:20px;background:color-mix(in srgb,var(--rw-stone) 22%,transparent);clip-path:inset(calc((1 - var(--u))*12%) round 20px);-webkit-clip-path:inset(calc((1 - var(--u))*12%) round 20px)}
.rwjr-card.is-lead .rwjr-cov{aspect-ratio:16/10.6;border-radius:24px;clip-path:inset(calc((1 - var(--u))*12%) round 24px);-webkit-clip-path:inset(calc((1 - var(--u))*12%) round 24px)}
.rwjr-cov img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transform:scale(calc(1 + (1 - var(--u))*.12));transition:scale 1.1s cubic-bezier(.2,.8,.2,1);user-select:none}
.rwjr-card:hover .rwjr-cov img{scale:1.06}
.rwjr-note{position:absolute;left:22px;bottom:22px;display:inline-flex;align-items:center;gap:9px;padding:6px 13px 6px 6px;border-radius:999px;background:var(--rw-cloud);color:var(--rw-ink);font-size:12px;box-shadow:0 14px 34px -12px rgba(0,0,0,.5);opacity:clamp(0,calc((var(--u) - .7)*4),1);translate:0 calc((1 - clamp(0,calc((var(--u) - .7)*4),1))*14px)}
.rwjr-note b{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--rw-brass);font-size:11px}
.rwjr-note i{position:absolute;right:-3px;top:-3px;width:10px;height:10px;border-radius:50%;background:#B46A72;box-shadow:0 0 0 2px var(--rw-cloud)}
.rwjr-txt{position:relative;display:flex;flex-direction:column;gap:12px;padding-right:44px}
.rwjr-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--rw-mut)}
.rwjr-kick{padding:5px 10px;border-radius:999px;background:var(--rw-ink);color:var(--rw-bone)}
.rwjr-read{padding:5px 10px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--rw-fog);transition:background .35s,box-shadow .35s,color .35s}
.rwjr-card:hover .rwjr-read{background:var(--rw-brass);box-shadow:none;color:var(--rw-ink)}
.rwjr-t{margin:0;font-size:clamp(22px,1.9vw,28px);line-height:1.08;letter-spacing:-.035em}
.rwjr-card.is-lead .rwjr-t{font-size:clamp(28px,2.7vw,42px);line-height:1.02;max-width:20ch}
.rwjr-t span{background:linear-gradient(var(--rw-ink),var(--rw-ink)) 0 96%/0% 2px no-repeat;transition:background-size .7s cubic-bezier(.7,0,.2,1);-webkit-box-decoration-break:clone;box-decoration-break:clone}
.rwjr-card:hover .rwjr-t span{background-size:100% 2px}
.rwjr-ex{margin:0;font-size:16px;line-height:1.5;color:color-mix(in srgb,var(--rw-ink) 70%,var(--rw-bone));max-width:52ch}
.rwjr-go{position:absolute;right:0;top:0;display:grid;place-items:center;width:36px;height:36px;border-radius:50%;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-ink) 22%,transparent);transition:background .35s,rotate .5s cubic-bezier(.7,0,.2,1),box-shadow .35s;rotate:-45deg}
.rwjr-card:hover .rwjr-go{background:var(--rw-brass);box-shadow:none;rotate:0deg}
.rwjr.is-tab .rwjr-grid{grid-template-columns:1fr 1fr;grid-template-rows:auto;row-gap:52px} .rwjr.is-tab .rwjr-card.is-lead{grid-row:auto;grid-column:1/-1;grid-template-columns:1.2fr 1fr;align-items:end}
.rwjr.is-tab .rwjr-card:not(.is-lead){grid-template-columns:1fr;gap:18px} .rwjr.is-tab .rwjr-card:not(.is-lead)+.rwjr-card:not(.is-lead){padding-top:0;border-top:0}
.rwjr.is-ph .rwjr-top{flex-direction:column;align-items:flex-start;gap:24px} .rwjr.is-ph .rwjr-side{align-items:flex-start;text-align:left}
.rwjr.is-ph .rwjr-grid{grid-template-columns:1fr;gap:36px} .rwjr.is-ph .rwjr-card,.rwjr.is-ph .rwjr-card.is-lead{grid-row:auto;grid-template-columns:1fr;gap:18px}
.rwjr.is-ph .rwjr-card:not(.is-lead)+.rwjr-card:not(.is-lead){padding-top:0;border-top:0} .rwjr.is-ph .rwjr-card.is-lead .rwjr-t{font-size:28px} .rwjr.is-ph .rwjr-t{font-size:23px}
.rwjr.is-ph .rwjr-note{left:14px;bottom:14px}
@media (prefers-reduced-motion:reduce){.rwjr-cov{clip-path:none!important} .rwjr-cov img{transform:none!important}}`
addPropertyControls(RwJournal, {
    ...COLOR_CONTROLS,
    ...FONT_CONTROLS,
    ...BP_CONTROL,
    eyebrow: {
        type: ControlType.String,
        title: "Eyebrow",
        defaultValue: "(10) Insights",
    },
    heading: {
        type: ControlType.String,
        title: "Heading",
        description: "| = line break, *words* = lime marker",
        defaultValue: "Ideas we|*test* first.",
        displayTextArea: true,
    },
    sub: {
        type: ControlType.String,
        title: "Sub copy",
        defaultValue:
            "What we learn running campaigns every week, written up so you can use it too.",
        displayTextArea: true,
    },
    button: {
        type: ControlType.String,
        title: "Button",
        defaultValue: "All articles",
    },
    buttonLink: {
        type: ControlType.Link,
        title: "Button link",
        defaultValue: "/blog",
    },
    readSuffix: {
        type: ControlType.String,
        title: "Read label",
        defaultValue: "read",
    },
    chip: {
        type: ControlType.String,
        title: "Lead pop-up",
        description: "icon|text — empty hides it",
        defaultValue: "▲|2.4k reads this week",
    },
    count: {
        type: ControlType.Number,
        title: "Posts shown",
        min: 1,
        max: 3,
        step: 1,
        displayStepper: true,
        defaultValue: 3,
    },
})
