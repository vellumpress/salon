import { Link } from "@tanstack/react-router";
import { PlaceChip } from "@/components/place-chip";
import type { ShelfWork } from "@/lib/catalog/shelf";
import { prefetchWork } from "@/lib/prefetch-work";

/**
 * Homepage carousel card: title, author, country outline.
 * Curated rows add the shelf blurb and the catalog time on the same mark.
 */
export function WorksCard({
  work,
  title = work.title,
  author = work.author,
  blurb,
  time,
}: {
  work: ShelfWork;
  title?: string;
  author?: string;
  blurb?: string;
  time?: string;
}) {
  const detail = blurb !== undefined || time !== undefined;
  const copy = blurb?.replace(/\s+/g, " ").trim() ?? "";
  const when = time?.trim() ?? "";
  if (detail && (!title.trim() || !copy || !when)) return null;

  return (
    <Link
      to="/read/$workId"
      params={{ workId: work.id }}
      preload="intent"
      onPointerDown={() => prefetchWork(work.id)}
      onFocus={() => prefetchWork(work.id)}
      className={detail ? "works-card has-detail" : "works-card"}
      data-work={work.id}
    >
      <span className="works-title">{title}</span>
      <span className="works-author">{author}</span>
      <PlaceChip work={work} tone="accent" className="works-place" />
      {detail ? (
        <>
          <span className="works-blurb type-pitch">{copy}</span>
          <span className="works-time type-kicker">{when}</span>
        </>
      ) : null}
    </Link>
  );
}
