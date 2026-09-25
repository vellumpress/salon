import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  curatedPicks,
  curatedReadableId,
  curatedShelfTitle,
  curatedSitCount,
  guestCurator,
  type CuratedPick,
} from "@/lib/catalog/curated";
import { ResumeLink } from "@/components/resume-link";
import { prefetchWork } from "@/lib/works";

export const Route = createFileRoute("/curated_/$slug")({
  component: CuratedListPage,
});

function CuratedListPage() {
  const { slug } = Route.useParams();
  const curator = guestCurator(slug);

  useEffect(() => {
    if (!curator) return;
    for (const pick of curatedPicks(curator)) {
      const id = curatedReadableId(pick.workId);
      if (id) prefetchWork(id);
    }
  }, [curator]);

  return (
    <main className="board board-alive board-adapted">
      <div className="cell-mark flex bg-paper">
        <Link
          to="/"
          className="type-chrome inline-flex h-full shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Home
        </Link>
        <span className="type-mark flex h-full min-w-0 flex-1 items-center self-stretch truncate bg-paper px-4 text-ink">
          {curator?.name ?? "Curated"}
        </span>
        <ResumeLink />
        <Link
          to="/curated"
          preload="intent"
          className="type-chrome flex h-full shrink-0 items-center self-stretch border-l border-ink/15 bg-paper px-4 text-ink"
        >
          Lists
        </Link>
      </div>

      {curator ? (
        <>
          <div className="cell-adapted-intro">
            <span className="type-kicker opacity-70">Curated</span>
            <span className="type-lede mt-1">{curator.name}</span>
            <span className="type-pitch mt-2 max-w-xl opacity-80">{curator.note}</span>
            <span className="type-kicker mt-3 opacity-60">
              {curatedSitCount(curator) === 1
                ? "1 English sit"
                : `${curatedSitCount(curator)} English sits`}
            </span>
          </div>

          <div className="cell-adapted-lane">
            <div className="adapted-lane">
              {curator.groups.flatMap((group) => {
                const nodes: ReactNode[] = [];
                if (group.label) {
                  nodes.push(
                    <div key={`${group.id}-label`} className="curated-section type-kicker">
                      {group.label}
                    </div>,
                  );
                }
                for (const entry of group.entries) {
                  nodes.push(
                    <article
                      key={entry.pick.key}
                      className="adapted-row"
                      data-curated-entry={entry.pick.key}
                    >
                      <PickBody pick={entry.pick} />
                      {entry.alt ? (
                        <div className="curated-or">
                          <span className="type-kicker opacity-50">or</span>
                          <PickBody pick={entry.alt} />
                        </div>
                      ) : null}
                    </article>,
                  );
                }
                return nodes;
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="cell-adapted-intro">
          <span className="type-kicker opacity-70">Curated</span>
          <span className="type-lede mt-1">That list isn’t here.</span>
          <Link to="/curated" className="type-chrome mt-4 inline-flex min-h-11 items-center">
            Guest lists
          </Link>
        </div>
      )}
    </main>
  );
}

function PickBody({ pick }: { pick: CuratedPick }) {
  const workId = curatedReadableId(pick.workId);
  const shelfTitle = curatedShelfTitle(pick);
  const body = (
    <>
      <span className="type-kicker opacity-70">
        {pick.year}
        <span className="opacity-60"> · {pick.place}</span>
      </span>
      <span className="type-kicker mt-1 opacity-70">{pick.author}</span>
      <span className="type-card mt-1">{pick.title}</span>
      {shelfTitle ? (
        <span className="type-kicker mt-1 opacity-60">Reads here as {shelfTitle}</span>
      ) : null}
      <span className="type-pitch mt-1.5 opacity-75">{pick.blurb}</span>
      {workId ? null : (
        <span className="type-kicker mt-2 opacity-55">
          {pick.unavailable ?? "Not yet an English sit"}
        </span>
      )}
    </>
  );

  if (!workId) {
    return (
      <div data-curated-pick={pick.key} data-readable="0">
        {body}
      </div>
    );
  }

  return (
    <Link
      to="/read/$workId"
      params={{ workId }}
      preload="intent"
      onPointerDown={() => prefetchWork(workId)}
      onFocus={() => prefetchWork(workId)}
      className="curated-open"
      data-curated-pick={pick.key}
      data-readable="1"
      aria-label={`Read ${pick.title} by ${pick.author}`}
    >
      {body}
    </Link>
  );
}
