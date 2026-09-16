import { Link } from "@tanstack/react-router";
import type { Work } from "../catalog/works";
import { cn } from "../lib/hash";
import {
  fillClass,
  fillForWork,
  inkClass,
  type Fill,
} from "../lib/mondrian";
import { FavoriteButton } from "./FavoriteButton";

type Props = {
  work: Work;
  fill?: Fill;
  rail?: "feature" | "unit";
  ratio?: number;
};

export function WorkCard({ work, fill, rail, ratio = 0 }: Props) {
  const tone = fill ?? fillForWork(work.id);
  const featured = rail === "feature" && Boolean(work.opening);

  return (
    <Link
      to="/read/$workId"
      params={{ workId: work.id }}
      className={cn(
        "relative flex min-h-0 flex-col justify-end overflow-hidden p-3 sm:p-4",
        rail === "feature" && "rail-feature",
        rail === "unit" && "rail-unit",
        !rail && "cell-unit",
        fillClass(tone),
        inkClass(tone),
      )}
    >
      {featured ? (
        <span className="mb-3 line-clamp-3 font-serif text-sm leading-snug opacity-80 sm:text-base">
          {work.opening}
        </span>
      ) : null}
      <span className="font-sans text-xs tracking-wide opacity-70">
        {work.author}
        <span className="opacity-60"> · {work.year}</span>
      </span>
      <span
        className={cn(
          "mt-1 font-display font-medium leading-tight tracking-tight",
          featured
            ? "text-xl sm:text-2xl lg:text-3xl"
            : "text-sm sm:text-base lg:text-lg",
        )}
      >
        {work.title}
      </span>
      {work.pitch ? (
        <span className="mt-1.5 line-clamp-4 font-serif text-xs leading-snug opacity-75 sm:text-sm">
          {work.pitch}
        </span>
      ) : null}
      {ratio > 0 ? (
        <span
          className={cn(
            "absolute bottom-0 left-0 h-1",
            tone === "yellow" || tone === "paper" ? "bg-ink" : "bg-paper",
          )}
          style={{ width: `${Math.max(10, ratio * 100)}%`, opacity: 0.5 }}
        />
      ) : null}
      <FavoriteButton
        workId={work.id}
        compact
        className={cn(
          "absolute right-1 top-1 z-10 border border-ink/20",
          tone === "yellow" || tone === "paper"
            ? "bg-paper/90 text-ink"
            : "bg-ink/25 text-paper",
        )}
      />
    </Link>
  );
}
