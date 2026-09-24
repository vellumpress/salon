import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { usePersistHydrated } from "@/components/resume-link";
import { dailyScoreGlance } from "@/lib/reading-score";
import { deriveReadingStats } from "@/lib/reading-stats";
import { useTbr } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Glanceable today's score. The number is `deriveReadingStats(...).dailyScore`
 * — the same path the You page hero uses, including day-ledger backfill.
 * Week and month stay on You.
 *
 * `mark` sits in the top bar when Continue is hidden. `continue` is the
 * score tile on the right of the homepage resume cell.
 */
export function DailyScoreChip({
  className,
  placement = "mark",
}: {
  className?: string;
  placement?: "mark" | "continue";
}) {
  const hydrated = usePersistHydrated();
  const progress = useTbr((s) => s.progress);
  const favorites = useTbr((s) => s.favorites);
  const readingMinutesByDay = useTbr((s) => s.readingMinutesByDay);
  const advancesByDay = useTbr((s) => s.advancesByDay);
  const sceneCrossesByDay = useTbr((s) => s.sceneCrossesByDay);
  const keepsByDay = useTbr((s) => s.keepsByDay);
  const worksTouchedByDay = useTbr((s) => s.worksTouchedByDay);
  const hostOpensByDay = useTbr((s) => s.hostOpensByDay);
  const sitsByDay = useTbr((s) => s.sitsByDay);
  const clubTouchesByDay = useTbr((s) => s.clubTouchesByDay);
  const lastActiveReadAt = useTbr((s) => s.lastActiveReadAt);
  const sitHistory = useTbr((s) => s.sitHistory);
  const togetherKeeps = useTbr((s) => s.togetherKeeps);
  const hostedSits = useTbr((s) => s.hostedSits);
  const handle = useTbr((s) => s.handle);
  const sittingMinutes = useTbr((s) => s.sittingMinutes);

  const daily = useMemo(() => {
    if (!hydrated) return null;
    return deriveReadingStats({
      progress,
      favorites,
      readingMinutesByDay,
      advancesByDay,
      sceneCrossesByDay,
      keepsByDay,
      worksTouchedByDay,
      hostOpensByDay,
      sitsByDay,
      clubTouchesByDay,
      lastActiveReadAt,
      sitHistory,
      togetherKeeps,
      hostedSits,
      handle,
      sittingMinutes,
    }).dailyScore;
  }, [
    hydrated,
    progress,
    favorites,
    readingMinutesByDay,
    advancesByDay,
    sceneCrossesByDay,
    keepsByDay,
    worksTouchedByDay,
    hostOpensByDay,
    sitsByDay,
    clubTouchesByDay,
    lastActiveReadAt,
    sitHistory,
    togetherKeeps,
    hostedSits,
    handle,
    sittingMinutes,
  ]);

  const text = dailyScoreGlance(daily);
  const quiet = text === "—";
  const inContinue = placement === "continue";

  return (
    <Link
      to="/profile"
      preload="intent"
      data-home-daily-score={quiet ? "quiet" : text}
      data-score-place={placement}
      aria-label={
        quiet
          ? "Today’s reading score, not yet. Open You."
          : `Today’s reading score ${text}. Open You.`
      }
      className={cn(
        "daily-score-chip type-chrome flex flex-col items-center justify-center [touch-action:manipulation]",
        inContinue
          ? "daily-score-chip--continue min-h-11 shrink-0 self-stretch"
          : cn(
              "h-full shrink-0 self-stretch border-l border-ink/15",
              quiet ? "bg-paper-deep text-ink/45" : "bg-yellow text-ink",
            ),
        className,
      )}
    >
      <span className={cn("type-kicker", quiet ? "opacity-55" : "opacity-70")}>Today</span>
      <span className="daily-score-num type-card" aria-hidden="true">
        {text}
      </span>
    </Link>
  );
}
