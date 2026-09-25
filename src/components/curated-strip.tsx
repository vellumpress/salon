import { Link } from "@tanstack/react-router";
import { curatedStripCopy, GUEST_CURATORS } from "@/lib/catalog/curated";

/**
 * Homepage Curated entry — a compact gateway to guest lists.
 * Remakes stay at /adapted for deep links. Rituals can still list them.
 * Guest lists only — the chat curator stays on its own route.
 */
export function CuratedStrip() {
  if (GUEST_CURATORS.length === 0) return null;
  const { pitch, aria } = curatedStripCopy();

  return (
    <Link
      to="/curated"
      preload="intent"
      className="cell-adapted"
      aria-label={aria}
    >
      <span className="adapted-copy">
        <span className="adapted-kicker type-kicker">Curated</span>
        <span className="adapted-pitch type-kicker">{pitch}</span>
      </span>
      <span className="adapted-enter type-chrome">Enter</span>
    </Link>
  );
}
