import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getMe, pushReading, saveSettings, type Me } from "@/lib/account";
import { SIT_PRESETS } from "@/lib/sitting";
import { FavoriteWorks } from "@/components/favorite-works";
import { ReaderAuthForm } from "@/components/reader-auth-form";
import { SignOutMark } from "@/components/sign-out";
import { CLUBS, formatHandle } from "@/lib/social";
import { fillClass, fillInk } from "@/lib/mondrian";
import { useTbr } from "@/lib/store";
import { deriveReadingStats } from "@/lib/reading-stats";
import { RITUAL_LANES, worksForRitualLane } from "@/lib/catalog/rituals";
import { clubPair } from "@/lib/shuffle";
import { KeptSentences } from "@/components/kept-sentences";
import { ResumeLink, useLastRead } from "@/components/resume-link";
import {
  DeskStrip,
  ActiveReading,
  InsightStrip,
  LaneStrip,
  ReadinessHero,
  WeekMinutes,
  YouActivity,
  YouBreakdown,
  YouEmptyInvite,
  YouRings,
} from "@/components/you-stats";
import { cn } from "@/lib/utils";
import { mixSeed, takeShuffled } from "@/lib/recommend";
import { useFavoriteSync } from "@/lib/use-favorite-sync";
import { liveBackendEnabled } from "@/lib/site";
import { confirmEmailMessage } from "@/lib/remote-auth";
import { useReaderSession, type ReaderAuthMode } from "@/lib/use-reader-session";
import { useVisitSeed } from "@/lib/use-visit-seed";

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

function ProfilePage() {
  const session = useReaderSession();
  if (session.isPending) {
    return (
      <div className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/"
            className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
          >
            Home
          </Link>
          <h1 className="type-mark flex min-w-0 flex-1 items-center px-4">
            You
          </h1>
          <ResumeLink className="h-12 border-l border-ink" />
          <Link
            to="/friends"
            className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-paper px-4 text-ink"
          >
            Friends
          </Link>
        </header>
        <div className="flex min-h-36 flex-col justify-end border-b border-ink bg-paper p-5 text-ink sm:p-8">
          <p className="type-kicker text-muted">This sitting</p>
          <p className="mt-2 type-title">You</p>
        </div>
      </div>
    );
  }
  return <ProfileBody session={session} />;
}

function ProfileBody({
  session,
}: {
  session: ReturnType<typeof useReaderSession>;
}) {
  const { identity, liveUser, hasAccounts, storeHandle, createAccount, signIn } = session;
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
  const handle = useTbr((s) => s.handle) ?? "";
  const setTaste = useTbr((s) => s.setTaste);
  const setSittingMinutes = useTbr((s) => s.setSittingMinutes);
  const { hydrated, favorites } = useFavoriteSync(liveUser);
  const visit = useVisitSeed();
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState(identity?.displayName ?? "");
  const [sit, setSit] = useState<number>(sittingMinutes);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [authMode, setAuthMode] = useState<ReaderAuthMode>(hasAccounts ? "in" : "up");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [confirmNote, setConfirmNote] = useState("");

  useEffect(() => {
    if (hasAccounts) setAuthMode("in");
  }, [hasAccounts]);

  useEffect(() => {
    if (!liveUser || !liveBackendEnabled) return;
    let alive = true;
    void getMe({ data: { name: liveUser.displayName ?? "" } })
      .then((row) => {
        if (!alive) return;
        setMe(row);
        setName(row.name || liveUser.displayName || "");
        setSit(row.sittingMinutes);
        setSittingMinutes(row.sittingMinutes);
        setTaste(row.taste);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof Error && err.message !== "Unauthorized") {
          setError(err.message);
        }
      });
    return () => {
      alive = false;
    };
  }, [liveUser, setSittingMinutes, setTaste]);

  useEffect(() => {
    if (!hydrated || !liveUser || !liveBackendEnabled) return;
    const entries = Object.entries(progress)
      .filter(([id, item]) => item.entered && id !== "page")
      .slice(0, 80)
      .map(([id, item]) => ({
        workId: id,
        breathIndex: item.breathIndex,
        kept: item.kept?.length ?? 0,
        completed: Boolean(item.completedAt),
        lastOpenedAt: item.lastOpenedAt || Date.now(),
      }));
    if (entries.length === 0) return;
    void pushReading({ data: { entries } }).catch(() => undefined);
  }, [hydrated, progress, liveUser]);

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
    ],
  );

  const prompt = useMemo(() => {
    const base = dayPrompt();
    const lane = RITUAL_LANES.find((l) => l.id === base.laneId);
    const works = lane ? worksForRitualLane(lane) : [];
    const pick = takeShuffled(works, mixSeed(visit, `prompt-${base.laneId}`))[0];
    return { ...base, work: pick };
  }, [visit]);

  const mine = hydrated ? CLUBS.filter((club) => joined.includes(club.id)) : [];
  const shownHandle = formatHandle(identity?.handle || handle);
  const shownName =
    shownHandle || name.trim() || identity?.displayName || "You";

  async function submitCreate(input: { handle: string; email: string; password: string }) {
    setAuthBusy(true);
    setAuthError("");
    try {
      const result = await createAccount(input);
      if (result.confirmEmail) setConfirmNote(confirmEmailMessage(result.handle));
      else if (result.notice) setConfirmNote(result.notice);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not create the account");
    } finally {
      setAuthBusy(false);
    }
  }

  async function submitSignIn(input: { email: string; password: string }) {
    setAuthBusy(true);
    setAuthError("");
    try {
      const result = await signIn(input);
      if (result.confirmEmail) setConfirmNote(confirmEmailMessage(result.handle));
      else if (result.notice) setConfirmNote(result.notice);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setAuthBusy(false);
    }
  }

  async function save() {
    if (!identity) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      setSittingMinutes(sit);
      if (liveUser && liveBackendEnabled) {
        const row = await saveSettings({
          data: {
            name: name.trim().slice(0, 80),
            sittingMinutes: sit,
            taste: me?.taste ?? "",
          },
        });
        setMe(row);
        setSittingMinutes(row.sittingMinutes);
        setTaste(row.taste);
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not keep that");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Home
        </Link>
        <h1 className="type-mark flex min-w-0 flex-1 items-center px-4">
          You
        </h1>
        <ResumeLink className="h-12 border-l border-ink" />
        <Link
          to="/friends"
          preload="intent"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-paper px-4 text-ink"
        >
          Friends
        </Link>
        {me?.role === "staff" ? (
          <Link
            to="/desk"
            className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-red px-4 text-paper"
          >
            Desk
          </Link>
        ) : null}
        {identity ? <SignOutMark className="border-l border-paper" /> : null}
        {!identity ? (
          <Link
            to="/login"
            className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-red px-4 text-paper"
          >
            Sign in
          </Link>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!hydrated ? (
          <div className="grid grid-cols-2 gap-px bg-ink sm:grid-cols-4">
            <div className="min-h-40 bg-ink sm:min-h-48" />
            <div className="min-h-40 bg-yellow sm:min-h-48" />
            <div className="min-h-40 bg-red sm:min-h-48" />
            <div className="min-h-40 bg-blue sm:min-h-48" />
          </div>
        ) : (
          <ReadinessHero reading={reading} handle={shownHandle} name={shownName} />
        )}

        {confirmNote ? (
          <p className="border-b border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">{confirmNote}</p>
        ) : null}

        {!identity ? (
          <section>
            <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
              {authMode === "up" ? "Create an account" : "Sign in"}
            </p>
            <ReaderAuthForm
              mode={authMode}
              onMode={setAuthMode}
              defaultHandle={storeHandle}
              busy={authBusy}
              error={authError}
              onCreate={(input) => void submitCreate(input)}
              onSignIn={(input) => void submitSignIn(input)}
            />
          </section>
        ) : null}

        {!hydrated ? null : (
          <>
            <YouRings rings={reading.rings} />
            {reading.hasSignal ? (
              <>
                <ActiveReading reading={reading} />
                <WeekMinutes days={reading.weekDays} estimated={reading.minutesAreEstimated} />
                <InsightStrip reading={reading} />
                <YouBreakdown reading={reading} />
                <DeskStrip works={reading.desk} />
              </>
            ) : (
              <YouEmptyInvite
                label={prompt.label}
                line="Sit once — minutes, keeps, and a quiet rhythm will gather here."
                workId={prompt.work?.id}
              />
            )}
          </>
        )}

        {last ? (
          <section>
            <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
              Resume
            </p>
            <Link
              to="/read/$workId"
              params={{ workId: last.id }}
              search={{ at: last.breathIndex }}
              className="flex items-stretch border-b border-ink bg-forest text-paper"
            >
              <span className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5">
                <span className="type-kicker opacity-80">
                  {last.author}
                </span>
                <span className="mt-1 type-lede">
                  {last.title}
                </span>
              </span>
              <span className="flex items-center px-4 font-sans text-sm opacity-80">Continue</span>
            </Link>
          </section>
        ) : null}

        {hydrated && reading.hasSignal ? (
          <>
            <YouActivity items={reading.activity} />
            <LaneStrip lanes={reading.lanes} />
            <section>
              <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
                For now
              </p>
              <div className="grid grid-cols-1 gap-px bg-ink sm:grid-cols-2">
                <div className="flex min-h-28 flex-col justify-end bg-yellow p-4 text-ink sm:min-h-32 sm:p-5">
                  <span className="type-kicker opacity-80">{prompt.label}</span>
                  <span className="mt-1 type-lede">
                    {prompt.line}
                  </span>
                </div>
                {prompt.work ? (
                  <Link
                    to="/read/$workId"
                    params={{ workId: prompt.work.id }}
                    className="flex min-h-28 flex-col justify-end bg-blue p-4 text-paper sm:min-h-32 sm:p-5"
                  >
                    <span className="type-kicker opacity-80">
                      {prompt.work.author}
                    </span>
                    <span className="mt-1 type-lede">
                      {prompt.work.title}
                    </span>
                    <span className="mt-2 font-sans text-sm opacity-80">Sit</span>
                  </Link>
                ) : (
                  <Link
                    to="/rituals"
                    className="flex min-h-28 flex-col justify-end bg-blue p-4 text-paper sm:min-h-32 sm:p-5"
                  >
                    <span className="type-kicker opacity-80">Rituals</span>
                    <span className="mt-1 type-lede">
                      Open a timed sit
                    </span>
                  </Link>
                )}
              </div>
            </section>
          </>
        ) : null}

        <FavoriteWorks
          ids={favorites}
          hydrated={hydrated}
          preview
          heading="Favorites"
          empty="Heart a work while reading — it will live here."
        />

        <KeptSentences
          progress={progress}
          hydrated={hydrated}
          preview
          empty="Tap Keep on a sentence. It will live in your collection."
        />

        <section>
          <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
            Clubs
          </p>
          {mine.length === 0 ? (
            <Link
              to="/together"
              className="flex items-center justify-between border-b border-ink px-4 py-5"
            >
              <span>
                <span className="block type-lede">
                  No rooms yet
                </span>
                <span className="mt-1 block font-serif text-sm text-ink/70">
                  Join a club and sit the book live, with chat.
                </span>
              </span>
              <span className="font-sans text-sm">Together</span>
            </Link>
          ) : (
            mine.map((club) => (
              <div
                key={club.id}
                className={cn(
                  "flex items-stretch border-b border-ink",
                  fillClass(club.fill),
                  fillInk(club.fill),
                )}
              >
                <Link
                  to="/club/$clubId"
                  params={{ clubId: club.id }}
                  className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5"
                >
                  <span className="type-kicker opacity-80">{club.place}</span>
                  <span className="mt-1 type-lede">
                    {club.name}
                  </span>
                </Link>
                <Link
                  to="/read/$workId"
                  params={{ workId: club.workId }}
                  search={{ pair: clubPair(club.id), sit: 0 }}
                  className={cn(
                    "inline-flex shrink-0 items-center px-4 font-sans text-sm",
                    club.fill === "yellow" || club.fill === "paper"
                      ? "bg-ink text-paper"
                      : "bg-paper text-ink",
                  )}
                >
                  Sit
                </Link>
              </div>
            ))
          )}
        </section>

        {identity ? (
          <section>
            <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
              Settings
            </p>
            <div className="flex items-stretch border-b border-ink">
              <span className="flex w-24 shrink-0 items-center px-4 type-kicker text-muted">
                @name
              </span>
              <span className="flex h-12 min-w-0 flex-1 items-center font-serif text-xl">
                {formatHandle(identity.handle)}
              </span>
            </div>
            <div className="flex items-stretch border-b border-ink">
              <span className="flex w-24 shrink-0 items-center px-4 type-kicker text-muted">
                Email
              </span>
              <span className="flex h-12 min-w-0 flex-1 items-center font-serif text-xl">
                {identity.email}
              </span>
            </div>
            <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
              A sitting
            </p>
            <div className="grid grid-cols-3 gap-px bg-ink sm:grid-cols-6">
              {SIT_PRESETS.map((option, i) => {
                const fills = [
                  "bg-red text-paper",
                  "bg-blue text-paper",
                  "bg-yellow text-ink",
                  "bg-forest text-paper",
                  "bg-ink text-paper",
                  "bg-paper-deep text-ink",
                ];
                return (
                  <button
                    key={option.minutes}
                    type="button"
                    onClick={() => setSit(option.minutes)}
                    className={cn(
                      "flex min-h-20 flex-col justify-end p-3 text-left font-sans text-sm sm:min-h-24 sm:p-4",
                      fills[i % fills.length],
                      sit === option.minutes ? "opacity-100" : "opacity-55",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {error ? (
              <p className="border-b border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="flex h-14 w-full items-center justify-center bg-ink font-sans text-sm text-paper disabled:opacity-60"
            >
              {saving ? "Keeping…" : saved ? "Kept" : "Keep"}
            </button>
            <SignOutMark className="h-14 w-full border-0" />
          </section>
        ) : null}
      </div>
    </div>
  );
}
