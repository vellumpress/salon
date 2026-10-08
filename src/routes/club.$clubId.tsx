import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { getClub, getReader } from "@/lib/social";
import { clubPair, shareOrCopy } from "@/lib/shuffle";
import { fillClass, fillInk } from "@/lib/mondrian";
import { usePersistHydrated } from "@/components/resume-link";
import { useTbr } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  addClubSession,
  getBookClub,
  getClubByInvite,
  hostedUserId,
  joinClubByInvite,
  leaveClub,
  SIGN_IN_LEAVE_CLUB,
  listClubMessages,
  listClubRoster,
  mergeClubMessages,
  postClubMessage,
  subscribeClubMessages,
  updateClub,
  type BookClubView,
  type ClubMemberView,
  type ClubMessage,
  clubInviteUrl,
} from "@/lib/clubs";
import { shouldAutoJoin } from "@/lib/club-flow";
import { formatHandle } from "@/lib/social";

const NO_CLUBS: string[] = [];
import { defaultSitClock, etWallToIso, formatClubWhenLong } from "@/lib/club-time";
import { serializeClubReadSearch } from "@/lib/catalog/serialize";
import { salonShareText, salonShareTitle } from "@/lib/site";

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
    void (async () => {
      try {
        const club = await getBookClub(clubId);
        if (!alive) return;
        if (club) {
          setLive(club);
          setLoaded(true);
          return;
        }
        const token = useTbr.getState().clubInvites?.[clubId];
        const invited = token ? await getClubByInvite(token) : null;
        if (!alive) return;
        setLive(invited && invited.id === clubId ? invited : null);
        setLoaded(true);
      } catch {
        if (!alive) return;
        setLive(null);
        setLoaded(true);
      }
    })();
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
  const following = useTbr((s) => s.following) ?? [];
  const joined = useTbr((s) => s.joined) ?? [];
  const toggleFollow = useTbr((s) => s.toggleFollow);
  const toggleJoin = useTbr((s) => s.toggleJoin);
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
          {isIn ? "Leave this phone" : "Join on this phone"}
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
      <p className="border-b border-ink px-5 py-3 font-sans text-sm text-ink sm:px-8">
        This room lives on this phone. Joining here does not open a shared club.
      </p>
      <div className="border-b border-ink px-5 py-5 sm:px-8">
        <p className="mb-4 type-kicker text-muted">Members</p>
        {isIn ? (
          <div className="flex items-center gap-3 py-2">
            <span className="size-2.5 shrink-0 bg-ink" />
            <span className="type-lede">You</span>
          </div>
        ) : null}
        {members.length === 0 && !isIn ? (
          <p className="font-serif text-base text-ink/70">No one from this phone is in the room yet.</p>
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
          {club.traces.filter((trace) => getReader(trace.readerId)).length === 0 ? (
            <p className="font-serif text-base text-ink/70">Keeps from people on this phone will gather here.</p>
          ) : (
            club.traces.map((trace) => {
              const who = getReader(trace.readerId);
              if (!who) return null;
              return (
                <div key={`${trace.readerId}-${trace.word}`}>
                  <p className="type-title italic">{trace.word}</p>
                  <p className="mt-1 type-kicker text-muted">{who.name}</p>
                </div>
              );
            })
          )}
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
  const joined = useTbr((s) => s.joined) ?? [];
  const leftClubs = useTbr((s) => s.leftClubs) ?? NO_CLUBS;
  const clubInvites = useTbr((s) => s.clubInvites) ?? {};
  const joinClub = useTbr((s) => s.joinClub);
  const leaveClubLocal = useTbr((s) => s.leaveClubLocal);
  const rememberInvite = useTbr((s) => s.rememberInvite);
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const clock = useMemo(() => defaultSitClock(), []);
  const [date, setDate] = useState(clock.date);
  const [time, setTime] = useState(clock.time);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(club.name);
  const [editNote, setEditNote] = useState(club.note);
  const [editSaving, setEditSaving] = useState(false);
  const storeReady = usePersistHydrated();
  useEffect(() => {
    let live = true;
    void hostedUserId().then((id) => {
      if (live) setUserId(id);
    });
    return () => {
      live = false;
    };
  }, [club.id]);
  useEffect(() => {
    setEditName(club.name);
    setEditNote(club.note);
  }, [club.id, club.name, club.note]);
  useEffect(() => {
    if (!storeReady) return;
    rememberInvite(club.id, club.inviteToken);
    if (!shouldAutoJoin(leftClubs, club.id)) return;
    joinClub(club.id);
    void joinClubByInvite(club.inviteToken).catch(() => undefined);
  }, [storeReady, club.id, club.inviteToken, joinClub, rememberInvite, leftClubs]);

  const isIn = storeReady && joined.includes(club.id) && shouldAutoJoin(leftClubs, club.id);
  const isOwner = Boolean(userId && club.hostUserId && userId === club.hostUserId);
  const token = clubInvites[club.id] ?? club.inviteToken;
  const when = club.nextSession ? formatClubWhenLong(club.nextSession.startsAt) : "";

  async function onLeave() {
    setLeaving(true);
    setError("");
    leaveClubLocal(club.id);
    try {
      await leaveClub(club.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : SIGN_IN_LEAVE_CLUB);
    } finally {
      setLeaving(false);
    }
  }

  async function onJoin() {
    setError("");
    joinClub(club.id);
    try {
      const next = await joinClubByInvite(club.inviteToken);
      if (next) onClub(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in to join this club.");
    }
  }

  async function share() {
    const result = await shareOrCopy({
      title: salonShareTitle(club.name),
      text: salonShareText(when ? `${club.name} — ${when}` : club.name),
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
      const next = await addClubSession({ token, startsAt });
      onClub(next);
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not keep the sitting");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    const name = editName.trim();
    if (!name) {
      setError("Name the club.");
      return;
    }
    setEditSaving(true);
    setError("");
    try {
      const next = await updateClub({ id: club.id, name, note: editNote });
      onClub(next);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not edit the club");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <ClubFrame
      title={club.name}
      action={
        <button
          type="button"
          disabled={leaving}
          onClick={() => void (isIn ? onLeave() : onJoin())}
          className={cn(
            "inline-flex h-12 shrink-0 items-center justify-center border-l border-ink px-4 font-sans text-sm disabled:opacity-60",
            isIn ? "bg-paper text-ink" : "bg-red text-paper",
          )}
        >
          {leaving ? "Leaving" : isIn ? "Leave" : "Join"}
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
        onClick={() => {
          if (!isIn) void onJoin();
        }}
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
      {userId === null ? (
        <Link
          to="/login"
          search={{ next: `/club/${club.id}` }}
          className="flex h-14 items-center justify-center border-b border-ink bg-yellow font-sans text-sm text-ink"
        >
          Sign in to join. You’ll return here.
        </Link>
      ) : null}
      {error ? <p className="border-b border-ink bg-yellow px-5 py-3 font-sans text-sm text-ink">{error}</p> : null}
      {isOwner ? (
        <div className="border-b border-ink">
          <button
            type="button"
            onClick={() => setEditing((open) => !open)}
            className="flex h-14 w-full items-center justify-center bg-paper font-sans text-sm text-ink"
          >
            {editing ? "Close" : "Edit the club"}
          </button>
          {editing ? (
            <div>
              <label className="flex items-stretch border-t border-ink">
                <span className="flex w-20 shrink-0 items-center px-4 type-kicker text-muted">Name</span>
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  maxLength={80}
                  className="h-14 min-w-0 flex-1 border-0 bg-transparent px-2 font-serif text-lg text-ink focus-visible:outline-none"
                />
              </label>
              <label className="flex items-stretch border-t border-ink">
                <span className="flex w-20 shrink-0 items-center px-4 type-kicker text-muted">Note</span>
                <input
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
                  maxLength={240}
                  placeholder="Optional"
                  className="h-14 min-w-0 flex-1 border-0 bg-transparent px-2 font-serif text-lg text-ink placeholder:text-muted focus-visible:outline-none"
                />
              </label>
              <button
                type="button"
                disabled={editSaving}
                onClick={() => void saveEdit()}
                className="flex h-14 w-full items-center justify-center border-t border-ink bg-ink font-sans text-sm text-paper disabled:opacity-60"
              >
                {editSaving ? "Saving…" : "Save the club"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {club.note ? (
        <div className="border-b border-ink px-5 py-6 sm:px-8">
          <p className="type-lede">{club.note}</p>
        </div>
      ) : null}
      <ClubRoster clubId={club.id} />
      <ClubThread clubId={club.id} />
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
                    className="h-12 min-w-0 border-0 bg-transparent px-4 font-sans text-base text-ink focus-visible:outline-none"
                  />
                </label>
                <label className="flex min-w-0 flex-col">
                  <span className="px-4 pt-3 type-kicker text-muted">Time · ET</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    className="h-12 min-w-0 border-0 bg-transparent px-4 font-sans text-base text-ink focus-visible:outline-none"
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

function ClubRoster({ clubId }: { clubId: string }) {
  const [people, setPeople] = useState<ClubMemberView[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    const load = () => {
      void listClubRoster(clubId)
        .then((rows) => {
          if (!live) return;
          setPeople(rows);
          setReady(true);
        })
        .catch(() => {
          if (live) setReady(true);
        });
    };
    load();
    const timer = window.setInterval(load, 8000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [clubId]);
  return (
    <div className="border-b border-ink px-5 py-5 sm:px-8">
      <p className="mb-4 type-kicker text-muted">Members</p>
      {!ready ? <p className="font-serif text-lg text-ink/70">Opening the room</p> : null}
      {ready && people.length === 0 ? (
        <p className="font-serif text-lg text-ink/70">No one else is listed yet.</p>
      ) : null}
      {people.map((person) => (
        <div key={person.userId} className="flex items-baseline justify-between gap-3 py-2">
          <span className="type-lede">{person.handle ? formatHandle(person.handle) : "A member"}</span>
          <span className="type-kicker text-muted">
            {person.place
              ? person.place
              : person.breathIndex != null
                ? "in the book"
                : "in the club"}
          </span>
        </div>
      ))}
    </div>
  );
}

function ClubThread({ clubId }: { clubId: string }) {
  const [lines, setLines] = useState<ClubMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let live = true;
    const load = () => {
      void listClubMessages(clubId)
        .then((rows) => {
          if (!live) return;
          setLines((prev) => mergeClubMessages(prev, rows));
          setReady(true);
        })
        .catch((err) => {
          if (!live) return;
          setReady(true);
          setNote(err instanceof Error ? err.message : "");
        });
    };
    load();
    const stop = subscribeClubMessages(clubId, (message) => {
      setLines((prev) => mergeClubMessages(prev, [message]));
    });
    const timer = window.setInterval(load, 5000);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      stop();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [clubId]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setNote("");
    try {
      const message = await postClubMessage(clubId, text);
      setLines((prev) => mergeClubMessages(prev, [message]));
      setDraft("");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "The line would not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-b border-ink">
      <p className="px-5 pt-5 type-kicker text-muted sm:px-8">The room</p>
      <div className="flex flex-col gap-3 px-5 py-4 sm:px-8">
        {!ready ? <p className="font-serif text-lg text-ink/70">Opening the room</p> : null}
        {ready && lines.length === 0 ? (
          <p className="font-serif text-lg text-ink/70">No lines yet. Members can write here.</p>
        ) : null}
        {lines.slice(-40).map((line) => (
          <p key={line.id} className="font-serif text-lg leading-snug">
            {line.handle ? (
              <span className="type-kicker text-muted">{formatHandle(line.handle)} </span>
            ) : null}
            {line.body}
          </p>
        ))}
      </div>
      {note ? (
        <p className="bg-yellow px-5 py-3 font-sans text-sm text-ink">
          {note}{" "}
          {/sign in/i.test(note) ? (
            <Link to="/login" search={{ next: `/club/${clubId}` }} className="underline">
              Sign in
            </Link>
          ) : null}
        </p>
      ) : null}
      <form onSubmit={(event) => void send(event)} className="flex items-stretch border-t border-ink">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={500}
          placeholder="A line for the club"
          className="h-14 min-w-0 flex-1 border-0 bg-transparent px-5 font-serif text-lg text-ink placeholder:text-muted focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={sending || draft.trim().length === 0}
          className="shrink-0 bg-ink px-4 font-sans text-sm text-paper disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function clubPageReadSearch(club: BookClubView) {
  return serializeClubReadSearch(club, clubPair(club.id));
}
