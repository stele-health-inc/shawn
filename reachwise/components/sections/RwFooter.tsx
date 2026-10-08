"use client"
import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from "react"
import { addPropertyControls, ControlType } from "@/lib/controls"
import {
    cleanTel,
    useFonts,
    useStill,
    useLive,
    useSize,
    useReduced,
    onTick,
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
    useOn,
    Reveal,
    REVEAL_CONTROLS,
    rise,
    SEED,
    pick,
    useCMS,
    useSite,
    linkList,
} from "@/lib/rw"

// ===== RwFooter =====
interface FooterProps extends Pal {
    customFonts: boolean
    displayFont: any
    bodyFont: any
    monoFont: any
    bpHint: string
    reveal: boolean
    layer: number
    blurb: string
    button: string
    buttonLink: string
    servicesTitle: string
    companyTitle: string
    company: string
    resourcesTitle: string
    resources: string
    contactTitle: string
    wordmark: string
    hint: string
    legal: string
    madeWith: string
    madeWithLink: string
    clockLabel: string
    style?: CSSProperties
}
// ---- THE WORDMARK: the footer waits behind the CTA (Reveal curtain) and is uncovered as it lifts; the giant wordmark rises with the uncover (--rv).
// The pointer is a signal: a lime ring follows it over the wordmark and lights the letters inside it (CSS mask at --fx/--fy/--fr). Touch = it pulses on its own. ----
const RwftMark = ({ s = 30 }: { s?: number }) => (
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
export default function RwFooter(props: FooterProps) {
    const {
        reveal = true,
        layer = 9,
        blurb = "",
        button = "Book a strategy call",
        buttonLink = "",
        servicesTitle = "Services",
        companyTitle = "Company",
        company = "About:/about, Work:/work, Team:/about#team, Careers:/careers, Contact:/contact",
        resourcesTitle = "Resources",
        resources = "Blog:/blog, FAQ:/#faq",
        contactTitle = "Contact",
        wordmark = "",
        hint = "Move over the name",
        legal = "Privacy:/privacy, Terms:/terms, Cookies:/cookies",
        madeWith = "",
        madeWithLink = "",
        clockLabel = "Local time",
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
    const wmBox = useRef<HTMLDivElement>(null)
    const wmTxt = useRef<HTMLSpanElement>(null)
    const { w } = useSize(root, bpHint)
    const phone = w < 810,
        tab = w >= 810 && w < 1100
    useMagnet(root, live)
    const on = useOn(root, live, rm, 0.05)
    const services = useCMS("services", SEED.services || [])
    const name = pick(wordmark, site.name || "BOS Media Labs")
    const book = pick(buttonLink, site.book || "/contact")
    const [year, setYear] = useState("2026")
    const [now, setNow] = useState("--:--")
    useEffect(() => {
        if (!live) return
        setYear(String(new Date().getFullYear()))
        const f = () => {
            try {
                setNow(
                    new Intl.DateTimeFormat("en-US", {
                        timeZone: site.tz || "America/New_York",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                    }).format(new Date())
                )
            } catch (e) {}
        }
        f()
        const id = window.setInterval(f, 15000)
        return () => window.clearInterval(id)
    }, [live, site.tz])
    // fit the wordmark to the container width (on resize only)
    useEffect(() => {
        const box = wmBox.current,
            t = wmTxt.current
        if (!box || !t) return
        const fit = () => {
            t.style.fontSize = "100px"
            const tw = t.offsetWidth || 1
            const bw = box.clientWidth || 1
            box.style.setProperty(
                "--wf",
                `${Math.max(40, Math.floor(((100 * bw) / tw) * 0.995))}px`
            )
            t.style.fontSize = ""
        }
        fit()
        const ro = new ResizeObserver(fit)
        ro.observe(box)
        const tm = window.setTimeout(fit, 900)
        ;(document as any).fonts?.ready?.then(fit).catch(() => {})
        return () => {
            ro.disconnect()
            window.clearTimeout(tm)
        }
    }, [name])
    // the signal ring: pointer (lerped) on desktop; on touch / no pointer it sweeps and pulses on its own while in view
    useEffect(() => {
        const box = wmBox.current
        if (!live || !box) return
        const fine = window.matchMedia(
            "(hover:hover) and (pointer:fine)"
        ).matches
        let vis = false,
            bw = 1,
            bh = 1,
            left = 0,
            top = 0,
            tx = 0,
            ty = 0,
            x = -999,
            y = -999,
            r = 0,
            tr = 0,
            inside = false,
            lx = "",
            t0 = performance.now()
        const io = new IntersectionObserver((es) => {
            vis = es[0].isIntersecting
        })
        io.observe(box)
        const mv = (e: PointerEvent) => {
            inside = true
            tx = e.clientX - left
            ty = e.clientY - top
            if (x < -900) {
                x = tx
                y = ty
            }
        }
        const lv = () => {
            inside = false
        }
        if (fine) {
            box.addEventListener("pointermove", mv as any)
            box.addEventListener("pointerleave", lv)
        }
        const read = () => {
            if (!vis) return
            const a = box.getBoundingClientRect()
            bw = a.width
            bh = a.height
            left = a.left
            top = a.top
        }
        const off = onTick((tm) => {
            if (!vis) return
            if (!fine || rm) {
                const s = (tm - t0) / 1000
                tx = bw * (0.5 + 0.42 * Math.sin(s * 0.45))
                ty = bh * (0.52 + 0.1 * Math.sin(s * 0.9))
                tr = rm ? bh * 0.5 : bh * (0.42 + 0.16 * Math.sin(s * 2.1))
                if (x < -900) {
                    x = tx
                    y = ty
                }
            } else tr = inside ? bh * 0.55 : 0
            x += (tx - x) * 0.16
            y += (ty - y) * 0.16
            r += (tr - r) * 0.12
            const k = `${x.toFixed(1)},${y.toFixed(1)},${r.toFixed(1)}`
            if (k === lx) return
            lx = k
            box.style.setProperty("--fx", `${x.toFixed(1)}px`)
            box.style.setProperty("--fy", `${y.toFixed(1)}px`)
            box.style.setProperty("--fr", `${Math.max(0, r).toFixed(1)}px`)
        }, read)
        return () => {
            off()
            io.disconnect()
            box.removeEventListener("pointermove", mv as any)
            box.removeEventListener("pointerleave", lv)
        }
    }, [live, rm])
    const cols = [
        {
            t: servicesTitle,
            l: services.map((s) => ({ l: s.f1, h: `/services/${s.slug}` })),
        },
        { t: companyTitle, l: linkList(company) },
        { t: resourcesTitle, l: linkList(resources) },
    ].filter((x) => x.t && x.l.length)
    const socials = linkList(site.socials)
    const blurbT = pick(blurb, site.tagline)
    const body = (
        <section
            ref={root as any}
            className={`rw rw-sec rw-dark rwft${phone ? " is-ph" : tab ? " is-tab" : ""}${on ? " is-on" : ""}${still ? " is-still" : ""}`}
            style={{ ...cssVars(c), ...B, ...(props.style || {}) }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html:
                        CSS_FOOTER + siteFontCss(props),
                }}
            />
            <h2 className="rw-sr">{name} footer</h2>
            <div className="rw-wrap">
                <div className="rwft-top">
                    <div className="rwft-brand" style={rise(on, 0)}>
                        <a
                            className="rwft-logo"
                            href="/"
                            aria-label={`${name} home`}
                        >
                            <RwftMark />
                            <span style={Dh}>{site.name}</span>
                        </a>
                        {blurbT && <p className="rwft-blurb">{blurbT}</p>}
                        {site.announce && (
                            <p className="rwft-ann" style={M}>
                                <i className="rw-port" aria-hidden />
                                {site.announce}
                            </p>
                        )}
                        <Btn
                            href={book}
                            label={button}
                            kind="quiet"
                            icon="cal"
                            className="rwft-btn"
                        />
                    </div>
                    <nav className="rwft-cols" aria-label="Footer">
                        {cols.map((col, i) => (
                            <div
                                key={i}
                                className="rwft-col"
                                style={rise(on, 80 + i * 70)}
                            >
                                <p className="rwft-ct" style={M}>
                                    {col.t}
                                </p>
                                <ul>
                                    {col.l.map((l, j) => (
                                        <li key={j}>
                                            <a href={l.h}>
                                                <span>{l.l}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                        <div
                            className="rwft-col"
                            style={rise(on, 80 + cols.length * 70)}
                        >
                            <p className="rwft-ct" style={M}>
                                {contactTitle}
                            </p>
                            <ul>
                                {site.email && (
                                    <li>
                                        <a href={`mailto:${site.email}`}>
                                            <span>{site.email}</span>
                                        </a>
                                    </li>
                                )}
                                {site.phone && (
                                    <li>
                                        <a href={`tel:${cleanTel(site.phone)}`}>
                                            <span>{site.phone}</span>
                                        </a>
                                    </li>
                                )}
                                {site.city && (
                                    <li className="rwft-city">{site.city}</li>
                                )}
                            </ul>
                            {socials.length > 0 && (
                                <ul className="rwft-soc">
                                    {socials.map((s, j) => (
                                        <li key={j}>
                                            <a
                                                href={s.h}
                                                target="_blank"
                                                rel="noopener"
                                                style={M}
                                            >
                                                {s.l}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </nav>
                </div>
            </div>
            <div className="rw-wrap rwft-wmw">
                <div ref={wmBox} className="rwft-wm" aria-hidden>
                    <span ref={wmTxt} className="rwft-wm-t" style={Dh}>
                        {name}
                    </span>
                    <span className="rwft-wm-l" style={Dh}>
                        {name}
                    </span>
                    <i className="rwft-ring" />
                    {!phone && hint && (
                        <b className="rwft-hint" style={M}>
                            {hint}
                        </b>
                    )}
                </div>
            </div>
            <div className="rw-wrap">
                <div className="rwft-legal" style={M}>
                    <span>
                        © {year} {site.name}
                    </span>
                    <ul>
                        {linkList(legal).map((l, i) => (
                            <li key={i}>
                                <a href={l.h}>{l.l}</a>
                            </li>
                        ))}
                    </ul>
                    <span className="rwft-made">
                        {madeWithLink ? (
                            <a
                                href={madeWithLink}
                                target="_blank"
                                rel="noopener"
                            >
                                {madeWith}
                            </a>
                        ) : (
                            madeWith
                        )}
                    </span>
                    <span className="rwft-time">
                        <i className="rwft-live" aria-hidden />
                        {clockLabel} {now}
                        {site.city ? ` · ${site.city}` : ""}
                    </span>
                </div>
            </div>
        </section>
    )
    return reveal ? (
        <Reveal on={reveal} layer={layer}>
            {body}
        </Reveal>
    ) : (
        body
    )
}
const CSS_FOOTER = `
.rwft{background:var(--rw-ink);color:var(--rw-cloud);padding:clamp(80px,8vw,120px) 0 28px;overflow:hidden;overflow:clip}
.rwft .rw-btn{--ring:var(--rw-ink)}
.rwft-top{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,2fr);gap:clamp(40px,5vw,96px);padding-bottom:clamp(48px,5vw,80px)}
.rwft-brand{display:flex;flex-direction:column;align-items:flex-start;gap:20px;max-width:380px}
.rwft-logo{display:inline-flex;align-items:center;gap:10px;text-decoration:none;font-size:24px;letter-spacing:-.035em}
.rwft-blurb{margin:0;font-size:17px;line-height:1.5;color:color-mix(in srgb,var(--rw-cloud) 72%,transparent)}
.rwft-ann{display:inline-flex;align-items:center;gap:10px;margin:0;padding:8px 14px 8px 12px;border-radius:999px;font-size:11.5px;letter-spacing:.06em;background:color-mix(in srgb,var(--rw-cloud) 7%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 14%,transparent)}
.rwft-cols{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px}
.rwft-ct{margin:0 0 18px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 50%,transparent)}
.rwft-col ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:11px}
.rwft-col a{position:relative;display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-size:15.5px;color:color-mix(in srgb,var(--rw-cloud) 88%,transparent);transition:color .3s}
.rwft-col a::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--rw-brass);scale:0;margin-right:-14px;transition:scale .35s cubic-bezier(.34,1.56,.64,1),margin .35s cubic-bezier(.2,.8,.2,1)}
.rwft-col a:hover{color:var(--rw-cloud)} .rwft-col a:hover::before{scale:1;margin-right:0}
.rwft-city{font-size:15.5px;color:color-mix(in srgb,var(--rw-cloud) 60%,transparent)}
.rwft-col .rwft-soc{flex-direction:row;flex-wrap:wrap;gap:6px;margin-top:20px}
.rwft-soc a{padding:7px 11px;border-radius:999px;font-size:11px;letter-spacing:.06em;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 18%,transparent);transition:background .3s,color .3s,box-shadow .3s} .rwft-soc a::before{display:none}
.rwft-soc a:hover{background:var(--rw-brass);color:var(--rw-ink);box-shadow:none}
.rwft-wmw{border-top:1px solid color-mix(in srgb,var(--rw-cloud) 12%,transparent)}
.rwft-wm{--fx:-999px;--fy:-999px;--fr:0px;position:relative;display:grid;padding:clamp(18px,2vw,30px) 0 0;overflow:hidden;translate:0 calc((1 - var(--rv,1))*42%);opacity:calc(.3 + var(--rv,1)*.7);user-select:none}
.rwft-wm-t,.rwft-wm-l{grid-area:1/1;display:block;font-size:var(--wf,17vw);line-height:.8;letter-spacing:-.065em;white-space:nowrap;padding:0 .075em .08em 0;justify-self:center;width:max-content}
.rwft-wm-t{color:color-mix(in srgb,var(--rw-cloud) 9%,transparent);-webkit-text-stroke:1px color-mix(in srgb,var(--rw-cloud) 16%,transparent)}
.rwft-wm-l{color:var(--rw-brass);-webkit-mask:radial-gradient(circle var(--fr) at var(--fx) var(--fy),#000 0,#000 72%,rgba(0,0,0,.35) 90%,transparent 100%);mask:radial-gradient(circle var(--fr) at var(--fx) var(--fy),#000 0,#000 72%,rgba(0,0,0,.35) 90%,transparent 100%)}
.rwft-ring{position:absolute;left:var(--fx);top:var(--fy);width:calc(var(--fr)*2);height:calc(var(--fr)*2);translate:-50% -50%;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--rw-brass),0 0 40px -6px color-mix(in srgb,var(--rw-brass) 60%,transparent);pointer-events:none}
.rwft-hint{position:absolute;right:0;top:clamp(18px,2vw,30px);font-size:10.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 45%,transparent)}
.rwft.is-still .rwft-wm{--fx:34%;--fy:55%;--fr:22%}
.rwft.is-still .rwft-wm-l{-webkit-mask:radial-gradient(circle 18vw at 34% 55%,#000 70%,transparent);mask:radial-gradient(circle 18vw at 34% 55%,#000 70%,transparent)} .rwft.is-still .rwft-ring{width:36vw;height:36vw}
.rwft-legal{display:flex;flex-wrap:wrap;align-items:center;gap:10px 28px;padding-top:22px;border-top:1px solid color-mix(in srgb,var(--rw-cloud) 12%,transparent);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 55%,transparent)}
.rwft-legal ul{display:flex;gap:20px;list-style:none;margin:0;padding:0}
.rwft-legal a{text-decoration:none;transition:color .3s} .rwft-legal a:hover{color:var(--rw-brass)}
.rwft-made{margin-left:auto}
.rwft-time{display:inline-flex;align-items:center;gap:8px}
.rwft-live{width:7px;height:7px;border-radius:50%;background:var(--rw-brass);animation:rwft-live 1.6s infinite} @keyframes rwft-live{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--rw-brass) 70%,transparent)}100%{box-shadow:0 0 0 9px transparent}}
.rwft.is-tab .rwft-top{grid-template-columns:1fr} .rwft.is-tab .rwft-brand{max-width:560px}
.rwft.is-ph .rwft-top{grid-template-columns:1fr;gap:44px} .rwft.is-ph .rwft-cols{grid-template-columns:1fr 1fr;gap:36px 20px}
.rwft.is-ph .rwft-col a{font-size:15px;overflow-wrap:anywhere} .rwft.is-ph .rwft-col:last-child{grid-column:1/-1} .rwft.is-ph .rwft-soc a{font-size:11px} .rwft.is-ph .rwft-legal{flex-direction:column;align-items:flex-start;gap:12px} .rwft.is-ph .rwft-made{margin-left:0}
@media (prefers-reduced-motion:reduce){.rwft-wm{translate:none!important;opacity:1!important}}`
addPropertyControls(RwFooter, {
    ...COLOR_CONTROLS,
    ...FONT_CONTROLS,
    ...BP_CONTROL,
    ...REVEAL_CONTROLS,
    blurb: {
        type: ControlType.String,
        title: "Blurb",
        description: "Empty = Tagline on the Site CMS row",
        defaultValue: "",
        displayTextArea: true,
    },
    button: {
        type: ControlType.String,
        title: "Button",
        defaultValue: "Book a strategy call",
    },
    buttonLink: {
        type: ControlType.Link,
        title: "Button link",
        description: "Empty = Booking Link on the Site CMS row",
    },
    servicesTitle: {
        type: ControlType.String,
        title: "Services title",
        description: "Links come from the Services CMS",
        defaultValue: "Services",
    },
    companyTitle: {
        type: ControlType.String,
        title: "Company title",
        defaultValue: "Company",
    },
    company: {
        type: ControlType.String,
        title: "Company links",
        description: "Label:/path, …",
        defaultValue:
            "About:/about, Work:/work, Team:/about#team, Careers:/careers, Contact:/contact",
        displayTextArea: true,
    },
    resourcesTitle: {
        type: ControlType.String,
        title: "Resources title",
        defaultValue: "Resources",
    },
    resources: {
        type: ControlType.String,
        title: "Resources links",
        description: "Label:/path, …",
        defaultValue: "Blog:/blog, FAQ:/#faq",
        displayTextArea: true,
    },
    contactTitle: {
        type: ControlType.String,
        title: "Contact title",
        defaultValue: "Contact",
    },
    wordmark: {
        type: ControlType.String,
        title: "Wordmark",
        description: "Empty = Name on the Site CMS row",
        defaultValue: "",
    },
    hint: {
        type: ControlType.String,
        title: "Wordmark hint",
        defaultValue: "Move over the name",
    },
    legal: {
        type: ControlType.String,
        title: "Legal links",
        description: "Label:/path, …",
        defaultValue: "Privacy:/privacy, Terms:/terms, Cookies:/cookies",
    },
    madeWith: {
        type: ControlType.String,
        title: "Made with",
        defaultValue: "",
    },
    madeWithLink: {
        type: ControlType.Link,
        title: "Made with link",
        defaultValue: "",
    },
    clockLabel: {
        type: ControlType.String,
        title: "Clock label",
        defaultValue: "Local time",
    },
})
