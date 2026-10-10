import { Component, lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PagesShell } from "@/components/pages-shell";
import { StreakCare } from "@/components/streak-care";
import { YouReading } from "@/components/you-reading";
import { useLastRead, usePersistHydrated } from "@/components/resume-link";
import { RITUAL_LANES, worksForRitualLane } from "@/lib/catalog/rituals";
import { readDaylightEnabled } from "@/lib/daylight-colors";
import { deriveReadingStats } from "@/lib/reading-stats";
import { mixSeed, takeShuffled } from "@/lib/recommend";
import { formatHandle } from "@/lib/social";
import { useTbr } from "@/lib/store";
import { useVisitSeed } from "@/lib/use-visit-seed";

const YouAccountShell = lazy(() =>
  import("@/components/you-account").then((mod) => ({ default: mod.YouAccountShell })),
);

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

function dayPrompt() {
  const hour = new Date().getHours();
  if (hour < 10) {
    return {
      laneId: "waking-up",
      label: "Waking up",
      line: "A short page for the first hour.",
    };
  }
  if (hour >= 21) {
    return {
      laneId: "before-sleep",
      label: "Before sleep",
      line: "One quiet page before the lights go out.",
    };
  }
  if (hour >= 17) {
    return {
      laneId: "unwind",
      label: "Unwind",
      line: "Something soft after the day.",
    };
  }
  return {
    laneId: "on-a-walk",
    label: "On a walk",
    line: "A page that travels well.",
  };
}

/**
 * Direct /you HTML is the wordmark. Matching it on the first client render
 * avoids hydration error #422, which was leaving the score unmounted on iPhone.
 * The layout effect then paints Today from local data before the browser paints.
 */
function ProfilePage() {
  const [booted, setBooted] = useState(false);
  useLayoutEffect(() => {
    setBooted(true);
  }, []);
  if (!booted) return <PagesShell />;
  return <ProfileBody />;
}

class AccountBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function ProfileBody() {
  const progress = useTbr((s) => s.progress);
  const joined = useTbr((s) => s.joined) ?? [];
  const sittingMinutes = useTbr((s) => s.sittingMinutes);
  const readingMinutesByDay = useTbr((s) => s.readingMinutesByDay) ?? {};
  const advancesByDay = useTbr((s) => s.advancesByDay);
  const sceneCrossesByDay = useTbr((s) => s.sceneCrossesByDay);
  const keepsByDay = useTbr((s) => s.keepsByDay);
  const worksTouchedByDay = useTbr((s) => s.worksTouchedByDay);
  const hostOpensByDay = useTbr((s) => s.hostOpensByDay);
  const sitsByDay = useTbr((s) => s.sitsByDay);
  const clubTouchesByDay = useTbr((s) => s.clubTouchesByDay);
  const lastActiveReadAt = useTbr((s) => s.lastActiveReadAt);
  const sitHistory = useTbr((s) => s.sitHistory) ?? [];
  const togetherKeeps = useTbr((s) => s.togetherKeeps) ?? [];
  const hostedSits = useTbr((s) => s.hostedSits) ?? [];
  const scorePausedAt = useTbr((s) => s.scorePausedAt);
  const scoreIgnoredDays = useTbr((s) => s.scoreIgnoredDays);
  const insightDismissed = useTbr((s) => s.insightDismissed);
  const insightSeen = useTbr((s) => s.insightSeen);
  const handle = useTbr((s) => s.handle) ?? "";
  const favorites = useTbr((s) => s.favorites) ?? [];
  const hydrated = usePersistHydrated();
  const streakFreezeBanked = useTbr((s) => s.streakFreezeBanked);
  const streakFreezeUsedOn = useTbr((s) => s.streakFreezeUsedOn);
  const setStreakFreeze = useTbr((s) => s.setStreakFreeze);
  const visit = useVisitSeed();
  const last = useLastRead();

  const reading = useMemo(
    () =>
      deriveReadingStats({
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
        joined,
        daylight: readDaylightEnabled(),
        pausedAt: scorePausedAt,
        ignoredDays: scoreIgnoredDays,
        dismissedInsights: insightDismissed,
        lastInsight: insightSeen,
        freezeBanked: streakFreezeBanked,
        freezeUsedOn: streakFreezeUsedOn,
      }),
    [
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
      joined,
      scorePausedAt,
      scoreIgnoredDays,
      insightDismissed,
      insightSeen,
      streakFreezeBanked,
      streakFreezeUsedOn,
    ],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (
      reading.freezeBanked === streakFreezeBanked &&
      reading.freezeUsedOn === streakFreezeUsedOn
    ) {
      return;
    }
    setStreakFreeze(reading.freezeBanked, reading.freezeUsedOn);
  }, [
    hydrated,
    reading.freezeBanked,
    reading.freezeUsedOn,
    setStreakFreeze,
    streakFreezeBanked,
    streakFreezeUsedOn,
  ]);

  const prompt = useMemo(() => {
    const base = dayPrompt();
    const lane = RITUAL_LANES.find((l) => l.id === base.laneId);
    const works = lane ? worksForRitualLane(lane) : [];
    const pick = takeShuffled(works, mixSeed(visit, `prompt-${base.laneId}`))[0];
    return { ...base, work: pick };
  }, [visit]);

  const signIn = (
    <Link
      to="/login"
      className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-red px-4 text-paper"
    >
      Sign in
    </Link>
  );
  const localSettings = (
    <section>
      <p className="border-b border-ink px-4 py-3 type-kicker text-muted">A sitting</p>
      <p className="px-4 py-4 type-lede">Still learning</p>
    </section>
  );

  const renderPage = (slots: {
    headerEnd: ReactNode;
    settings: ReactNode;
    handle?: string;
    notice?: string;
  }) => (
    <div className="frame-screen bg-paper text-ink">
      <YouReading
        reading={reading}
        hydrated={hydrated}
        handle={slots.handle || formatHandle(handle)}
        progress={progress}
        favorites={favorites}
        last={last}
        notice={slots.notice}
        headerEnd={slots.headerEnd}
        settings={slots.settings}
        todayEnd={hydrated ? <StreakCare streak={reading.streak} /> : null}
        trendsEnd={
          <section>
            <p className="border-b border-ink px-4 py-3 type-kicker text-muted">For now</p>
            <div className="rail" role="list" aria-label="For now">
              <div role="listitem" className="you-tile is-half bg-yellow text-ink">
                <span className="type-kicker opacity-80">{prompt.label}</span>
                <span className="mt-1 type-lede">{prompt.line}</span>
              </div>
              {prompt.work ? (
                <Link
                  to="/read/$workId"
                  params={{ workId: prompt.work.id }}
                  role="listitem"
                  className="you-tile is-half bg-blue text-paper"
                >
                  <span className="type-kicker opacity-80">{prompt.work.author}</span>
                  <span className="mt-1 type-lede">{prompt.work.title}</span>
                  <span className="mt-2 font-sans text-sm opacity-80">Sit</span>
                </Link>
              ) : (
                <Link to="/rituals" role="listitem" className="you-tile is-half bg-blue text-paper">
                  <span className="type-kicker opacity-80">Rituals</span>
                  <span className="mt-1 type-lede">Open a timed sit</span>
                </Link>
              )}
            </div>
          </section>
        }
      />
    </div>
  );

  const local = renderPage({ headerEnd: signIn, settings: localSettings });

  return (
    <AccountBoundary fallback={local}>
      <Suspense fallback={local}>
        <YouAccountShell page={renderPage} />
      </Suspense>
    </AccountBoundary>
  );
}
