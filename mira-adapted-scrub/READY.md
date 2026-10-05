# READY — Adapted novel pull + pipeline scrub

Base: `ebe333b` (PR #240 The Fresco). Does not re-stamp #239 or #240.

## Pulled off the live shelf: **11**

LOCAL_WORKS **1196 → 1185** (−11).

| slug | title |
|---|---|
| `madame-bovary-tokyo` | Bovary Tokyo |
| `dorian-gray-shanghai` | Dorian Gray Shanghai |
| `anna-karenina-milan` | Anna Karenina Milan |
| `jane-eyre-singapore` | Jane Eyre Singapore |
| `pride-prejudice-buenos-aires` | Pride and Prejudice Buenos Aires |
| `dracula-istanbul` | Dracula Istanbul |
| `crime-punishment-cape-town` | Crime and Punishment Cape Town |
| `age-of-innocence-venice` | Age of Innocence Venice |
| `tess-lisbon` | Tess Lisbon |
| `scarlet-letter-kyoto` | Scarlet Letter Kyoto |
| `wuthering-heights-rio` | Wuthering Heights Rio |

Archive (off-shelf, not deleted): `src/lib/catalog/off-shelf/novel-remakes/`
(`texts/` + `openings/` for each slug). See `README.md` in that folder.

## Scrubbed in remaining live works: **11 sentences**

See `SCRUB.md`. Short Adapted sits (the live 14) had no pipeline breaths.

## Gate

`src/lib/catalog/pipeline-leak.test.ts` fails the test run if a pipeline phrase appears in reader-facing bound breaths or in shelf intros, blurbs, pitches, prefaces, and bound notes. Allowlist is empty.

## Pack

- Folder: `mira-adapted-scrub/`
- Archive: `mira-adapted-scrub.tgz`
- Checksum file: `mira-adapted-scrub.tgz.md5`
