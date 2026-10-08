import Link from "next/link"
import { CONTENT, type CmsRow } from "@/content/site"

// Blog pages are plain server pages that share the homepage palette and fonts.
// Colours mirror DEF in lib/rw.tsx (that module is client-only, so the values are repeated here).
export const posts = (): CmsRow[] =>
    [...(CONTENT.posts || [])].sort((a, b) => Number(a.n1 || 0) - Number(b.n1 || 0))
export const postBy = (slug: string) => posts().find((p) => p.slug === slug)
export const siteName = () => CONTENT.site?.[0]?.f1 || "BOS Media Labs"

const CSS = `
.bl{--paper:#FFFFEB;--ink:#0D0E10;--acc:#FF8A3D;--line:#DAE7D9;--mut:#5d5e58;--night:#08090A;
  min-height:100vh;background:var(--paper);color:var(--ink);font-family:'Funnel Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.bl a{color:inherit}
.bl-wrap{max-width:1180px;margin:0 auto;padding:0 clamp(16px,4vw,40px)}
.bl-top{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--paper) 88%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.bl-top .bl-wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;height:68px}
.bl-mark{font:700 20px/1 'Funnel Display',sans-serif;letter-spacing:-.03em;text-decoration:none}
.bl-nav{display:flex;align-items:center;gap:clamp(12px,2.4vw,28px);font-size:14px}
.bl-nav a{text-decoration:none;opacity:.75;transition:opacity .2s} .bl-nav a:hover{opacity:1}
.bl-cta{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;background:var(--ink);color:var(--paper)!important;opacity:1!important;font-weight:500;text-decoration:none}
.bl-cta:hover{background:var(--acc);color:var(--ink)!important}
.bl-eb{display:inline-flex;align-items:center;gap:8px;font:500 11.5px/1 'Geist Mono',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
.bl-eb i{width:7px;height:7px;border-radius:50%;background:var(--acc)}
.bl-h1{font:600 clamp(36px,6vw,72px)/1.02 'Funnel Display',sans-serif;letter-spacing:-.04em;margin:18px 0 0;text-wrap:balance}
.bl-lede{font-size:clamp(17px,1.6vw,20px);line-height:1.55;color:var(--mut);max-width:640px;margin:18px 0 0}
.bl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:28px;margin:48px 0 96px}
.bl-card{display:flex;flex-direction:column;gap:14px;text-decoration:none}
.bl-card img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:18px;background:var(--line);transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.bl-card:hover img{transform:scale(1.02)}
.bl-card h2{font:600 22px/1.15 'Funnel Display',sans-serif;letter-spacing:-.02em;margin:0;text-wrap:balance}
.bl-card p{margin:0;color:var(--mut);line-height:1.5;font-size:15px}
.bl-meta{display:flex;flex-wrap:wrap;gap:6px 14px;font:500 11px/1 'Geist Mono',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
.bl-meta b{color:var(--ink);font-weight:500;padding:5px 9px;border-radius:999px;background:color-mix(in srgb,var(--acc) 26%,transparent)}
.bl-art{max-width:760px;margin:0 auto;padding:56px 0 0}
.bl-hero{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:24px;margin:40px 0 8px;background:var(--line)}
.bl-body{font-size:clamp(17px,1.5vw,19px);line-height:1.7}
.bl-body p{margin:22px 0}
.bl-body h2{font:600 clamp(24px,2.6vw,32px)/1.15 'Funnel Display',sans-serif;letter-spacing:-.025em;margin:48px 0 0}
.bl-body ul{margin:22px 0;padding-left:22px} .bl-body li{margin:8px 0} .bl-body li::marker{color:var(--acc)}
.bl-end{margin:64px 0 0;padding:32px;border-radius:24px;background:var(--night);color:var(--paper);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px}
.bl-end h3{margin:0;font:600 clamp(22px,2.4vw,28px)/1.15 'Funnel Display',sans-serif;letter-spacing:-.02em;max-width:460px}
.bl-end .bl-cta{background:var(--acc);color:var(--ink)!important} .bl-end .bl-cta:hover{background:var(--paper)}
.bl-more{border-top:1px solid var(--line);margin-top:80px;padding-top:40px}
.bl-more h2{font:600 28px/1.1 'Funnel Display',sans-serif;letter-spacing:-.02em;margin:0}
.bl-foot{border-top:1px solid var(--line);padding:28px 0 40px;font-size:13px;color:var(--mut)}
.bl-foot .bl-wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px}
.bl-foot a{text-decoration:none} .bl-foot a:hover{color:var(--ink)}
@media (max-width:640px){.bl-nav a:not(.bl-cta){display:none}.bl-end{padding:24px}}
`

export function Shell({ children }: { children: React.ReactNode }) {
    const name = siteName()
    const email = CONTENT.site?.[0]?.f4
    return (
        <div className="bl">
            <style dangerouslySetInnerHTML={{ __html: CSS }} />
            <header className="bl-top">
                <div className="bl-wrap">
                    <Link href="/" className="bl-mark">
                        {name}
                    </Link>
                    <nav className="bl-nav" aria-label="Main">
                        <Link href="/#services">Services</Link>
                        <Link href="/#work">Work</Link>
                        <Link href="/blog">Blog</Link>
                        <Link href="/#contact" className="bl-cta">
                            Book a call
                        </Link>
                    </nav>
                </div>
            </header>
            <main>{children}</main>
            <footer className="bl-foot">
                <div className="bl-wrap">
                    <span>
                        © {new Date().getFullYear()} {name}
                    </span>
                    {email && <a href={`mailto:${email}`}>{email}</a>}
                </div>
            </footer>
        </div>
    )
}

export function Card({ p }: { p: CmsRow }) {
    return (
        <Link href={`/blog/${p.slug}`} className="bl-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.img} alt="" loading="lazy" decoding="async" />
            <span className="bl-meta">
                {p.f2 && <b>{p.f2}</b>}
                <span>{p.f3}</span>
                {p.f4 && <span>{p.f4} read</span>}
            </span>
            <h2>{p.f1}</h2>
            {p.f5 && <p>{p.f5}</p>}
        </Link>
    )
}

// f6 body: blank line between blocks, "## " heading, "- " list items
export function Body({ text }: { text: string }) {
    const blocks = String(text || "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
    return (
        <div className="bl-body">
            {blocks.map((b, i) => {
                if (b.startsWith("## ")) return <h2 key={i}>{b.slice(3)}</h2>
                const lines = b.split("\n")
                if (lines.every((l) => l.trim().startsWith("- ")))
                    return (
                        <ul key={i}>
                            {lines.map((l, j) => (
                                <li key={j}>{l.trim().slice(2)}</li>
                            ))}
                        </ul>
                    )
                return <p key={i}>{b}</p>
            })}
        </div>
    )
}
