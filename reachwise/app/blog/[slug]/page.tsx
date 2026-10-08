import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Body, Card, Shell, postBy, posts, siteName } from "../shell"

export const dynamicParams = false
export const generateStaticParams = () => posts().map((p) => ({ slug: p.slug }))

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const p = postBy((await params).slug)
    if (!p) return {}
    return {
        title: `${p.f1} · ${siteName()}`,
        description: p.f5,
        openGraph: { title: p.f1, description: p.f5, images: p.img ? [p.img] : undefined },
    }
}

export default async function Article({ params }: Props) {
    const p = postBy((await params).slug)
    if (!p) notFound()
    const more = posts().filter((x) => x.slug !== p.slug).slice(0, 3)
    return (
        <Shell>
            <article className="bl-wrap">
                <div className="bl-art">
                    <Link href="/blog" className="bl-eb" style={{ textDecoration: "none" }}>
                        <i />
                        Blog
                    </Link>
                    <h1 className="bl-h1" style={{ fontSize: "clamp(34px,5vw,58px)" }}>
                        {p.f1}
                    </h1>
                    <p className="bl-lede">{p.f5}</p>
                    <div className="bl-meta" style={{ marginTop: 22 }}>
                        {p.f2 && <b>{p.f2}</b>}
                        <span>{p.f3}</span>
                        {p.f4 && <span>{p.f4} read</span>}
                    </div>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="bl-hero" src={p.img} alt="" style={{ maxWidth: 1000, display: "block", marginInline: "auto" }} />
                <div className="bl-art" style={{ paddingTop: 8 }}>
                    <Body text={p.f6} />
                    <div className="bl-end">
                        <h3>Want this kind of work for your brand?</h3>
                        <Link href="/#contact" className="bl-cta">
                            Book a strategy call →
                        </Link>
                    </div>
                </div>
                <section className="bl-more">
                    <h2>More from the blog</h2>
                    <div className="bl-grid" style={{ marginTop: 28 }}>
                        {more.map((m) => (
                            <Card key={m.slug} p={m} />
                        ))}
                    </div>
                </section>
            </article>
        </Shell>
    )
}
