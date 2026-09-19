import { placeFor, placeForId, type PlaceRef, type WorkPlace } from "@/lib/catalog/places";
import { REGION_SHAPES, REGION_TONE, type PlaceRegion } from "@/lib/catalog/region-shapes";
import { cn } from "@/lib/utils";

export function RegionSilhouette({
  region,
  className,
}: {
  region: PlaceRegion;
  className?: string;
}) {
  const shape = REGION_SHAPES[region];
  if (!shape) return null;
  return (
    <svg
      className={cn("place-chip-mark", className)}
      viewBox={shape.viewBox}
      aria-hidden="true"
      focusable="false"
    >
      <path d={shape.d} />
    </svg>
  );
}

export function PlaceChip({
  work,
  workId,
  place,
  tone = "inherit",
  className,
}: {
  work?: PlaceRef;
  workId?: string;
  place?: WorkPlace | null;
  /** inherit = currentColor; accent = Mondrian ink/red/blue/forest on paper. */
  tone?: "inherit" | "accent";
  className?: string;
}) {
  const resolved = place ?? (work ? placeFor(work) : workId ? placeForId(workId) : null);
  if (!resolved) return null;
  const accent = tone === "accent" ? REGION_TONE[resolved.region] : null;
  return (
    <span
      className={cn(
        "place-chip",
        accent === "red" && "place-chip-red",
        accent === "blue" && "place-chip-blue",
        accent === "forest" && "place-chip-forest",
        accent === "ink" && "place-chip-ink",
        className,
      )}
    >
      <RegionSilhouette region={resolved.region} />
      <span className="place-chip-label">{resolved.label}</span>
    </span>
  );
}
