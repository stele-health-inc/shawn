import type { Metadata } from "next"
import { Card, Shell, posts, siteName } from "./shell"

export const metadata: Metadata = {
    title: `Blog · ${siteName()}`,
    description: "Notes from the work: short-form content, paid ads, social media, websites and branding.",
}

export default function BlogIndex() {
    return (
        <Shell>
            <div className="bl-wrap" style={{ paddingTop: 64 }}>
                <span className="bl-eb">
                    <i />
                    Blog
                </span>
                <h1 className="bl-h1">Notes from the work.</h1>
                <p className="bl-lede">
                    What we learned running content, ads, social, websites and brands for real clients.
                </p>
                <div className="bl-grid">
                    {posts().map((p) => (
                        <Card key={p.slug} p={p} />
                    ))}
                </div>
            </div>
        </Shell>
    )
}
