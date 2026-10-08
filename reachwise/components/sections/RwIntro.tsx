"use client"
import { useEffect, useRef, type CSSProperties } from "react"
import { addPropertyControls, ControlType } from "@/lib/controls"
import {
    type Pal,
    colorsOf,
    fontsOf,
    useFonts,
    useLive,
    useReduced,
    useStill,
    useSize,
    useOn,
    useMagnet,
    onTick,
    clamp01,
    cssRgb,
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

// ===== RwIntro =====
interface IntroProps extends Pal {
    customFonts: boolean
    displayFont: any
    bodyFont: any
    monoFont: any
    bpHint: string
    eyebrow: string
    heading: string
    subCopy: string
    button: string
    buttonLink: string
    facts: string
    clusters: string
    ratioLabel: string
    ratioTail: string
    crowdLabel: string
    buyersShare: number
    style?: CSSProperties
}
// ---- THE CROWD SORT: one canvas, a dot-matrix crowd seen from very high (the hero plaza, zoomed out). As the panel scrolls through the viewport
// the crowd SORTS: ~1 in 12 dots (your buyers) turn lime and migrate (eased, per-dot delay, curved paths) into three tight clusters — SEARCH · FEEDS ·
// AUDIENCES — whose counts roll; everyone else fades to 25% and drifts apart. Reverse scroll un-sorts. Pointer: nearby dots are pushed away and glow.
// Reduced motion: the sorted state drawn once. ----
const rwinRand = (seed: number) => {
    let s = seed >>> 0
    return () => {
        s = (s + 0x6d2b79f5) >>> 0
        let t = s
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}
const rwinFmt = (n: number) => Math.round(n).toLocaleString("en-US")
export default function RwIntro(props: IntroProps) {
    const {
        eyebrow = "(01) Why BOS",
        heading = "Everyone is a crowd.|We find *your buyers*.",
        subCopy = "Most brands aren't invisible. They're talking to the wrong people. We find the searches, feeds and audiences where your buyers already are — and put you there.",
        button = "About us",
        buttonLink = "/about",
        facts = "Founded 2016;38 people;New York + remote",
        clusters = "Search|312|searching “dentist near me”;Feeds|1,204|following #coffee;Audiences|88|lookalikes",
        ratioLabel = "1 in",
        ratioTail = "is your buyer",
        crowdLabel = "people in the crowd",
        buyersShare = 12,
        bpHint = "auto",
    } = props
    const c = colorsOf(props)
    const { D, B, M } = fontsOf(props)
    useFonts()
    const live = useLive()
    const rm = useReduced()
    const still = useStill()
    const root = useRef<HTMLElement>(null)
    const panel = useRef<HTMLDivElement>(null)
    const cv = useRef<HTMLCanvasElement>(null)
    const ratioEl = useRef<HTMLSpanElement>(null)
    const { w } = useSize(root, bpHint)
    const phone = w < 810,
        tab = w >= 810 && w < 1100
    const on = useOn(root, live, rm)
    useMagnet(root, live)
    const CL = listOf(clusters)
        .slice(0, 3)
        .map((x) => {
            const [t, n, l] = x.split("|").map((y) => (y || "").trim())
            return {
                t: t || "",
                n: parseFloat(String(n || "0").replace(/[^\d.]/g, "")) || 0,
                l: l || "",
            }
        })
    const FX = listOf(facts)
    const share = Math.max(2, Math.round(buyersShare || 12))
    const N = phone ? 600 : tab ? 900 : 1200
    // cluster anchors (fractions of the canvas): desktop in a row right of the counter, phone stacked on the right half
    const anchors: [number, number][] = phone
        ? [
              [0.22, 0.2],
              [0.22, 0.5],
              [0.22, 0.8],
          ]
        : tab
          ? [
                [0.36, 0.52],
                [0.6, 0.4],
                [0.84, 0.56],
            ]
          : [
                [0.42, 0.52],
                [0.63, 0.38],
                [0.84, 0.58],
            ]
    const final = !live || rm || still
    const cntRefs = useRef<(HTMLSpanElement | null)[]>([])
    useEffect(() => {
        if (!live || !cv.current || !panel.current) return
        const canvas = cv.current,
            pn = panel.current,
            ctx = canvas.getContext("2d")
        if (!ctx) return
        const ink = cssRgb(pn, c.cloud, "255,255,255"),
            lime = cssRgb(pn, c.brass, "255,138,61")
        const R = rwinRand(1207 + N)
        // ---- the crowd: people walk alone or in small groups; home positions in 0..1 ----
        const hx = new Float32Array(N),
            hy = new Float32Array(N),
            sz = new Float32Array(N),
            ph = new Float32Array(N),
            buyer = new Int8Array(N).fill(-1),
            dl = new Float32Array(N),
            ord = new Float32Array(N),
            bend = new Float32Array(N)
        const ox = new Float32Array(N),
            oy = new Float32Array(N),
            gl = new Float32Array(N)
        let k = 0
        while (k < N) {
            const gx = R(),
                gy = R()
            const g = R() < 0.3 ? 2 + Math.floor(R() * 3) : 1
            for (let j = 0; j < g && k < N; j++, k++) {
                hx[k] = Math.min(
                    0.99,
                    Math.max(0.01, gx + (R() - 0.5) * 0.018 * (j ? 1 : 0))
                )
                hy[k] = Math.min(
                    0.98,
                    Math.max(0.02, gy + (R() - 0.5) * 0.03 * (j ? 1 : 0))
                )
                sz[k] = 1.25 + R() * 0.6
                ph[k] = R() * 6.283
            }
        }
        // buyers: 1 in `share`, split across the clusters by weight (roughly even so every cluster reads)
        const wts = [0.34, 0.4, 0.26]
        const bi: number[][] = [[], [], []]
        for (let i = 0; i < N; i++)
            if (R() < 1 / share) {
                const r = R()
                const cl = r < wts[0] ? 0 : r < wts[0] + wts[1] ? 1 : 2
                if (CL[cl]) {
                    buyer[i] = cl
                    bi[cl].push(i)
                    dl[i] = R() * 0.42
                    bend[i] = (R() - 0.5) * 0.5
                }
            }
        bi.forEach((arr) =>
            arr.forEach((i, j) => {
                ord[i] = j
            })
        )
        let W = 1,
            H = 1,
            dpr = 1
        let dirty = true
        const size = () => {
            dpr = Math.min(2, window.devicePixelRatio || 1)
            const r = canvas.getBoundingClientRect()
            W = Math.max(1, r.width)
            H = Math.max(1, r.height)
            canvas.width = Math.round(W * dpr)
            canvas.height = Math.round(H * dpr)
            dirty = true
        }
        size()
        const ro = new ResizeObserver(size)
        ro.observe(canvas)
        const fine = window.matchMedia(
            "(hover:hover) and (pointer:fine)"
        ).matches
        let mx = -9999,
            my = -9999,
            mon = 0
        const mv = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect()
            mx = e.clientX - r.left
            my = e.clientY - r.top
            mon = 1
        }
        const lv = () => {
            mon = 0
            mx = my = -9999
        }
        if (fine && !rm) {
            canvas.addEventListener("pointermove", mv as any)
            canvas.addEventListener("pointerleave", lv)
        }
        let vis = false
        const io = new IntersectionObserver(
            (es) => {
                vis = es[0].isIntersecting
                dirty = true
            },
            { rootMargin: "10% 0px 10% 0px" }
        )
        io.observe(canvas)
        let p = final ? 1 : 0,
            pt = p,
            rt = 0,
            rh = 1,
            vh = 1,
            fresh = false,
            lastRatio = "",
            lastCnt = ["", "", ""]
        const read = () => {
            if (!vis) {
                fresh = false
                return
            }
            const r = canvas.getBoundingClientRect()
            rt = r.top
            rh = r.height
            vh = window.innerHeight || 1
            fresh = true
        }
        const ease = (t: number) => {
            const x = clamp01(t)
            return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
        }
        const draw = (tm: number) => {
            const t = tm / 1000
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, W, H)
            const sp = Math.min(W, H) * (phone ? 0.021 : 0.019) + 2.2 // cluster packing step
            const cx = anchors.map((a) => a[0] * W),
                cy = anchors.map((a) => a[1] * H)
            const idle = final ? 0 : 1
            // pass 1: the crowd (non-buyers) — one path, fading to 25% and drifting away from the clusters
            const crowdA = 0.62 - 0.4 * ease(p)
            ctx.fillStyle = `rgba(${ink},${crowdA.toFixed(3)})`
            ctx.beginPath()
            const glowList: number[] = []
            for (let i = 0; i < N; i++) {
                let x = hx[i] * W + Math.sin(t * 0.6 + ph[i]) * 1.4 * idle,
                    y = hy[i] * H + Math.cos(t * 0.5 + ph[i] * 1.3) * 1.2 * idle
                const b = buyer[i]
                if (b >= 0) continue
                // drift apart: pushed away from the nearest cluster, a little outward overall
                let best = 0,
                    bd = 1e9
                for (let q = 0; q < 3; q++) {
                    if (!CL[q]) continue
                    const d = (x - cx[q]) ** 2 + (y - cy[q]) ** 2
                    if (d < bd) {
                        bd = d
                        best = q
                    }
                }
                const d = Math.sqrt(bd) || 1
                const push =
                    ease(p) *
                    Math.max(0, 1 - d / (Math.min(W, H) * 0.55)) *
                    Math.min(W, H) *
                    0.12
                x += ((x - cx[best]) / d) * push
                y += ((y - cy[best]) / d) * push
                x += ox[i]
                y += oy[i]
                const r = sz[i]
                if (gl[i] > 0.05) {
                    glowList.push(i, x, y)
                    continue
                }
                ctx.moveTo(x + r, y)
                ctx.arc(x, y, r, 0, 6.2832)
            }
            ctx.fill()
            // glowing (pointer-pushed) crowd dots
            for (let j = 0; j < glowList.length; j += 3) {
                const i = glowList[j]
                ctx.fillStyle = `rgba(${ink},${Math.min(1, crowdA + gl[i] * 0.7).toFixed(3)})`
                ctx.beginPath()
                ctx.arc(
                    glowList[j + 1],
                    glowList[j + 2],
                    sz[i] * (1 + gl[i] * 0.6),
                    0,
                    6.2832
                )
                ctx.fill()
            }
            // cluster halos
            for (let q = 0; q < 3; q++) {
                if (!CL[q] || !bi[q].length) continue
                const e = ease((p - 0.55) / 0.45)
                if (e <= 0) continue
                const rr = sp * Math.sqrt(bi[q].length) * 0.5 + 14
                ctx.strokeStyle = `rgba(${lime},${(0.55 * e).toFixed(3)})`
                ctx.lineWidth = 1
                ctx.beginPath()
                ctx.arc(cx[q], cy[q], rr + (1 - e) * 30, 0, 6.2832)
                ctx.stroke()
                ctx.fillStyle = `rgba(${lime},${(0.06 * e).toFixed(3)})`
                ctx.fill()
            }
            // pass 2: buyers — migrate along a curved path into a sunflower pack, ink → lime
            for (let i = 0; i < N; i++) {
                const b = buyer[i]
                if (b < 0) continue
                const lp = ease((p - dl[i]) / 0.58)
                const hxp =
                        hx[i] * W +
                        Math.sin(t * 0.6 + ph[i]) * 1.4 * idle * (1 - lp),
                    hyp =
                        hy[i] * H +
                        Math.cos(t * 0.5 + ph[i] * 1.3) * 1.2 * idle * (1 - lp)
                const j = ord[i]
                const ang = j * 2.39996
                const rad = sp * 0.5 * Math.sqrt(j + 0.5)
                const tx =
                        cx[b] +
                        Math.cos(ang) * rad +
                        Math.sin(t * 1.3 + ph[i]) * 0.6 * idle,
                    ty =
                        cy[b] +
                        Math.sin(ang) * rad +
                        Math.cos(t * 1.1 + ph[i]) * 0.6 * idle
                const dx = tx - hxp,
                    dy = ty - hyp
                const cb = Math.sin(lp * Math.PI) * bend[i]
                const x = hxp + dx * lp - dy * cb + ox[i],
                    y = hyp + dy * lp + dx * cb + oy[i]
                const r = sz[i] * (1 + 0.6 * lp) * (1 + gl[i] * 0.5)
                if (lp < 0.999) {
                    ctx.fillStyle = `rgba(${ink},${(0.62 * (1 - lp)).toFixed(3)})`
                    ctx.beginPath()
                    ctx.arc(x, y, r, 0, 6.2832)
                    ctx.fill()
                }
                if (lp > 0.001) {
                    if (gl[i] > 0.05 || (lp > 0.05 && lp < 0.95)) {
                        ctx.fillStyle = `rgba(${lime},${(0.18 * lp).toFixed(3)})`
                        ctx.beginPath()
                        ctx.arc(x, y, r * 2.6, 0, 6.2832)
                        ctx.fill()
                    }
                    ctx.fillStyle = `rgba(${lime},${lp.toFixed(3)})`
                    ctx.beginPath()
                    ctx.arc(x, y, r, 0, 6.2832)
                    ctx.fill()
                }
            }
        }
        const writeText = () => {
            const e = ease(p)
            const den = Math.round(N - (N - share) * Math.pow(e, 0.6))
            const rs = rwinFmt(den)
            if (rs !== lastRatio && ratioEl.current) {
                lastRatio = rs
                ratioEl.current.textContent = rs
            }
            CL.forEach((cl, q) => {
                const el = cntRefs.current[q]
                if (!el) return
                const v = rwinFmt(cl.n * ease((p - 0.35) / 0.65))
                if (v !== lastCnt[q]) {
                    lastCnt[q] = v
                    el.textContent = v
                }
            })
            pn.style.setProperty("--p", p.toFixed(3))
        }
        if (final) {
            p = 1
            const redraw = () => {
                size()
                draw(0)
                writeText()
            }
            redraw()
            const ro2 = new ResizeObserver(redraw)
            ro2.observe(canvas)
            return () => {
                ro.disconnect()
                ro2.disconnect()
                io.disconnect()
            }
        }
        const R2 = 70
        const off = onTick((tm) => {
            if (!vis) return
            if (fresh) {
                const q = (vh - rt) / (vh + rh)
                pt = clamp01((q - 0.27) / 0.4)
            }
            const was = p
            p += (pt - p) * 0.12
            if (Math.abs(pt - p) < 0.0005) p = pt
            // pointer: push + glow (lerped)
            for (let i = 0; i < N; i++) {
                let tx = 0,
                    ty = 0,
                    tg = 0
                if (mon) {
                    const bx = buyer[i] >= 0 && p > 0.5 ? null : 1
                    const px = hx[i] * W,
                        py = hy[i] * H
                    const ddx = px - mx,
                        ddy = py - my
                    const d2 = ddx * ddx + ddy * ddy
                    if (bx && d2 < R2 * R2) {
                        const d = Math.sqrt(d2) || 1
                        const f = 1 - d / R2
                        tx = (ddx / d) * f * 16
                        ty = (ddy / d) * f * 16
                        tg = f
                    }
                }
                if (
                    Math.abs(tx - ox[i]) +
                        Math.abs(ty - oy[i]) +
                        Math.abs(tg - gl[i]) >
                    0.01
                ) {
                    ox[i] += (tx - ox[i]) * 0.14
                    oy[i] += (ty - oy[i]) * 0.14
                    gl[i] += (tg - gl[i]) * (tg > gl[i] ? 0.3 : 0.05)
                }
            }
            draw(tm)
            if (was !== p || dirty) {
                writeText()
                dirty = false
            }
        }, read)
        return () => {
            off()
            ro.disconnect()
            io.disconnect()
            canvas.removeEventListener("pointermove", mv as any)
            canvas.removeEventListener("pointerleave", lv)
        }
    }, [live, rm, still, N, clusters, share, phone, tab])
    const fin = final
    return (
        <section
            ref={root as any}
            className={`rw rw-sec rwin${phone ? " is-ph" : tab ? " is-tab" : ""}${on ? " is-on" : ""}${fin ? " is-fin" : ""}`}
            style={{ ...cssVars(c), ...B, ...(props.style || {}) }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html: CSS_IN + siteFontCss(props),
                }}
            />
            <div className="rw-wrap">
                <div className="rwin-top">
                    <div className="rwin-lead">
                        <Eyebrow text={eyebrow} on={on} M={M} />
                        <Head
                            text={heading}
                            on={on}
                            D={D}
                            size={
                                phone
                                    ? "clamp(40px,11.4vw,54px)"
                                    : "clamp(40px,5vw,76px)"
                            }
                            lh={0.95}
                            delay={80}
                            className="rwin-hd"
                        />
                    </div>
                    <div className="rwin-side">
                        {subCopy && (
                            <p className="rwin-sub" style={rise(on, 420, 14)}>
                                {subCopy}
                            </p>
                        )}
                        <div className="rwin-act" style={rise(on, 520, 14)}>
                            <Btn
                                href={buttonLink || "/about"}
                                label={button}
                                kind="ghost"
                            />
                        </div>
                        {FX.length > 0 && (
                            <ul
                                className="rwin-facts"
                                style={{ ...M, ...rise(on, 600, 10) }}
                            >
                                {FX.map((f, i) => (
                                    <li key={i}>{f}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                <div
                    ref={panel}
                    className="rwin-panel"
                    style={{
                        ...rise(on, 200, 30),
                        ["--p" as any]: fin ? 1 : 0,
                    }}
                >
                    <div className="rwin-ratio">
                        <p className="rwin-ratio-k" style={M}>
                            <i className="rwin-live" aria-hidden />
                            {rwinFmt(N)} {crowdLabel}
                        </p>
                        <p className="rwin-ratio-n" style={D}>
                            <span className="rwin-ratio-a">{ratioLabel}</span>{" "}
                            <span ref={ratioEl} className="rwin-ratio-v">
                                {rwinFmt(fin ? share : N)}
                            </span>
                        </p>
                        <p className="rwin-ratio-t" style={D}>
                            {ratioTail}
                        </p>
                    </div>
                    <div className="rwin-field">
                        <canvas
                            ref={cv}
                            className="rwin-cv"
                            role="img"
                            aria-label={`A crowd of ${N} people sorts itself: 1 in ${share} are your buyers, gathered into ${CL.map((x) => x.t).join(", ")}`}
                        />
                        {CL.map((cl, q) => (
                            <div
                                key={q}
                                className={`rwin-lab rwin-lab-${q}`}
                                style={{
                                    left: `${anchors[q][0] * 100}%`,
                                    top: `${anchors[q][1] * 100}%`,
                                    ["--q" as any]: q,
                                }}
                            >
                                <b className="rwin-tag" style={M}>
                                    {cl.t}
                                </b>
                                <span className="rwin-cnt" style={M}>
                                    <span
                                        ref={(el) => {
                                            cntRefs.current[q] = el
                                        }}
                                        className="rwin-num"
                                    >
                                        {rwinFmt(fin ? cl.n : 0)}
                                    </span>{" "}
                                    {cl.l}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
const CSS_IN = `
.rwin{background:var(--rw-bone);color:var(--rw-ink);padding:clamp(96px,9vw,150px) 0 clamp(88px,8vw,132px);overflow-x:clip}
.rwin .rw-it{position:relative;color:var(--rw-ink);font-weight:inherit;padding:0 .06em;isolation:isolate}
.rwin .rw-it::before{content:"";position:absolute;z-index:-1;left:0;right:0;top:.12em;bottom:.02em;border-radius:.16em;background:var(--rw-brass);transform:scaleX(0);transform-origin:left;transition:transform .9s cubic-bezier(.7,0,.2,1) var(--pd,.6s)}
.rwin .rw-hd.is-on .rw-it::before{transform:none}
.rwin-top{display:grid;grid-template-columns:minmax(0,7.4fr) minmax(0,4.6fr);gap:clamp(32px,5vw,96px);align-items:end;margin-bottom:clamp(44px,4.6vw,72px)}
.rwin-lead{display:flex;flex-direction:column;align-items:flex-start;gap:26px}
.rwin-side{display:flex;flex-direction:column;align-items:flex-start;gap:24px;padding-bottom:6px}
.rwin-sub{margin:0;font-size:18px;line-height:1.5;color:var(--rw-mut);max-width:460px}
.rwin-facts{display:flex;flex-wrap:wrap;gap:6px 18px;list-style:none;margin:0;padding:18px 0 0;border-top:1px solid var(--rw-fog);width:100%;font-size:11.5px;letter-spacing:.12em;text-transform:uppercase}
.rwin-facts li{display:inline-flex;align-items:center;gap:8px} .rwin-facts li::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--rw-ink);opacity:.35}
/* the crowd panel — an ink screen, the plaza from very high */
.rwin-panel{position:relative;height:clamp(420px,36vw,540px);border-radius:24px;overflow:hidden;background:radial-gradient(120% 90% at 60% 50%,var(--rw-pine),var(--rw-ink) 70%);color:var(--rw-cloud);isolation:isolate}
.rwin-panel::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 10%,transparent);pointer-events:none}
.rwin-field{position:absolute;inset:0} .rwin-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y}
.rwin-ratio{position:absolute;z-index:2;left:clamp(22px,2.6vw,40px);top:clamp(22px,2.6vw,40px);bottom:clamp(22px,2.6vw,40px);width:min(300px,26%);display:flex;flex-direction:column;justify-content:flex-end;gap:6px;pointer-events:none}
.rwin-ratio::before{content:"";position:absolute;z-index:-1;left:calc(clamp(22px,2.6vw,40px)*-1);top:calc(clamp(22px,2.6vw,40px)*-1);bottom:calc(clamp(22px,2.6vw,40px)*-1);width:calc(100% + 140px);background:linear-gradient(90deg,var(--rw-ink) 30%,transparent)}
.rwin-ratio-k{display:flex;align-items:center;gap:9px;margin:0 0 auto;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 70%,transparent)}
.rwin-live{width:7px;height:7px;border-radius:50%;background:var(--rw-brass);animation:rwin-live 1.6s infinite} @keyframes rwin-live{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--rw-brass) 70%,transparent)}100%{box-shadow:0 0 0 10px transparent}}
.rwin-ratio-n{margin:0;display:flex;align-items:baseline;gap:.18em;font-size:clamp(56px,6vw,96px);line-height:.9;letter-spacing:-.05em;font-weight:var(--rw-font-dw,700);white-space:nowrap}
.rwin-ratio-a{font-size:.42em;letter-spacing:-.02em;color:color-mix(in srgb,var(--rw-cloud) 70%,transparent)}
.rwin-ratio-v{color:var(--rw-brass);font-variant-numeric:tabular-nums}
.rwin-ratio-t{margin:0;font-size:clamp(20px,1.8vw,28px);line-height:1.05;letter-spacing:-.03em}
.rwin-lab{position:absolute;z-index:3;display:flex;flex-direction:column;align-items:flex-start;gap:6px;translate:-50% 0;margin-top:clamp(52px,4.6vw,64px);opacity:clamp(0,calc((var(--p) - .45)*3),1);transition:none;pointer-events:none}
.rwin-lab-1{margin-top:0;translate:-50% calc(-100% - clamp(52px,4.6vw,64px))}
.rwin-tag{display:inline-block;padding:5px 10px;border-radius:999px;background:var(--rw-brass);color:var(--rw-ink);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.rwin-cnt{font-size:12px;letter-spacing:.02em;white-space:nowrap;color:color-mix(in srgb,var(--rw-cloud) 82%,transparent)} .rwin-num{color:var(--rw-cloud);font-weight:600;font-variant-numeric:tabular-nums}
/* tablet */
.rwin.is-tab .rwin-top{grid-template-columns:1fr;gap:28px;align-items:start} .rwin.is-tab .rwin-panel{height:440px} .rwin.is-tab .rwin-ratio{width:34%} .rwin.is-tab .rwin-ratio-n{font-size:64px}
/* phone: a taller screen, counter on top, clusters stacked down the left with labels to their right */
.rwin.is-ph{padding:72px 0 72px} .rwin.is-ph .rwin-top{grid-template-columns:1fr;gap:26px;margin-bottom:36px} .rwin.is-ph .rwin-lead{gap:18px} .rwin.is-ph .rwin-sub{font-size:16px} .rwin.is-ph .rwin-facts{gap:8px 14px}
.rwin.is-ph .rwin-panel{height:auto;display:flex;flex-direction:column} .rwin.is-ph .rwin-field{position:relative;inset:auto;height:360px;flex:none}
.rwin.is-ph .rwin-ratio{position:relative;inset:auto;width:auto;padding:22px 20px 4px;gap:4px} .rwin.is-ph .rwin-ratio::before{display:none} .rwin.is-ph .rwin-ratio-k{margin:0 0 10px} .rwin.is-ph .rwin-ratio-n{font-size:58px} .rwin.is-ph .rwin-ratio-t{font-size:22px}
.rwin.is-ph .rwin-lab{translate:0 -50%;margin:0 0 0 54px;width:calc(78% - 64px)} .rwin.is-ph .rwin-cnt{white-space:normal;line-height:1.35}
`
addPropertyControls(RwIntro, {
    ...COLOR_CONTROLS,
    ...FONT_CONTROLS,
    ...BP_CONTROL,
    eyebrow: {
        type: ControlType.String,
        title: "Eyebrow",
        defaultValue: "(01) Why BOS",
    },
    heading: {
        type: ControlType.String,
        title: "Heading",
        description: "| = line break, *words* = lime marker",
        defaultValue: "Everyone is a crowd.|We find *your buyers*.",
    },
    subCopy: {
        type: ControlType.String,
        title: "Sub copy",
        displayTextArea: true,
        defaultValue:
            "Most brands aren't invisible. They're talking to the wrong people. We find the searches, feeds and audiences where your buyers already are — and put you there.",
    },
    button: {
        type: ControlType.String,
        title: "Button",
        defaultValue: "About us",
    },
    buttonLink: {
        type: ControlType.Link,
        title: "Button link",
        defaultValue: "/about",
    },
    facts: {
        type: ControlType.String,
        title: "Facts",
        description: "; list",
        defaultValue: "Founded 2016;38 people;New York + remote",
    },
    clusters: {
        type: ControlType.String,
        title: "Clusters",
        description: "Label|count|text; … (three)",
        displayTextArea: true,
        defaultValue:
            "Search|312|searching “dentist near me”;Feeds|1,204|following #coffee;Audiences|88|lookalikes",
    },
    buyersShare: {
        type: ControlType.Number,
        title: "1 in …",
        description: "How many people per buyer",
        min: 2,
        max: 50,
        step: 1,
        displayStepper: true,
        defaultValue: 12,
    },
    ratioLabel: {
        type: ControlType.String,
        title: "Counter prefix",
        defaultValue: "1 in",
    },
    ratioTail: {
        type: ControlType.String,
        title: "Counter line",
        defaultValue: "is your buyer",
    },
    crowdLabel: {
        type: ControlType.String,
        title: "Crowd label",
        defaultValue: "people in the crowd",
    },
})
