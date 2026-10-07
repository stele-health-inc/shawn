// Downloads every image still hotlinked from Framer's CDN into public/images/ and rewrites the
// source files to point at the local copy, so the site no longer depends on framerusercontent.com.
//   npm run images:localize
// Safe to re-run: files already downloaded are skipped, and rewritten sources no longer match.
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"

const ROOT = new URL("..", import.meta.url).pathname
const DIRS = ["content", "components", "lib", "app"]
const OUT = join(ROOT, "public", "images")
const URL_RE = /https:\/\/framerusercontent\.com\/images\/([A-Za-z0-9_-]+\.(?:webp|jpe?g|png|gif|avif|svg))(?:\?[^"'`\s|;)]*)?/g

async function* walk(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
        const p = join(dir, e.name)
        if (e.isDirectory()) yield* walk(p)
        else if (/\.(ts|tsx|js|jsx|css)$/.test(e.name)) yield p
    }
}

const exists = (p) => stat(p).then(() => true, () => false)

await mkdir(OUT, { recursive: true })
let downloaded = 0, rewritten = 0, failed = 0
for (const d of DIRS) {
    if (!(await exists(join(ROOT, d)))) continue
    for await (const file of walk(join(ROOT, d))) {
        const src = await readFile(file, "utf8")
        const names = [...new Set([...src.matchAll(URL_RE)].map((m) => m[1]))]
        if (!names.length) continue
        const ok = new Set()
        for (const name of names) {
            const dest = join(OUT, name)
            if (await exists(dest)) { ok.add(name); continue }
            // Cap originals at 2048px wide; the site's optimizer serves smaller sizes from this copy.
            const url = `https://framerusercontent.com/images/${name}` + (name.endsWith(".svg") ? "" : "?scale-down-to=2048")
            try {
                const res = await fetch(url)
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                await writeFile(dest, Buffer.from(await res.arrayBuffer()))
                ok.add(name)
                downloaded++
                console.log(`  ↓ ${name}`)
            } catch (err) {
                failed++
                console.error(`  ✗ ${name}: ${err.message}`)
            }
        }
        const out = src.replace(URL_RE, (m, name) => (ok.has(name) ? `/images/${name}` : m))
        if (out !== src) {
            await writeFile(file, out)
            rewritten++
            console.log(`✎ ${file.slice(ROOT.length)}`)
        }
    }
}
console.log(`\n${downloaded} downloaded, ${rewritten} files rewritten, ${failed} failed`)
if (failed) process.exit(1)
