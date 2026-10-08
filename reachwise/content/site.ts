// ALL SITE CONTENT lives here. Each collection is a list of rows; the field keys (f1, f2 … img, n1) are the ones the
// sections read (they mirror the Framer CMS bridge). n1 = sort order. Swap this file for a CMS / database later:
// only `useCMS` in lib/rw.tsx reads it.

export type CmsRow = Record<string, string>

// site — the one-row collection of agency-wide facts
// f1 name · f2 role · f3 tagline · f4 email · f5 phone · f6 booking link · f7 city · f8 time zone
// f9 rating · f10 reviews count · f11 socials (Label:url, …) · f12 announcement · f13 clients count
const site: CmsRow[] = [
    {
        slug: "site",
        f1: "BOS Media Labs",
        f2: "Digital marketing agency",
        f3: "Short-form content, paid ads, AI systems and websites that bring the right people to your door.",
        f4: "hello@bosmedialabs.com",
        f5: "",
        f6: "/#contact",
        f7: "New York",
        f8: "America/New_York",
        f9: "4.9",
        f10: "126",
        f11: "",
        f12: "Now booking Q4 · 3 spots left",
        f13: "140+",
        n1: "1",
    },
]

// services — f1 title · f2 one-liner · f3 body · f4 price (empty = hidden) · f5 includes (;) · f6 mini-UI kind (seo|social|ads|content|web|brand) · f7 stat · f8 link (article)
const services: CmsRow[] = [
    {
        slug: "social-media",
        f8: "/blog/running-your-whole-social",
        f1: "Social media",
        f2: "Posts people stop for.",
        f3: "Strategy, shooting, editing and community management on Instagram, TikTok and LinkedIn.",
        f4: "",
        f5: "12 posts + 8 reels a month;Content calendar;Community replies;Monthly report",
        f6: "social",
        f7: "25M+ organic views for Ring Magazine",
        n1: "1",
    },
    {
        slug: "paid-ads",
        f8: "/blog/8x-roas-med-spa",
        f1: "Paid ads",
        f2: "Every dollar tracked to a sale.",
        f3: "Meta, Google and TikTok campaigns built around your margins, tested weekly and reported in revenue.",
        f4: "",
        f5: "Account setup;Creative testing;Weekly optimisation;Revenue dashboard",
        f6: "ads",
        f7: "8× ROAS on Google Ads",
        n1: "2",
    },
    {
        slug: "content",
        f8: "/blog/your-archive-is-content",
        f1: "Content",
        f2: "Articles, videos and emails that sell.",
        f3: "Blog posts, newsletters and short videos written for search and for people.",
        f4: "",
        f5: "Editorial plan;4 long-form articles;2 newsletters;Repurposed clips",
        f6: "content",
        f7: "3.4× more leads from blog",
        n1: "3",
    },
    {
        slug: "web-design",
        f8: "/blog/building-rain-ucsd",
        f1: "Web design",
        f2: "Sites that turn visits into calls.",
        f3: "Fast Framer and Webflow websites with landing pages built to convert your traffic.",
        f4: "",
        f5: "Wireframes;Design + build;CMS setup;Speed + SEO basics",
        f6: "web",
        f7: "+64% conversion rate",
        n1: "4",
    },
    {
        slug: "branding",
        f8: "/blog/brand-before-ads",
        f1: "Branding",
        f2: "A brand people remember.",
        f3: "Naming, logo, colours and a voice that makes your ads and posts look like one company.",
        f4: "",
        f5: "Brand workshop;Logo + identity;Brand guidelines;Social templates",
        f6: "brand",
        f7: "2 weeks to launch",
        n1: "5",
    },
]

// work (case studies) — f1 client · f2 headline · f3 industry · f4 services (;) · f5 metric label · f6 before · f7 after
// f8 unit suffix · f9 year · f10 summary · f13 "compare" = before/after slider (else a plain cover) · f14 live link (optional) · img cover
const work: CmsRow[] = [
    {
        slug: "ring-magazine",
        f1: "Ring Magazine",
        f2: "A 5-page fan network that pulled 25M+ organic views",
        f3: "Media · Boxing",
        f4: "Clipping;Short-form content",
        f5: "Organic views",
        f6: "0",
        f7: "25M+",
        f8: "",
        f9: "Since Dec 2025",
        f10: "Boxing's most iconic brand had a huge content library but no short-form presence. We built a 5-page fan network: 770+ clips posted, a 2.5M-view top clip and a 2× engagement rate.",
        f13: "compare",
        img: "/images/ring-magazine.png",
        n1: "1",
    },
    {
        slug: "body-suite-spa",
        f1: "Body Suite Spa",
        f2: "Paid ads that returned 8× on Google and 7× on Facebook",
        f3: "Health & wellness",
        f4: "Google Ads;Facebook Ads;CRM & automation",
        f5: "Return on ad spend · Google Ads",
        f6: "—",
        f7: "8×",
        f8: "",
        f9: "2024–25",
        f10: "We ran marketing operations for the spa: Google and Facebook campaigns plus the CRM and automations behind them, reaching 8× ROAS on Google Ads and 7× on Facebook Ads.",
        img: "/images/cover-body-suite-spa.webp",
        n1: "2",
    },
    {
        slug: "friss-labs",
        f14: "https://www.instagram.com/frisslabs/",
        f1: "Friss Labs",
        f2: "A brand's whole social presence, run end to end",
        f3: "Consumer products",
        f4: "Social media;Content",
        f5: "Social media, fully managed",
        f6: "Idea",
        f7: "Live",
        f8: "",
        f9: "2026",
        f10: "We run Friss Labs' social media: strategy, shooting, editing and posting across their feed and reels.",
        img: "/images/friss-labs.jpg",
        n1: "3",
    },
    {
        slug: "hop-wtr",
        f14: "https://www.instagram.com/hopwtr/",
        f1: "HOP WTR",
        f2: "Creator-style reels for a sparkling hop water",
        f3: "Consumer products",
        f4: "UGC ads;Content",
        f5: "UGC video",
        f6: "",
        f7: "",
        f8: "",
        f9: "2025–26",
        f10: "Short, native-feeling videos for HOP WTR's social and ads: real moments with the can, shot and edited to stop the scroll.",
        img: "/images/hop-wtr.jpg",
        n1: "4",
    },
    {
        slug: "mood",
        f14: "https://www.instagram.com/mood.products/",
        f1: "Mood",
        f2: "UGC video ads for a fast-growing wellness brand",
        f3: "Consumer products",
        f4: "UGC ads;Content",
        f5: "UGC ad creative",
        f6: "Brief",
        f7: "Live",
        f8: "",
        f9: "2025",
        f10: "Creator-style video ads for Mood's paid and organic social, scripted, filmed and edited to feel native to the feed.",
        img: "/images/mood.jpg",
        n1: "5",
    },
    {
        slug: "rain-ucsd",
        f14: "https://www.rainucsd.org/",
        f1: "RAIN · UC San Diego",
        f2: "Designed and built the site for UC San Diego's Real World AI Network",
        f3: "Education · AI",
        f4: "Web development",
        f5: "Website, designed and built",
        f6: "",
        f7: "",
        f8: "",
        f9: "",
        f10: "The site for RAIN, the hub for AI talent at UC San Diego: research, industry and entrepreneurship in one ecosystem, hosted at the San Diego Supercomputer Center. Live at rainucsd.org.",
        img: "/images/rain-ucsd.jpg",
        n1: "6",
    },
]

// team — f1 name · f2 role · f3 bio · f4 focus · f5 LinkedIn · img portrait
const team: CmsRow[] = [
    {
        slug: "maya-chen",
        f1: "Maya Chen",
        f2: "Founder & strategy lead",
        f3: "Ten years running growth for consumer brands before starting BOS Media Labs.",
        f4: "Strategy",
        f5: "",
        img: "/images/HxGAwVNM9ZaaBu6N5yRyWcYxYQM.webp",
        n1: "1",
    },
    {
        slug: "jordan-reyes",
        f1: "Jordan Reyes",
        f2: "Head of SEO",
        f3: "Has taken 40+ local businesses to the top three on Google.",
        f4: "SEO",
        f5: "",
        img: "/images/JXNHKwjRlDqIdZuxCrbzCaz9Td8.webp",
        n1: "2",
    },
    {
        slug: "amara-okafor",
        f1: "Amara Okafor",
        f2: "Social media director",
        f3: "Runs the content team and every client's reel calendar.",
        f4: "Social",
        f5: "",
        img: "/images/371lVaDSMdqEsHSlTLGeKl7650.webp",
        n1: "3",
    },
    {
        slug: "liam-novak",
        f1: "Liam Novak",
        f2: "Paid ads lead",
        f3: "Manages $4M a year in Meta and Google spend.",
        f4: "Paid ads",
        f5: "",
        img: "/images/NmkpUVq1OjshWo3MRYHXbDUFJGU.webp",
        n1: "4",
    },
    {
        slug: "sofia-marin",
        f1: "Sofia Marín",
        f2: "Content lead",
        f3: "Former magazine editor who writes for search and for people.",
        f4: "Content",
        f5: "",
        img: "/images/wTEJQWR3N9EVhTU88mXAPHBq5g4.webp",
        n1: "5",
    },
    {
        slug: "theo-park",
        f1: "Theo Park",
        f2: "Design lead",
        f3: "Designs the sites, brands and ads our clients launch with.",
        f4: "Design",
        f5: "",
        img: "/images/LBJSHBzWF5iwJGgfJgtazdyk8.webp",
        n1: "6",
    },
]

// reviews — f1 name · f2 role · f3 company · f4 quote · f5 result chip · f6 stars · img avatar
const reviews: CmsRow[] = [
    {
        slug: "r1",
        f1: "Dr. Hannah Lee",
        f2: "Owner",
        f3: "Northside Dental",
        f4: "We went from four new patients a week to four a day. They report every number and explain what they changed.",
        f5: "+826% organic visits",
        f6: "5",
        img: "/images/YqwmM7lRs3vsXpr2grgwzyJ62LE.webp",
        n1: "1",
    },
    {
        slug: "r2",
        f1: "Marcus Bell",
        f2: "Co-founder",
        f3: "Kinfolk Coffee",
        f4: "Our reels finally look like us. The team shoots, edits and posts, and we just approve.",
        f5: "96k followers",
        f6: "5",
        img: "/images/YYdQD4OSWKjNOGVWs9tCxMobw8I.webp",
        n1: "2",
    },
    {
        slug: "r3",
        f1: "Priya Nair",
        f2: "Growth lead",
        f3: "Fitloop",
        f4: "The first agency that talks about our margins, not clicks. Ads paid back in eleven days.",
        f5: "6.2× ROAS",
        f6: "5",
        img: "/images/RqmMNLZRFBKyGJxcMWBx21DI85Q.webp",
        n1: "3",
    },
    {
        slug: "r4",
        f1: "Tom Alvarez",
        f2: "Broker",
        f3: "Haven Realty",
        f4: "Seller leads every week from our own site. We stopped buying leads from portals.",
        f5: "122 leads/mo",
        f6: "5",
        img: "/images/gv5mT4bQ8T1n4dyt3U0G2Gfwldw.webp",
        n1: "4",
    },
    {
        slug: "r5",
        f1: "Elena Rossi",
        f2: "Founder",
        f3: "Lumen Skin",
        f4: "They built the brand and the launch. We sold out twice in the first month.",
        f5: "$142k launch week",
        f6: "5",
        img: "/images/FkGV79fUruxxZYYaCa5EOB8RME.webp",
        n1: "5",
    },
    {
        slug: "r6",
        f1: "David Kim",
        f2: "Partner",
        f3: "Orbit Legal",
        f4: "Clients now mention our LinkedIn posts in the first call. That never happened before.",
        f5: "57 consults/mo",
        f6: "5",
        img: "/images/x1XkAfPNF95aDnEhP091G8c03KY.webp",
        n1: "6",
    },
]

// faq — f1 question · f2 answer · f3 group
const faq: CmsRow[] = [
    {
        slug: "f1",
        f1: "How long until we see results?",
        f2: "Paid ads show results in the first two weeks. Social grows month by month. SEO usually moves in 3 to 6 months, and we show progress in every report.",
        f3: "General",
        n1: "1",
    },
    {
        slug: "f2",
        f1: "Do we have to sign a long contract?",
        f2: "No. Retainers run month to month with 30 days notice. Most clients stay because the numbers keep going up.",
        f3: "General",
        n1: "2",
    },
    {
        slug: "f4",
        f1: "Which industries do you work with?",
        f2: "Local services, e-commerce, apps and professional firms. We say no when we can't move the numbers.",
        f3: "General",
        n1: "4",
    },
    {
        slug: "f5",
        f1: "Who creates the content?",
        f2: "Our in-house team writes, shoots and edits. You approve everything before it goes live.",
        f3: "Process",
        n1: "5",
    },
    {
        slug: "f6",
        f1: "How do you report results?",
        f2: "A live dashboard plus a monthly call where we walk through what worked, what didn't and what we'll change.",
        f3: "Process",
        n1: "6",
    },
    {
        slug: "f7",
        f1: "Can you work with our in-house team?",
        f2: "Yes. We often run one channel while your team handles the rest, and share every file and login.",
        f3: "Process",
        n1: "7",
    },
    {
        slug: "f8",
        f1: "What happens on the first call?",
        f2: "A free 30-minute audit of your site, socials and ads, and a plan you can keep even if we don't work together.",
        f3: "General",
        n1: "8",
    },
]

// posts (blog) — f1 title · f2 category · f3 date · f4 read time · f5 excerpt · f6 body · img cover
// f6 is plain text: blank line between paragraphs, "## " for a heading, "- " for a list item.
const posts: CmsRow[] = [
    {
        slug: "your-archive-is-content",
        f1: "Your old footage is your best content. Ring Magazine proved it.",
        f2: "Content",
        f3: "Oct 06, 2026",
        f4: "5 min",
        f5: "The Ring had a century of boxing on tape and no short-form presence. A network of fan pages turned that archive into 25M+ organic views.",
        f6: `The Ring has covered boxing since 1922. That's a hundred years of fights, interviews and moments people still argue about. In December 2025, almost none of it was living on short-form video.

That's more common than you'd think. Brands sit on hours of footage and keep paying to shoot new material, while the good stuff sits on a hard drive.

## What we built

We didn't start one account. We started five. A network of fan pages, each with its own angle on the sport, all fed from the same archive.

Here's where it stands:

- 770+ clips posted since December 2025
- 25M+ organic views across the network
- 2.5M views on the biggest single clip
- A 2× engagement rate

Every one of those views is organic. No ad spend behind any of it. And the network is still live and still growing.

## Why five pages beat one big account

One account gives you one voice and one shot at the algorithm. Five pages give you five. Each page can lean into a different kind of fan: the history buffs, the knockout crowd, the people who only care about one weight class.

When a clip takes off on one page, it doesn't stay there. People follow it back, find the other pages, and the whole network gets a lift.

Fans also trust fan pages. A clip from a page that feels like it's run by someone who loves the sport lands differently than the same clip from a brand account. That's not a trick. It's how people actually use these apps.

## How to tell if your archive is worth clipping

Not every library is a goldmine. A few quick checks:

- People talked about the moment at least once already
- It works with the sound off for the first two seconds
- You can cut it under 30 seconds and keep the point
- You have the rights to post it

If most of your footage passes, you're sitting on months of content.

## Where to start

Pick 20 moments. Cut each one two or three ways: different first second, different caption, different length. Post them, watch which versions hold attention, and cut more like those.

That loop is most of the job. The archive does the rest.

If you've got footage and no short-form presence, that's the call we like getting.`,
        img: "/blog/content.jpg",
        n1: "1",
    },
    {
        slug: "8x-roas-med-spa",
        f1: "What 8× ROAS on Google Ads took for a med spa",
        f2: "Paid ads",
        f3: "Sep 29, 2026",
        f4: "5 min",
        f5: "Fifteen months running Google and Facebook ads for Body Suite Spa. Google hit 8× return on ad spend and Facebook hit 7×. A lot of the work happened after the click.",
        f6: `Body Suite is a body-contouring spa. From June 2024 to August 2025 we ran their Google and Facebook campaigns, plus the CRM and automations behind them.

The headline numbers: 8× return on ad spend on Google Ads and 7× on Facebook Ads.

People ask what the trick was. There wasn't one. There were two halves to the job, and the ads were the smaller half.

## Half one: the ads

Google and Facebook do different jobs, so we treated them differently.

Google catches people who already want the treatment. They're typing it into a search bar. Your job there is to show up, say exactly what they searched for, and make booking easy. Clever copy matters less than being specific.

Facebook finds people who weren't looking yet. That means the creative has to do the work. Real results, real space, a clear offer. If the ad looks like every other spa ad in the feed, it gets scrolled past.

## Half two: everything after the click

This is where most local businesses leak money. Someone fills out a form, then waits a day for a call back. By then they've booked somewhere else.

We set up the CRM and automations so new leads got a fast response and a clear next step. Follow-ups went out on their own. The front desk could see who came from where.

Good ads with slow follow-up still lose. Fast follow-up makes every ad dollar count for more.

## ROAS isn't the whole story

A high ROAS is great. It's not the same as profit. Before you celebrate a number, check three things:

- Your margin on the services the ads are selling
- How many first-time clients come back
- Whether the bookings show up, not just get made

If those line up, scale. If they don't, a big ROAS can hide a business that's working harder for less.

## What we'd tell any local service business

Start with the search side. It's the closest thing to free money in paid ads. Then fix your follow-up before you spend more on social. Then test creative, a lot of it.

That order matters more than any single setting in the ad account.`,
        img: "/blog/ads.jpg",
        n1: "2",
    },
    {
        slug: "running-your-whole-social",
        f1: "What it looks like when we run your whole social account",
        f2: "Social media",
        f3: "Sep 22, 2026",
        f4: "4 min",
        f5: "Posting a few times a week is easy. Running a brand's social from the plan to the post is a different job. Here's how we do it for Friss Labs.",
        f6: `Plenty of brands hire someone to post. Fewer hand over the whole account. Friss Labs did, and we run their social media from the plan to the post.

That's a different job than scheduling content, so it's worth explaining what it actually means.

## One voice, every day

When three people post for a brand, it shows. The captions sound different. The photos don't match. Followers can feel it even if they can't name it.

Running the whole account means one team owns the voice. Every post sounds like the same brand, whether it's a product shot, a reel or a poster for something new.

## A plan before a calendar

A content calendar is a list of dates. A plan is a reason for each post. We start with what the brand needs this month: a launch, a restock, more people who've never heard of it. Then we work backward to the posts.

That way a slow week doesn't turn into filler. Every post has a job.

## What you hand over

You still have a say. Most of what we need from you is simple:

- Access to the products
- Fast answers on approvals
- A heads up when something big is coming

The rest is on us: planning, making the content, writing, posting and keeping an eye on what's working.

## What you get back

Time, mostly. Founders running their own social tend to post in bursts and then go quiet for weeks. A steady account beats a brilliant one that disappears.

You also get someone watching the numbers every week, so the plan changes when the data says it should.

If your social is the thing that always slips to the bottom of the list, that's a sign it should be someone's whole job.`,
        img: "/blog/social.jpg",
        n1: "3",
    },
    {
        slug: "building-rain-ucsd",
        f1: "Building a website for a university AI network",
        f2: "Web design",
        f3: "Sep 15, 2026",
        f4: "4 min",
        f5: "RAIN brings research, industry and startups together at UC San Diego. That means a lot of different visitors. Here's how we designed and built a site that works for all of them.",
        f6: `RAIN is the Real World AI Network at UC San Diego. It pulls research, industry and entrepreneurship into one place, and it's hosted by the Societal Computing and Innovation Lab at the San Diego Supercomputer Center.

We designed and built their website, rainucsd.org.

## The problem: too many audiences

A student, a researcher and a company looking for AI talent all land on the same homepage. They want different things. If the site tries to talk to all of them at once, it ends up talking to nobody.

So the homepage does two jobs. It says what RAIN is in one line, and it sends each kind of visitor where they need to go.

## One line, then clear doors

The headline says it plainly: the operating layer for real world AI at UC San Diego. No paragraph of mission statement before you get to the point.

Right under it are three buttons:

- Join the network
- Raindrop portal
- Read the constitution

New people join. Members go to the portal. Anyone who wants to know how RAIN is run reads the constitution. Nobody has to hunt.

## Make it feel like the place

University sites can feel like a filing cabinet. RAIN is newer and moves faster than that, so the design leans into it: a deep, dark gradient, a serif headline with real presence, and a simple floating nav with Home, About, People, Events and Raindrop.

It still had to be easy to keep updated. People join, events change, and the team running it shouldn't need a developer for every edit.

## What any organization can take from this

Before you design a single page, write down who visits and what each of them wants. Then make sure the homepage gets each of them one click closer.

Looks matter. Clear paths matter more.`,
        img: "/blog/web.jpg",
        n1: "4",
    },
    {
        slug: "brand-before-ads",
        f1: "Build the brand before you buy the ads",
        f2: "Branding",
        f3: "Sep 08, 2026",
        f4: "4 min",
        f5: "Ads get more expensive when every one of them has to explain who you are. We built Stele Health's brand from zero first, and everything after got faster.",
        f6: `Most young brands want to run ads right away. We get it. Ads feel like progress. But if every ad has to explain who you are from scratch, you pay for that explanation every single time.

A brand fixes that. People see the colours, the type, the tone, and they know it's you before they read a word.

## What we mean by a brand

A logo is one piece of it. A brand that does its job covers:

- A logo and identity that works small and large
- Colours and type you use every time
- A voice, so every caption sounds like the same company
- Templates, so making a new post takes minutes

Get those right once and every ad, post and page after it is faster to make and easier to recognize.

## Stele Health: from zero

Stele Health came to us with a product and no brand. We built the identity, set the creative direction, made the pitch deck and built the pre-order website.

Doing all of it together mattered. The deck, the site and the first posts all looked and sounded like one company, because they came from the same system.

## Solin: concept to the show floor

Solin was a solar brand that started as an idea. We took it from concept to market-ready: brand, website, creative direction and the pitch deck. Then it went to Intersolar.

A trade show is a hard test. You get a few seconds as people walk past. A brand either reads instantly or it doesn't.

## When to do this

Before your first real ad spend. Before a launch. Before a raise, if you're pitching. Any time people are about to see you for the first time.

Fixing a brand after you've spent on ads means paying twice. Doing it first means every dollar after it works a little harder.`,
        img: "/blog/brand.jpg",
        n1: "5",
    },
]

export const CONTENT: Record<string, CmsRow[]> = {
    site,
    services,
    work,
    team,
    reviews,
    faq,
    posts,
}
