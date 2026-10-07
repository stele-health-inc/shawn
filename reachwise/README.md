# Reachwise — site template

The 15 Reachwise Framer code components (THE REACH design) ported to a plain **Next.js (App Router)** site you can deploy on Vercel and edit like any React project.

```bash
cd reachwise
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (what Vercel runs)
npm run typecheck
```

## Layout

| Path | What it is |
| --- | --- |
| `app/layout.tsx` | `<html>`, page title/description, Google Fonts, and the shared CSS (`CSS_BASE` + `CSS_MOTION`) injected once. |
| `app/page.tsx` → `components/HomePage.tsx` | The home page: the 15 sections in order. Reorder, remove or override props here. |
| `components/sections/Rw*.tsx` | One file per section. The component code is the Framer original, almost unchanged. |
| `content/site.ts` | **All the copy and data:** site settings, services, case studies, team, reviews, plans, FAQ and journal posts. |
| `lib/rw.tsx` | The shared scaffold every Framer file used to inline: palette, fonts, the PING `Btn`, the motion layer, `Reveal`, `Head`, `Eyebrow` and the CMS bridge (`useCMS`). |
| `lib/rw-css.ts` | Global CSS strings and the Google Fonts URL. |
| `lib/framer.ts` | A tiny stand-in for the `framer` package, so the components run outside Framer. |

## Editing

- **Copy and data:** edit `content/site.ts`.
  - Each collection is a list of rows with Framer-CMS-style fields (`f1`, `f2`, … `img`, `n1`), sorted by `n1`.
  - The comments above each collection say what every field means.
  - Only `useCMS` in `lib/rw.tsx` reads this file, so swapping it for a real CMS or database later is a one-function change.
- **Section props (headings, toggles, photos):**
  - Every prop's default is in the `addPropertyControls(...)` block at the bottom of its section file.
  - `HomePage` renders each section with those defaults (via `defaultsOf`).
  - To override one, pass it in, e.g. `S(RwHero, { heading: "…" })`. You can also edit the `defaultValue` in place.
- **Palette and fonts:**
  - Per section, pass the colour props: `bone` (paper), `ink`, `brass` (accent), and so on.
  - Site-wide, change `DEF` in `lib/rw.tsx`.
- **Global styles:** `lib/rw-css.ts`.

## Deploying to Vercel

The app lives in the `reachwise/` subfolder of this repo, so:

1. Go to vercel.com → **Add New… → Project** and import this GitHub repo.
2. Set **Root Directory** to `reachwise`. The framework is auto-detected as Next.js, and the default build settings are fine.
3. Deploy. Every push then redeploys, and other branches get preview URLs.

If you prefer the CLI, run `npx vercel` from inside `reachwise/`.

## Before going live

- **Images:**
  - Photos, logos and avatars are still hotlinked from `framerusercontent.com`. Most are in `content/site.ts`, plus a few defaults in `RwHero`, `RwServices` and `RwFeed`.
  - Move them into `public/` (or a CDN you own) and update the URLs.
- **Links:**
  - The nav and buttons point at `#section` anchors and placeholder URLs: the booking link, the socials, and the footer's "Made with Framer".
  - Swap in the real ones in `content/site.ts` and the section defaults.
- **Forms:** the CTA email form has no backend. Wire it to your form or CRM provider.
- **Pages:** only `/` exists. For more pages, add `app/<route>/page.tsx` and compose sections there, the same way `HomePage.tsx` does.
