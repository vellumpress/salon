import { wordmarkInk, wordmarkStop, type WordmarkSurface } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Homepage lockup. Lowercase serif tbr plus the grid's square full stop.
 * The stop is a unit square, not a round period. No gloss under the mark.
 */
export function Wordmark({
  surface = "paper",
  className,
}: {
  surface?: WordmarkSurface;
  className?: string;
}) {
  return (
    <span
      className={cn("wordmark", className)}
      data-ink={wordmarkInk(surface)}
      data-stop={wordmarkStop(surface)}
      role="img"
      aria-label="tbr."
    >
      <span className="wordmark-name" aria-hidden="true">
        tbr
      </span>
      <span className="wordmark-stop" aria-hidden="true" />
    </span>
  );
}
