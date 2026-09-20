# Salon

A calm, phone-first reading app for public-domain classics. This repository is the GitHub Pages twin of [Vellum](https://vellumpress.vercel.app/): same catalog and chamber reader, named **Salon**.

The product name is Salon. The GitHub repo and Pages path are `salon`.

This tree is a full mirror of Vellum V4 (`c9c405`), including every local catalog text and opening (392 each). Do not thin the catalog to save size.

On GitHub Pages the app is a **static SPA**. Reading, shuffle, rituals, local progress, and **reader sign-up / sign-in** work in the browser. Synced accounts, clubs, and RTC sitting need a hosted backend (see below).

## Public URL

Live on GitHub Pages: **https://vellumpress.github.io/salon/**

Pushes to `main` run `.github/workflows/deploy-pages.yml`. Vite/`tanstackStart` use `base` `/salon/`. Deep links fall back through `dist/404.html` (a copy of the SPA shell).

Add to Home Screen on iPhone uses the name **Salon** (`apple-mobile-web-app-title` + web app manifest) and a Mondrian red / blue / green icon.

## Local run

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:8080/salon/`).

```bash
npm run build
npm run preview
```

`npm run build` emits a static `dist/` folder for Pages. `npm run preview` serves that folder at `/salon/` with the same `404.html` fallback GitHub Pages uses. `pnpm` and `bun` install/build the same way if you prefer those clients.

Optional Vercel output (server functions + Nitro `vercel` preset):

```bash
npm run build:vercel
```

## What works on Pages (no secrets)

- Discover, search, form rails, rituals, shuffle, curator UI (picks fail closed without an LLM backend)
- Chamber reader for all **392 local binds** (texts + openings stay in `src/lib/catalog/texts` and `src/lib/catalog/openings`)
- Progress, favorites, kept breaths — `localStorage` (`vellum-v1`)
- Continue-reading on Home (header + primary resume cell) from that same local progress
- Friends: claim an `@username`, follow Salon readers, see what they are sitting — local-first
- Reader accounts on **You** (`/profile`) and `/login`: `@username` + email + password. First visit creates; return visits sign in. Session restores after a hard refresh from `localStorage` (`salon-reader-v1`). Password is stored as a PBKDF2 hash, never plaintext. The same `@handle` is shared with Friends so a name is not claimed twice on this phone.
- Share links that stay on this origin (`/salon/read/…`)

## Env / backend gaps (not on Pages)

Pages has no Node server. These stay off unless you host the app with a real backend and set the flags. **Do not commit secrets.**

| Feature | Needs | Pages behavior |
| --- | --- | --- |
| Reader sign-up / sign-in | Works offline on this device (`salon-reader-v1`) | Create account and sign in on You / login. Session survives refresh. Not synced across phones. |
| Hosted Better Auth / staff desk | `VITE_AUTH_ENABLED=true`, `VITE_LIVE_BACKEND=true`, Better Auth secret, OAuth broker, `DATABASE_URL` | Flags stay false on Pages so the fake Dev User is not treated as signed in. When a hosted backend is on, You / login also call `authClient.signUp.email` / `signIn.email`. Staff desk stays closed here. |
| Synced favorites / reading | Auth + Postgres / PGlite | Local only. |
| Friends graph / `@username` | Hosted follow + handle APIs (none in this tree yet) | Local `localStorage` graph. Catalog readers are followable offline. Cross-device / other-user sync needs a live backend. |
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

392 locally bound works with full text and openings. Years and rights notes come from the V4 shelf. English-off ids stay unlistable as full-text reads.

## Tech

TanStack Start (SPA mode) + Vite + React 19 + Tailwind v4. Default production build targets GitHub Pages under `/salon/`.
