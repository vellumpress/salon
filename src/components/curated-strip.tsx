import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { WorksCard } from "@/components/works-card";
import { usePersistHydrated } from "@/components/resume-link";
import { GUEST_CURATORS } from "@/lib/catalog/curated";
import { homeMixRows, mixHistoryFromState, type MixRow } from "@/lib/catalog/home-mix";
import { dayKey } from "@/lib/day-key";
import { fillClass, fillInk, type Fill } from "@/lib/mondrian";
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

export function CuratedStrip({ fill }: { fill: Fill }) {
  const { ready, day, rows } = useDailyMix();
  const teaser = mixTeaser(rows);

  return (
    <Link
      to="/curated"
      preload="intent"
      aria-label={`Curated. ${teaser}`}
      data-home-curated=""
      data-mix-ready={ready ? "1" : "0"}
      data-mix-day={day ?? ""}
      className={cn(
        "cell-pillar cell-curated-door relative flex min-h-0 flex-col justify-end p-5 sm:p-8",
        fillClass(fill),
        fillInk(fill),
      )}
    >
      <span className="type-kicker opacity-70">Today</span>
      <span className="pillar-title mt-1">Curated</span>
      <span className="type-pitch pillar-pitch curated-teaser mt-2.5">{teaser}</span>
    </Link>
  );
}

/** Every daily row. Guest lists stay on this page. */
export function CuratedRows() {
  const { ready, day, rows } = useDailyMix();

  return (
    <section
      className="cell-curated"
      aria-label="Curated"
      data-curated-rows=""
      data-mix-ready={ready ? "1" : "0"}
      data-mix-day={day ?? ""}
    >
      <div className="curated-head">
        <span className="adapted-kicker type-kicker">Today</span>
        {GUEST_CURATORS.length > 0 ? (
          <Link to="/curated/lists" preload="intent" className="curated-lists type-chrome">
            Guest lists
          </Link>
        ) : null}
      </div>
      {rows.map((row) => {
        const headingId = `mix-${row.id.replace(/[^a-z0-9]+/gi, "-")}`;
        return (
          <div key={row.id} className="curated-row" data-mix-row={row.id}>
            <h2 id={headingId} className="curated-row-title type-lede">
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
