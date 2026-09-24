import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useKeptLines } from "@/components/kept-sentences";
import { ResumeLink, usePersistHydrated } from "@/components/resume-link";
import {
  friendProfilePath,
  localFriendProfiles,
  type FriendGraph,
  type FriendRow,
} from "@/lib/friend-profile";
import { boardKeptLines, friendsFeed, youCard, type BoardKeptLine } from "@/lib/friends";
import {
  encodeHostedSit,
  hostedSitUrl,
  sitDurationLabel,
  sitInvolves,
  sitPhase,
  type HostedSit,
} from "@/lib/hosted-sit";
import { fillClass, fillInk, planeOf } from "@/lib/mondrian";
import { renameActiveHandle } from "@/lib/reader-account";
import { formatHandle, getClub, handleError, normalizeHandle } from "@/lib/social";
import { APP_NAME, liveBackendEnabled, publicUrl, salonShareText, salonShareTitle } from "@/lib/site";
import {
  createSitPledge,
  EVENING_WINDOWS,
  isPledgePending,
  pledgeLine,
  remindPledgeLocally,
  sitPledgeUrl,
  type EveningWindow,
  type SitPledge,
} from "@/lib/sit-pledge";
import { useVellum } from "@/lib/store";
import { shareOrCopy } from "@/lib/shuffle";
import { echoInviteUrl, encodeEchoInvite } from "@/lib/together-keep";
import type { TogetherKeep } from "@/lib/together-keep";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/friends")({
  component: FriendsPage,
});

function FriendsPage() {
  const hydrated = usePersistHydrated();
  const handle = useVellum((s) => s.handle) ?? "";
  const following = useVellum((s) => s.following) ?? [];
  const contacts = useVellum((s) => s.contacts) ?? [];
  const progress = useVellum((s) => s.progress);
  const togetherKeeps = useVellum((s) => s.togetherKeeps) ?? [];
  const hostedSits = useVellum((s) => s.hostedSits) ?? [];
  const sitPledges = useVellum((s) => s.sitPledges) ?? [];
  const sitHistory = useVellum((s) => s.sitHistory) ?? [];
  const joined = useVellum((s) => s.joined) ?? [];
  const readingMinutesByDay = useVellum((s) => s.readingMinutesByDay);
  const advancesByDay = useVellum((s) => s.advancesByDay);
  const sceneCrossesByDay = useVellum((s) => s.sceneCrossesByDay);
  const keepsByDay = useVellum((s) => s.keepsByDay);
  const worksTouchedByDay = useVellum((s) => s.worksTouchedByDay);
  const hostOpensByDay = useVellum((s) => s.hostOpensByDay);
  const sitsByDay = useVellum((s) => s.sitsByDay);
  const clubTouchesByDay = useVellum((s) => s.clubTouchesByDay);
  const setHandle = useVellum((s) => s.setHandle);
  const addContact = useVellum((s) => s.addContact);
  const toggleFollow = useVellum((s) => s.toggleFollow);
  const rememberPledge = useVellum((s) => s.rememberPledge);
  const setPledgeStatus = useVellum((s) => s.setPledgeStatus);
  const [draft, setDraft] = useState("");
  const [find, setFind] = useState("");
  const [message, setMessage] = useState("");
  const [pledgeTo, setPledgeTo] = useState("");
  const [pledgeWindow, setPledgeWindow] = useState<EveningWindow>("tonight");
  const kept = useKeptLines(progress, hydrated);

  const graph = useMemo<FriendGraph>(
    () => ({
      selfHandle: handle,
      contacts,
      following,
      progress,
      sitHistory,
      togetherKeeps,
      hostedSits,
      sitPledges,
      ledgers: {
        readingMinutesByDay,
        advancesByDay,
        sceneCrossesByDay,
        keepsByDay,
        worksTouchedByDay,
        hostOpensByDay,
        sitsByDay,
        clubTouchesByDay,
      },
    }),
    [
      handle,
      contacts,
      following,
      progress,
      sitHistory,
      togetherKeeps,
      hostedSits,
      sitPledges,
      readingMinutesByDay,
      advancesByDay,
      sceneCrossesByDay,
      keepsByDay,
      worksTouchedByDay,
      hostOpensByDay,
      sitsByDay,
      clubTouchesByDay,
    ],
  );
  const rows = useMemo(
    () => (hydrated ? localFriendProfiles.list(graph) : []),
    [hydrated, graph],
  );
  const withYou = rows.filter((row) => row.isSelf || row.following);
  const suggestions = rows.filter((row) => !row.isSelf && !row.following);
  const friends = rows.filter((row) => !row.isSelf);
  const you = useMemo(() => youCard({ handle, progress }), [handle, progress]);
  const me = normalizeHandle(handle);
  const reading = useMemo(() => {
    if (!hydrated) return [];
    const seen = new Set<string>();
    return friendsFeed(following, contacts).filter((row) => {
      if (!row.reading || seen.has(row.handle)) return false;
      seen.add(row.handle);
      return true;
    });
  }, [hydrated, following, contacts]);
  const keptLines = useMemo(
    () =>
      hydrated
        ? boardKeptLines({
            selfHandle: handle,
            selfLines: kept,
            togetherKeeps,
            hostedSits,
          })
        : [],
    [hydrated, handle, kept, togetherKeeps, hostedSits],
  );
  const pendingPledges = useMemo(
    () =>
      hydrated
        ? sitPledges.filter(
            (row) => isPledgePending(row) && (row.fromHandle === me || row.toHandle === me || !me),
          )
        : [],
    [hydrated, sitPledges, me],
  );
  const mySits = useMemo(
    () => (hydrated ? hostedSits.filter((row) => !me || sitInvolves(row, me)) : []),
    [hydrated, hostedSits, me],
  );
  const rooms = useMemo(
    () =>
      joined.map((id) => {
        const club = getClub(id);
        return {
          id,
          name: club?.name ?? "Room you joined",
          place: club?.place ?? "On this phone",
          workTitle: club?.workTitle ?? "",
          workId: club?.workId ?? "",
        };
      }),
    [joined],
  );
  const latestByHandle = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) map.set(row.handle, row.latest);
    return map;
  }, [rows]);

  function claim(event: FormEvent) {
    event.preventDefault();
    const result = setHandle(draft || handle);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    renameActiveHandle(result.handle);
    setDraft("");
    setMessage(`Sitting as ${formatHandle(result.handle)}.`);
  }

  function connect(event: FormEvent) {
    event.preventDefault();
    const result = addContact({ handle: find });
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setFind("");
    setMessage(`Following ${formatHandle(normalizeHandle(find) || result.id)}.`);
  }

  async function invite() {
    const mine = normalizeHandle(handle);
    if (!mine) {
      setMessage("Claim an @name first. The invite is your profile.");
      return;
    }
    const result = await shareOrCopy({
      title: salonShareTitle(formatHandle(mine)),
      text: salonShareText(`${formatHandle(mine)} is sitting on ${APP_NAME}.`),
      url: publicUrl(friendProfilePath(mine)),
    });
    setMessage(result === "failed" ? "The invite would not copy." : "Invite ready.");
  }

  async function sendPledge(event: FormEvent) {
    event.preventDefault();
    const pledge = createSitPledge({
      fromHandle: handle,
      toHandle: pledgeTo,
      window: pledgeWindow,
    });
    if (!pledge) {
      setMessage(handle ? "Name a friend, not yourself." : "Claim an @name first.");
      return;
    }
    rememberPledge(pledge);
    remindPledgeLocally(pledge);
    addContact({ handle: pledge.toHandle });
    setPledgeTo("");
    const result = await shareOrCopy({
      title: salonShareTitle("A sitting tonight"),
      text: salonShareText(pledgeLine(pledge)),
      url: sitPledgeUrl(pledge),
    });
    setMessage(result === "failed" ? "The note would not copy." : "The note is ready.");
  }

  async function shareSit(sit: HostedSit) {
    const result = await shareOrCopy({
      title: salonShareTitle(sit.workTitle || "A sit"),
      text: salonShareText(`${formatHandle(sit.hostHandle)} · ${sit.workTitle || "a sit"}`),
      url: hostedSitUrl(sit),
    });
    setMessage(result === "failed" ? "The sit link would not copy." : "Sit link ready.");
  }

  async function shareLine(line: BoardKeptLine) {
    const result = await shareOrCopy({
      title: salonShareTitle(line.workTitle || "A kept line"),
      text: salonShareText(line.line),
      url: echoInviteUrl({
        workId: line.workId,
        handle: line.handle,
        name: line.name,
        line: line.line,
        breathId: line.breathId,
        at: line.atIndex,
      }),
    });
    setMessage(result === "failed" ? "The line would not copy." : "Line link ready.");
  }

  function onFollow(row: FriendRow) {
    if (row.following) {
      if (following.includes(row.id)) toggleFollow(row.id);
      if (following.includes(row.handle)) toggleFollow(row.handle);
      return;
    }
    const result = addContact({ handle: row.handle, name: row.name });
    if (!result.ok) setMessage(result.error);
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
        <h1 className="type-mark flex min-w-0 flex-1 items-center px-4">Friends</h1>
        <ResumeLink className="h-12 border-l border-ink" />
        <Link
          to="/profile"
          preload="intent"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-paper px-4 text-ink"
        >
          You
        </Link>
      </header>

      {message ? (
        <p className="shrink-0 border-b border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">{message}</p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-ink px-4 py-5">
          <p className="type-kicker text-muted">On this phone</p>
          <p className="mt-1 type-lede">What friends are reading</p>
        </div>

        {!hydrated ? <div className="min-h-24 border-b border-ink bg-paper" /> : null}

        {hydrated ? (
          <section>
            <SectionTitle>Your @name</SectionTitle>
            <form onSubmit={claim} className="flex items-stretch border-b border-ink">
              <label className="flex min-w-0 flex-1 items-center">
                <span className="px-4 font-sans text-sm text-muted">@</span>
                <input
                  value={draft || handle}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setMessage("");
                  }}
                  placeholder="name"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-14 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl text-ink focus-visible:outline-none"
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-14 shrink-0 items-center bg-ink px-5 font-sans text-sm text-paper"
              >
                {handle ? "Keep" : "Claim"}
              </button>
            </form>
            {handleError(draft || handle || "ab") && (draft || !handle) ? (
              <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
                Two to twenty letters. Friends open your profile by this name.
              </p>
            ) : null}
          </section>
        ) : null}

        {hydrated ? (
          <section>
            <SectionTitle>People</SectionTitle>
            {withYou.map((row) => (
              <FriendListRow key={row.handle} row={row} onFollow={() => onFollow(row)} />
            ))}
            {friends.filter((row) => row.following).length === 0 ? (
              <EmptyCopy>
                No friends on this phone yet. A follow, an invite, or a shared sit is what shows up here.
              </EmptyCopy>
            ) : null}
            <TextButton onClick={() => void invite()}>Invite a friend</TextButton>
          </section>
        ) : null}

        {hydrated ? (
          <section>
            <SectionTitle>You are reading</SectionTitle>
            {you.reading ? (
              <Link
                to="/read/$workId"
                params={{ workId: you.reading }}
                className="flex items-stretch border-b border-ink bg-forest text-paper"
              >
                <span className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5">
                  <span className="type-kicker opacity-80">{you.author || "This sitting"}</span>
                  <span className="mt-1 type-lede">{you.workTitle || you.reading}</span>
                </span>
                <span className="inline-flex shrink-0 items-center px-4 font-sans text-sm">Continue</span>
              </Link>
            ) : (
              <>
                <EmptyCopy>No book open on this phone.</EmptyCopy>
                <Link
                  to="/"
                  className="flex h-12 items-center border-b border-ink px-4 font-sans text-sm"
                >
                  Open a book
                </Link>
              </>
            )}
          </section>
        ) : null}

        {hydrated ? (
          <section>
            <SectionTitle>Friends are reading</SectionTitle>
            {reading.length === 0 ? (
              <>
                <EmptyCopy>No open book from anyone on this phone.</EmptyCopy>
                <TextButton onClick={() => void invite()}>Invite a friend</TextButton>
              </>
            ) : (
              reading.map((row) => {
                const line = keptLines.find(
                  (item) => item.handle === row.handle && item.workId === row.reading,
                );
                return (
                  <ReadingCard
                    key={row.handle}
                    handle={row.handle}
                    workId={row.reading}
                    workTitle={row.workTitle}
                    author={row.author}
                    latest={latestByHandle.get(row.handle) ?? ""}
                    line={line}
                  />
                );
              })
            )}
          </section>
        ) : null}

        {hydrated ? (
          <section>
            <SectionTitle>Kept lines</SectionTitle>
            {keptLines.length === 0 ? (
              <>
                <EmptyCopy>No kept lines on this phone yet.</EmptyCopy>
                {you.reading ? (
                  <Link
                    to="/read/$workId"
                    params={{ workId: you.reading }}
                    className="flex h-12 items-center border-b border-ink px-4 font-sans text-sm"
                  >
                    Keep a line
                  </Link>
                ) : (
                  <TextButton onClick={() => void invite()}>Invite a friend</TextButton>
                )}
              </>
            ) : (
              keptLines.map((line) => (
                <KeptLineCard key={line.id} line={line} onShare={() => void shareLine(line)} />
              ))
            )}
          </section>
        ) : null}

        {hydrated ? (
          <section>
            <SectionTitle>Together</SectionTitle>
            {pendingPledges.length === 0 ? (
              <EmptyCopy>No tonight-notes on this phone.</EmptyCopy>
            ) : (
              pendingPledges.map((pledge) => (
                <PledgeCard
                  key={pledge.id}
                  pledge={pledge}
                  mine={me === pledge.fromHandle}
                  onSat={() => setPledgeStatus(pledge.id, "done")}
                  onAside={() => setPledgeStatus(pledge.id, "cancelled")}
                />
              ))
            )}
            {mySits.length === 0 ? (
              <EmptyCopy>No sit to join or host on this phone.</EmptyCopy>
            ) : (
              mySits.map((sit) => (
                <SitCard key={sit.id} sit={sit} onShare={() => void shareSit(sit)} />
              ))
            )}
            {togetherKeeps.length === 0 ? (
              <EmptyCopy>No together-keeps yet.</EmptyCopy>
            ) : (
              togetherKeeps.map((pair) => <TogetherCard key={pair.id} pair={pair} selfHandle={me} />)
            )}
            <div className="grid grid-cols-2 border-b border-ink">
              <button
                type="button"
                onClick={() => void invite()}
                className="flex h-12 items-center justify-center font-sans text-sm"
              >
                Invite a friend
              </button>
              <Link
                to="/together"
                search={{ host: true }}
                className="flex h-12 items-center justify-center border-l border-ink font-sans text-sm"
              >
                Host a sit
              </Link>
            </div>
          </section>
        ) : null}

        {hydrated ? (
          <section>
            <SectionTitle>I’ll sit tonight</SectionTitle>
            <form onSubmit={sendPledge}>
              <div className="grid grid-cols-3 border-b border-ink">
                {EVENING_WINDOWS.map((row, index) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setPledgeWindow(row.id)}
                    className={cn(
                      "flex min-h-12 items-center justify-center px-2 text-center font-sans text-sm leading-tight",
                      index > 0 && "border-l border-ink",
                      pledgeWindow === row.id ? "bg-ink text-paper" : "bg-paper text-ink",
                    )}
                  >
                    {row.label}
                  </button>
                ))}
              </div>
              <div className="flex items-stretch border-b border-ink">
                <input
                  value={pledgeTo}
                  onChange={(event) => setPledgeTo(event.target.value)}
                  placeholder="@name"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label="Friend to sit with"
                  className="h-14 min-w-0 flex-1 border-0 bg-transparent px-4 font-serif text-xl text-ink focus-visible:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex h-14 shrink-0 items-center border-l border-ink px-4 font-sans text-sm"
                >
                  Send word
                </button>
              </div>
            </form>
            <Link
              to="/together"
              search={{ host: true }}
              className="flex items-center justify-between border-b border-ink px-4 py-5"
            >
              <span>
                <span className="block type-kicker text-muted">Or host the hour</span>
                <span className="mt-1 block type-lede">Host a sit</span>
              </span>
              <span className="font-sans text-sm">Open</span>
            </Link>
          </section>
        ) : null}

        {hydrated ? (
          <section>
            <SectionTitle>Suggestions</SectionTitle>
            {suggestions.length === 0 ? (
              <>
                <EmptyCopy>
                  No one else is on this phone to suggest. Invite a friend, or follow a name you already know.
                </EmptyCopy>
                <TextButton onClick={() => void invite()}>Invite a friend</TextButton>
              </>
            ) : (
              suggestions.map((row) => (
                <FriendListRow key={row.handle} row={row} onFollow={() => onFollow(row)} />
              ))
            )}
          </section>
        ) : null}

        {hydrated ? (
          <section>
            <SectionTitle>Follow a name</SectionTitle>
            <form onSubmit={connect} className="flex items-stretch border-b border-ink">
              <label className="flex min-w-0 flex-1 items-center">
                <span className="sr-only">Handle</span>
                <input
                  value={find}
                  onChange={(event) => {
                    setFind(event.target.value);
                    setMessage("");
                  }}
                  placeholder="@name"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-14 min-w-0 flex-1 border-0 bg-transparent px-4 font-serif text-xl text-ink focus-visible:outline-none"
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-14 shrink-0 items-center border-l border-ink px-4 font-sans text-sm text-ink"
              >
                Follow
              </button>
            </form>
            <TextButton onClick={() => void invite()}>Share your profile link</TextButton>
          </section>
        ) : null}

        {hydrated ? (
          <section>
            <SectionTitle>Club rooms</SectionTitle>
            {rooms.length === 0 ? (
              <>
                <EmptyCopy>
                  No club room on this phone. Rooms fill when someone here actually joins — nothing is invented.
                </EmptyCopy>
                <Link
                  to="/together"
                  className="flex h-12 items-center border-b border-ink px-4 font-sans text-sm"
                >
                  Open together
                </Link>
              </>
            ) : (
              rooms.map((room) => (
                <Link
                  key={room.id}
                  to="/club/$clubId"
                  params={{ clubId: room.id }}
                  className="flex items-stretch border-b border-ink"
                >
                  <span className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5">
                    <span className="type-kicker text-muted">{room.place}</span>
                    <span className="mt-1 type-lede">{room.name}</span>
                    {room.workTitle ? (
                      <span className="mt-1 font-serif text-sm text-ink/70">{room.workTitle}</span>
                    ) : null}
                    <span className="mt-2 font-serif text-sm text-ink/70">
                      You joined. Other people appear only when they are on this phone.
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center px-4 font-sans text-sm">Open</span>
                </Link>
              ))
            )}
          </section>
        ) : null}

        <p className="px-4 py-6 font-serif text-sm text-ink/60">
          {liveBackendEnabled
            ? "Handles, keeps, sits, and tonight-notes stay on this device. Live sync is not in this tree yet."
            : `Handles, keeps, sits, and tonight-notes stay on this device. A hosted ${APP_NAME} can sync them later.`}
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <p className="border-b border-ink px-4 py-3 type-kicker text-muted">{children}</p>;
}

function EmptyCopy({ children }: { children: ReactNode }) {
  return <p className="border-b border-ink px-4 py-5 font-serif text-lg leading-snug text-ink/70">{children}</p>;
}

function TextButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center border-b border-ink px-4 text-left font-sans text-sm"
    >
      {children}
    </button>
  );
}

function FriendListRow({ row, onFollow }: { row: FriendRow; onFollow: () => void }) {
  const fill = planeOf(row.handle);
  const initial = (row.handle.slice(0, 1) || "?").toUpperCase();
  const reading = row.readingTitle
    ? row.readingAuthor
      ? `${row.readingTitle} · ${row.readingAuthor}`
      : row.readingTitle
    : "No open book on this phone";
  return (
    <div className="border-b border-ink">
      <Link
        to="/friends/$handle"
        params={{ handle: row.handle }}
        aria-label={`Open ${formatHandle(row.handle)}`}
        className="flex min-w-0 items-center gap-3 px-4 py-3"
      >
        <span
          aria-hidden
          className={cn(
            "flex size-11 shrink-0 items-center justify-center border border-ink font-sans text-sm",
            fillClass(fill),
            fillInk(fill),
          )}
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block type-kicker text-muted">{row.isSelf ? "This device" : "Friend"}</span>
          <span className="block truncate font-serif text-xl leading-tight">{formatHandle(row.handle)}</span>
          <span className="mt-0.5 block truncate font-serif text-sm text-ink/80">{reading}</span>
          <span className="mt-0.5 block truncate type-kicker text-muted">
            {row.latest || "No activity on this phone yet"}
          </span>
        </span>
        <span className="shrink-0 font-sans text-sm">Open</span>
      </Link>
      {row.isSelf ? null : (
        <button
          type="button"
          onClick={onFollow}
          aria-pressed={row.following}
          className={cn(
            "flex h-11 w-full items-center border-t border-ink px-4 font-sans text-sm",
            row.following ? "bg-ink text-paper" : "bg-paper text-ink",
          )}
        >
          {row.following ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
}

function ReadingCard({
  handle,
  workId,
  workTitle,
  author,
  latest,
  line,
}: {
  handle: string;
  workId: string;
  workTitle: string;
  author: string;
  latest: string;
  line?: BoardKeptLine;
}) {
  const echo = line
    ? encodeEchoInvite({
        workId: line.workId,
        handle: line.handle,
        name: line.name,
        line: line.line,
        breathId: line.breathId,
        at: line.atIndex,
      })
    : "";
  return (
    <article className="border-b border-ink">
      <Link
        to="/friends/$handle"
        params={{ handle }}
        className="flex items-center gap-3 px-4 py-4"
      >
        <span className="min-w-0 flex-1">
          <span className="block type-kicker text-muted">{formatHandle(handle)}</span>
          <span className="mt-1 block type-lede">{workTitle || "Open book"}</span>
          {author ? <span className="mt-1 block font-serif text-sm text-ink/70">{author}</span> : null}
          {line ? <span className="mt-2 block font-serif text-base italic leading-snug">{line.line}</span> : null}
          {latest ? <span className="mt-1 block truncate type-kicker text-muted">{latest}</span> : null}
        </span>
        <span className="shrink-0 font-sans text-sm">Open</span>
      </Link>
      {echo ? (
        <Link
          to="/read/$workId"
          params={{ workId }}
          search={{ echo }}
          className="flex h-12 items-center border-t border-ink px-4 font-sans text-sm"
        >
          Keep with them
        </Link>
      ) : (
        <Link
          to="/read/$workId"
          params={{ workId }}
          className="flex h-12 items-center border-t border-ink px-4 font-sans text-sm"
        >
          Sit
        </Link>
      )}
    </article>
  );
}

function KeptLineCard({ line, onShare }: { line: BoardKeptLine; onShare: () => void }) {
  return (
    <article className="border-b border-ink">
      <Link
        to="/friends/$handle"
        params={{ handle: line.handle }}
        className="block px-4 py-4"
      >
        <span className="type-kicker text-muted">{formatHandle(line.handle)} · Open</span>
        <span className="mt-1 block font-serif text-lg italic leading-snug">{line.line}</span>
        <span className="mt-1 block font-serif text-sm text-ink/70">{line.workTitle}</span>
      </Link>
      <div className="grid grid-cols-2 border-t border-ink">
        <Link
          to="/read/$workId"
          params={{ workId: line.workId }}
          search={line.atIndex >= 0 ? { at: line.atIndex } : {}}
          className="flex h-12 items-center justify-center font-sans text-sm"
        >
          Read
        </Link>
        <button
          type="button"
          onClick={onShare}
          className="flex h-12 items-center justify-center border-l border-ink font-sans text-sm"
        >
          Share link
        </button>
      </div>
    </article>
  );
}

function PledgeCard({
  pledge,
  mine,
  onSat,
  onAside,
}: {
  pledge: SitPledge;
  mine: boolean;
  onSat: () => void;
  onAside: () => void;
}) {
  const other = mine ? pledge.toHandle : pledge.fromHandle;
  return (
    <article className="border-b border-ink bg-yellow text-ink">
      <Link to="/friends/$handle" params={{ handle: other }} className="flex items-stretch">
        <span className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5">
          <span className="type-kicker opacity-70">
            {mine ? "You said you would sit" : "A friend will sit"}
          </span>
          <span className="mt-1 type-lede">
            {mine
              ? `${formatHandle(pledge.toHandle)} has your word`
              : `${formatHandle(pledge.fromHandle)} · ${pledgeLine(pledge)}`}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center px-4 font-sans text-sm">Open</span>
      </Link>
      <div className="grid grid-cols-2 border-t border-ink">
        <button
          type="button"
          onClick={onSat}
          className="flex h-12 items-center justify-center bg-ink font-sans text-sm text-paper"
        >
          {mine ? "I sat" : "They sat"}
        </button>
        <button
          type="button"
          onClick={onAside}
          className="flex h-12 items-center justify-center border-l border-ink bg-paper font-sans text-sm text-ink"
        >
          Set aside
        </button>
      </div>
    </article>
  );
}

function SitCard({ sit, onShare }: { sit: HostedSit; onShare: () => void }) {
  const phase = sitPhase(sit);
  return (
    <article className={cn("border-b border-ink", phase === "ghost" ? "bg-paper text-ink" : "bg-forest text-paper")}>
      <Link
        to="/friends/$handle"
        params={{ handle: sit.hostHandle }}
        className="flex items-stretch"
      >
        <span className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5">
          <span className="type-kicker opacity-80">
            {formatHandle(sit.hostHandle)} · {sitDurationLabel(sit.minutes)}
            {phase === "ghost" ? " · replay" : ""}
          </span>
          <span className="mt-1 type-lede">{sit.workTitle || "A sit"}</span>
        </span>
        <span className="inline-flex shrink-0 items-center px-4 font-sans text-sm">Open</span>
      </Link>
      <div className={cn("grid grid-cols-2 border-t", phase === "ghost" ? "border-ink" : "border-paper/40")}>
        <Link
          to="/sit/$token"
          params={{ token: encodeHostedSit(sit) }}
          className="flex h-12 items-center justify-center font-sans text-sm"
        >
          {phase === "ghost" ? "Replay" : "Join"}
        </Link>
        <button
          type="button"
          onClick={onShare}
          className={cn(
            "flex h-12 items-center justify-center border-l font-sans text-sm",
            phase === "ghost" ? "border-ink" : "border-paper/40",
          )}
        >
          Share link
        </button>
      </div>
    </article>
  );
}

function TogetherCard({ pair, selfHandle }: { pair: TogetherKeep; selfHandle: string }) {
  const other =
    normalizeHandle(pair.theirs.handle) !== selfHandle ? pair.theirs.handle : pair.yours.handle;
  const line = pair.yours.line.trim() || pair.theirs.line.trim();
  const echo = pair.theirs.line.trim();
  return (
    <article className="border-b border-ink">
      <Link to="/friends/$handle" params={{ handle: other }} className="block px-4 py-5">
        <span className="type-kicker text-muted">Together · {formatHandle(other)} · Open</span>
        {line ? <span className="mt-1 block type-lede italic leading-snug">{line}</span> : null}
        {echo && echo !== line ? (
          <span className="mt-2 block font-serif text-sm text-ink/60">{echo}</span>
        ) : null}
        <span className="mt-2 block type-kicker text-muted">{pair.workTitle}</span>
      </Link>
      <Link
        to="/read/$workId"
        params={{ workId: pair.workId }}
        search={{ at: pair.yours.at }}
        className="flex h-12 items-center border-t border-ink px-4 font-sans text-sm"
      >
        Read
      </Link>
    </article>
  );
}
