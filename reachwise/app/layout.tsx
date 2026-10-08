import type { Metadata } from "next"
import { CSS_BASE, CSS_MOTION, FONTS } from "@/lib/rw-css"
import "./globals.css"

export const metadata: Metadata = {
    title: "BOS Media Labs — Digital marketing studio",
    description:
        "BOS Media Labs is a digital marketing studio: short-form content, paid ads, AI systems and websites.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link id="rw-fonts" rel="stylesheet" href={FONTS} />
            </head>
            <body>
                {/* Shared scaffold + motion CSS, injected once for every section */}
                <style dangerouslySetInnerHTML={{ __html: CSS_BASE + CSS_MOTION }} />
                {children}
            </body>
        </html>
    )
}
