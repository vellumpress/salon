# NOTES — Salon vs full Vellum

Renamed from **Vellum Lite** to **Salon**. The user-facing brand is Salon; the GitHub repo, Pages path (`/vellum-lite/`), and `localStorage` key (`vellum-lite-v1`) stay as they are so the live URL and existing reader progress keep working.

Salon is a reading-first twin of [Vellum](https://vellumpress.vercel.app/), not a port of the whole product. The live app and its private source (`vellumpress/vellumpress`: TanStack Start, chamber-reader, `shelf.ts`, Mondrian UI) were used as reference only. Nothing was pushed back to that repository.

A live UX study of the full product (Sep 2026) confirmed overlapping modes, a crowded intro veil, and chrome that mixed reading with Curator/Shuffle. Salon follows those findings — then restored the **one-breath chamber** so the read itself feels like production, not a scrolling article.

## Primary destinations

| Salon | Full Vellum |
| --- | --- |
| Discover `/` | Home, minus Rituals / Curator / Sit pillars |
| Read `/read/$workId` | Chamber reader: one breath at a time, Keep, Hourglass. No pair/RTC, Send, or extra CTAs |
| You `/you` | Profile, minus following / clubs / auth |
| Shuffle `/shuffle` | Shuffle time-pick, minus Alone / With a friend |

No Clubs, Map, Stores, Rituals, Curator, Desk, `/form`, or Page import routes. Live sitting-room RTC is out of scope.

## Reader upgrade (chamber)

The old Salon reader was a scrolling page with paragraph progress. Production Vellum is a **one-breath chamber** — one sentence or short line unit at a time, faded lookback, Keep, and a real sand hourglass. Salon now matches that feel.

- **Breaths.** Catalog JSON (chapters → paragraphs) is split at read time into breaths: sentences for prose, existing short lines for poems/plays. Long sentences break on a semicolon, dash, or clause so the current line stays on the page.
- **Advance / retreat.** Tap or click the right or left half of the pane, swipe, Arrow keys, Space / Enter to go forward. A short lock after each step keeps the page from racing.
- **Lookback.** Up to twelve prior breaths sit faded above the current line (`.breath-now`). Huge paper, serif current line, muted previous lines.
- **Progress.** `breathIndex` is persisted in `vellum-lite-v1`. Older `paragraphIndex` / `scrollRatio` records migrate to the first breath of that paragraph (`breathMigrated`). Shelf cards still show a quiet ratio from `scrollRatio` (breath index / last breath).
- **Keep.** Footer **Keep** toggles the current breath id (red when kept). Kept breaths appear as dots you can jump back to. Keyboard: `K` when no overlay is open. Separate from the whole-work Favorite/heart.
- **Veil.** Opening a work always shows the threshold: title, intro, sit presets, one **Begin** (or Continue). Starting a sit writes `sittingStartedAt`. Shuffle skips the veil and starts immediately.
- **Hourglass sitting.** Presets match production: **5 / 12 / 20 / 30 / Sit / Open**. Compact SVG hourglass in the footer; tap it to change duration (restarts the sit). Yellow sand empties over the sitting; a stream draws while it runs. When time elapses, a gentle cue (“The sand has run. Stay as long as you like.”) offers Continue or Again — not a harsh interrupt.
- **Chrome.** Back, chapter/scene label (opens a reached-chapters spine), Keep, Favorite, Hourglass. No percentage-bar hero, no type-size buttons, no Curator / Shuffle / Send in the reader. Header/footer Keep chrome fades after stillness; the glass stays.

## Kept

- Paper/ink Mondrian board: 1px ink gutters, Cormorant + Outfit, red / blue / yellow / forest / paper blocks.
- Home shelf: quiet mark, search across title / author / year, jump-back-in from local progress, curated rail (seeded shuffle of the local catalog, no backend), form rails (Novels / Stories / Poems / Plays).
- Favorite/heart for a whole work, plus Keep for a single breath.
- Shuffle: time pick → title → open on this phone only.
- Starter catalog with real public-domain text, preferring Vellum’s local binds (especially *In Our Time* 1925, never PG 61085; *Banjo* as a local bind).

## Cut from this build

| Full Vellum | Salon |
| --- | --- |
| Rituals, Curator | Gone — overlapping “how to start” modes |
| Sit with someone / pair / RTC | Gone (do not rebuild sitting-room) |
| Clubs, Map, Stores, Desk, `/form` stub | Gone |
| Page import | Gone |
| Better Auth, following | Replaced by a local You page |
| Postgres / PGlite, notices backend | Gone |
| Leaflet maps | Gone |
| Send phone / private sentence share | Gone |
| Shuffle + Curator in reader chrome | Reader stays in the chamber |
| Three giant home pillars | Intentionally absent |

## Next

Salon will center **timed routines/sits** and **live reading + chat book clubs**. Clubs and rituals are not out of scope forever — they are the next core after the chamber.

## Catalog notes

- Years are first-publication (or first English collection) years from Vellum’s shelf, not copyright-expiry math.
- *In Our Time* is the 1925 Boni & Liveright local bind (opens “Everybody was drunk.”). It is not Project Gutenberg #61085.
- *Banjo* (McKay, 1929) is a local bind with no Gutenberg id in the source shelf.
- Other titles were taken from Vellum’s shipped local text modules (themselves Gutenberg / public-domain editions). Apparatus such as transcriber notes was stripped where it was easy to detect.

## Tech

Vite 7 + React 19 + TypeScript + TanStack Router + Tailwind v4. Deploy as a static GitHub Pages SPA under `/vellum-lite/` (`vercel.json` remains for optional Vercel deploys). `base` stays `/vellum-lite/`. Deep links copy `index.html` to `dist/404.html` so Pages serves the SPA shell. State key: `vellum-lite-v1` in `localStorage`.
