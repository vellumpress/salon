import { shelfButtonLabel, shelfButtonName } from "@/lib/shelf-list";
import { useTbr } from "@/lib/store";
import { canonicalWorkId } from "@/lib/work-id-alias";
import { cn } from "@/lib/utils";

/** One-tap shelf toggle. Stops navigation when nested in a link. */
export function FavoriteMark({
  workId,
  className,
  compact = false,
}: {
  workId: string;
  className?: string;
  compact?: boolean;
}) {
  const favorites = useTbr((s) => s.favorites) ?? [];
  const toggleFavorite = useTbr((s) => s.toggleFavorite);
  const id = canonicalWorkId(workId);
  const on = favorites.includes(id);

  return (
    <button
      type="button"
      data-shelf-toggle={on ? "on" : "off"}
      aria-label={shelfButtonName(on)}
      aria-pressed={on}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-sans [touch-action:manipulation]",
        compact
          ? "size-8 text-base leading-none"
          : "h-12 whitespace-nowrap px-4 text-sm",
        on ? "bg-yellow text-ink" : "bg-paper text-ink",
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
      {compact ? (on ? "♥" : "♡") : shelfButtonLabel(on)}
    </button>
  );
}
