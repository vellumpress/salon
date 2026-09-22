import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { usePersistHydrated } from "@/components/resume-link";
import { dailyScoreGlance } from "@/lib/reading-score";
import { deriveReadingStats } from "@/lib/reading-stats";
import { useVellum } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Glanceable today's score in the homepage mark, between Friends and You.
 * The number is `deriveReadingStats(...).dailyScore` — the same path the
 * You page hero uses, including day-ledger backfill. Week and month stay
 * on You.
 */
export function DailyScoreChip({
  className,
}: {
  className?: string;
}) {
  const hydrated = usePersistHydrated();
  const progress = useVellum((s) => s.progress);
  const favorites = useVellum((s) => s.favorites);
  const readingMinutesByDay = useVellum((s) => s.readingMinutesByDay);
  const advancesByDay = useVellum((s) => s.advancesByDay);
  const sceneCrossesByDay = useVellum((s) => s.sceneCrossesByDay);
  const keepsByDay = useVellum((s) => s.keepsByDay);
  const worksTouchedByDay = useVellum((s) => s.worksTouchedByDay);
  const hostOpensByDay = useVellum((s) => s.hostOpensByDay);
  const sitsByDay = useVellum((s) => s.sitsByDay);
  const clubTouchesByDay = useVellum((s) => s.clubTouchesByDay);
  const lastActiveReadAt = useVellum((s) => s.lastActiveReadAt);
  const sitHistory = useVellum((s) => s.sitHistory);
  const togetherKeeps = useVellum((s) => s.togetherKeeps);
  const hostedSits = useVellum((s) => s.hostedSits);
  const handle = useVellum((s) => s.handle);
  const sittingMinutes = useVellum((s) => s.sittingMinutes);

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

  return (
    <Link
      to="/profile"
      preload="intent"
      data-home-daily-score={quiet ? "quiet" : text}
      aria-label={
        quiet
          ? "Today’s reading score, not yet. Open You."
          : `Today’s reading score ${text}. Open You.`
      }
      className={cn(
        "daily-score-chip type-chrome flex h-full shrink-0 flex-col items-center justify-center self-stretch border-l border-ink/15 [touch-action:manipulation]",
        quiet ? "bg-paper-deep text-ink/45" : "bg-yellow text-ink",
        className,
      )}
    >
      <span className="type-kicker opacity-70">Today</span>
      <span className="daily-score-num type-card" aria-hidden="true">
        {text}
      </span>
    </Link>
  );
}
