# Dialogue formatting (hard rule)

For Literary Editor, Thea, and bind agents. Applies to **plays, novels, and short stories** — anywhere attributed speech is split across breaths.

## Speaker and spoken line share one breath

```
Lopakhin: What’s up with you, Dunyasha...?
```

Never a cue-only breath, then the line on the next breath:

```
LOPAKHIN.
What’s up with you, Dunyasha...?
```

A lone speaker label (`LOPAKHIN.`, `DUNYASHA.`, `HEADMAN.`, `JEAN [Smelling the food].`, or an equivalent ALL CAPS name standing alone) is not a breath of its own. Title-case the speaker and prefix **each** following dialogue breath with `Speaker: ` until the next speaker cue.

## Do not prefix

- ACT / SCENE / CHAPTER / CHARACTERS / CURTAIN (and the same as headers)
- Pure stage directions with no speech (`[Pause.]`, `[Exit.]`, `[_There's no answer._]`)
- Plain narration (scene-setting, authorial description, journal headings, signatures)

## Bind / rewrite

When a local pack still has cue-only breaths, merge them before it ships:

1. Drop the cue-only breath (keep any leading `[stage]` on that same breath).
2. Title-case the speaker (`LOPAKHIN` → `Lopakhin`, `MRS. MUSKAT` → `Mrs. Muskat`).
3. Prefix each following dialogue breath `Speaker: ` until the next speaker cue.
4. Keep shelf `opening` in sync if it was a bare cue.

The catalog guard in `src/lib/catalog/dialogue-formatting.test.ts` fails if any local `texts/` or `openings/` pack still contains cue-only breaths.
