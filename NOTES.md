# NOTES — Vellum Lite vs full Vellum

Vellum Lite is a reading-first twin of [Vellum](https://vellumpress.vercel.app/), not a port of the whole product. The live app and its private source (`vellumpress/vellumpress`: TanStack Start, chamber-reader, `shelf.ts`, Mondrian UI) were used as reference only. Nothing was pushed back to that repository.

## Kept

- Paper/ink Mondrian board: 1px ink gutters, Cormorant + Outfit, red / blue / yellow / forest / paper blocks.
- Home shelf: quiet mark, search across title / author / year, jump-back-in from local progress, curated rail (seeded shuffle of the local catalog, no backend), form rails (Novels / Stories / Poems / Plays), favorites in `localStorage`.
- Reader at `/read/$workId`: intro veil + Begin when a work has a note, then typography-first scrolling. Minimal chrome (home, progress, type size). Progress persists locally.
- Shuffle: one tap to a random readable local work.
- Starter catalog with real public-domain text, preferring Vellum’s local binds (especially *In Our Time* 1925, never PG 61085; *Banjo* as a local bind).

## Cut from v1

| Full Vellum | Lite |
| --- | --- |
| Rituals (hour lanes, before-sleep stacks) | Gone |
| The Curator | Gone |
| Sit with someone / pair / RTC | Gone — Shuffle does not ask how long, does not mint a pair |
| Clubs, Map, Stores, Hourglass, Desk | Gone |
| Page import | Gone |
| Better Auth, profile, following | Gone |
| Postgres / PGlite, notices backend | Gone |
| Leaflet maps | Gone |
| Chamber-reader (one “breath” at a time, lookback slot, weigh/still) | Replaced with a calm scrolling page of the same texts |
| TanStack Start + server functions that hydrate openings then full texts | Vite SPA; JSON catalog in `public/catalog` |
| ~700-work shelf (many metadata-only + Gutenberg fetch) | Fourteen fully readable local titles |
| Three giant home pillars (Rituals / Curator / Sit with someone) | Intentionally absent so reading is the first paint |

## Catalog notes

- Years are first-publication (or first English collection) years from Vellum’s shelf, not copyright-expiry math.
- *In Our Time* is the 1925 Boni & Liveright local bind (opens “Everybody was drunk.”). It is not Project Gutenberg #61085.
- *Banjo* (McKay, 1929) is a local bind with no Gutenberg id in the source shelf.
- Other titles were taken from Vellum’s shipped local text modules (themselves Gutenberg / public-domain editions). Apparatus such as transcriber notes was stripped where it was easy to detect.

## Tech

Vite 7 + React 19 + TypeScript + TanStack Router + Tailwind v4. Deploy as a static Vercel SPA. State key: `vellum-lite-v1` in `localStorage`.
