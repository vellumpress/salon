import { Link } from "@tanstack/react-router";
import { ADAPTED_WORKS } from "@/lib/catalog/full-pdf";

/**
 * Homepage Adapted by Salon entry — a compact gateway, not a remake carousel.
 * Remakes stay off the locked recommend / Next / classics Works strip.
 * The full list lives at /adapted. Rituals still lists remakes in their lanes.
 */
export function AdaptedStrip() {
  const count = ADAPTED_WORKS.length;
  if (count === 0) return null;
  const sits = count === 1 ? "1 sit" : `${count} sits`;

  return (
    <Link
      to="/adapted"
      preload="intent"
      className="cell-adapted"
      aria-label={`Adapted by Salon — ${sits}. Open the remake lane.`}
    >
      <span className="adapted-copy">
        <span className="adapted-kicker type-kicker">Adapted by Salon</span>
        <span className="adapted-pitch type-kicker">
          Salon remakes of older pages · {sits}
        </span>
      </span>
      <span className="adapted-enter type-chrome">Enter</span>
    </Link>
  );
}
