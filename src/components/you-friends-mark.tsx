import { Link } from "@tanstack/react-router";
import { DailyScoreChip } from "@/components/daily-score-chip";
import { cn } from "@/lib/utils";

const slot =
  "type-chrome flex h-full shrink-0 items-center self-stretch border-l border-ink/15 bg-paper px-4 text-ink [touch-action:manipulation]";

/** Top-mark Friends + today's score + You — same chrome, Friends first. */
export function YouFriendsMark({
  className,
}: {
  className?: string;
}) {
  return (
    <>
      <Link to="/friends" preload="intent" className={cn(slot, className)}>
        Friends
      </Link>
      <DailyScoreChip />
      <Link to="/profile" preload="intent" className={cn(slot, className)}>
        You
      </Link>
    </>
  );
}
