import { Link } from "@tanstack/react-router";
import { DailyScoreChip } from "@/components/daily-score-chip";
import { cn } from "@/lib/utils";

const slot =
  "type-chrome flex h-full shrink-0 items-center self-stretch border-l border-ink/15 bg-paper px-4 text-ink [touch-action:manipulation]";

/**
 * Top-mark Friends + You. Today's score joins this row only when the
 * homepage Continue block is not on screen — otherwise the score lives
 * in that block, and a second chip would compete with it.
 */
export function YouFriendsMark({
  className,
  showScore = false,
}: {
  className?: string;
  showScore?: boolean;
}) {
  return (
    <>
      <Link to="/friends" preload="intent" className={cn(slot, className)}>
        Friends
      </Link>
      {showScore ? <DailyScoreChip /> : null}
      <Link to="/profile" preload="intent" className={cn(slot, className)}>
        You
      </Link>
    </>
  );
}
