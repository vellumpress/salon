import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getClub, getReader } from "@/lib/social";
import { clubPair, shareOrCopy } from "@/lib/shuffle";
import { fillClass, fillInk } from "@/lib/mondrian";
import { useVellum } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  addClubSession,
  getBookClub,
  joinClubByInvite,
  type BookClubView,
  clubInviteUrl,
} from "@/lib/clubs";
import { defaultSitClock, etWallToIso, formatClubWhenLong } from "@/lib/club-time";
import { serializeClubReadSearch } from "@/lib/catalog/serialize";

export const Route = createFileRoute("/club/$clubId")({
  component: ClubPage,
});

function ClubPage() {
  const { clubId } = Route.useParams();
  const house = getClub(clubId);
  const [live, setLive] = useState<BookClubView | null>(null);
  const [loaded, setLoaded] = useState(Boolean(house));

  useEffect(() => {
    if (house) {
      setLoaded(true);
      return;
    }
    let alive = true;
    setLoaded(false);
    void getBookClub({ data: { id: clubId } })
      .then((club) => {
        if (!alive) return;
        setLive(club);
        setLoaded(true);
      })
      .catch(() => {
        if (!alive) return;
        setLive(null);
        setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [clubId, house]);

  if (!loaded) {
    return (
      <ClubFrame title="Club">
        <div className="flex min-h-0 flex-1 flex-col justify-end p-5 sm:p-8">
          <p className="type-kicker text-muted">Opening</p>
          <p className="mt-2 type-title">
            The room
          </p>
        </div>
      </ClubFrame>
    );
  }

  if (house) return <HouseClub clubId={clubId} />;
  if (live) return <LiveClub club={live} onClub={setLive} />;

  return (
    <ClubFrame title="Together">
      <div className="flex min-h-0 flex-1 flex-col justify-end p-5 sm:p-8">
        <p className="type-title">
          This club
        </p>
        <p className="mt-3 font-serif text-lg text-ink/70">This club would not come</p>
      </div>
    </ClubFrame>
  );
}

function ClubFrame({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/together"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Together
        </Link>
        <h1 className="type-mark flex min-w-0 flex-1 items-center truncate px-4">
          {title}
        </h1>
        {action}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col">{children}</div>
      </div>
    </div>
  );
}

function HouseClub({ clubId }: { clubId: string }) {
  const club = getClub(clubId);
  const following = useVellum((s) => s.following) ?? [];
  const joined = useVellum((s) => s.joined) ?? [];
  const toggleFollow = useVellum((s) => s.toggleFollow);
  const toggleJoin = useVellum((s) => s.toggleJoin);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!club) return null;

  const isIn = hydrated && joined.includes(club.id);
  const members = club.memberIds.map(getReader).filter(Boolean);

  return (
    <ClubFrame
      title={club.name}
      action={
        <button
          type="button"
          onClick={() => toggleJoin(club.id)}
          className={cn(
            "inline-flex h-12 shrink-0 items-center justify-center border-l border-ink px-4 font-sans text-sm",
            isIn ? "bg-paper text-ink" : "bg-red text-paper",
          )}
        >
          {isIn ? "Leave" : "Join"}
        </button>
      }
    >
      <div className={cn("flex min-h-36 flex-col justify-end p-5 sm:p-8", fillClass(club.fill), fillInk(club.fill))}>
        <p className="type-kicker opacity-80">{club.place}</p>
        <p className="mt-2 type-title">{club.workTitle}</p>
        <p className="mt-2 font-sans text-sm opacity-80">{club.author}</p>
      </div>
      <Link
        to="/read/$workId"
        params={{ workId: club.workId }}
        search={{ pair: clubPair(club.id), sit: 0 }}
        onClick={() => {
          if (!isIn) toggleJoin(club.id);
        }}
        className="flex h-14 items-center justify-center bg-ink font-sans text-sm text-paper"
      >
        Sit together
      </Link>
      <div className="border-b border-ink px-5 py-6 sm:px-8">
        <p className="type-lede">{club.prompt}</p>
      </div>
      <div className="border-b border-ink px-5 py-5 sm:px-8">
        <p className="mb-4 type-kicker text-muted">Members</p>
        {isIn ? (
          <div className="flex items-center gap-3 py-2">
            <span className="size-2.5 shrink-0 bg-ink" />
            <span className="type-lede">You</span>
          </div>
        ) : null}
        {members.map((reader) => {
          if (!reader) return null;
          const isFollowed = hydrated && following.includes(reader.id);
          return (
            <div key={reader.id} className="flex items-center gap-3 py-2">
              <Link
                to="/reader/$readerId"
                params={{ readerId: reader.id }}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <span className={cn("size-2.5 shrink-0", fillClass(reader.fill))} />
                <span className="min-w-0">
                  <span className="block type-lede">{reader.name}</span>
                  <span className="type-kicker text-muted">{reader.city}</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => toggleFollow(reader.id)}
                className={cn(
                  "inline-flex h-11 shrink-0 items-center px-3 font-sans text-sm",
                  isFollowed ? "bg-ink text-paper" : "bg-paper-deep text-ink",
                )}
              >
                {isFollowed ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
      <div className="px-5 py-8 sm:px-8">
        <p className="mb-6 type-kicker text-muted">Kept</p>
        <div className="flex flex-col gap-5">
          {isIn ? (
            <p className="type-title italic text-ink/40">you</p>
          ) : null}
          {club.traces.map((trace) => {
            const who = getReader(trace.readerId);
            return (
              <div key={`${trace.readerId}-${trace.word}`}>
                <p className="type-title italic">{trace.word}</p>
                <p className="mt-1 type-kicker text-muted">{who?.name}</p>
              </div>
            );
          })}
        </div>
      </div>
    </ClubFrame>
  );
}

function LiveClub({
  club,
  onClub,
}: {
  club: BookClubView;
  onClub: (club: BookClubView) => void;
}) {
  const joined = useVellum((s) => s.joined) ?? [];
  const clubInvites = useVellum((s) => s.clubInvites) ?? {};
  const toggleJoin = useVellum((s) => s.toggleJoin);
  const joinClub = useVellum((s) => s.joinClub);
  const rememberInvite = useVellum((s) => s.rememberInvite);
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const clock = useMemo(() => defaultSitClock(), []);
  const [date, setDate] = useState(clock.date);
  const [time, setTime] = useState(clock.time);
  const [saving, setSaving] = useState(false);
  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    rememberInvite(club.id, club.inviteToken);
    joinClub(club.id);
    void joinClubByInvite({ data: { token: club.inviteToken } }).catch(() => undefined);
  }, [club.id, club.inviteToken, joinClub, rememberInvite]);

  const isIn = hydrated && joined.includes(club.id);
  const token = clubInvites[club.id] ?? club.inviteToken;
  const when = club.nextSession ? formatClubWhenLong(club.nextSession.startsAt) : "";

  async function share() {
    const result = await shareOrCopy({
      title: club.name,
      text: when ? `${club.name} — ${when}` : club.name,
      url: clubInviteUrl(club.inviteToken),
    });
    if (result === "copied") {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  }

  async function addSitting() {
    const startsAt = etWallToIso(date, time);
    if (!startsAt) {
      setError("Pick a day and time in Eastern time.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const next = await addClubSession({ data: { token, startsAt } });
      onClub(next);
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not keep the sitting");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ClubFrame
      title={club.name}
      action={
        <button
          type="button"
          onClick={() => toggleJoin(club.id)}
          className={cn(
            "inline-flex h-12 shrink-0 items-center justify-center border-l border-ink px-4 font-sans text-sm",
            isIn ? "bg-paper text-ink" : "bg-red text-paper",
          )}
        >
          {isIn ? "Leave" : "Join"}
        </button>
      }
    >
      <div className={cn("flex min-h-36 flex-col justify-end p-5 sm:p-8", fillClass(club.fill), fillInk(club.fill))}>
        <p className="type-kicker opacity-80">{when || "A sitting"}</p>
        <p className="mt-2 type-title">
          {club.serializeLabel ?? club.workTitle}
        </p>
        <p className="mt-2 font-sans text-sm opacity-80">
          {club.serializeLabel ? `${club.workTitle} · ${club.author}` : club.author}
        </p>
      </div>
      <Link
        to="/read/$workId"
        params={{ workId: club.workId }}
        search={clubPageReadSearch(club)}
        onClick={() => joinClub(club.id)}
        className="flex h-14 items-center justify-center bg-ink font-sans text-sm text-paper"
      >
        Sit together
      </Link>
      <button
        type="button"
        onClick={() => void share()}
        className="flex h-14 w-full items-center justify-center border-b border-ink bg-yellow font-sans text-sm text-ink"
      >
        {copied ? "Copied" : "Invite"}
      </button>
      {club.note ? (
        <div className="border-b border-ink px-5 py-6 sm:px-8">
          <p className="type-lede">{club.note}</p>
        </div>
      ) : null}
      <div className="border-b border-ink px-5 py-5 sm:px-8">
        <p className="mb-4 type-kicker text-muted">Sittings</p>
        {club.sessions.length === 0 ? (
          <p className="font-serif text-lg text-ink/70">No hour named yet.</p>
        ) : (
          club.sessions.map((session) => (
            <p key={session.id} className="py-2 type-lede">
              {formatClubWhenLong(session.startsAt)}
              {session.label ? (
                <span className="mt-1 block font-sans text-sm font-normal tracking-wide opacity-70">
                  {session.label}
                </span>
              ) : null}
            </p>
          ))
        )}
      </div>
      {token ? (
        <div className="border-b border-ink">
          <button
            type="button"
            onClick={() => setAdding((open) => !open)}
            className="flex h-14 w-full items-center justify-center bg-paper font-sans text-sm text-ink"
          >
            {adding ? "Close" : "Add a sitting"}
          </button>
          {adding ? (
            <div>
              {error ? (
                <p className="border-t border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">{error}</p>
              ) : null}
              <div className="grid grid-cols-2 border-t border-ink">
                <label className="flex min-w-0 flex-col border-r border-ink">
                  <span className="px-4 pt-3 type-kicker text-muted">Day</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="h-12 min-w-0 border-0 bg-transparent px-4 font-sans text-sm text-ink focus-visible:outline-none"
                  />
                </label>
                <label className="flex min-w-0 flex-col">
                  <span className="px-4 pt-3 type-kicker text-muted">Time · ET</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    className="h-12 min-w-0 border-0 bg-transparent px-4 font-sans text-sm text-ink focus-visible:outline-none"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void addSitting()}
                className="flex h-14 w-full items-center justify-center bg-ink font-sans text-sm text-paper disabled:opacity-60"
              >
                {saving ? "Keeping…" : "Keep this hour"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn(
          "flex min-h-40 flex-1 flex-col justify-end p-5 sm:min-h-52 sm:p-8",
          fillClass(club.fill),
          fillInk(club.fill),
        )}
      >
        <p className="type-kicker opacity-80">The door</p>
        <p className="mt-2 type-lede">
          Walk in when the hour comes. Chat is already on the page.
        </p>
      </div>
    </ClubFrame>
  );
}

function clubPageReadSearch(club: BookClubView) {
  return serializeClubReadSearch(club, clubPair(club.id));
}
