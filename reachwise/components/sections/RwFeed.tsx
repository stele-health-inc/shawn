"use client"
import {
    useEffect,
    useRef,
    type CSSProperties,
} from "react"
import { addPropertyControls, ControlType } from "@/lib/controls"
import {
    T,
    RS,
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
    useScrollVars,
    useOn,
    Head,
    Eyebrow,
    rise,
    pick,
    listOf,
} from "@/lib/rw"

// ===== RwFeed =====
interface FeedProps extends Pal {
    customFonts: boolean
    displayFont: any
    bodyFont: any
    monoFont: any
    bpHint: string
    eyebrow: string
    heading: string
    subCopy: string
    stats: string
    button: string
    buttonLink: string
    posts: string
    reelLabel: string
    style?: CSSProperties
}
// ---- THE WALL: a feed of client posts in columns that scroll at different speeds and directions (odd up, even down), bending with scroll velocity.
// Hover a post: the heart pops pink, a lime ring pings out of it and the like count rolls +1. ----
const FEED_POSTS =
    "/images/xbfdpTvZzzafiJOwtXCs0luyp2I.webp|@kinfolk.coffee|2418|post;/images/1DPklcMWo4iq1F5uWVjcytvrsc.webp|@lumenskin|8114|carousel|5;/images/yOk3vEq9TQ9CWpwuFmZY86mAVY.webp|@fitloop|3912|reel|48k;/images/s0jwUqVTFxGplLAwU0WLa8rbdw.webp|@parcel.co|5630|post;/images/YpYjh1duUyRdFMaCaQZ6JVDbmko.webp|@tallow.kitchen|1204|post;/images/HeKFyo7MfYy7GEQSGOPGXvhVHvo.webp|@brightline.run|9870|reel|112k;/images/oSWgZWTjPoakKUa7CvtJ6TXueP0.webp|@lumenskin|3307|carousel|3;/images/3nqFQlS1bXsh1PS74cijri0AhSM.webp|@verde.studio|1786|post;/images/yg9StsTkn2mS5VxfA3YnyrJNM1Q.webp|@haven.realty|2205|reel|21k;/images/mnE5eA5CunHm89doTbOt2H7pHdE.webp|@verde.studio|2874|carousel|4;/images/uYN9bcKFZFsqzLzQWUSswf4QIs.webp|@tallow.kitchen|2951|carousel|6;/images/eMqxq3byjv5ceZYESvRLuMWVug.webp|@parcel.co|3690|post;/images/xbfdpTvZzzafiJOwtXCs0luyp2I.webp|@kinfolk.coffee|1932|post;/images/yOk3vEq9TQ9CWpwuFmZY86mAVY.webp|@fitloop|4480|reel|64k;/images/1DPklcMWo4iq1F5uWVjcytvrsc.webp|@lumenskin|2660|carousel|3;/images/3nqFQlS1bXsh1PS74cijri0AhSM.webp|@verde.studio|1417|post;/images/HeKFyo7MfYy7GEQSGOPGXvhVHvo.webp|@brightline.run|6042|reel|31k;/images/oSWgZWTjPoakKUa7CvtJ6TXueP0.webp|@lumenskin|1118|carousel|5;/images/s0jwUqVTFxGplLAwU0WLa8rbdw.webp|@parcel.co|2336|post;/images/uYN9bcKFZFsqzLzQWUSswf4QIs.webp|@tallow.kitchen|2074|carousel|4"
type FeedPost = {
    src: string
    handle: string
    likes: number
    kind: "post" | "reel" | "carousel" | "photo"
    extra: string
    video: string
}
const feedParse = (s: string): FeedPost[] =>
    String(s || "")
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => {
            const p = x.split("|").map((y) => y.trim())
            const id = p[0] || ""
            const src = /^(https?:\/\/|\/)/.test(id)
                ? id.split("?")[0]
                : id
                  ? `https://images.unsplash.com/${id}`
                  : ""
            const k = (p[3] || "post").toLowerCase()
            return {
                src,
                handle: p[1] || "@client",
                likes: Math.max(
                    0,
                    Math.round(
                        Number(String(p[2] || "0").replace(/[^\d.]/g, "")) || 0
                    )
                ),
                kind: (k.startsWith("r")
                    ? "reel"
                    : k.startsWith("c")
                      ? "carousel"
                      : k.startsWith("ph")
                        ? "photo"
                        : "post") as any,
                extra: p[4] || "",
                video: p[5] || "",
            }
        })
        .filter((p) => p.src)
const FEED_HUES = [
    "#EB4600",
    "#A2C2BE",
    "#C9DCD7",
    "#FFFFEB",
    "#D9A3AB",
    "#C9D2B0",
]
const feedHue = (h: string) => {
    let n = 0
    for (const ch of h) n = (n * 31 + ch.charCodeAt(0)) >>> 0
    return FEED_HUES[n % FEED_HUES.length]
}
const Heart = () => (
    <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 3.9 4.5 7.4 4.5c2 0 3.6 1.1 4.6 2.7 1-1.6 2.6-2.7 4.6-2.7 3.5 0 5.8 3.3 4.6 6.7C19.5 15.9 12 20.5 12 20.5z" />
    </svg>
)
export default function RwFeed(props: FeedProps) {
    const {
        eyebrow = "(06) Content",
        heading = "Content that|*stops the scroll.*",
        subCopy = "",
        stats = "",
        button = "Social media service",
        buttonLink = "/services/social-media",
        posts = FEED_POSTS,
        reelLabel = "views",
        bpHint = "auto",
    } = props
    const c = colorsOf(props)
    const { D, B, M } = fontsOf(props)
    useFonts()
    const live = useLive()
    const rm = useReduced()
    const still = useStill()
    const root = useRef<HTMLElement>(null)
    const wall = useRef<HTMLDivElement>(null)
    const { w } = useSize(root, bpHint)
    const phone = w < 810,
        tab = w >= 810 && w < 1100
    const on = useOn(root, live, rm)
    useMagnet(root, live)
    useScrollVars(root, live, rm)
    // scroll velocity → a clamped skew on the columns (±4°), eased; written only when it changes
    useEffect(() => {
        if (!live || rm || !wall.current) return
        const el = wall.current
        let y = 0,
            last = -1,
            v = 0,
            cur = 0,
            shown = 0,
            vis = true
        const io = new IntersectionObserver(
            (es) => {
                vis = es[0].isIntersecting
            },
            { rootMargin: "20% 0px 20% 0px" }
        )
        io.observe(el)
        const off = onTick(
            () => {
                if (last < 0) {
                    last = y
                    return
                }
                const d = y - last
                last = y
                if (!vis && Math.abs(cur) < 0.01) return
                v += (d - v) * 0.25
                const t = Math.max(-4, Math.min(4, v * 0.16))
                cur += (t - cur) * 0.14
                if (Math.abs(cur) < 0.01) cur = 0
                if (Math.abs(cur - shown) < 0.02) return
                shown = cur
                el.style.setProperty("--sk", `${cur.toFixed(2)}deg`)
            },
            () => {
                y = window.scrollY
            }
        )
        return () => {
            off()
            io.disconnect()
        }
    }, [live, rm])
    const P = feedParse(posts)
    const cols = phone ? 2 : tab ? 3 : 5
    const per = P.length
        ? Math.max(Math.ceil(P.length / cols), phone ? 6 : 4)
        : 0
    // round-robin into columns; a short list wraps (offset so a post never repeats next to itself)
    const C = Array.from({ length: cols }, (_, j) =>
        Array.from({ length: per }, (_, k) => {
            const i = k * cols + j
            return {
                p: P[(i < P.length ? i : i + 3) % Math.max(1, P.length)],
                key: `${j}-${k}`,
            }
        })
    )
    const SPD = [1, 0.72, 1.12, 0.84, 0.96]
    const sub = pick(
        subCopy,
        "We plan, shoot, edit and post for our clients every week. Reels, carousels and stories made for how each platform actually works."
    )
    const ST = listOf(stats || "4.1M views last month;38k saves;+212% reach")
    const fmt = (n: number) => n.toLocaleString("en-US")
    return (
        <section
            ref={root as any}
            className={`rw rw-sec rw-dark rwfd${phone ? " is-ph" : tab ? " is-tab" : ""}${on ? " is-on" : ""}${rm || still ? " is-rm" : ""}`}
            style={{ ...cssVars(c), ...B, ...(props.style || {}) }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html:
                        CSS_FEED + siteFontCss(props),
                }}
            />
            <div className="rw-wrap rwfd-top">
                <div className="rwfd-hl">
                    <Eyebrow text={eyebrow} on={on} M={M} />
                    <Head
                        text={heading}
                        on={on}
                        D={D}
                        size="clamp(40px,4.6vw,68px)"
                        lh={0.95}
                        delay={120}
                        className="rwfd-h2"
                    />
                </div>
                <div className="rwfd-side" style={rise(on, 360)}>
                    {sub && <p className="rwfd-sub">{sub}</p>}
                    {ST.length > 0 && (
                        <ul className="rwfd-stats" style={M}>
                            {ST.map((s, i) => (
                                <li key={i}>
                                    <i aria-hidden />
                                    {s}
                                </li>
                            ))}
                        </ul>
                    )}
                    {button && (
                        <Btn
                            href={buttonLink || "/services/social-media"}
                            label={button}
                            kind="ghost"
                        />
                    )}
                </div>
            </div>
            <div
                ref={wall}
                className="rwfd-wall"
                style={{ ["--cols" as any]: cols }}
            >
                {C.map((col, j) => (
                    <div
                        key={j}
                        className="rwfd-col"
                        style={{
                            ["--dir" as any]: j % 2 ? 1 : -1,
                            ["--spd" as any]: SPD[j % SPD.length],
                        }}
                    >
                        {col.map(
                            ({ p, key }, k) =>
                                p && (
                                    <article
                                        key={key}
                                        className={`rwfd-card is-${p.kind}`}
                                        style={{
                                            transitionDelay: `${j * 70 + k * 40}ms`,
                                        }}
                                    >
                                        <div
                                            className="rwfd-media"
                                            style={{
                                                aspectRatio:
                                                    p.kind === "reel"
                                                        ? "9/16"
                                                        : p.kind === "carousel" ||
                                                            p.kind === "photo"
                                                          ? "4/5"
                                                          : "1/1",
                                            }}
                                        >
                                            <img
                                                {...RS(
                                                    p.src,
                                                    "(max-width: 809px) 46vw, (max-width: 1099px) 31vw, 20vw"
                                                )}
                                                alt={`Post by ${p.handle}`}
                                                loading="lazy"
                                                decoding="async"
                                                draggable={false}
                                            />
                                            {p.video && (
                                                <video
                                                    className="rwfd-vid"
                                                    src={p.video}
                                                    poster={p.src}
                                                    muted
                                                    loop
                                                    playsInline
                                                    autoPlay
                                                    preload="metadata"
                                                    aria-hidden
                                                />
                                            )}
                                            {p.kind === "reel" && (
                                                <span
                                                    className="rwfd-reel"
                                                    style={M}
                                                >
                                                    <svg
                                                        viewBox="0 0 24 24"
                                                        aria-hidden
                                                    >
                                                        <path
                                                            fill="currentColor"
                                                            d="M8 5.5v13l10.5-6.5z"
                                                        />
                                                    </svg>
                                                    {p.extra
                                                        ? `${p.extra} ${reelLabel}`
                                                        : "Reel"}
                                                </span>
                                            )}
                                            {p.kind === "carousel" && (
                                                <>
                                                    <span
                                                        className="rwfd-n"
                                                        style={M}
                                                    >
                                                        1/
                                                        {Math.max(
                                                            2,
                                                            parseInt(p.extra) ||
                                                                3
                                                        )}
                                                    </span>
                                                    <span
                                                        className="rwfd-dots"
                                                        aria-hidden
                                                    >
                                                        {Array.from(
                                                            {
                                                                length: Math.min(
                                                                    6,
                                                                    Math.max(
                                                                        2,
                                                                        parseInt(
                                                                            p.extra
                                                                        ) || 3
                                                                    )
                                                                ),
                                                            },
                                                            (_, d) => (
                                                                <i
                                                                    key={d}
                                                                    className={
                                                                        d
                                                                            ? ""
                                                                            : "is-a"
                                                                    }
                                                                />
                                                            )
                                                        )}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <div className="rwfd-meta">
                                            <i
                                                className="rwfd-av"
                                                aria-hidden
                                                style={{
                                                    ["--av" as any]: feedHue(
                                                        p.handle
                                                    ),
                                                    ...D,
                                                }}
                                            >
                                                {p.handle
                                                    .replace(/^@/, "")
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </i>
                                            <span className="rwfd-hd">
                                                {p.handle}
                                            </span>
                                            <span
                                                className="rwfd-like"
                                                style={M}
                                            >
                                                <span className="rwfd-heart">
                                                    <Heart />
                                                    <i
                                                        className="rwfd-ring"
                                                        aria-hidden
                                                    />
                                                </span>
                                                {p.likes > 0 && (
                                                    <span
                                                        className="rwfd-roll"
                                                        aria-label={`${fmt(p.likes)} likes`}
                                                    >
                                                        <b aria-hidden>
                                                            {fmt(p.likes)}
                                                        </b>
                                                        <b aria-hidden>
                                                            {fmt(p.likes + 1)}
                                                        </b>
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </article>
                                )
                        )}
                    </div>
                ))}
            </div>
        </section>
    )
}
const CSS_FEED = `
.rwfd{background:var(--rw-night);color:var(--rw-cloud);padding:clamp(96px,10vw,168px) 0 clamp(80px,8vw,128px);overflow:hidden;overflow:clip;isolation:isolate}
.rwfd .rw-eb i{animation:rwfd-eb 1.8s cubic-bezier(.2,.6,.3,1) infinite} @keyframes rwfd-eb{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--rw-brass) 70%,transparent)}100%{box-shadow:0 0 0 8px transparent}}
.rwfd .rw-it{color:var(--rw-brass);font-weight:inherit}
.rwfd-top{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,.75fr);gap:40px 64px;align-items:end}
.rwfd-hl{display:flex;flex-direction:column;gap:26px}
.rwfd-h2{letter-spacing:-.045em!important}
.rwfd-side{display:flex;flex-direction:column;align-items:flex-start;gap:22px;padding-bottom:6px}
.rwfd-sub{margin:0;max-width:440px;font-size:17px;line-height:1.55;color:color-mix(in srgb,var(--rw-cloud) 74%,transparent)}
.rwfd-stats{display:flex;flex-wrap:wrap;gap:6px;list-style:none;margin:0;padding:0;font-size:11px;letter-spacing:.1em;text-transform:uppercase}
.rwfd-stats li{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 16%,transparent);color:color-mix(in srgb,var(--rw-cloud) 82%,transparent)}
.rwfd-stats i{width:6px;height:6px;border-radius:50%;background:var(--rw-brass)}
/* the wall */
.rwfd-wall{--T:190px;--gap:14px;position:relative;height:clamp(640px,92vh,900px);margin-top:clamp(56px,6vw,88px);padding:0 clamp(12px,1.4vw,24px);display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));grid-template-rows:minmax(0,1fr);gap:var(--gap);overflow:hidden;overflow:clip;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 13%,#000 85%,transparent 100%);mask-image:linear-gradient(180deg,transparent 0,#000 13%,#000 85%,transparent 100%)}
.rwfd-col{position:relative;top:50%;align-self:start;display:flex;flex-direction:column;gap:var(--gap);height:max-content;transform:translate3d(0,calc(-50% + (var(--sp,.5) - .5) * 2 * var(--dir) * var(--spd) * var(--T)),0) skewY(var(--sk,0deg));will-change:transform}
.rwfd.is-rm .rwfd-col{transform:translate3d(0,-50%,0)}
.rwfd-vid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
.rwfd-card{position:relative;display:flex;flex-direction:column;border-radius:20px;padding:6px;background:var(--rw-pine);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 8%,transparent);opacity:0;translate:0 40px;transition:opacity .9s ease,translate 1.1s cubic-bezier(.2,.8,.2,1),box-shadow .4s}
.rwfd.is-on .rwfd-card{opacity:1;translate:0 0}
.rwfd-media{position:relative;overflow:hidden;border-radius:15px;background:color-mix(in srgb,var(--rw-cloud) 6%,transparent)}
.rwfd-media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transition:scale 1.1s cubic-bezier(.2,.8,.2,1),filter .6s;user-select:none}
.rwfd-reel{position:absolute;left:9px;top:9px;display:inline-flex;align-items:center;gap:5px;padding:5px 9px 5px 7px;border-radius:999px;background:color-mix(in srgb,var(--rw-night) 55%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-size:10.5px;letter-spacing:.04em;color:var(--rw-cloud)}
.rwfd-reel svg{width:11px;height:11px;color:var(--rw-brass)}
.rwfd-n{position:absolute;right:9px;top:9px;padding:4px 8px;border-radius:999px;background:color-mix(in srgb,var(--rw-night) 55%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-size:10.5px;color:var(--rw-cloud)}
.rwfd-dots{position:absolute;left:0;right:0;bottom:10px;display:flex;justify-content:center;gap:5px} .rwfd-dots i{width:5px;height:5px;border-radius:50%;background:color-mix(in srgb,var(--rw-cloud) 55%,transparent)} .rwfd-dots i.is-a{background:var(--rw-cloud)}
.rwfd-meta{display:flex;align-items:center;gap:8px;padding:10px 6px 5px 4px;font-size:12.5px}
.rwfd-av{display:grid;place-items:center;flex:none;width:22px;height:22px;border-radius:50%;background:var(--av);color:var(--rw-ink);font-size:11px;font-style:normal;font-weight:700;box-shadow:0 0 0 2px var(--rw-pine),0 0 0 3.5px color-mix(in srgb,var(--av) 60%,transparent)}
.rwfd-hd{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:color-mix(in srgb,var(--rw-cloud) 88%,transparent)}
.rwfd-like{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:color-mix(in srgb,var(--rw-cloud) 78%,transparent)}
.rwfd-heart{position:relative;display:grid;place-items:center;width:16px;height:16px}
.rwfd-heart svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;transition:fill .25s,stroke .25s,scale .45s cubic-bezier(.34,1.56,.64,1)}
.rwfd-ring{position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;box-shadow:0 0 0 1.5px var(--rw-brass);opacity:0;pointer-events:none}
.rwfd-roll{display:inline-flex;flex-direction:column;height:1.3em;line-height:1.3em;overflow:hidden;font-variant-numeric:tabular-nums} .rwfd-roll b{display:block;font-weight:inherit;transition:translate .5s cubic-bezier(.7,0,.2,1)}
@media (hover:hover) and (pointer:fine){
.rwfd-card:hover{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-brass) 55%,transparent)}
.rwfd-card:hover .rwfd-media img{scale:1.05}
.rwfd-card:hover .rwfd-heart svg{fill:#A2C2BE;stroke:#A2C2BE;animation:rwfd-pop .5s cubic-bezier(.34,1.56,.64,1)}
.rwfd-card:hover .rwfd-ring{animation:rwfd-ping .9s cubic-bezier(.2,.6,.3,1) .05s}
.rwfd-card:hover .rwfd-roll b{translate:0 -100%}
.rwfd-card:hover .rwfd-like{color:var(--rw-cloud)}}
@keyframes rwfd-pop{0%{scale:1}40%{scale:1.45}100%{scale:1}}
@keyframes rwfd-ping{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(3)}}
/* tablet */
.rwfd.is-tab .rwfd-top{grid-template-columns:1fr;align-items:start} .rwfd.is-tab .rwfd-wall{height:900px}
/* phone */
.rwfd.is-ph{padding:88px 0 64px} .rwfd.is-ph .rwfd-top{grid-template-columns:1fr;gap:26px} .rwfd.is-ph .rwfd-side{gap:18px} .rwfd.is-ph .rwfd-sub{font-size:16px}
.rwfd.is-ph .rwfd-wall{--T:150px;--gap:10px;height:720px;margin-top:40px;padding:0 10px} .rwfd.is-ph .rwfd-card{padding:5px;border-radius:16px} .rwfd.is-ph .rwfd-media{border-radius:12px}
.rwfd.is-ph .rwfd-meta{gap:6px;padding:8px 3px 3px 2px;font-size:11.5px} .rwfd.is-ph .rwfd-like{font-size:11px} .rwfd.is-ph .rwfd-av{width:18px;height:18px;font-size:9.5px}
.rwfd.is-ph .rwfd-reel,.rwfd.is-ph .rwfd-n{font-size:10px}
@media (prefers-reduced-motion:reduce){.rwfd-col{transform:translate3d(0,-50%,0)!important} .rwfd-card{opacity:1;translate:0 0}}
`
addPropertyControls(RwFeed, {
    ...COLOR_CONTROLS,
    ...FONT_CONTROLS,
    ...BP_CONTROL,
    eyebrow: {
        type: ControlType.String,
        title: "Eyebrow",
        defaultValue: "(06) Content",
    },
    heading: {
        type: ControlType.String,
        title: "Heading",
        description: "| = line break, *words* = lime",
        defaultValue: "Content that|*stops the scroll.*",
        displayTextArea: true,
    },
    subCopy: {
        type: ControlType.String,
        title: "Text",
        defaultValue:
            "We plan, shoot, edit and post for our clients every week. Reels, carousels and stories made for how each platform actually works.",
        displayTextArea: true,
    },
    stats: {
        type: ControlType.String,
        title: "Stats",
        description: "Separate with ;",
        defaultValue: "4.1M views last month;38k saves;+212% reach",
    },
    button: {
        type: ControlType.String,
        title: "Button",
        defaultValue: "Social media service",
    },
    buttonLink: {
        type: ControlType.Link,
        title: "Button link",
        defaultValue: "/services/social-media",
    },
    posts: {
        type: ControlType.String,
        title: "Posts",
        description:
            "image|@handle|likes (0 hides)|post, photo, reel or carousel|views or slides|video URL (optional); … (image = Unsplash photo id or a full image URL)",
        displayTextArea: true,
        defaultValue: FEED_POSTS,
    },
    reelLabel: {
        type: ControlType.String,
        title: "Reel label",
        defaultValue: "views",
    },
})
