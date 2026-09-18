import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function CuratorButton({
  from,
  className,
  quiet = false,
}: {
  from?: string;
  className?: string;
  quiet?: boolean;
}) {
  return (
    <Link
      to="/curator"
      search={from ? { from } : {}}
      aria-label="Talk to the curator"
      className={cn(
        "inline-flex shrink-0 items-center justify-center px-3 font-sans text-sm sm:px-4",
        quiet
          ? "h-full self-stretch border-l border-ink/15 bg-paper text-ink"
          : "h-12 bg-yellow text-ink",
        className,
      )}
    >
      Curator
    </Link>
  );
}
