"use client"
// Client component on purpose: defaultsOf() reads the addPropertyControls registry,
// which is only populated where the section modules actually execute (the client bundle).
import type { ComponentType } from "react"
import { defaultsOf } from "@/lib/framer"
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
import RwPricing from "./sections/RwPricing"
import RwFaq from "./sections/RwFaq"
import RwJournal from "./sections/RwJournal"
import RwCta from "./sections/RwCta"
import RwFooter from "./sections/RwFooter"

// Render a section with its Framer control defaults, then any overrides.
// e.g. S(RwHero, { title: "New headline" })
const S = (C: ComponentType<any>, p: Record<string, any> = {}) => (
    <C {...defaultsOf(C)} {...p} />
)

export default function HomePage() {
    return (
        <main>
            {S(RwHero)}
            {S(RwClients)}
            {S(RwIntro)}
            {S(RwServices)}
            {S(RwWork)}
            {S(RwFunnel)}
            {S(RwNumbers)}
            {S(RwFeed)}
            {S(RwTeam)}
            {S(RwReviews)}
            {S(RwPricing)}
            {S(RwFaq)}
            {S(RwJournal)}
            {S(RwCta)}
            {S(RwFooter)}
        </main>
    )
}
