# Salon

A calm, phone-first reading app for public-domain classics. Same paper/ink Mondrian shelf as [Vellum](https://vellumpress.vercel.app/), cut to three destinations: **Discover**, **Read**, and **You**.

Renamed from Vellum Lite. The product name is Salon; the GitHub repo and Pages path stay `vellum-lite`.

No account. No backend. Progress and favorites live in `localStorage`.

## Local run

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173/vellum-lite/`).

```bash
npm run build
npm run preview
```

`npm run build` typechecks and emits a static `dist/` folder.

## What’s on the shelf

Fourteen readable works, including the titles called out for this twin:

- Nella Larsen, *Passing* (1929)
- Joseph Sheridan Le Fanu, *Carmilla* (1872)
- Anzia Yezierska, *Hungry Hearts* (1920)
- Stephen Crane, *Maggie: A Girl of the Streets* (1893)
- Claude McKay, *Banjo* (1929) — local bind
- Ernest Hemingway, *In Our Time* (1925 Boni & Liveright local bind; not Project Gutenberg 61085)
- Edith Wharton, *The House of Mirth* (1905) and *Bunner Sisters* (1916)
- Lafcadio Hearn, *Kwaidan* (1904)
- Langston Hughes, *The Weary Blues* (1926)

Plus Blake, Strindberg, Tagore, and Čapek so the Novels / Stories / Poems / Plays rails all have company.

Texts follow Vellum’s local catalog binds (and Gutenberg/Standard-Ebooks-era public-domain editions where that is how Vellum ships the title). Publication years are historical, not invented.

## Public URL

Live on GitHub Pages: **https://vellumpress.github.io/vellum-lite/**

Pushes to `main` build with Vite (`base` `/vellum-lite/`) and deploy `dist/` via `.github/workflows/deploy-pages.yml`. Deep links fall back through `404.html` (a copy of `index.html`).

`vercel.json` remains for anyone who still deploys to Vercel; the public HTTPS URL for this repo is the Pages site above.

## Using it

- **Discover (`/`)** — quiet header (You, not three pillars), search (title / author / year), jump-back-in, curated rail, form rails. Heart on a card favorites the whole work.
- **You (`/you`)** — continue, favorites, and light stats (opened / favorites / finished).
- **Shuffle (`/shuffle`)** — pick a duration (5 / 12 / 20 / 30 / Sit / Open), see the title, open it on this phone. No “with a friend.”
- **Read (`/read/$workId`)** — one-breath chamber: veil with one Begin + sit length, then one sentence/line at a time with faded lookback. Keep a breath (separate from Favorite), tap the hourglass to sit, sand runs until a gentle end cue. Arrow keys, Space, and left/right taps move; `K` keeps. Deep links fall back through `404.html`.
