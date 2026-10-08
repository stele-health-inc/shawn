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
    line: "From boxing's most iconic brand to a health-tech startup: content, ads and websites, measured by what they actually did.",
    clients: "Ring Magazine, Body Suite Spa, Stele Health, Solin, Crash Politics",
    badges: "25M+ views;8× ROAS;Brand + site;Intersolar launch;501(c)(3) site",
    ratingLine: "25M+ organic views · 8× ROAS",
}
const WORK = {
    intro: "Two clients, two channels, one habit: we report the number that matters, before and after.",
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

export default function HomePage() {
    return (
        <main>
            {S(RwHero)}
            {S(RwClients, CLIENTS)}
            {S(RwIntro)}
            {S(RwServices)}
            {S(RwWork, WORK)}
            {S(RwFunnel)}
            {S(RwNumbers, NUMBERS)}
            {S(RwFeed)}
            {S(RwTeam)}
            {S(RwReviews)}
            {S(RwFaq)}
            {S(RwJournal)}
            {S(RwCta)}
            {S(RwFooter)}
        </main>
    )
}
