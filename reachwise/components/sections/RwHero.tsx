"use client"
import { useEffect, useRef, useState, type CSSProperties } from "react"
import { addPropertyControls, ControlType } from "@/lib/controls"
import {
    type Pal,
    MAXW,
    srcOf,
    colorsOf,
    fontsOf,
    useFonts,
    useLive,
    useReduced,
    useStill,
    useSite,
    useSize,
    useStage,
    useMagnet,
    pick,
    cssRgb,
    clamp01,
    onTick,
    linkList,
    splitWords,
    plainOf,
    rise,
    cssVars,
    siteFontCss,
    Btn,
    COLOR_CONTROLS,
    FONT_CONTROLS,
    BP_CONTROL,
} from "@/lib/rw"

// ===== RwHero =====
const IMG: Record<string, string> = {}
interface HeroProps extends Pal {
    customFonts: boolean
    displayFont: any
    bodyFont: any
    monoFont: any
    bpHint: string
    photo: any
    focusX: number
    focusY: number
    eyebrow: string
    heading: string
    subCopy: string
    primary: string
    primaryLink: string
    secondary: string
    secondaryLink: string
    chips: string
    services: string
    counterLabel: string
    counterStart: number
    hint: string
    showNav: boolean
    navLinks: string
    navCta: string
    style?: CSSProperties
}
// ---- THE REACH: a crowd seen from above, full-bleed. The visitor's pointer is the signal: rings pulse out of it every ~1.4 s and wherever a ring
// passes, the grey crowd blooms into colour (WebGL). People the ring crosses light up with a notification (likes, followers, a review, a #1 ranking),
// and the REACH counter climbs. A click launches a campaign: one big ring, longer colour, a bigger jump. No pointer (phones, idle) → a signal wanders the plaza. ----
const PHOTO =
    "/images/0OweuTthx3Dz38pzze75lZw78M.webp"
const IMG_AR = 2400 / 1340
// people in the photo (0..1 image coords) — the spots a ring can "reach"
const SPOTS: [number, number][] = [
    [0.31, 0.12],
    [0.275, 0.21],
    [0.41, 0.17],
    [0.47, 0.29],
    [0.54, 0.3],
    [0.62, 0.27],
    [0.75, 0.18],
    [0.905, 0.08],
    [0.935, 0.19],
    [0.295, 0.37],
    [0.255, 0.39],
    [0.465, 0.39],
    [0.625, 0.39],
    [0.72, 0.47],
    [0.805, 0.43],
    [0.93, 0.4],
    [0.07, 0.58],
    [0.235, 0.53],
    [0.56, 0.56],
    [0.95, 0.55],
    [0.315, 0.65],
    [0.535, 0.71],
    [0.61, 0.73],
    [0.705, 0.75],
    [0.89, 0.74],
    [0.185, 0.7],
    [0.35, 0.8],
    [0.455, 0.91],
    [0.635, 0.94],
    [0.095, 0.87],
    [0.94, 0.89],
    [0.4, 0.87],
]
const Mark = ({ s = 30 }: { s?: number }) => (
    <svg
        width={s}
        height={s}
        viewBox="0 0 32 32"
        aria-hidden
        className="rwh-mark"
    >
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
// rolling digits: every digit is a 0–9 column that slides to its value (keyed from the right so a new leading digit doesn't re-roll the rest)
const Roll = ({ text, className }: { text: string; className?: string }) => {
    const a = String(text).split("")
    return (
        <span
            className={`rwh-roll${className ? " " + className : ""}`}
            aria-label={text}
        >
            {a.map((ch, i) =>
                /\d/.test(ch) ? (
                    <span key={a.length - i} className="rwh-rd" aria-hidden>
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
type Chip = { id: number; x: number; y: number; k: number; up: boolean }
const bigUrl = (u: string, w: number) => {
    const b = String(u || "").split("?")[0]
    if (/framerusercontent\.com\/images\//.test(b))
        return `${b}?scale-down-to=${w > 1200 ? 2048 : 1024}`
    if (/images\.unsplash\.com\//.test(b))
        return `${b}?w=${w}&q=74&fm=jpg&auto=format`
    return b
}
const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"
const FS = `precision mediump float;
uniform sampler2D uTex;uniform vec2 uView;uniform float uImg;uniform float uZoom;uniform vec2 uFoc;uniform float uTime;uniform vec3 uLime;uniform vec4 uP[8];uniform vec3 uPtr;uniform float uDiag;uniform float uDim;uniform vec3 uNight;
vec2 cover(vec2 s){float ra=uView.x/uView.y;vec2 uv=s;if(ra>uImg){uv.y=(s.y-.5)*uImg/ra+.5;}else{uv.x=(s.x-.5)*ra/uImg+.5;}return (uv-.5)/uZoom+.5+uFoc;}
void main(){vec2 fc=vec2(gl_FragCoord.x,uView.y-gl_FragCoord.y);vec2 s=fc/uView;vec3 col=texture2D(uTex,clamp(cover(s),.001,.999)).rgb;
float l=dot(col,vec3(.299,.587,.114));vec3 grey=mix(vec3(l)*vec3(.9,.94,1.),uNight*.78,uDim);
float reach=0.;float rim=0.;
for(int i=0;i<8;i++){vec4 P=uP[i];if(P.w<=0.)continue;float age=uTime-P.z;if(age<0.)continue;float R=age*uDiag*(.2+.07*P.w);float d=distance(fc,P.xy);float life=2.4+2.6*P.w;float fade=1.-smoothstep(life*.4,life,age);float band=uDiag*(.008+.006*P.w);
rim+=exp(-pow((d-R)/band,2.))*(1.-smoothstep(0.,life*.75,age));reach=max(reach,(1.-smoothstep(R-band*5.,R+band,d))*fade);}
float sp=(1.-smoothstep(uDiag*.035,uDiag*.12,distance(fc,uPtr.xy)))*uPtr.z;reach=max(reach,sp*.85);
vec3 c=mix(grey,col*mix(1.,.86,uDim),reach);c=mix(c,uLime,clamp(rim,0.,1.)*.62);
float vg=smoothstep(.45,1.,s.y)*.55+(1.-smoothstep(0.,.2,s.y))*.28;c=mix(c,uNight*.7,vg);
gl_FragColor=vec4(c,1.);}`
export default function RwHero(props: HeroProps) {
    const {
        photo,
        focusX = 50,
        focusY = 50,
        eyebrow = "",
        heading = "Get seen by|the *right crowd.*",
        subCopy = "",
        primary = "Book a strategy call",
        primaryLink = "",
        secondary = "See our work",
        secondaryLink = "/work",
        chips = "❤|1.2k likes on one reel;+|86 new followers;★|New 5-star review;#1|“dentist near me”;●|12 leads today;↗|CTR up to 4.8%;✓|Call booked · Tue 10:30;◎|+318 profile visits;▶|48k video views;$|ROAS 6.2×",
        services = "Social media, Paid ads, Content, Web design",
        counterLabel = "People reached for clients this month",
        counterStart = 1284300,
        hint = "Move to reach · click to launch a campaign",
        showNav = true,
        navLinks = "Services:/services, Work:/work, Pricing:/pricing, About:/about, Blog:/blog",
        navCta = "Book a call",
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
    const cv = useRef<HTMLCanvasElement>(null)
    const curEl = useRef<HTMLDivElement>(null)
    const copyEl = useRef<HTMLDivElement>(null)
    const { w, vh } = useSize(root, bpHint)
    const ready = useStage(live)
    const [inn0, setIn] = useState(false)
    useEffect(() => {
        if (!live || !ready) return
        const t = window.setTimeout(() => setIn(true), 80)
        return () => window.clearTimeout(t)
    }, [live, ready])
    const inn = inn0 || still || rm
    useMagnet(root, live)
    const phone = w < 810,
        tab = w >= 810 && w < 1100
    const src = srcOf(photo, IMG.hero || PHOTO)
    const CH = String(chips)
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => {
            const i = x.indexOf("|")
            return i < 0
                ? { i: "●", t: x }
                : { i: x.slice(0, i).trim(), t: x.slice(i + 1).trim() }
        })
    const SV = String(services)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    const sub = pick(
        subCopy,
        site.tagline
            ? `${site.name} is a digital marketing agency. We run social media, paid ads and content that put your brand in front of the people who buy, and we report every result in plain numbers.`
            : ""
    )
    const ann = pick(eyebrow, site.announce)
    const book = pick(primaryLink, site.book || "/contact")
    const [reach, setReach] = useState(Math.max(0, Math.round(counterStart)))
    useEffect(() => {
        setReach(Math.max(0, Math.round(counterStart)))
    }, [counterStart])
    const [chipList, setChips] = useState<Chip[]>([])
    const cid = useRef(0)
    const acc = useRef(0)
    useEffect(() => {
        if (!live) return
        const id = window.setInterval(() => {
            if (acc.current > 0) {
                const v = acc.current
                acc.current = 0
                setReach((x) => x + v)
            }
        }, 1400)
        return () => window.clearInterval(id)
    }, [live])
    const [gl, setGl] = useState(false)
    const [hasCur, setHasCur] = useState(false)
    // ---- the signal engine: WebGL crowd + pulses + reach detection ----
    useEffect(() => {
        if (!live || !root.current || !cv.current) return
        const r = root.current,
            canvas = cv.current
        const g0 = canvas.getContext("webgl", {
            antialias: false,
            alpha: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
        }) as WebGLRenderingContext | null
        if (!g0) return
        const g: WebGLRenderingContext = g0
        const sh = (t: number, s: string) => {
            const o = g.createShader(t)!
            g.shaderSource(o, s)
            g.compileShader(o)
            return o
        }
        const pr = g.createProgram()!
        g.attachShader(pr, sh(g.VERTEX_SHADER, VS))
        g.attachShader(pr, sh(g.FRAGMENT_SHADER, FS))
        g.linkProgram(pr)
        if (!g.getProgramParameter(pr, g.LINK_STATUS)) return
        g.useProgram(pr)
        const buf = g.createBuffer()
        g.bindBuffer(g.ARRAY_BUFFER, buf)
        g.bufferData(
            g.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            g.STATIC_DRAW
        )
        const loc = g.getAttribLocation(pr, "p")
        g.enableVertexAttribArray(loc)
        g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0)
        const U = (n: string) => g.getUniformLocation(pr, n)
        const uView = U("uView"),
            uImg = U("uImg"),
            uZoom = U("uZoom"),
            uFoc = U("uFoc"),
            uTime = U("uTime"),
            uLime = U("uLime"),
            uP = U("uP"),
            uPtr = U("uPtr"),
            uDiag = U("uDiag"),
            uDim = U("uDim"),
            uNight = U("uNight")
        const lime = cssRgb(r, c.brass, "247,200,211")
            .split(",")
            .map((v) => Number(v) / 255)
        g.uniform3f(uLime, lime[0], lime[1], lime[2])
        // the crowd dims toward the night token, not black, so the hero sits in the palette
        const night = cssRgb(r, c.night, "45,58,71")
            .split(",")
            .map((v) => Number(v) / 255)
        g.uniform3f(uNight, night[0], night[1], night[2])
        const tex = g.createTexture()
        let imgAr = IMG_AR,
            texOk = false
        const im = new Image()
        im.crossOrigin = "anonymous"
        im.decoding = "async"
        im.onload = () => {
            try {
                g.bindTexture(g.TEXTURE_2D, tex)
                g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR)
                g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR)
                g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE)
                g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE)
                g.texImage2D(g.TEXTURE_2D, 0, g.RGB, g.RGB, g.UNSIGNED_BYTE, im)
                imgAr = im.naturalWidth / im.naturalHeight
                texOk = true
                setGl(true)
            } catch (e) {}
        }
        im.src = bigUrl(src, window.innerWidth < 810 ? 1200 : 2000)
        let W = 1,
            H = 1,
            dpr = 1,
            diag = 1,
            vis = true,
            t0 = performance.now(),
            raf = 0,
            zoom = rm ? 1 : 1.12,
            sy = 0
        const size = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 1.6)
            const a = r.getBoundingClientRect()
            W = Math.max(1, a.width)
            H = Math.max(1, a.height)
            canvas.width = Math.round(W * dpr)
            canvas.height = Math.round(H * dpr)
            g.viewport(0, 0, canvas.width, canvas.height)
            diag = Math.hypot(W, H)
        }
        size()
        const ro = new ResizeObserver(size)
        ro.observe(r)
        // pulses: [x, y, t, strength] in css px, seconds
        const P: number[][] = []
        const now = () => (performance.now() - t0) / 1000
        const emit = (x: number, y: number, s: number) => {
            P.push([x, y, now(), s])
            if (P.length > 8) P.shift()
            acc.current += Math.round(s * (120 + Math.random() * 380))
        }
        // spots on screen (same cover mapping as the shader) + cooldown
        const cool = SPOTS.map(() => -99)
        const spotXY = (hx: number, hy: number, fx: number, fy: number) => {
            const ra = W / H
            let ux = (hx - fx - 0.5) * zoom + 0.5,
                uy = (hy - fy - 0.5) * zoom + 0.5
            if (ra > imgAr) uy = ((uy - 0.5) * ra) / imgAr + 0.5
            else ux = ((ux - 0.5) * imgAr) / ra + 0.5
            return [ux * W, uy * H]
        }
        let k = Math.floor(Math.random() * 10)
        const reachSpots = (tn: number) => {
            const fx = ((focusX - 50) / 100) * 0.3,
                fy = ((focusY - 50) / 100) * 0.3
            const cr = copyEl.current?.getBoundingClientRect(),
                rr = r.getBoundingClientRect()
            for (const p of P) {
                const age = tn - p[2]
                if (age < 0) continue
                const R = age * diag * (0.2 + 0.07 * p[3])
                if (R > diag) continue
                SPOTS.forEach(([hx, hy], i) => {
                    if (tn - cool[i] < 7) return
                    const [sx, sy2] = spotXY(hx, hy, fx, fy)
                    if (sx < 90 || sx > W - 110 || sy2 < 190 || sy2 > H - 190)
                        return
                    if (
                        cr &&
                        sx + rr.left > cr.left - 40 &&
                        sx + rr.left < cr.right + 40 &&
                        sy2 + rr.top > cr.top - 30 &&
                        sy2 + rr.top < cr.bottom + 20
                    )
                        return
                    const d = Math.hypot(sx - p[0], sy2 - p[1])
                    if (Math.abs(d - R) > 14) return
                    cool[i] = tn
                    const id = ++cid.current
                    const kk = k++ % Math.max(1, CH.length)
                    setChips((l) => [
                        ...l.filter((x) => x.up).slice(-3),
                        {
                            id,
                            x: Math.round(sx),
                            y: Math.round(sy2),
                            k: kk,
                            up: true,
                        },
                    ])
                    acc.current += 40 + Math.round(Math.random() * 260)
                    window.setTimeout(
                        () =>
                            setChips((l) =>
                                l.map((x) =>
                                    x.id === id ? { ...x, up: false } : x
                                )
                            ),
                        2600
                    )
                    window.setTimeout(
                        () => setChips((l) => l.filter((x) => x.id !== id)),
                        3200
                    )
                })
            }
        }
        // pointer = the signal source; idle / touch = a wandering source
        const fine = window.matchMedia(
            "(hover:hover) and (pointer:fine)"
        ).matches
        let px = W / 2,
            py = H * 0.55,
            tx = px,
            ty = py,
            on = 0,
            onT = 0,
            lastMove = -99,
            lastEmit = -99
        const mv = (e: PointerEvent) => {
            const a = r.getBoundingClientRect()
            tx = e.clientX - a.left
            ty = e.clientY - a.top
            onT = 1
            lastMove = now()
        }
        const lv = () => {
            onT = 0
        }
        const dn = (e: PointerEvent) => {
            const t = e.target as HTMLElement
            if (t.closest?.("a,button,input,nav")) return
            const a = r.getBoundingClientRect()
            const x = e.clientX - a.left,
                y = e.clientY - a.top
            if (!fine) {
                tx = px = x
                ty = py = y
                lastMove = now()
            }
            emit(x, y, 1.6)
            lastEmit = now()
        }
        if (fine) {
            r.addEventListener("pointermove", mv as any)
            r.addEventListener("pointerleave", lv)
        }
        r.addEventListener("pointerdown", dn as any)
        const io = new IntersectionObserver((es) => {
            vis = es[0].isIntersecting
            if (vis && !raf) raf = requestAnimationFrame(frame)
        })
        io.observe(r)
        const PU = new Float32Array(32)
        const intro = rm ? 0 : 1.6
        function frame() {
            raf = 0
            if (!vis || document.hidden) return
            const tn = now()
            const a = r.getBoundingClientRect()
            sy = clamp01(-a.top / (a.height || 1))
            zoom = rm
                ? 1 + sy * 0.08
                : 1 + 0.12 * Math.pow(1 - clamp01(tn / 2.2), 3) + sy * 0.08
            const idle = !fine || tn - lastMove > 2.6 || onT === 0
            if (idle) {
                const q = tn * 0.23
                tx = W * (0.5 + 0.34 * Math.sin(q * 1.3))
                ty = H * (0.5 + 0.28 * Math.sin(q * 0.9 + 1.2))
            }
            px += (tx - px) * (idle ? 0.03 : 0.16)
            py += (ty - py) * (idle ? 0.03 : 0.16)
            on += ((fine && !idle ? 1 : 0) - on) * 0.08
            if (!rm && tn > intro) {
                if (tn - lastEmit > (idle ? 1.9 : 1.35)) {
                    emit(px, py, idle ? 0.7 : 0.9)
                    lastEmit = tn
                }
            }
            if (tn > intro - 0.2 && P.length === 0 && !rm) {
                emit(W / 2, H * 0.55, 1.4)
                lastEmit = tn
            }
            for (let i = 0; i < 8; i++) {
                const p = P[i]
                PU[i * 4] = p ? p[0] * dpr : 0
                PU[i * 4 + 1] = p ? p[1] * dpr : 0
                PU[i * 4 + 2] = p ? p[2] : 0
                PU[i * 4 + 3] = p ? p[3] : 0
            }
            if (texOk) {
                const fx = ((focusX - 50) / 100) * 0.3,
                    fy = ((focusY - 50) / 100) * 0.3
                g.uniform2f(uView, canvas.width, canvas.height)
                g.uniform1f(uImg, imgAr)
                g.uniform1f(uZoom, zoom)
                g.uniform2f(uFoc, fx, fy)
                g.uniform1f(uTime, tn)
                g.uniform4fv(uP, PU)
                g.uniform3f(uPtr, px * dpr, py * dpr, on)
                g.uniform1f(uDiag, diag * dpr)
                g.uniform1f(uDim, 0.42)
                g.drawArrays(g.TRIANGLE_STRIP, 0, 4)
            }
            reachSpots(tn)
            r.style.setProperty("--sy", sy.toFixed(4))
            raf = requestAnimationFrame(frame)
        }
        const vc = () => {
            if (!document.hidden && vis && !raf)
                raf = requestAnimationFrame(frame)
        }
        document.addEventListener("visibilitychange", vc)
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            raf = -1 as any
            ro.disconnect()
            io.disconnect()
            document.removeEventListener("visibilitychange", vc)
            r.removeEventListener("pointermove", mv as any)
            r.removeEventListener("pointerleave", lv)
            r.removeEventListener("pointerdown", dn as any)
            try {
                g.getExtension("WEBGL_lose_context")?.loseContext()
            } catch (e) {}
        }
    }, [live, rm, src, focusX, focusY, chips])
    // cursor: a dot + a ring labelled REACH that pings on click, hugs buttons
    useEffect(() => {
        if (
            !live ||
            phone ||
            !root.current ||
            !window.matchMedia("(hover:hover) and (pointer:fine)").matches
        )
            return
        const r = root.current
        setHasCur(true)
        let x = -99,
            y = -99,
            ax = -99,
            ay = -99,
            mode = "",
            on = false
        const set = (m: string) => {
            if (m !== mode) {
                mode = m
                if (curEl.current) curEl.current.dataset.m = m
            }
        }
        const mv = (e: PointerEvent) => {
            x = e.clientX
            y = e.clientY
            on = true
            const tg = e.target as HTMLElement
            set(
                tg.closest?.(".rw-btn, nav a, .rwh-tags a")
                    ? "btn"
                    : tg.closest?.(".rwh-copy h1, .rwh-copy p")
                      ? "dot"
                      : "reach"
            )
        }
        const lv = () => {
            on = false
            set("out")
        }
        const dn = () => {
            const cu = curEl.current
            if (!cu || mode === "btn") return
            cu.classList.remove("is-ping")
            void cu.offsetWidth
            cu.classList.add("is-ping")
        }
        r.addEventListener("pointermove", mv as any)
        r.addEventListener("pointerleave", lv)
        r.addEventListener("pointerdown", dn)
        const off = onTick(() => {
            const cu = curEl.current
            if (!cu || (!on && ax < -50)) return
            ax += (x - ax) * 0.28
            ay += (y - ay) * 0.28
            cu.style.transform = `translate3d(${ax.toFixed(1)}px,${ay.toFixed(1)}px,0)`
        })
        return () => {
            off()
            r.removeEventListener("pointermove", mv as any)
            r.removeEventListener("pointerleave", lv)
            r.removeEventListener("pointerdown", dn)
        }
    }, [live, phone])
    const H = phone ? 0 : Math.round(Math.min(Math.max(vh, 720), 1080))
    const links = linkList(navLinks)
    // reduced motion: a still frame with three reached people
    const stillChips: Chip[] = [
        { id: -1, x: 0, y: 0, k: 0, up: true },
        { id: -2, x: 0, y: 0, k: 2, up: true },
        { id: -3, x: 0, y: 0, k: 3, up: true },
    ]
    const showChips = still || (rm && !gl) ? stillChips : chipList
    return (
        <section
            ref={root as any}
            className={`rw rw-dark rwh${phone ? " is-ph" : tab ? " is-tab" : ""}${inn ? " is-in" : ""}${still ? " is-still" : ""}${rm ? " is-rm" : ""}${gl ? " is-gl" : ""}${hasCur ? " has-cur" : ""}`}
            style={{
                ...cssVars(c),
                ...B,
                ["--hh" as any]: H ? `${H}px` : "auto",
                ...(props.style || {}),
            }}
        >
            <style
                dangerouslySetInnerHTML={{
                    __html: CSS_HERO + siteFontCss(props),
                }}
            />
            <div className="rwh-bg" aria-hidden>
                <img
                    className="rwh-img"
                    src={bigUrl(src, phone ? 1200 : 2000)}
                    srcSet={
                        /unsplash/.test(src)
                            ? `${bigUrl(src, 1000)} 1000w, ${bigUrl(src, 1600)} 1600w, ${bigUrl(src, 2200)} 2200w`
                            : undefined
                    }
                    sizes="100vw"
                    alt=""
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    style={{ objectPosition: `${focusX}% ${focusY}%` }}
                />
                <canvas ref={cv} className="rwh-cv" />
                {(still || (rm && !gl)) && <i className="rwh-stillring" />}
                <i className="rwh-shade" />
            </div>
            <div className="rwh-chips" aria-hidden>
                {showChips.map((ch) => {
                    const it = CH[ch.k % Math.max(1, CH.length)] || {
                        i: "●",
                        t: "",
                    }
                    return (
                        <span
                            key={ch.id}
                            className={`rwh-chip${ch.up ? " is-up" : ""}`}
                            style={
                                ch.id < 0
                                    ? undefined
                                    : { left: ch.x, top: ch.y }
                            }
                            data-s={ch.id < 0 ? String(-ch.id) : undefined}
                        >
                            <i className="rwh-chip-p" />
                            <b className="rwh-chip-i" style={D}>
                                {it.i}
                            </b>
                            <span style={M}>{it.t}</span>
                        </span>
                    )
                })}
            </div>
            {showNav && (
                <nav
                    className="rwh-nav"
                    aria-label="Main"
                    style={rise(inn, 60, -10)}
                >
                    <a
                        className="rwh-logo"
                        href="/"
                        aria-label={`${site.name} home`}
                    >
                        <Mark />
                        <span style={D}>{site.name}</span>
                    </a>
                    <ul className="rwh-links">
                        {links.map((l, i) => (
                            <li key={i}>
                                <a href={l.h}>{l.l}</a>
                            </li>
                        ))}
                    </ul>
                    <Btn
                        href={book}
                        label={navCta}
                        kind="quiet"
                        className="rwh-navcta"
                        icon="cal"
                    />
                </nav>
            )}
            {!phone && hint && (
                <p className="rwh-hint" style={{ ...M, ...rise(inn, 900, 8) }}>
                    <i className="rwh-hint-r" aria-hidden />
                    {hint}
                </p>
            )}
            <div className="rwh-in">
                <div ref={copyEl} className="rwh-copy">
                    {ann && (
                        <p
                            className="rwh-ann"
                            style={{ ...M, ...rise(inn, 180, 12) }}
                        >
                            <i className="rw-port" aria-hidden />
                            {ann}
                        </p>
                    )}
                    <h1
                        className="rwh-h1"
                        style={D}
                        aria-label={plainOf(heading)}
                    >
                        {String(heading)
                            .split("|")
                            .map((line, li) => {
                                let k = li * 4
                                return (
                                    <span
                                        key={li}
                                        className="rwh-line"
                                        aria-hidden
                                    >
                                        {splitWords(line)
                                            .map((wd, i) => (
                                                <span key={i} className="rwh-w">
                                                    <span
                                                        className={`rwh-wi${wd.acc ? " is-acc" : ""}`}
                                                        style={{
                                                            transitionDelay: `${260 + k++ * 70}ms`,
                                                        }}
                                                    >
                                                        {wd.t}
                                                        {wd.tail}
                                                    </span>
                                                </span>
                                            ))
                                            .reduce(
                                                (acc: any[], el, i) =>
                                                    i
                                                        ? [...acc, " ", el]
                                                        : [el],
                                                []
                                            )}
                                    </span>
                                )
                            })}
                    </h1>
                    {sub && (
                        <p className="rwh-sub" style={rise(inn, 640, 16)}>
                            {sub}
                        </p>
                    )}
                    <div className="rwh-btns" style={rise(inn, 760, 16)}>
                        <Btn
                            href={book}
                            label={primary}
                            kind="solid"
                            icon="cal"
                        />
                        <Btn
                            href={secondaryLink || "/work"}
                            label={secondary}
                            kind="ghost"
                        />
                    </div>
                </div>
            </div>
            <div className="rwh-strip" style={rise(inn, 900, 14)}>
                <div className="rwh-count">
                    <p className="rwh-count-l" style={M}>
                        <i className="rwh-live" aria-hidden />
                        {counterLabel}
                    </p>
                    <p className="rwh-count-n" style={D}>
                        <Roll text={reach.toLocaleString("en-US")} />
                    </p>
                </div>
                <ul className="rwh-tags" style={M}>
                    {SV.map((s, i) => (
                        <li key={i}>
                            <span>{String(i + 1).padStart(2, "0")}</span>
                            {s}
                        </li>
                    ))}
                </ul>
                <p className="rwh-proof" style={M}>
                    <span className="rwh-stars" aria-hidden>
                        ★★★★★
                    </span>
                    <span>
                        <b>{site.rating}</b>
                        {site.reviews
                            ? ` · ${site.reviews} client reviews`
                            : ""}
                    </span>
                    {site.clients && (
                        <span className="rwh-dim">
                            {site.clients} brands grown
                        </span>
                    )}
                </p>
            </div>
            {hasCur && (
                <div ref={curEl} className="rwh-cur" data-m="out" aria-hidden>
                    <i className="rwh-cur-r">
                        <b style={M}>Reach</b>
                    </i>
                    <i className="rwh-cur-d" />
                </div>
            )}
        </section>
    )
}
const CSS_HERO = `
.rwh{position:relative;width:100%;height:var(--hh,100svh);min-height:640px;overflow:hidden;background:var(--rw-night);color:var(--rw-cloud);isolation:isolate}
.rwh.has-cur,.rwh.has-cur *{cursor:none!important}
.rwh-bg{position:absolute;inset:0;z-index:0;overflow:hidden;translate:0 calc(var(--sy,0)*14%)}
.rwh-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:grayscale(1) brightness(.62) contrast(1.05);transform:scale(1.12);transition:transform 2.2s cubic-bezier(.2,.8,.2,1),opacity .6s}
.rwh.is-in .rwh-img{transform:scale(1)} .rwh.is-gl .rwh-img{opacity:0}
.rwh-cv{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .8s} .rwh.is-gl .rwh-cv{opacity:1}
.rwh-shade{position:absolute;inset:0;pointer-events:none;background:radial-gradient(60% 46% at 50% 50%,color-mix(in srgb,var(--rw-night) 52%,transparent),transparent 72%),linear-gradient(180deg,color-mix(in srgb,var(--rw-night) 55%,transparent) 0,transparent 18%)}
.rwh-stillring{position:absolute;left:62%;top:44%;width:520px;height:520px;translate:-50% -50%;border-radius:50%;box-shadow:0 0 0 2px var(--rw-brass),0 0 60px 6px color-mix(in srgb,var(--rw-brass) 40%,transparent);backdrop-filter:grayscale(0) saturate(1.6) brightness(1.5);-webkit-backdrop-filter:saturate(1.6) brightness(1.5)}
/* nav */
.rwh-nav{position:absolute;z-index:5;left:0;right:0;top:0;display:flex;align-items:center;gap:28px;max-width:${MAXW};margin:0 auto;padding:22px clamp(20px,3.2vw,48px) 0}
.rwh-logo{display:inline-flex;align-items:center;gap:10px;text-decoration:none;font-size:21px;letter-spacing:-.03em;font-weight:700}
.rwh-links{display:flex;gap:4px;list-style:none;margin:0 auto;padding:5px;border-radius:999px;background:color-mix(in srgb,var(--rw-night) 38%,transparent);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 14%,transparent)}
.rwh-links a{display:block;padding:9px 16px;border-radius:999px;font-size:14px;text-decoration:none;color:color-mix(in srgb,var(--rw-cloud) 86%,transparent);transition:background .3s,color .3s} .rwh-links a:hover{background:var(--rw-cloud);color:var(--rw-ink)}
.rwh-navcta{--ring:var(--rw-night)}
.rwh-hint{position:absolute;z-index:4;right:clamp(20px,3.2vw,48px);top:96px;display:flex;align-items:center;gap:10px;margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 70%,transparent)}
.rwh-hint-r{position:relative;width:14px;height:14px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--rw-brass)} .rwh-hint-r::after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 1.5px var(--rw-brass);animation:rwh-ping 1.8s cubic-bezier(.2,.6,.3,1) infinite}
@keyframes rwh-ping{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(2.8)}}
/* copy, centred */
.rwh-in{position:absolute;z-index:3;inset:0;display:grid;place-items:center;padding:110px clamp(20px,3.2vw,48px) 180px;pointer-events:none}
.rwh-copy{display:flex;flex-direction:column;align-items:center;text-align:center;gap:24px;max-width:1100px;pointer-events:auto}
.rwh-ann{display:inline-flex;align-items:center;gap:10px;margin:0;padding:8px 14px 8px 12px;border-radius:999px;font-size:12px;letter-spacing:.04em;background:color-mix(in srgb,var(--rw-night) 45%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 16%,transparent)}
.rwh-h1{margin:0;font-size:clamp(64px,8.4vw,142px);line-height:.9;letter-spacing:-.055em;font-weight:var(--rw-font-dw,700);text-wrap:balance;text-shadow:0 2px 40px color-mix(in srgb,var(--rw-night) 45%,transparent)}
.rwh-line{display:block}
.rwh-w{display:inline-block;overflow:hidden;padding:0 .02em .1em;margin-bottom:-.1em;vertical-align:top}
.rwh-wi{display:inline-block;transform:translateY(105%);transition:transform 1.1s cubic-bezier(.2,.8,.2,1)} .rwh.is-in .rwh-wi{transform:none}
.rwh-wi.is-acc{position:relative;color:var(--rw-ink);padding:0 .08em;margin:0 -.04em;isolation:isolate;text-shadow:none}
.rwh-wi.is-acc::before{content:"";position:absolute;z-index:-1;left:0;right:0;top:.12em;bottom:.02em;border-radius:.16em;background:var(--rw-brass);transform:scaleX(0);transform-origin:left;transition:transform .9s cubic-bezier(.7,0,.2,1) .95s} .rwh.is-in .rwh-wi.is-acc::before{transform:none}
.rwh-sub{margin:0;max-width:600px;font-size:18px;line-height:1.5;color:color-mix(in srgb,var(--rw-cloud) 86%,transparent);text-shadow:0 1px 18px color-mix(in srgb,var(--rw-night) 70%,transparent)}
.rwh-btns{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:6px} .rwh-btns .rw-btn{--ring:var(--rw-night)}
/* chips */
.rwh-chips{position:absolute;inset:0;z-index:2;pointer-events:none}
.rwh-chip{position:absolute;display:inline-flex;align-items:center;gap:9px;padding:7px 13px 7px 7px;border-radius:999px;background:var(--rw-cloud);color:var(--rw-ink);font-size:12px;white-space:nowrap;box-shadow:0 14px 34px -12px rgba(0,0,0,.6);translate:-50% calc(-100% - 18px);transform-origin:50% 100%;scale:.4;opacity:0;transition:scale .5s cubic-bezier(.34,1.56,.64,1),opacity .35s,translate .6s cubic-bezier(.2,.8,.2,1)}
.rwh-chip.is-up{scale:1;opacity:1} .rwh-chip:not(.is-up){translate:-50% calc(-100% - 40px)}
.rwh-chip::after{content:"";position:absolute;left:50%;bottom:-16px;width:1.5px;height:14px;background:var(--rw-cloud);translate:-50% 0;opacity:.8}
.rwh-chip-i{display:grid;place-items:center;min-width:26px;height:26px;padding:0 6px;border-radius:999px;background:var(--rw-brass);color:var(--rw-ink);font-size:12px;font-weight:700}
.rwh-chip-p{position:absolute;right:-3px;top:-3px;width:10px;height:10px;border-radius:50%;background:#B46A72;box-shadow:0 0 0 2px var(--rw-cloud)}
.rwh-chip[data-s="1"]{left:22%;top:34%} .rwh-chip[data-s="2"]{left:77%;top:30%} .rwh-chip[data-s="3"]{left:70%;top:72%}
/* bottom strip */
.rwh-strip{position:absolute;z-index:4;left:0;right:0;bottom:0;display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:24px;max-width:${MAXW};margin:0 auto;padding:0 clamp(20px,3.2vw,48px) 36px}
.rwh-count-l{display:flex;align-items:center;gap:8px;margin:0 0 6px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb,var(--rw-cloud) 72%,transparent)}
.rwh-live{width:7px;height:7px;border-radius:50%;background:var(--rw-brass);box-shadow:0 0 0 0 var(--rw-brass);animation:rwh-live 1.6s infinite} @keyframes rwh-live{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--rw-brass) 70%,transparent)}100%{box-shadow:0 0 0 10px transparent}}
.rwh-count-n{margin:0;font-size:clamp(34px,3.2vw,52px);line-height:1;letter-spacing:-.04em;font-weight:var(--rw-font-dw,700);font-variant-numeric:tabular-nums}
.rwh-roll{display:inline-flex} .rwh-rd{display:inline-block;height:1em;overflow:hidden;clip-path:inset(0);line-height:1;vertical-align:top} .rwh-rd>span{display:flex;flex-direction:column;transition:transform .7s cubic-bezier(.2,.8,.2,1)} .rwh-rd i{display:block;height:1em;font-style:normal}
.rwh-tags{display:flex;gap:6px;list-style:none;margin:0;padding:0;font-size:12px} .rwh-tags li{display:inline-flex;align-items:center;gap:8px;padding:8px 13px;border-radius:999px;background:color-mix(in srgb,var(--rw-night) 45%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rw-cloud) 16%,transparent)} .rwh-tags li span{color:var(--rw-brass)}
.rwh-proof{display:flex;flex-direction:column;align-items:flex-end;gap:4px;margin:0;font-size:12px;letter-spacing:.02em;text-align:right} .rwh-stars{color:var(--rw-brass);letter-spacing:.14em} .rwh-proof b{font-weight:600} .rwh-dim{color:color-mix(in srgb,var(--rw-cloud) 66%,transparent)}
/* cursor */
.rwh-cur{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;will-change:transform} .rwh-cur-d,.rwh-cur-r{position:absolute;left:0;top:0;translate:-50% -50%;border-radius:50%}
.rwh-cur-d{width:8px;height:8px;background:var(--rw-brass);transition:scale .3s,opacity .3s}
.rwh-cur-r{display:grid;place-items:center;width:74px;height:74px;box-shadow:inset 0 0 0 1.5px var(--rw-brass);transition:width .45s cubic-bezier(.34,1.56,.64,1),height .45s cubic-bezier(.34,1.56,.64,1),background .3s,box-shadow .3s} .rwh-cur-r b{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--rw-brass);font-weight:500;translate:0 22px;transition:opacity .25s}
.rwh-cur[data-m="out"]{opacity:0} .rwh-cur[data-m="dot"] .rwh-cur-r{width:28px;height:28px;box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--rw-cloud) 60%,transparent)} .rwh-cur[data-m="dot"] .rwh-cur-r b{opacity:0}
.rwh-cur[data-m="btn"] .rwh-cur-r{width:10px;height:10px;background:var(--rw-brass);box-shadow:none} .rwh-cur[data-m="btn"] .rwh-cur-r b{opacity:0} .rwh-cur[data-m="btn"] .rwh-cur-d{opacity:0}
.rwh-cur.is-ping .rwh-cur-r::after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 2px var(--rw-brass);animation:rwh-ping .9s cubic-bezier(.2,.6,.3,1)}
/* tablet */
.rwh.is-tab .rwh-links{display:none} .rwh.is-tab .rwh-navcta{margin-left:auto} .rwh.is-tab .rwh-h1{font-size:clamp(60px,9vw,92px)} .rwh.is-tab .rwh-strip{grid-template-columns:1fr 1fr} .rwh.is-tab .rwh-tags{display:none}
/* phone */
.rwh.is-ph{height:auto;min-height:100svh;display:flex;flex-direction:column}
.rwh.is-ph .rwh-nav{position:relative;padding:14px 16px 0;gap:12px} .rwh.is-ph .rwh-links{display:none} .rwh.is-ph .rwh-navcta{margin-left:auto} .rwh.is-ph .rwh-logo{font-size:19px}
.rwh.is-ph .rwh-in{position:relative;inset:auto;padding:56px 16px 36px;flex:1}
.rwh.is-ph .rwh-copy{gap:18px} .rwh.is-ph .rwh-h1{font-size:clamp(46px,13.4vw,60px)} .rwh.is-ph .rwh-sub{font-size:16px}
.rwh.is-ph .rwh-btns{flex-direction:column;align-items:stretch;width:100%} .rwh.is-ph .rwh-btns .rw-btn{width:100%}
.rwh.is-ph .rwh-strip{position:relative;grid-template-columns:1fr;gap:16px;padding:0 16px 28px} .rwh.is-ph .rwh-tags{flex-wrap:wrap} .rwh.is-ph .rwh-proof{align-items:flex-start;text-align:left}
.rwh.is-ph .rwh-chip{font-size:11px} .rwh.is-ph .rwh-stillring{width:300px;height:300px}
@media (max-width:1240px){.rwh-links a{padding:9px 11px}}`
addPropertyControls(RwHero, {
    ...COLOR_CONTROLS,
    ...FONT_CONTROLS,
    ...BP_CONTROL,
    photo: {
        type: ControlType.ResponsiveImage,
        title: "Crowd photo",
        description: "A crowd seen from above works best",
    },
    focusX: {
        type: ControlType.Number,
        title: "Focus X",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        defaultValue: 50,
    },
    focusY: {
        type: ControlType.Number,
        title: "Focus Y",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        defaultValue: 50,
    },
    eyebrow: {
        type: ControlType.String,
        title: "Eyebrow",
        description: "Empty = the Announcement on the Site CMS row",
        defaultValue: "",
    },
    heading: {
        type: ControlType.String,
        title: "Heading",
        description: "| = line break, *words* = accent highlight",
        defaultValue: "Get seen by|the *right crowd.*",
        displayTextArea: true,
    },
    subCopy: {
        type: ControlType.String,
        title: "Sub copy",
        defaultValue:
            "Shilly is a digital marketing agency. We run social media, paid ads and content that put your brand in front of the people who buy, and we report every result in plain numbers.",
        displayTextArea: true,
    },
    primary: {
        type: ControlType.String,
        title: "Primary button",
        defaultValue: "Book a strategy call",
    },
    primaryLink: {
        type: ControlType.Link,
        title: "Primary link",
        description: "Empty = Booking Link on the Site CMS row",
    },
    secondary: {
        type: ControlType.String,
        title: "Second button",
        defaultValue: "See our work",
    },
    secondaryLink: {
        type: ControlType.Link,
        title: "Second link",
        defaultValue: "/work",
    },
    chips: {
        type: ControlType.String,
        title: "Reach pop-ups",
        description: "icon|text; icon|text; …",
        displayTextArea: true,
        defaultValue:
            "❤|1.2k likes on one reel;+|86 new followers;★|New 5-star review;#1|“dentist near me”;●|12 leads today;↗|CTR up to 4.8%;✓|Call booked · Tue 10:30;◎|+318 profile visits;▶|48k video views;$|ROAS 6.2×",
    },
    services: {
        type: ControlType.String,
        title: "Service tags",
        defaultValue: "Social media, Paid ads, Content, Web design",
    },
    counterLabel: {
        type: ControlType.String,
        title: "Counter label",
        defaultValue: "People reached for clients this month",
    },
    counterStart: {
        type: ControlType.Number,
        title: "Counter start",
        min: 0,
        max: 99999999,
        step: 100,
        defaultValue: 1284300,
    },
    hint: {
        type: ControlType.String,
        title: "Hint",
        defaultValue: "Move to reach · click to launch a campaign",
    },
    showNav: {
        type: ControlType.Boolean,
        title: "Show nav",
        defaultValue: true,
    },
    navLinks: {
        type: ControlType.String,
        title: "Nav links",
        description: "Label:/path, …",
        defaultValue:
            "Services:/services, Work:/work, Pricing:/pricing, About:/about, Blog:/blog",
    },
    navCta: {
        type: ControlType.String,
        title: "Nav button",
        defaultValue: "Book a call",
    },
})
