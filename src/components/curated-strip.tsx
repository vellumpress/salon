import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { WorksCard } from "@/components/works-card";
import { usePersistHydrated } from "@/components/resume-link";
import { GUEST_CURATORS } from "@/lib/catalog/curated";
import { homeMixRows, mixHistoryFromState } from "@/lib/catalog/home-mix";
import { dayKey } from "@/lib/day-key";
import { useTbr } from "@/lib/store";

/**
 * Homepage Curated block. Daily rows from this phone's reading, or from the
 * signed-in shelf once it has synced into the same store. Guest lists stay
 * one tap away. Remakes stay at /adapted.
 */
export function CuratedStrip() {
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

  return (
    <section className="cell-curated" aria-label="Curated" data-home-curated="" data-mix-ready={ready ? "1" : "0"} data-mix-day={day ?? ""}>
      <div className="curated-head">
        <span className="adapted-kicker type-kicker">Curated</span>
        {GUEST_CURATORS.length > 0 ? (
          <Link to="/curated" preload="intent" className="curated-lists type-chrome">
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
