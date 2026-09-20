import { Link } from "@tanstack/react-router";
import { featuredWorks } from "@/lib/catalog/full-pdf";
import { PlaceChip } from "@/components/place-chip";
import { prefetchWork } from "@/lib/works";

/**
 * Homepage Featured rail — locked recommend order, not a shuffled classics strip.
 * Featured sits also remain in their ritual lanes.
 */
export function FeaturedStrip() {
  const items = featuredWorks();
  if (items.length === 0) return null;

  return (
    <nav className="cell-works cell-featured" aria-label="Featured">
      <div className="featured-kicker type-kicker">Featured</div>
      <div className="works-scroller">
        {items.map((work) => (
          <Link
            key={work.id}
            to="/read/$workId"
            params={{ workId: work.id }}
            preload="intent"
            onPointerDown={() => prefetchWork(work.id)}
            onFocus={() => prefetchWork(work.id)}
            className="works-card"
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
