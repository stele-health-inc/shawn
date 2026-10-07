# Reachwise — site template

The Reachwise agency site (THE REACH design), rebuilt as a standalone **Next.js (App Router)** app from the 15 original Framer code components. It doesn't use the Framer package, editor or hosting: it builds and runs on its own and deploys to Vercel like any React project.

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
| `lib/controls.ts` | The small property-controls API the sections use to declare their props and defaults. |
| `scripts/localize-images.mjs` | One-off: copies the images still hosted on Framer's CDN into `public/images/` and rewrites the URLs. |

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

The app lives in the `reachwise/` subfolder, and the repo's default branch holds a different app (the Instagram saves library) at its root. So give Reachwise **its own Vercel project**. Don't change the Root Directory of an existing project for the other app.

1. Go to vercel.com → **Add New… → Project** and import this GitHub repo. You can import the same repo more than once.
2. Under **Root Directory**, click **Edit** and pick `reachwise`. The framework is detected as Next.js, and the default build settings are fine.
3. Deploy:
   - The first, production deploy builds the repo's **default branch**. That branch has no `reachwise/` folder yet, so this deploy fails.
   - Pushes to other branches get **preview** deployments, and this branch has one.
   - To get a working production deploy, either merge this branch into the default branch, or change the production branch to this one (Project → Settings → Environments → Production → Branch Tracking).

If you prefer the CLI, run `npx vercel` from inside `reachwise/`.

## Before going live

- **Images:**
  - About 25 photos, logos and avatars still load from Framer's CDN (`framerusercontent.com`).
  - Run `npm run images:localize` once on a machine with internet access, then commit `public/images/` and the rewritten files. After that every image is served from this site, resized by Vercel's image optimizer.
  - To use your own photos, drop them in `public/images/` and reference them as `/images/name.webp` in `content/site.ts`.
- **Links:**
  - The nav and buttons point at `#section` anchors and placeholder URLs, such as the booking link and the socials.
  - Swap in the real ones in `content/site.ts` and the section defaults.
- **Forms:** the CTA email form has no backend. Wire it to your form or CRM provider.
- **Pages:** only `/` exists. For more pages, add `app/<route>/page.tsx` and compose sections there, the same way `HomePage.tsx` does.
