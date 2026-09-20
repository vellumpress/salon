# V4 mirror provenance

Synced from https://github.com/vellumpress/vellumpress/releases/tag/v4
Commit: c9c405365f4ea436b982b4e65ede0845d8cf8332
Includes full catalog texts/openings (390 each). Do not delete or thin them.

User-facing product name: **Salon**. Repo and Pages path are `salon`.

Deploy target: GitHub Pages at **https://vellumpress.github.io/salon/**

The V4 tree expects auth, RTC (`/api/rtc`), clubs, and other server functions. The Pages build is a static SPA (`base` `/salon/`, workflow `.github/workflows/deploy-pages.yml`). Those live features need env + a hosted backend; the static client still loads and degrades. See README.
