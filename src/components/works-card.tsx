import { Link } from "@tanstack/react-router";
import { PlaceChip } from "@/components/place-chip";
import type { ShelfWork } from "@/lib/catalog/shelf";
import { prefetchWork } from "@/lib/prefetch-work";

/**
 * Homepage carousel card: title, author, country outline.
 * Curated sections reuse this exact mark — do not fork the layout.
 */
export function WorksCard({
  work,
  title = work.title,
  author = work.author,
}: {
  work: ShelfWork;
  title?: string;
  author?: string;
}) {
  return (
    <Link
      to="/read/$workId"
      params={{ workId: work.id }}
      preload="intent"
      onPointerDown={() => prefetchWork(work.id)}
      onFocus={() => prefetchWork(work.id)}
      className="works-card"
    >
      <span className="works-title">{title}</span>
      <span className="works-author">{author}</span>
      <PlaceChip work={work} tone="accent" className="works-place" />
    </Link>
  );
}
