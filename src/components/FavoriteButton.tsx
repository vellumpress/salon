import { cn } from "../lib/hash";
import { toggleFavorite, useFavorites } from "../lib/use-shelf";

type Props = {
  workId: string;
  compact?: boolean;
  className?: string;
};

export function FavoriteButton({ workId, compact = false, className }: Props) {
  const [favorites] = useFavorites();
  const on = favorites.includes(workId);

  return (
    <button
      type="button"
      aria-label={on ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={on}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-sans",
        compact ? "size-8 text-base leading-none" : "h-12 px-4 text-sm",
        className,
        on && "bg-red text-paper",
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(workId);
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}
