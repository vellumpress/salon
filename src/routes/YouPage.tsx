import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { visitSeed } from "../lib/hash";
import {
  continueWorks,
  favoriteWorks,
  shelfStats,
} from "../lib/shelf";
import { useShelf } from "../lib/use-shelf";
import { Mark } from "../components/Mark";
import { ShelfRail } from "../components/ShelfRail";

export function YouPage() {
  const shelf = useShelf((s) => s);
  const visit = visitSeed();
  const stats = useMemo(() => shelfStats(shelf), [shelf]);
  const jumpBack = useMemo(
    () => continueWorks(shelf).slice(0, 12),
    [shelf],
  );
  const liked = useMemo(() => favoriteWorks(shelf), [shelf]);

  return (
    <main className="board board-alive">
      <Mark current="you" />

      <div className="cell-label">
        <span className="font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
          You
        </span>
      </div>

      <div className="cell-stat bg-paper text-ink">
        <span className="font-sans text-[0.65rem] uppercase tracking-[0.14em] text-muted">
          Opened
        </span>
        <span className="font-display text-3xl font-medium tracking-tight">
          {stats.started}
        </span>
      </div>
      <div className="cell-stat bg-yellow text-ink">
        <span className="font-sans text-[0.65rem] uppercase tracking-[0.14em] opacity-70">
          Favorites
        </span>
        <span className="font-display text-3xl font-medium tracking-tight">
          {stats.favorites}
        </span>
      </div>
      <div className="cell-stat-wide bg-forest text-paper">
        <span className="font-sans text-[0.65rem] uppercase tracking-[0.14em] opacity-80">
          Finished
        </span>
        <span className="font-display text-3xl font-medium tracking-tight">
          {stats.finished}
        </span>
      </div>

      {jumpBack.length > 0 ? (
        <ShelfRail
          label="Continue"
          items={jumpBack}
          progress={shelf.progress}
          visit={visit}
        />
      ) : (
        <div className="cell-wide flex min-h-0 flex-col justify-end bg-paper p-5 text-ink">
          <span className="font-sans text-xs tracking-wide opacity-70">
            Continue
          </span>
          <span className="mt-1 font-display text-2xl font-medium tracking-tight">
            Nothing open yet
          </span>
          <Link to="/" className="mt-3 font-sans text-sm underline underline-offset-4">
            Discover the shelf
          </Link>
        </div>
      )}

      {liked.length > 0 ? (
        <ShelfRail
          label="Favorites"
          items={liked}
          progress={shelf.progress}
          visit={visit}
        />
      ) : (
        <div className="cell-wide flex min-h-0 flex-col justify-end bg-paper p-5 text-ink">
          <span className="font-sans text-xs tracking-wide opacity-70">
            Favorites
          </span>
          <span className="mt-1 font-display text-2xl font-medium tracking-tight">
            Tap the heart on a card
          </span>
        </div>
      )}
    </main>
  );
}
