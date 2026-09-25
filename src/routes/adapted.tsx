import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ADAPTED_WORKS } from "@/lib/catalog/full-pdf";
import { blurbFor } from "@/lib/catalog/blurbs";
import { ritualDurationLabel } from "@/lib/catalog/rituals";
import { PlaceChip } from "@/components/place-chip";
import { ResumeLink } from "@/components/resume-link";
import { APP_NAME } from "@/lib/site";
import { prefetchWork } from "@/lib/prefetch-work";

export const Route = createFileRoute("/adapted")({
  component: AdaptedPage,
});

function AdaptedPage() {
  useEffect(() => {
    for (const work of ADAPTED_WORKS.slice(0, 4)) prefetchWork(work.id);
  }, []);

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
          Adapted
        </span>
        <ResumeLink />
        <Link
          to="/rituals"
          preload="intent"
          className="type-chrome flex h-full shrink-0 items-center self-stretch border-l border-ink/15 bg-paper px-4 text-ink"
        >
          Rituals
        </Link>
      </div>

      <div className="cell-adapted-intro">
        <span className="type-kicker opacity-70">Adapted by {APP_NAME}</span>
        <span className="type-lede mt-1">
          Remakes of older pages — {APP_NAME} originals.
        </span>
        <span className="type-pitch mt-2 max-w-xl opacity-80">
          After public-domain sources. Open a sit here, or find the same works
          in Rituals where they already live.
        </span>
      </div>

      <nav className="cell-adapted-lane" aria-label={`Adapted by ${APP_NAME} remakes`}>
        <div className="adapted-lane">
          {ADAPTED_WORKS.map((work) => (
            <Link
              key={work.id}
              to="/read/$workId"
              params={{ workId: work.id }}
              preload="intent"
              onPointerDown={() => prefetchWork(work.id)}
              onFocus={() => prefetchWork(work.id)}
              className="adapted-row"
            >
              <span className="type-kicker opacity-70">
                {ritualDurationLabel(work)}
                <span className="opacity-60"> · {work.author}</span>
              </span>
              <span className="type-card mt-1">{work.title}</span>
              <PlaceChip work={work} className="mt-1.5 opacity-80" />
              <span className="type-pitch mt-1.5 line-clamp-3 opacity-75">
                {blurbFor(work)}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
