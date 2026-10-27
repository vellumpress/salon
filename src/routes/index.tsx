import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { PagesShell } from "@/components/pages-shell";
import { documentIsWordmarkShell } from "@/lib/wordmark-shell";
import { DailyScoreChip } from "@/components/daily-score-chip";
import { ResumeLink, useLastRead, usePersistHydrated } from "@/components/resume-link";
import { YouFriendsMark } from "@/components/you-friends-mark";
import { CuratedStrip } from "@/components/curated-strip";
import { DoorCarousel } from "@/components/door-carousel";
import { DOOR_LOOP_SECONDS, ritualDoorSlides, togetherDoorSlides } from "@/lib/home-doors";
import { useTbr } from "@/lib/store";
import {
  ShelfSearchBar,
  ShelfSearchHits,
  useShelfSearch,
} from "@/components/shelf-search";
import { catalogCount } from "@/lib/catalog";
import { shelfWork } from "@/lib/catalog/shelf";
import { fillClass, fillInk, mosaicFills, type Fill } from "@/lib/mondrian";
import { useVisitSeed } from "@/lib/use-visit-seed";
import { prefetchOpening } from "@/lib/prefetch-work";
import { Wordmark } from "@/components/wordmark";
import { HomeScreenHint } from "@/components/home-screen-hint";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  // A direct open is the wordmark shell. Painting the doors into it raises
  // hydration error #418 on WebKit. Match that document first.
  const [booted, setBooted] = useState(
    () => typeof document !== "undefined" && !documentIsWordmarkShell(document),
  );
  useLayoutEffect(() => {
    setBooted(true);
  }, []);
  if (!booted) return <PagesShell />;
  return <HomeBody />;
}

function HomeBody() {
  const router = useRouter();
  const last = useLastRead();
  const hydrated = usePersistHydrated();
  const visit = useVisitSeed();
  const hostedSits = useTbr((state) => state.hostedSits);
  const contacts = useTbr((state) => state.contacts);
  const { query, setQuery, searching, matches } = useShelfSearch("local");

  // Fresh Mondrian palette every full open/reload (visit seed).
  // Order: [resume?, door0, door1] — neighbors avoid the same fill.
  const blockFills = useMemo(() => {
    const count = (last ? 1 : 0) + 3;
    return mosaicFills(count, `home-doors-${visit || "pending"}`);
  }, [last, visit]);

  const ritualSlides = useMemo(() => ritualDoorSlides(visit), [visit]);
  const togetherSlides = useMemo(
    () => togetherDoorSlides({ hostedSits, contacts }),
    [hostedSits, contacts],
  );

  const resumeWork = last ? shelfWork(last.id) : undefined;
  const resumeFill: Fill | undefined = last ? blockFills[0] : undefined;
  const doorFills = last ? blockFills.slice(1) : blockFills;
  const showResume = Boolean(last && resumeFill && !searching);

  useEffect(() => {
    let cancel = false;
    const timers: number[] = [];
    const warm = () => {
      if (cancel) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      const jobs = [
        () => router.preloadRoute({ to: "/rituals" }),
        () => router.preloadRoute({ to: "/together" }),
        () => router.preloadRoute({ to: "/friends" }),
        () => router.preloadRoute({ to: "/profile" }),
        () => router.preloadRoute({ to: "/curated" }),
        () => router.preloadRoute({ to: "/curated/lists" }),
        () => router.preloadRoute({ to: "/import" }),
        () => router.preloadRoute({ to: "/login" }),
        () => router.preloadRoute({ to: "/shuffle", search: { together: true } }),
        () => {
          if (last) prefetchOpening(last.id);
        },
      ];
      for (const [index, job] of jobs.entries()) {
        timers.push(
          window.setTimeout(() => {
            if (!cancel) void Promise.resolve(job()).catch(() => undefined);
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
    <>
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

      {searching ? null : <HomeScreenHint />}

      {searching ? (
        <div className="home-search-hits">
          <ShelfSearchHits matches={matches} query={query} />
        </div>
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
                  aria-label={`Resume ${resumeWork?.title?.trim() || last.title} by ${last.author || "unknown"}`}
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

          <DoorCarousel
            door="rituals"
            label="Rituals"
            aria="Rituals"
            fill={doorFills[0] ?? "yellow"}
            seconds={DOOR_LOOP_SECONDS.rituals}
            slides={ritualSlides}
            cta={{ kind: "rituals", label: "See them all" }}
          />
          <DoorCarousel
            door="together"
            label="Read together"
            aria="Read together — friends and book clubs"
            fill={doorFills[1] ?? "yellow"}
            seconds={DOOR_LOOP_SECONDS.together}
            slides={togetherSlides}
            cta={{ kind: "together", label: "Come read" }}
          />
          <CuratedStrip fill={doorFills[2] ?? "yellow"} />
        </>
      )}

      <div className="home-dock">
        <ShelfSearchBar
          id="home-shelf-search"
          query={query}
          setQuery={setQuery}
          count={searching ? matches.length : catalogCount()}
        />
        <Link to="/import" preload="intent" className="home-dock-import type-kicker">
          Import
        </Link>
      </div>
    </main>
    </>
  );
}
