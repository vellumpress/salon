# Vellum Lite

A calm, phone-first reading app for public-domain classics. Same paper/ink Mondrian shelf as [Vellum](https://vellumpress.vercel.app/), cut to three destinations: **Discover**, **Read**, and **You**.

No account. No backend. Progress and favorites live in `localStorage`.

## Local run

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

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

## Vercel deploy

This is a Vite SPA. From a GitHub repo:

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Deploy.

`vercel.json` already rewrites every path to `index.html`, so `/read/$workId`, `/you`, and `/shuffle` work on refresh.

CLI alternative:

```bash
npx vercel
```

No environment variables are required.

## Using it

- **Discover (`/`)** — quiet header (You, not three pillars), search (title / author / year), jump-back-in, curated rail, form rails. Heart on a card is the only save action.
- **You (`/you`)** — continue, favorites, and light stats (opened / favorites / finished).
- **Shuffle (`/shuffle`)** — pick a duration, see the title, open it on this phone. No “with a friend.”
- **Read (`/read/$workId`)** — intro veil with one Begin plus an optional 12 / 20 / Open sit control. Chrome is Back, TOC, a progress bar, optional timer, and type size.
