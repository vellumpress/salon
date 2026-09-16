import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  FORM_RAILS,
  WORKS,
  getWork,
  searchWorks,
  worksByForm,
} from "../catalog/works";
import { visitSeed, seededShuffle } from "../lib/hash";
import { fillSequence } from "../lib/mondrian";
import { randomWork } from "../lib/shuffle";
import { setLastShuffle } from "../lib/storage";
import { useShelf } from "../lib/use-shelf";
import { ShelfRail, progressRatio } from "../components/ShelfRail";
import { WorkCard } from "../components/WorkCard";

export function HomePage() {
  const navigate = useNavigate();
  const progress = useShelf((s) => s.progress);
  const favorites = useShelf((s) => s.favorites);
  const lastShuffle = useShelf((s) => s.lastShuffle);
  const [query, setQuery] = useState("");
  const visit = visitSeed();
  const searching = Boolean(query.trim());
  const matches = useMemo(() => searchWorks(query), [query]);
  const curated = useMemo(
    () => seededShuffle(WORKS, `curated-${visit}`).slice(0, 5),
    [visit],
  );
  const curatedFills = useMemo(
    () => fillSequence(curated.length, `curated-${visit}`),
    [curated.length, visit],
  );
  const jumpBack = useMemo(
    () =>
      WORKS.filter((work) => {
        const item = progress[work.id];
        return Boolean(item?.entered && (item.paragraphIndex > 0 || item.scrollRatio > 0));
      })
        .sort(
          (a, b) =>
            (progress[b.id]?.lastOpenedAt ?? 0) -
            (progress[a.id]?.lastOpenedAt ?? 0),
        )
        .slice(0, 12),
    [progress],
  );
  const favoriteWorks = useMemo(
    () =>
      favorites
        .map((id) => getWork(id))
        .filter((work): work is NonNullable<typeof work> => Boolean(work)),
    [favorites],
  );

  function shuffleNow() {
    const work = randomWork(lastShuffle ?? undefined);
    setLastShuffle(work.id);
    void navigate({ to: "/read/$workId", params: { workId: work.id } });
  }

  return (
    <main className="board board-alive">
      <div className="cell-mark flex bg-paper">
        <span className="flex h-full min-w-0 flex-1 items-center self-stretch bg-paper px-4 font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
          Vellum
          <span className="ml-2 font-sans text-[0.65rem] uppercase tracking-[0.14em] text-muted">
            Lite
          </span>
        </span>
        <button
          type="button"
          onClick={shuffleNow}
          className="flex h-full shrink-0 items-center self-stretch border-l border-ink/15 bg-paper px-4 font-sans text-sm text-ink"
        >
          Shuffle
        </button>
      </div>

      <div className="cell-search flex items-stretch bg-paper">
        <label
          htmlFor="shelf-search"
          className="flex shrink-0 items-center px-3 font-sans text-[0.65rem] uppercase tracking-[0.14em] text-muted"
        >
          Search
        </label>
        <input
          id="shelf-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Title, author, year"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-9 min-w-0 flex-1 border-0 bg-transparent font-serif text-base text-ink placeholder:text-muted/70 focus-visible:outline-none sm:text-lg"
        />
        <span className="flex shrink-0 items-center px-3 font-sans text-[0.65rem] tabular-nums tracking-wide text-muted">
          {searching ? matches.length : WORKS.length}
        </span>
      </div>

      {searching ? (
        matches.length === 0 ? (
          <div className="cell-wide flex min-h-0 flex-col justify-end bg-paper p-5 text-ink">
            <span className="font-sans text-xs tracking-wide opacity-70">
              The shelf
            </span>
            <span className="mt-1 font-display text-2xl font-medium tracking-tight">
              Nothing matches
            </span>
          </div>
        ) : (
          matches.map((work, index) => (
            <WorkCard
              key={work.id}
              work={work}
              fill={fillSequence(matches.length, `search-${query}`)[index]}
              ratio={progressRatio(progress[work.id])}
            />
          ))
        )
      ) : (
        <>
          <nav className="cell-more" aria-label="Library">
            <span className="more-kicker">Library</span>
            <div className="more-links">
              <button type="button" className="more-link" onClick={shuffleNow}>
                Shuffle
              </button>
              <span className="more-link text-muted">
                Public-domain classics, local
              </span>
            </div>
          </nav>

          {jumpBack.length > 0 ? (
            <ShelfRail
              label="Jump back in"
              items={jumpBack}
              progress={progress}
              visit={visit}
            />
          ) : null}

          {favoriteWorks.length > 0 ? (
            <ShelfRail
              label="Favorites"
              items={favoriteWorks}
              progress={progress}
              visit={visit}
            />
          ) : null}

          <div className="cell-label">
            <span className="font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
              Curated for you
            </span>
          </div>
          <div className="cell-rail" aria-label="Curated for you">
            <div className="rail">
              {curated.map((work, index) => (
                <WorkCard
                  key={work.id}
                  work={work}
                  fill={curatedFills[index]}
                  rail={index < 2 && work.opening ? "feature" : "unit"}
                  ratio={progressRatio(progress[work.id])}
                />
              ))}
            </div>
          </div>

          {FORM_RAILS.map((rail) => {
            const items = seededShuffle(
              worksByForm(rail.form),
              `form-${rail.form}-${visit}`,
            );
            if (items.length === 0) return null;
            return (
              <ShelfRail
                key={rail.form}
                label={rail.label}
                items={items}
                progress={progress}
                visit={visit}
              />
            );
          })}
        </>
      )}
    </main>
  );
}
