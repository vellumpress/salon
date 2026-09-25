import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { DailyScoreChip } from "@/components/daily-score-chip";
import { ResumeLink, useLastRead, usePersistHydrated } from "@/components/resume-link";
import { YouFriendsMark } from "@/components/you-friends-mark";
import { CuratedStrip } from "@/components/curated-strip";
import { WorksStrip } from "@/components/works-strip";
import {
  ShelfSearchBar,
  ShelfSearchHits,
  useShelfSearch,
} from "@/components/shelf-search";
import { fillClass, fillInk, mosaicFills, type Fill } from "@/lib/mondrian";
import { useVisitSeed } from "@/lib/use-visit-seed";
import { prefetchOpening } from "@/lib/prefetch-work";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Home,
});

const DOORS = [
  {
    to: "/rituals" as const,
    label: "Rituals",
    kicker: "Timed sits",
    pitch:
      "Pick a lane for the hour you are in — before sleep, waking, a walk, unwind. One work. A sitting that ends.",
    aria: "Rituals — timed reading sits",
  },
  {
    to: "/together" as const,
    label: "Read together",
    kicker: "Friends and clubs",
    pitch:
      "The same page, a live room. Sit with a friend, or join a club that reads in real time while you talk.",
    aria: "Read together — friends and book clubs",
  },
] as const;

function Home() {
  const router = useRouter();
  const last = useLastRead();
  const hydrated = usePersistHydrated();
  const visit = useVisitSeed();
  const { query, setQuery, searching, matches, poolSize } = useShelfSearch("local");

  // Fresh Mondrian palette every full open/reload (visit seed).
  // Order: [resume?, door0, door1] — neighbors avoid the same fill.
  const blockFills = useMemo(() => {
    const count = (last ? 1 : 0) + DOORS.length;
    return mosaicFills(count, `home-doors-${visit || "pending"}`);
  }, [last, visit]);

  const resumeFill: Fill | undefined = last ? blockFills[0] : undefined;
  const doorFills = last ? blockFills.slice(1) : blockFills;
  const showResume = Boolean(last && resumeFill && !searching);

  useEffect(() => {
    let cancel = false;
    const timers: number[] = [];
    const warm = () => {
      if (cancel) return;
      const jobs = [
        () => router.preloadRoute({ to: "/rituals" }),
        () => router.preloadRoute({ to: "/together" }),
        () => router.preloadRoute({ to: "/friends" }),
        () => router.preloadRoute({ to: "/profile" }),
        () => router.preloadRoute({ to: "/curated" }),
        () => router.preloadRoute({ to: "/login" }),
        () => router.preloadRoute({ to: "/shuffle", search: { together: true } }),
        () => {
          if (last) prefetchOpening(last.id);
        },
      ];
      for (const [index, job] of jobs.entries()) {
        timers.push(
          window.setTimeout(() => {
            if (!cancel) void job();
          }, index * 80),
        );
      }
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(warm, { timeout: 1600 });
      return () => {
        cancel = true;
        cancelIdleCallback(id);
        for (const timer of timers) window.clearTimeout(timer);
      };
    }
    const id = window.setTimeout(warm, 700);
    return () => {
      cancel = true;
      window.clearTimeout(id);
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [router, last]);

  return (
    <main
      className={cn(
        "board board-alive board-doors",
        last && !searching && "has-resume",
        searching && "is-searching",
      )}
      data-hydrated={last ? "1" : "0"}
    >
      <div className="cell-mark flex bg-paper">
        <span className="flex h-full min-w-0 flex-1 items-center self-stretch bg-paper px-4 text-ink">
          <Wordmark />
        </span>
        <ResumeLink />
        <YouFriendsMark showScore={hydrated && !showResume} />
      </div>

      {searching ? (
        <ShelfSearchHits matches={matches} query={query} />
      ) : (
        <>
          {showResume && last && resumeFill ? (
            <div
              className={cn(
                "cell-resume flex min-h-0 items-stretch",
                fillClass(resumeFill),
                fillInk(resumeFill),
              )}
              data-home-continue=""
              data-resume-fill={resumeFill}
            >
              <div className="resume-column flex min-w-0 flex-1 flex-col">
                <Link
                  to="/read/$workId"
                  params={{ workId: last.id }}
                  search={{ at: last.breathIndex }}
                  preload="intent"
                  aria-label={`Resume ${last.title} by ${last.author || "unknown"}`}
                  className="flex min-w-0 flex-1 flex-col justify-center px-5 py-4 sm:px-8 sm:py-5"
                >
                  <span className="type-kicker opacity-80">Resume</span>
                  <span className="pillar-title mt-1">{last.title}</span>
                  {last.author ? (
                    <span className="type-kicker mt-1 truncate opacity-75">
                      {last.author}
                    </span>
                  ) : null}
                </Link>
                <Link
                  to="/read/$workId"
                  params={{ workId: last.id }}
                  search={{ at: last.breathIndex }}
                  preload="intent"
                  aria-label={`Continue ${last.title}`}
                  className="resume-continue type-chrome flex min-h-11 items-center px-5 sm:px-8"
                >
                  Continue
                </Link>
              </div>
              <DailyScoreChip placement="continue" />
            </div>
          ) : null}

          {DOORS.map((door, i) => {
            const fill = doorFills[i] ?? "yellow";
            return (
              <Link
                key={door.label}
                to={door.to}
                preload="intent"
                aria-label={door.aria}
                className={cn(
                  "cell-pillar relative flex min-h-0 flex-col justify-end p-5 sm:p-8",
                  fillClass(fill),
                  fillInk(fill),
                )}
              >
                <span className="type-kicker opacity-70">{door.kicker}</span>
                <span className="pillar-title mt-1">{door.label}</span>
                <span className="type-pitch pillar-pitch mt-2.5 max-w-md">
                  {door.pitch}
                </span>
              </Link>
            );
          })}

          <CuratedStrip />
          <WorksStrip />
        </>
      )}

      <ShelfSearchBar
        id="home-shelf-search"
        query={query}
        setQuery={setQuery}
        count={searching ? matches.length : poolSize}
      />
    </main>
  );
}
