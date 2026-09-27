# Saves — personal Instagram saves library

Send an Instagram reel or post link and it gets fetched, transcribed, auto‑tagged and filed into a sortable, Instagram‑style feed. Review the backlog story‑style: flip a card, confirm tags, pick a status, swipe to the next one.

- **Feed**: thumbnail grid with creator handle, tags and a status dot on every card. Tapping a thumbnail opens the original post on Instagram (no video hosting here).
- **Review mode**: tap a card's handle/tags (or "Review N unreviewed") → full‑screen card. Tap the card to flip to the script. Auto‑suggested tags are pre‑filled; tap to remove, tap a `+ topic` to add. `Keep` / `Content` / `Done` saves and jumps to the next one. Keyboard: `←` `→`, `K` `C` `D`, `Space` to flip, `Esc` to close. On phones, swipe left/right.
- **Auto‑tagging**: Claude cleans the transcript into a readable script, pulls out the hook and a one‑line summary, picks a category, tags by topic (health, faith, business, fitness, editing, hooks) plus a few specific tags, and flags posts worth remaking with a note on how.
- **Export**: "Copy for Notion" copies the script, hook, notes and metadata as Markdown that pastes into Notion as proper blocks.

## How it works

| Step | Service |
| --- | --- |
| Resolve the post (creator, caption, date, media URLs) | [Apify `instagram-scraper`](https://apify.com/apify/instagram-scraper) |
| Store thumbnails / post images (Instagram links expire) | Supabase Storage |
| Speech → text | [Deepgram](https://deepgram.com) (`nova-3`) |
| Script clean‑up, tags, category, remake flag | Claude API (`claude-opus-5`) |
| Database | Supabase Postgres |
| Hosting | Vercel (Next.js) |

Processing runs in the background after the save is created (≈20–60 s per reel); the feed shows a spinner and refreshes on its own. Failed items get a Retry button.

## Setup (about 15 minutes)

1. **Supabase**: create a project, open *SQL Editor* and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). This creates the `saves` table and a public `media` bucket. Copy the project URL and the `service_role` key from *Project Settings → API*.
2. **API keys**: an [Apify](https://console.apify.com/settings/integrations) token, a [Deepgram](https://console.deepgram.com) key and an [Anthropic](https://console.anthropic.com) key.
3. **Deploy to Vercel**: import this repo, then add the variables from [`.env.example`](.env.example) under *Settings → Environment Variables*. `APP_PASSWORD` is what you type to log in; `API_KEY` is a long random string for agents and shortcuts (`openssl rand -hex 32`).
4. Open the site, log in, paste a link.

Local dev: `cp .env.example .env.local`, fill it in, `npm install && npm run dev`.

## Adding saves

**From the web app**: paste a link into the top bar (focusing it offers the Instagram link on your clipboard).

**Android**: open the site in Chrome → *Add to Home screen*. "Saves" then appears in Instagram's share sheet.

**iPhone**: make a Shortcut that shows in the share sheet:
1. *Receive* **URLs** from **Share Sheet**.
2. *Get contents of* `https://YOUR-APP.vercel.app/api/saves`, method **POST**, header `Authorization: Bearer YOUR_API_KEY`, request body **JSON** with `url` = *Shortcut Input*.
3. (Optional) *Show notification* "Saved".

Then in Instagram: Share → Shortcuts → your shortcut.

**Any browser**: `https://YOUR-APP.vercel.app/share?url=<instagram link>`.

## API (for AI agents)

All endpoints accept `Authorization: Bearer $API_KEY`.

```bash
# Add a save (returns immediately; processing continues in the background)
curl -X POST https://YOUR-APP.vercel.app/api/saves \
  -H "Authorization: Bearer $API_KEY" -H "content-type: application/json" \
  -d '{"url": "https://www.instagram.com/reel/XXXX/", "notes": "optional", "tags": ["optional"]}'

# List / filter: status, tag, category, remake=true, q (text search), sort=posted, order=asc, limit
curl "https://YOUR-APP.vercel.app/api/saves?status=content&tag=hooks" -H "Authorization: Bearer $API_KEY"

# Read one (check processing_state: pending | processing | ready | error)
curl https://YOUR-APP.vercel.app/api/saves/ID -H "Authorization: Bearer $API_KEY"

# Update: tags, category, status (unreviewed|keep|content|done), remake_idea, remake_note, notes, transcript
curl -X PATCH https://YOUR-APP.vercel.app/api/saves/ID \
  -H "Authorization: Bearer $API_KEY" -H "content-type: application/json" \
  -d '{"status": "keep", "tags": ["business", "hooks"]}'

# Re-run fetch/transcribe/tag, or delete
curl -X POST   https://YOUR-APP.vercel.app/api/saves/ID/retry -H "Authorization: Bearer $API_KEY"
curl -X DELETE https://YOUR-APP.vercel.app/api/saves/ID       -H "Authorization: Bearer $API_KEY"
```

Posting the same post twice returns the existing save (`"created": false`).

## Data model

Each save stores: `url`, `creator`, `posted_at`, `saved_at`, `thumbnail_url`, `transcript` (clean script) and `raw_transcript`, `caption`, `summary`, `hook`, `tags`, `category`, `status`, `remake_idea`, `remake_note`, `notes`, plus `processing_state` / `error`. See the migration for the full schema.

## Costs (rough, per reel)

Apify ≈ $0.002–0.005 · Deepgram ≈ $0.004/min · Claude ≈ $0.01–0.03. Vercel and Supabase free tiers cover personal use.
