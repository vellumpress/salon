import { createFileRoute, Link } from "@tanstack/react-router";
import { curatedSitCount, GUEST_CURATORS } from "@/lib/catalog/curated";
import { ResumeLink } from "@/components/resume-link";

export const Route = createFileRoute("/curated")({
  component: CuratedHub,
});

function CuratedHub() {
  return (
    <main className="board board-alive board-adapted">
      <div className="cell-mark flex bg-paper">
        <Link
          to="/"
          className="type-chrome inline-flex h-full shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Home
        </Link>
        <span className="type-mark flex h-full min-w-0 flex-1 items-center self-stretch bg-paper px-4 text-ink">
          Curated
        </span>
        <ResumeLink />
      </div>

      <div className="cell-adapted-intro">
        <span className="type-kicker opacity-70">Curated</span>
        <span className="type-lede mt-1">Guest lists.</span>
        <span className="type-pitch mt-2 max-w-xl opacity-80">
          What readers like Emmeline chose — their notes, and the sits already
          on the shelf.
        </span>
      </div>

      <nav className="cell-adapted-lane" aria-label="Guest curators">
        <div className="adapted-lane">
          {GUEST_CURATORS.map((curator) => {
            const sits = curatedSitCount(curator);
            const sitLabel = sits === 1 ? "1 sit" : `${sits} sits`;
            return (
              <Link
                key={curator.slug}
                to="/curated/$slug"
                params={{ slug: curator.slug }}
                preload="intent"
                className="adapted-row"
              >
                <span className="type-kicker opacity-70">Guest list · {sitLabel}</span>
                <span className="type-card mt-1">{curator.name}</span>
                <span className="type-pitch mt-1.5 opacity-75">{curator.note}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
