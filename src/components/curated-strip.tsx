import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DoorCarousel } from "@/components/door-carousel";
import { WorksCard } from "@/components/works-card";
import { usePersistHydrated } from "@/components/resume-link";
import { GUEST_CURATORS } from "@/lib/catalog/curated";
import { homeMixRows, mixHistoryFromState, type MixRow } from "@/lib/catalog/home-mix";
import { curatedDoorSlides, DOOR_LOOP_SECONDS } from "@/lib/home-doors";
import { dayKey } from "@/lib/day-key";
import { mosaicFills, type Fill } from "@/lib/mondrian";
import { useTbr } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Homepage Curated door. One block, same shape as Rituals and Read together.
 * The daily rows live on /curated. Guest lists stay one tap from that page.
 */
export function useDailyMix() {
  const hydrated = usePersistHydrated();
  const progress = useTbr((state) => state.progress);
  const favorites = useTbr((state) => state.favorites);
  const sitHistory = useTbr((state) => state.sitHistory);
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    setDay(dayKey(Date.now()));
  }, []);

  const ready = Boolean(hydrated && day);
  const rows = useMemo(() => {
    if (!day) return [];
    const history = ready ? mixHistoryFromState({ progress, favorites, sitHistory }) : mixHistoryFromState(null);
    return homeMixRows(history, day);
  }, [day, ready, progress, favorites, sitHistory]);

  return { ready, day, rows };
}

export function mixTeaser(rows: MixRow[]) {
  const lead = rows[0];
  if (!lead) return "A few shelves for today.";
  const names = lead.cards
    .slice(0, 3)
    .map((card) => card.work.title.trim())
    .filter(Boolean);
  if (names.length === 0) return lead.title;
  return `${lead.title}. ${names.join(", ")}.`;
}

const CURATED_PALETTE: Fill[] = ["yellow", "red", "blue", "forest", "paper", "ink"];
const BOLD_FILLS = new Set<Fill>(["yellow", "red", "blue", "forest"]);

export type CuratedBlockSize = "hero" | "wide" | "pair-a" | "pair-b" | "unit";

export function isPersonalRow(id: string) {
  return id.startsWith("because:") || id === "start" || id === "finish";
}

/** Personal rows lead, and the first of them is the largest block. */
export function curatedBlockSizes(rows: readonly { id: string }[]): CuratedBlockSize[] {
  const catalogCount = rows.filter((row) => !isPersonalRow(row.id)).length;
  let catalogSeen = 0;
  return rows.map((row, index) => {
    if (isPersonalRow(row.id) && index === 0) return "hero";
    if (isPersonalRow(row.id)) return "wide";
    const remaining = catalogCount - catalogSeen;
    catalogSeen += 1;
    if (remaining === 1) return "unit";
    return catalogSeen % 2 === 1 ? "pair-a" : "pair-b";
  });
}

/** The lead block is a saturated color, and neighbors never share a fill. */
export function curatedBlockFills(count: number, seed: string): Fill[] {
  const fills = mosaicFills(count, seed, CURATED_PALETTE);
  if (fills.length === 0) return fills;
  const next = [...fills];
  if (!BOLD_FILLS.has(next[0]!)) {
    const boldAt = next.findIndex((fill) => BOLD_FILLS.has(fill));
    if (boldAt > 0) {
      const [picked] = next.splice(boldAt, 1);
      next.unshift(picked!);
    } else {
      next[0] = "yellow";
    }
  }
  for (let i = 1; i < next.length; i++) {
    if (next[i] !== next[i - 1]) continue;
    const swap = next.findIndex(
      (fill, index) => index > i && fill !== next[i - 1] && (next[i + 1] == null || fill !== next[i + 1]),
    );
    if (swap > i) {
      const hold = next[i]!;
      next[i] = next[swap]!;
      next[swap] = hold;
      continue;
    }
    const alt = CURATED_PALETTE.find(
      (fill) => fill !== next[i - 1] && (next[i + 1] == null || fill !== next[i + 1]),
    );
    if (alt) next[i] = alt;
  }
  return next;
}

export function CuratedStrip({ fill }: { fill: Fill }) {
  const { ready, day, rows } = useDailyMix();
  const teaser = mixTeaser(rows);
  const slides = useMemo(() => curatedDoorSlides(rows), [rows]);

  return (
    <DoorCarousel
      door="curated"
      label="Curated"
      aria={`Curated. ${teaser}`}
      fill={fill}
      seconds={DOOR_LOOP_SECONDS.curated}
      slides={slides}
      cta={{ kind: "curated", label: "See today's picks" }}
      mark={{
        "data-home-curated": "",
        "data-mix-ready": ready ? "1" : "0",
        "data-mix-day": day ?? "",
      }}
    />
  );
}

/** Every daily row, as a Mondrian block. Guest lists stay on this page. */
export function CuratedRows() {
  const { ready, day, rows } = useDailyMix();
  const shown = rows
    .map((row) => ({
      ...row,
      cards: row.cards.filter((card) => card.work.title.trim() && card.blurb.trim() && card.time.trim()),
    }))
    .filter((row) => row.cards.length > 0);
  const fills = curatedBlockFills(shown.length, `curated-${day ?? "today"}`);
  const sizes = curatedBlockSizes(shown);

  return (
    <section
      className="curated-mosaic"
      aria-label="Curated"
      data-curated-rows=""
      data-mix-ready={ready ? "1" : "0"}
      data-mix-day={day ?? ""}
    >
      {GUEST_CURATORS.length > 0 ? (
        <Link to="/curated/lists" preload="intent" className="curated-lists-block">
          <span className="type-kicker">Today</span>
          <span className="type-chrome">Guest lists</span>
        </Link>
      ) : null}
      {shown.map((row, index) => {
        const headingId = `mix-${row.id.replace(/[^a-z0-9]+/gi, "-")}`;
        const fill = fills[index] ?? "yellow";
        const size = sizes[index] ?? "unit";
        return (
          <div
            key={row.id}
            className={cn("curated-block", `is-${fill}`, `is-${size}`)}
            data-mix-row={row.id}
            data-block-fill={fill}
            data-block-size={size}
          >
            <h2 id={headingId} className="curated-block-title pillar-title">
              {row.title}
            </h2>
            <div className="cell-works curated-lane">
              <div className="works-scroller is-snap" role="list" aria-labelledby={headingId}>
                {row.cards.map((card) => (
                  <WorksCard
                    key={card.work.id}
                    work={card.work}
                    blurb={card.blurb}
                    time={card.time}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
