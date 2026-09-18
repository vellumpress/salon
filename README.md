# Salon

A calm, phone-first reading app for public-domain classics. This repository is the GitHub Pages twin of [Vellum](https://vellumpress.vercel.app/): same catalog and chamber reader, named **Salon**.

The product name is Salon. The GitHub repo and Pages path stay `vellum-lite`.

This tree is a full mirror of Vellum V4 (`c9c405`), including every local catalog text and opening (389 each). Do not thin the catalog to save size.

On GitHub Pages the app is a **static SPA**. Reading, shuffle, rituals, and local progress work in the browser. Live accounts, clubs, and RTC sitting need a hosted backend (see below).

## Public URL

Live on GitHub Pages: **https://vellumpress.github.io/vellum-lite/**

Pushes to `main` run `.github/workflows/deploy-pages.yml`. Vite/`tanstackStart` use `base` `/vellum-lite/`. Deep links fall back through `dist/404.html` (a copy of the SPA shell).

## Local run

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:8080/vellum-lite/`).

```bash
npm run build
npm run preview
```

`npm run build` emits a static `dist/` folder for Pages. `pnpm` and `bun` install/build the same way if you prefer those clients.

Optional Vercel output (server functions + Nitro `vercel` preset):

```bash
npm run build:vercel
```

## What works on Pages (no secrets)

- Discover, search, form rails, rituals, shuffle, curator UI (picks fail closed without an LLM backend)
- Chamber reader for all **389 local binds** (texts + openings stay in `src/lib/catalog/texts` and `src/lib/catalog/openings`)
- Progress, favorites, kept breaths — `localStorage` (`vellum-v1`)
- Share links that stay on this origin (`/vellum-lite/read/…`)

## Env / backend gaps (not on Pages)

Pages has no Node server. These stay off unless you host the app with a real backend and set the flags. **Do not commit secrets.**

| Feature | Needs | Pages behavior |
| --- | --- | --- |
| Sign-in / staff desk | `VITE_AUTH_ENABLED=true`, Better Auth secret, OAuth broker, `DATABASE_URL` | Disabled. Profile is local. `/login` explains the gap. |
| Synced favorites / reading | Auth + Postgres / PGlite | Local only. |
| Book clubs / invites | `VITE_LIVE_BACKEND=true` + DB | Create/list/join fail closed; cards stay local. |
| Sit-together RTC | `/api/rtc` signaling + optional `VITE_STUN_URLS` | Room shows “needs a server”; no mesh. |
| Curator replies | Server function + model API key | UI loads; ask fails with a quiet error. |
| Gutenberg-only shelf rows | Server fetch (`fetchShelfWork`) | Local binds still open. Remote-only titles have no text on Pages. |
| Page import / sentence share | Server extract + DB | Routes load; actions fail closed. |

Placeholder flags (already in `.grok/app-env.json` for this static build):

```
VITE_AUTH_ENABLED=false
VITE_LIVE_BACKEND=false
# DATABASE_URL=
# BETTER_AUTH_SECRET=
# VITE_STUN_URLS=
```

## Catalog

389 locally bound works with full text and openings. Years and rights notes come from the V4 shelf. English-off ids stay unlistable as full-text reads.

## Tech

TanStack Start (SPA mode) + Vite + React 19 + Tailwind v4. Default production build targets GitHub Pages under `/vellum-lite/`.
