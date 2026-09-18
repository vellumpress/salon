import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PLACED_WORKS, regionsFromPlaced, type PlacedWork } from "@/lib/literature-geo";
import { TitlesMap } from "@/components/titles-map";
import { prefetchWork } from "@/lib/works";
import { mixSeed, takeShuffled } from "@/lib/recommend";
import { useVisitSeed } from "@/lib/use-visit-seed";

export const Route = createFileRoute("/map")({
  component: MapPage,
});

function MapPage() {
  const visit = useVisitSeed();
  const [place, setPlace] = useState<string>("All");
  const [onlyReadable, setOnlyReadable] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const regions = useMemo(() => {
    const base = regionsFromPlaced(PLACED_WORKS);
    return takeShuffled(base, mixSeed(visit, "map-regions"));
  }, [visit]);

  const works = useMemo(() => {
    const filtered = PLACED_WORKS.filter((w) => {
      if (onlyReadable && !w.readable) return false;
      if (place !== "All" && w.place !== place) return false;
      return true;
    });
    return takeShuffled(filtered, mixSeed(visit, `map-works-${place}-${onlyReadable}`));
  }, [place, onlyReadable, visit]);

  const active: PlacedWork | undefined = works.find((w) => w.id === selected) ?? works[0];

  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/"
          className="inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 font-sans text-sm text-paper"
        >
          Home
        </Link>
        <h1 className="flex min-w-0 flex-1 items-center px-4 font-display text-xl font-medium tracking-tight">
          Map
        </h1>
        <label className="inline-flex h-12 shrink-0 items-center gap-2 border-l border-ink px-3 font-sans text-xs tracking-wide">
          <input
            type="checkbox"
            checked={onlyReadable}
            onChange={(e) => setOnlyReadable(e.target.checked)}
          />
          Full text
        </label>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="map-pane">
          <TitlesMap
            works={works}
            selected={active?.id ?? null}
            onSelect={(id) => {
              setSelected(id);
              prefetchWork(id);
            }}
          />
        </div>
        <aside className="min-h-0 flex-1 overflow-y-auto border-t border-ink md:h-full md:w-[22rem] md:flex-none md:border-t-0 md:border-l">
          <div className="border-b border-ink px-4 py-3">
            <p className="font-sans text-xs tracking-wide text-muted">
              {works.length} titles · by literary geography
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                className={`rounded-full px-2.5 py-1 font-sans text-[0.7rem] tracking-wide ${place === "All" ? "bg-ink text-paper" : "bg-paper-deep text-ink"}`}
                onClick={() => setPlace("All")}
              >
                All
              </button>
              {regions.slice(0, 18).map((r) => (
                <button
                  key={r.label}
                  type="button"
                  className={`rounded-full px-2.5 py-1 font-sans text-[0.7rem] tracking-wide ${place === r.label ? "bg-ink text-paper" : "bg-paper-deep text-ink"}`}
                  onClick={() => setPlace(r.label)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {active ? (
            <div className="border-b border-ink px-4 py-4">
              <p className="font-sans text-[0.65rem] uppercase tracking-[0.16em] text-muted">
                {active.place}
              </p>
              <p className="mt-1 font-display text-xl font-medium tracking-tight leading-tight">
                {active.title}
              </p>
              <p className="mt-1 font-serif text-sm text-muted">
                {active.author}
                <span aria-hidden="true"> · </span>
                {active.year}
                <span aria-hidden="true"> · </span>
                {active.language}
              </p>
              {active.readable ? (
                <Link
                  to="/read/$workId"
                  params={{ workId: active.id }}
                  onPointerDown={() => prefetchWork(active.id)}
                  className="mt-4 inline-flex h-10 items-center bg-ink px-4 font-sans text-sm text-paper"
                >
                  Read
                </Link>
              ) : (
                <p className="mt-3 font-sans text-xs tracking-wide text-muted">
                  On the shelf — full text not bound yet
                </p>
              )}
            </div>
          ) : null}
          <div>
            {works.slice(0, 120).map((work) => (
              <button
                key={work.id}
                type="button"
                onClick={() => {
                  setSelected(work.id);
                  prefetchWork(work.id);
                }}
                className={`flex w-full flex-col items-start border-b border-ink px-4 py-3 text-left ${work.id === active?.id ? "bg-paper-deep" : "bg-paper"}`}
              >
                <span className="font-serif text-base leading-snug">{work.title}</span>
                <span className="mt-0.5 font-sans text-xs tracking-wide text-muted">
                  {work.author}
                  <span aria-hidden="true"> · </span>
                  {work.place}
                  {work.readable ? "" : " · door"}
                </span>
              </button>
            ))}
            {works.length > 120 ? (
              <p className="px-4 py-3 font-sans text-xs text-muted">
                Showing 120 of {works.length} — narrow by place
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
