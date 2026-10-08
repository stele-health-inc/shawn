"use client"
// Client component on purpose: defaultsOf() reads the addPropertyControls registry,
// which is only populated where the section modules actually execute (the client bundle).
import type { ComponentType } from "react"
import { defaultsOf } from "@/lib/controls"
import RwHero from "./sections/RwHero"
import RwClients from "./sections/RwClients"
import RwIntro from "./sections/RwIntro"
import RwServices from "./sections/RwServices"
import RwWork from "./sections/RwWork"
import RwFunnel from "./sections/RwFunnel"
import RwNumbers from "./sections/RwNumbers"
import RwFeed from "./sections/RwFeed"
import RwTeam from "./sections/RwTeam"
import RwReviews from "./sections/RwReviews"
import RwFaq from "./sections/RwFaq"
import RwJournal from "./sections/RwJournal"
import RwCta from "./sections/RwCta"
import RwFooter from "./sections/RwFooter"

// Render a section with its Framer control defaults, then any overrides.
// e.g. S(RwHero, { title: "New headline" })
const S = (C: ComponentType<any>, p: Record<string, any> = {}) => (
    <C {...defaultsOf(C)} {...p} />
)

// Real portfolio copy. Case-study rows live in content/site.ts (work); these sections take theirs as props.
const CLIENTS = {
    heading: "Real clients.|*Real numbers*.",
    line: "From boxing's most iconic brand to consumer brands and a health-tech startup: content, ads and websites, measured by what they actually did.",
    clients: "Ring Magazine, Body Suite Spa, Friss Labs, Mood, HOP WTR, The Dreams Vault, RAIN UC San Diego, Stele Health, Solin, Crash Politics",
    badges: "25M+ views;8× ROAS;Full social;UGC ads;UGC ads;UGC ads;Web dev;Brand + site;Intersolar launch;501(c)(3) site",
    ratingLine: "25M+ organic views · 8× ROAS",
}
const WORK = {
    intro: "Six clients, one habit: we show the work, and the number whenever there is one.",
}
const NUMBERS = {
    heading: "What our clients|*actually* got.",
    intro: "Headline results from client work: views from short-form content, return on ad spend from paid campaigns.",
    reportLabel: "Client results",
    liveLabel: "Results",
    tabs: "Overview, Content, Ads",
    range: "Since 2024",
    kpis: "25M+:organic views for Ring Magazine:up;8×:Google Ads ROAS for Body Suite Spa:up;7×:Facebook Ads ROAS for Body Suite Spa:up;770+:clips posted across 5 fan pages:up",
    deltaLabel: "client result",
    events: "25M+ organic views · Ring Magazine;770+ clips posted · Ring Magazine;Biggest clip: 2.5M views · Ring Magazine;2× engagement rate · Ring Magazine;8× ROAS on Google Ads · Body Suite Spa;7× ROAS on Facebook Ads · Body Suite Spa",
}

// Gallery: real posts and reels from client feeds (videos are muted, trimmed loops in /public/feed).
const FEED = {
    subCopy: "Reels and posts from the brands we create for, including HOP WTR and Friss Labs.",
    stats: "25M+ organic views;770+ clips posted;2.5M-view top clip",
    posts: "/feed/hop1.jpg|@hopwtr|0|reel||/feed/hop1.mp4;/feed/friss-p1.jpg|@frisslabs|0|photo;/feed/friss-p2.jpg|@frisslabs|0|photo;/feed/hop2.jpg|@hopwtr|0|reel||/feed/hop2.mp4;/feed/friss-p3.jpg|@frisslabs|0|photo;/feed/friss1.jpg|@frisslabs|0|reel||/feed/friss1.mp4;/feed/hop3.jpg|@hopwtr|0|reel||/feed/hop3.mp4;/feed/friss-p4.jpg|@frisslabs|0|photo;/feed/friss-p5.jpg|@frisslabs|0|photo;/feed/hop4.jpg|@hopwtr|0|reel||/feed/hop4.mp4;/feed/friss-p6.jpg|@frisslabs|0|photo;/feed/friss2.jpg|@frisslabs|0|reel||/feed/friss2.mp4;/feed/hop5.jpg|@hopwtr|0|reel||/feed/hop5.mp4;/feed/friss-p7.jpg|@frisslabs|0|photo;/feed/friss-p8.jpg|@frisslabs|0|photo;/feed/hop6.jpg|@hopwtr|0|reel||/feed/hop6.mp4;/feed/friss-p9.jpg|@frisslabs|0|photo;/feed/friss-p10.jpg|@frisslabs|0|photo",
}

export default function HomePage() {
    return (
        <main>
            {S(RwHero)}
            {S(RwClients, CLIENTS)}
            <div id="about">{S(RwIntro)}</div>
            <div id="services">{S(RwServices)}</div>
            <div id="work">{S(RwWork, WORK)}</div>
            {S(RwFunnel)}
            {S(RwNumbers, NUMBERS)}
            {S(RwFeed, FEED)}
            <div id="team">{S(RwTeam)}</div>
            {S(RwReviews)}
            {S(RwFaq)}
            <div id="blog">{S(RwJournal)}</div>
            <div id="contact">{S(RwCta)}</div>
            {S(RwFooter)}
        </main>
    )
}
