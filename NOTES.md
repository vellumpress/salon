# NOTES — Salon vs full Vellum

Renamed from **Vellum Lite** to **Salon**. The user-facing brand is Salon; the GitHub repo, Pages path (`/vellum-lite/`), and `localStorage` key (`vellum-lite-v1`) stay as they are so the live URL and existing reader progress keep working.

Salon is a reading-first twin of [Vellum](https://vellumpress.vercel.app/), not a port of the whole product. The live app and its private source (`vellumpress/vellumpress`: TanStack Start, chamber-reader, `shelf.ts`, Mondrian UI) were used as reference only. Nothing was pushed back to that repository.

A live UX study of the full product (Sep 2026) confirmed overlapping modes, a crowded intro veil, and chrome that mixed reading with Curator/Shuffle. Salon follows those findings.

## Primary destinations

| Salon | Full Vellum |
| --- | --- |
| Discover `/` | Home, minus Rituals / Curator / Sit pillars |
| Read `/read/$workId` | Chamber reader, minus pair/RTC and extra CTAs |
| You `/you` | Profile, minus following / clubs / auth |
| Shuffle `/shuffle` | Shuffle time-pick, minus Alone / With a friend |

No Clubs, Map, Stores, Rituals, Curator, Hourglass, Desk, `/form`, or Page import routes.

## Kept

- Paper/ink Mondrian board: 1px ink gutters, Cormorant + Outfit, red / blue / yellow / forest / paper blocks.
- Home shelf: quiet mark, search across title / author / year, jump-back-in from local progress, curated rail (seeded shuffle of the local catalog, no backend), form rails (Novels / Stories / Poems / Plays).
- One heart/favorite action in `localStorage` (no separate Keep).
- Intro veil: one primary **Begin**, plus a single duration control (12 min / 20 min / Open) — not 5/12/20/30/Sit/Open + custom minutes as competing CTAs.
- Reader chrome: Back, TOC, a visible progress bar + percent, optional sit timer, font size. No Curator or Shuffle links in the top bar.
- Shuffle: time pick → title → open on this phone only.
- Starter catalog with real public-domain text, preferring Vellum’s local binds (especially *In Our Time* 1925, never PG 61085; *Banjo* as a local bind).

## Cut from v1

| Full Vellum | Salon |
| --- | --- |
| Rituals, Curator, Hourglass | Gone — overlapping “how to start” modes |
| Sit with someone / pair / RTC | Gone |
| Clubs, Map, Stores, Desk, `/form` stub | Gone |
| Page import | Gone |
| Better Auth, following | Replaced by a local You page |
| Postgres / PGlite, notices backend | Gone |
| Leaflet maps | Gone |
| Chamber-reader (one “breath” at a time) | Scrolling page of the same texts |
| Keep + heart + Send | Heart only |
| Six competing veil session buttons | Begin + one sit control |
| Shuffle + Curator in reader chrome | Reader stays on the page |
| Three giant home pillars | Intentionally absent |

## Next

Salon will center **timed routines/sits** and **live reading + chat book clubs**. Clubs and rituals are not out of scope forever — they are the next core after this rename.

## Catalog notes

- Years are first-publication (or first English collection) years from Vellum’s shelf, not copyright-expiry math.
- *In Our Time* is the 1925 Boni & Liveright local bind (opens “Everybody was drunk.”). It is not Project Gutenberg #61085.
- *Banjo* (McKay, 1929) is a local bind with no Gutenberg id in the source shelf.
- Other titles were taken from Vellum’s shipped local text modules (themselves Gutenberg / public-domain editions). Apparatus such as transcriber notes was stripped where it was easy to detect.

## Tech

Vite 7 + React 19 + TypeScript + TanStack Router + Tailwind v4. Deploy as a static GitHub Pages SPA under `/vellum-lite/` (`vercel.json` remains for optional Vercel deploys). State key: `vellum-lite-v1` in `localStorage`.
