import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getMe, pushReading, saveSettings, type Me } from "@/lib/account";
import { SIT_PRESETS } from "@/lib/sitting";
import { useCurrentUserState, type AppUser } from "@/lib/auth/use-current-user";
import { FavoriteWorks } from "@/components/favorite-works";
import { SignOutMark } from "@/components/sign-out";
import { CLUBS } from "@/lib/social";
import { fillClass, fillInk } from "@/lib/mondrian";
import { useVellum } from "@/lib/store";
import { deriveReadingStats, formatMinutes } from "@/lib/reading-stats";
import { RITUAL_LANES, worksForRitualLane } from "@/lib/catalog/rituals";
import { clubPair } from "@/lib/shuffle";
import { KeptSentences } from "@/components/kept-sentences";
import { ResumeLink, useLastRead } from "@/components/resume-link";
import { cn } from "@/lib/utils";
import { mixSeed, takeShuffled } from "@/lib/recommend";
import { useFavoriteSync } from "@/lib/use-favorite-sync";
import { liveBackendEnabled } from "@/lib/site";
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
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/"
            className="inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 font-sans text-sm text-paper"
          >
            Home
          </Link>
          <h1 className="flex min-w-0 flex-1 items-center px-4 font-display text-xl font-medium tracking-tight">
            You
          </h1>
          <ResumeLink className="h-12 border-l border-ink" />
        </header>
        <div className="flex min-h-36 flex-col justify-end bg-ink p-5 text-paper sm:p-8">
          <p className="font-sans text-xs tracking-wide opacity-80">This sitting</p>
          <p className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">You</p>
        </div>
      </div>
    );
  }
  return <ProfileBody user={user} />;
}

function ProfileBody({ user }: { user: AppUser | null }) {
  const progress = useVellum((s) => s.progress);
  const joined = useVellum((s) => s.joined) ?? [];
  const sittingMinutes = useVellum((s) => s.sittingMinutes);
  const readingMinutesByDay = useVellum((s) => s.readingMinutesByDay) ?? {};
  const sitHistory = useVellum((s) => s.sitHistory) ?? [];
  const setTaste = useVellum((s) => s.setTaste);
  const setSittingMinutes = useVellum((s) => s.setSittingMinutes);
  const { hydrated, favorites } = useFavoriteSync(user);
  const visit = useVisitSeed();
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState(user?.displayName ?? "");
  const [sit, setSit] = useState<number>(sittingMinutes);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || user.isDevFallback || !liveBackendEnabled) return;
    let alive = true;
    void getMe({ data: { name: user.displayName ?? "" } })
      .then((row) => {
        if (!alive) return;
        setMe(row);
        setName(row.name || user.displayName || "");
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
  }, [user, setSittingMinutes, setTaste]);

  useEffect(() => {
    if (!hydrated || !user || user.isDevFallback || !liveBackendEnabled) return;
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
  }, [hydrated, progress, user]);

  const last = useLastRead();
  const reading = useMemo(
    () =>
      deriveReadingStats({
        progress,
        favorites,
        readingMinutesByDay,
        sitHistory,
      }),
    [progress, favorites, readingMinutesByDay, sitHistory],
  );

  const prompt = useMemo(() => {
    const base = dayPrompt();
    const lane = RITUAL_LANES.find((l) => l.id === base.laneId);
    const works = lane ? worksForRitualLane(lane) : [];
    const pick = takeShuffled(works, mixSeed(visit, `prompt-${base.laneId}`))[0];
    return { ...base, work: pick };
  }, [visit]);

  const mine = hydrated ? CLUBS.filter((club) => joined.includes(club.id)) : [];
  const shownName = name.trim() || user?.displayName || "You";

  async function save() {
    if (!user) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
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
          className="inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 font-sans text-sm text-paper"
        >
          Home
        </Link>
        <h1 className="flex min-w-0 flex-1 items-center px-4 font-display text-xl font-medium tracking-tight">
          You
        </h1>
        <ResumeLink className="h-12 border-l border-ink" />
        {me?.role === "staff" ? (
          <Link
            to="/desk"
            className="inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-red px-4 font-sans text-sm text-paper"
          >
            Desk
          </Link>
        ) : null}
        {user ? <SignOutMark className="border-l border-paper" /> : null}
        {!user ? (
          <Link
            to="/login"
            className="inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-red px-4 font-sans text-sm text-paper"
          >
            Log in
          </Link>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-36 flex-col justify-end bg-ink p-5 text-paper sm:p-8">
          <p className="font-sans text-xs tracking-wide opacity-80">This sitting</p>
          <p className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {shownName}
          </p>
          <p className="mt-3 max-w-xl font-serif text-lg text-paper/70">
            Timed rituals and live rooms. Sign in to keep your name and sitting length.
          </p>
        </div>

        {last ? (
          <section>
            <p className="border-b border-ink px-4 py-3 font-sans text-xs tracking-wide text-muted">
              Resume
            </p>
            <Link
              to="/read/$workId"
              params={{ workId: last.id }}
              search={{ at: last.breathIndex }}
              className="flex items-stretch border-b border-ink bg-forest text-paper"
            >
              <span className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5">
                <span className="font-sans text-xs tracking-wide opacity-80">
                  {last.author}
                </span>
                <span className="mt-1 font-display text-2xl font-medium tracking-tight">
                  {last.title}
                </span>
              </span>
              <span className="flex items-center px-4 font-sans text-sm opacity-80">Continue</span>
            </Link>
          </section>
        ) : null}

        <section>
          <p className="border-b border-ink px-4 py-3 font-sans text-xs tracking-wide text-muted">
            Pulse
          </p>
          {!hydrated ? (
            <div className="grid grid-cols-2 gap-px bg-ink sm:grid-cols-4">
              <div className="min-h-28 bg-paper sm:min-h-32" />
              <div className="min-h-28 bg-yellow sm:min-h-32" />
              <div className="min-h-28 bg-blue sm:min-h-32" />
              <div className="min-h-28 bg-forest sm:min-h-32" />
            </div>
          ) : !reading.hasSignal ? (
            <div className="flex min-h-28 flex-col justify-end border-b border-ink bg-paper px-4 py-5 sm:min-h-32">
              <span className="font-sans text-xs tracking-wide text-muted">Reading</span>
              <span className="mt-1 font-display text-xl font-medium tracking-tight sm:text-2xl">
                Sit once — minutes, pace, and form will gather here.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-px bg-ink sm:grid-cols-4">
              <div className="flex min-h-28 flex-col justify-end bg-yellow p-4 text-ink sm:min-h-32 sm:p-5">
                <span className="font-sans text-xs tracking-wide opacity-80">Today</span>
                <span className="mt-1 font-serif text-3xl font-medium tracking-tight sm:text-4xl">
                  {formatMinutes(reading.minutesToday)}
                </span>
                <span className="mt-1 font-sans text-xs opacity-70">
                  {reading.minutesAreEstimated ? "est. minutes" : "minutes"}
                </span>
              </div>
              <div className="flex min-h-28 flex-col justify-end bg-red p-4 text-paper sm:min-h-32 sm:p-5">
                <span className="font-sans text-xs tracking-wide opacity-80">This week</span>
                <span className="mt-1 font-serif text-3xl font-medium tracking-tight sm:text-4xl">
                  {formatMinutes(reading.minutesWeek)}
                </span>
                <span className="mt-1 font-sans text-xs opacity-70">
                  {reading.minutesAreEstimated ? "est. minutes" : "minutes"}
                </span>
              </div>
              <div className="flex min-h-28 flex-col justify-end bg-blue p-4 text-paper sm:min-h-32 sm:p-5">
                <span className="font-sans text-xs tracking-wide opacity-80">Pace</span>
                <span className="mt-1 font-display text-2xl font-medium tracking-tight sm:text-3xl">
                  {reading.pace.label}
                </span>
                <span className="mt-1 font-sans text-xs opacity-70">{reading.pace.detail}</span>
              </div>
              <div className="flex min-h-28 flex-col justify-end bg-forest p-4 text-paper sm:min-h-32 sm:p-5">
                <span className="font-sans text-xs tracking-wide opacity-80">Streak</span>
                <span className="mt-1 font-serif text-3xl font-medium tracking-tight sm:text-4xl">
                  {reading.streak}
                </span>
                <span className="mt-1 font-sans text-xs opacity-70">
                  {reading.streak === 1 ? "day" : "days"}
                </span>
              </div>
              <div className="flex min-h-28 flex-col justify-end bg-paper p-4 text-ink sm:min-h-32 sm:p-5 sm:col-span-2">
                <span className="font-sans text-xs tracking-wide opacity-80">Resonating</span>
                <span className="mt-1 font-display text-2xl font-medium tracking-tight sm:text-3xl">
                  {reading.forms[0]?.label ?? "—"}
                </span>
                <span className="mt-1 font-sans text-xs opacity-70">
                  {reading.forms.length > 1
                    ? reading.forms
                        .slice(1)
                        .map((f) => f.label)
                        .join(" · ")
                    : reading.forms[0]
                      ? "Most kept & finished"
                      : "Favorites and kept lines will name a form"}
                </span>
              </div>
              <div className="flex min-h-28 flex-col justify-end bg-ink p-4 text-paper sm:min-h-32 sm:p-5 sm:col-span-2">
                <span className="font-sans text-xs tracking-wide opacity-80">Where from</span>
                <span className="mt-1 font-display text-xl font-medium tracking-tight sm:text-2xl">
                  {reading.origins.length
                    ? reading.origins.map((o) => o.country).join(" · ")
                    : "—"}
                </span>
                <span className="mt-1 font-sans text-xs opacity-70">
                  {reading.kept || reading.favorites
                    ? `${reading.kept} kept · ${reading.favorites} favorites`
                    : `${reading.opened} opened · ${reading.completed} finished`}
                </span>
              </div>
            </div>
          )}
        </section>

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
          <p className="border-b border-ink px-4 py-3 font-sans text-xs tracking-wide text-muted">
            For now
          </p>
          <div className="grid grid-cols-1 gap-px bg-ink sm:grid-cols-2">
            <div className="flex min-h-28 flex-col justify-end bg-yellow p-4 text-ink sm:min-h-32 sm:p-5">
              <span className="font-sans text-xs tracking-wide opacity-80">{prompt.label}</span>
              <span className="mt-1 font-display text-xl font-medium tracking-tight sm:text-2xl">
                {prompt.line}
              </span>
            </div>
            {prompt.work ? (
              <Link
                to="/read/$workId"
                params={{ workId: prompt.work.id }}
                className="flex min-h-28 flex-col justify-end bg-blue p-4 text-paper sm:min-h-32 sm:p-5"
              >
                <span className="font-sans text-xs tracking-wide opacity-80">
                  {prompt.work.author}
                </span>
                <span className="mt-1 font-display text-xl font-medium tracking-tight sm:text-2xl">
                  {prompt.work.title}
                </span>
                <span className="mt-2 font-sans text-sm opacity-80">Sit</span>
              </Link>
            ) : (
              <Link
                to="/rituals"
                className="flex min-h-28 flex-col justify-end bg-blue p-4 text-paper sm:min-h-32 sm:p-5"
              >
                <span className="font-sans text-xs tracking-wide opacity-80">Rituals</span>
                <span className="mt-1 font-display text-xl font-medium tracking-tight sm:text-2xl">
                  Open a timed sit
                </span>
              </Link>
            )}
          </div>
        </section>

        <section>
          <p className="border-b border-ink px-4 py-3 font-sans text-xs tracking-wide text-muted">
            Clubs
          </p>
          {mine.length === 0 ? (
            <Link
              to="/together"
              className="flex items-center justify-between border-b border-ink px-4 py-5"
            >
              <span>
                <span className="block font-display text-xl font-medium tracking-tight">
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
                  <span className="font-sans text-xs tracking-wide opacity-80">{club.place}</span>
                  <span className="mt-1 font-display text-2xl font-medium tracking-tight">
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

        {user ? (
          <section>
            <p className="border-b border-ink px-4 py-3 font-sans text-xs tracking-wide text-muted">
              Settings
            </p>
            <label className="flex items-stretch border-b border-ink">
              <span className="flex w-24 shrink-0 items-center px-4 font-sans text-xs tracking-wide text-muted">
                Name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl text-ink focus-visible:outline-none"
              />
            </label>
            <p className="border-b border-ink px-4 py-3 font-sans text-xs tracking-wide text-muted">
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
        ) : (
          <section>
            <p className="border-b border-ink px-4 py-3 font-sans text-xs tracking-wide text-muted">
              Account
            </p>
            <Link
              to="/login"
              className="flex items-center justify-between border-b border-ink px-4 py-5"
            >
              <span>
                <span className="block font-display text-xl font-medium tracking-tight">
                  Log in to sync
                </span>
                <span className="mt-1 block font-serif text-sm text-ink/70">
                  Name and sitting length stay on this device until you do.
                </span>
              </span>
              <span className="font-sans text-sm">Log in</span>
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
