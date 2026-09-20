import { Link } from "@tanstack/react-router";
import { ADAPTED_WORKS } from "@/lib/catalog/full-pdf";
import { PlaceChip } from "@/components/place-chip";
import { prefetchWork } from "@/lib/works";

/**
 * Homepage Adapted by Salon shelf — remakes only.
 * Kept off the classics Works strip and off Featured / Next tracks.
 */
export function AdaptedStrip() {
  if (ADAPTED_WORKS.length === 0) return null;

  return (
    <nav className="cell-adapted" aria-label="Adapted by Salon">
      <span className="adapted-kicker type-kicker">Adapted by Salon</span>
      <div className="adapted-scroller">
        {ADAPTED_WORKS.map((work) => (
          <Link
            key={work.id}
            to="/read/$workId"
            params={{ workId: work.id }}
            preload="intent"
            onPointerDown={() => prefetchWork(work.id)}
            onFocus={() => prefetchWork(work.id)}
            className="works-card adapted-card"
          >
            <span className="works-title">{work.title}</span>
            <span className="works-author">{work.author}</span>
            <PlaceChip work={work} tone="accent" className="works-place" />
          </Link>
        ))}
      </div>
    </nav>
  );
}
