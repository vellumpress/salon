import { useVellum } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Heart toggle for a work — stops navigation when nested in a Link. */
export function FavoriteMark({
  workId,
  className,
  compact = false,
}: {
  workId: string;
  className?: string;
  compact?: boolean;
}) {
  const favorites = useVellum((s) => s.favorites) ?? [];
  const toggleFavorite = useVellum((s) => s.toggleFavorite);
  const on = favorites.includes(workId);

  return (
    <button
      type="button"
      aria-label={on ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={on}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-sans [touch-action:manipulation]",
        compact
          ? "size-8 text-base leading-none"
          : "h-12 px-4 text-sm",
        on ? "bg-red text-paper" : "bg-paper text-ink",
        className,
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(workId);
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}
