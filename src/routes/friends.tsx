import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useKeptLines } from "@/components/kept-sentences";
import { ResumeLink, usePersistHydrated } from "@/components/resume-link";
import {
  friendProfilePath,
  localFriendProfiles,
  type FriendGraph,
  type FriendRow,
} from "@/lib/friend-profile";
import { useFollowedAuthors } from "@/lib/followed-authors";
import { boardKeptLines, friendsFeed, youCard, type BoardKeptLine } from "@/lib/friends";
import { mergeDirectorySearch, searchHandles } from "@/lib/handle-search";
import { withRemoteActivity } from "@/lib/remote-activity";
import { updateHostedHandle } from "@/lib/remote-auth";
import { refreshFollowedActivity, useRemoteBundle, useRemoteHandleSearch } from "@/lib/remote-directory";
import {
  booksOnTbrLabel,
  notableAuthor,
  notableAuthors,
  type CatalogAuthor,
} from "@/lib/notable-authors";
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
import { APP_NAME, publicUrl, salonShareText, salonShareTitle } from "@/lib/site";
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
import { useTbr } from "@/lib/store";
import { shareOrCopy } from "@/lib/shuffle";
import { echoInviteUrl, encodeEchoInvite } from "@/lib/together-keep";
import type { TogetherKeep } from "@/lib/together-keep";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/friends")({
  component: FriendsPage,
});

function FriendsPage() {
  const hydrated = usePersistHydrated();
  const handle = useTbr((s) => s.handle) ?? "";
  const following = useTbr((s) => s.following) ?? [];
  const contacts = useTbr((s) => s.contacts) ?? [];
  const progress = useTbr((s) => s.progress);
  const togetherKeeps = useTbr((s) => s.togetherKeeps) ?? [];
  const hostedSits = useTbr((s) => s.hostedSits) ?? [];
  const sitPledges = useTbr((s) => s.sitPledges) ?? [];
  const sitHistory = useTbr((s) => s.sitHistory) ?? [];
  const joined = useTbr((s) => s.joined) ?? [];
  const readingMinutesByDay = useTbr((s) => s.readingMinutesByDay);
  const advancesByDay = useTbr((s) => s.advancesByDay);
  const sceneCrossesByDay = useTbr((s) => s.sceneCrossesByDay);
  const keepsByDay = useTbr((s) => s.keepsByDay);
  const worksTouchedByDay = useTbr((s) => s.worksTouchedByDay);
  const hostOpensByDay = useTbr((s) => s.hostOpensByDay);
  const sitsByDay = useTbr((s) => s.sitsByDay);
  const clubTouchesByDay = useTbr((s) => s.clubTouchesByDay);
  const setHandle = useTbr((s) => s.setHandle);
  const addContact = useTbr((s) => s.addContact);
  const toggleFollow = useTbr((s) => s.toggleFollow);
  const rememberPledge = useTbr((s) => s.rememberPledge);
  const setPledgeStatus = useTbr((s) => s.setPledgeStatus);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const followedAuthors = useFollowedAuthors();
  const remote = useRemoteBundle();
  const remoteSearch = useRemoteHandleSearch(query);

  useEffect(() => {
    if (!remote.userId) return;
    void refreshFollowedActivity(remote.userId);
  }, [remote.userId]);
  const [pledgeTo, setPledgeTo] = useState("");
  const [pledgeWindow, setPledgeWindow] = useState<EveningWindow>("tonight");
  const kept = useKeptLines(progress, hydrated);

  const graph = useMemo<FriendGraph>(
    () =>
      withRemoteActivity(
        {
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
        },
        remote.byHandle,
      ),
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
      remote.byHandle,
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
    return friendsFeed(following, graph.contacts).filter((row) => {
      if (!row.reading || seen.has(row.handle)) return false;
      seen.add(row.handle);
      return true;
    });
  }, [hydrated, following, graph.contacts]);
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
          fill: club?.fill ?? "paper",
        };
      }),
    [joined],
  );
  const latestByHandle = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) map.set(row.handle, row.latest);
    return map;
  }, [rows]);
  const search = useMemo(
    () =>
      mergeDirectorySearch(
        searchHandles(query, rows),
        remoteSearch.hits,
        rows,
        handle,
        remoteSearch.pending,
      ),
    [query, rows, remoteSearch.hits, remoteSearch.pending, handle],
  );
  const authors = useMemo(() => notableAuthors(), []);
  const followedAuthorCards = useMemo(
    () =>
      followedAuthors.slugs.flatMap((slug) => {
        const author = notableAuthor(slug);
        return author ? [author] : [];
      }),
    [followedAuthors.slugs],
  );

  async function claim(event: FormEvent) {
    event.preventDefault();
    const previous = handle;
    const result = setHandle(draft || handle);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    const remoteHandle = await updateHostedHandle(result.handle);
    if (!remoteHandle.ok) {
      if (previous) setHandle(previous);
      setMessage(remoteHandle.error);
      return;
    }
    const next = remoteHandle.handle || result.handle;
    if (next !== result.handle) setHandle(next);
    renameActiveHandle(next);
    setDraft("");
    setMessage(`Sitting as ${formatHandle(next)}.`);
  }

  function followOffer() {
    if (!search.offer) return;
    const result = addContact({ handle: search.offer });
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(`Following ${formatHandle(search.offer)}.`);
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
    const known = contacts.some((item) => item.handle === row.handle);
    if (known) {
      if (!following.includes(row.id)) toggleFollow(row.id);
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

      <div className="min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto">
        <div className="border-b border-ink px-4 py-5">
          <p className="type-kicker text-muted">On this phone</p>
          <p className="mt-1 type-lede">What friends are reading</p>
        </div>

        {hydrated ? (
          <section aria-label="Search handles">
            <label className="flex min-w-0 items-center border-b border-ink">
              <span className="sr-only">Search @handle</span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setMessage("");
                }}
                placeholder="Search @handle"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                className="h-14 min-w-0 flex-1 border-0 bg-transparent px-4 font-serif text-xl text-ink placeholder:text-ink/40 focus-visible:outline-none"
              />
            </label>
            {search.matches.length > 0 ? (
              <Rail label="Search handles">
                {search.matches.map((row) => (
                  <FriendListRow key={row.handle} row={row} onFollow={() => onFollow(row)} />
                ))}
              </Rail>
            ) : null}
            {search.offer ? (
              <button
                type="button"
                onClick={followOffer}
                className="flex w-full items-start border-b border-ink px-4 py-4 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-xl leading-tight">
                    Follow {formatHandle(search.offer)}
                  </span>
                  <span className="mt-1 block font-serif text-sm leading-snug text-ink/70">
                    Their activity appears once you share a sit or invite link with them.
                  </span>
                </span>
              </button>
            ) : null}
            {search.message ? (
              <p className="border-b border-ink px-4 py-3 font-serif text-sm text-ink/70">{search.message}</p>
            ) : null}
          </section>
        ) : null}

        {!hydrated ? <div className="min-h-24 border-b border-ink bg-paper" /> : null}

        {hydrated ? (
          <section>
            <SectionTitle>Your @name</SectionTitle>
            <form onSubmit={(event) => void claim(event)} className="flex items-stretch border-b border-ink">
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
            {withYou.length + followedAuthorCards.length > 0 ? (
              <Rail label="People">
                {withYou.map((row) => (
                  <FriendListRow key={row.handle} row={row} onFollow={() => onFollow(row)} />
                ))}
                {followedAuthorCards.map((author) => (
                  <AuthorFollowRow
                    key={author.slug}
                    author={author}
                    following
                    onFollow={() => followedAuthors.toggle(author.slug)}
                  />
                ))}
              </Rail>
            ) : null}
            {friends.filter((row) => row.following).length === 0 ? (
              <EmptyCopy>
                No friends on this phone yet. A follow, an invite, or a shared sit is what shows up here.
              </EmptyCopy>
            ) : null}
            <TextButton onClick={() => void invite()}>Invite a friend</TextButton>
          </section>
        ) : null}

        {hydrated ? (
          <section aria-label="Notable people to follow">
            <SectionTitle>Notable people to follow</SectionTitle>
            {authors.length > 0 ? (
              <Rail label="Notable people to follow">
                {authors.map((author) => (
                  <AuthorFollowRow
                    key={author.slug}
                    author={author}
                    following={followedAuthors.follows(author.slug)}
                    onFollow={() => followedAuthors.toggle(author.slug)}
                  />
                ))}
              </Rail>
            ) : null}
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
              <Rail label="Friends are reading">
                {reading.map((row) => {
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
                })}
              </Rail>
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
              <Rail label="Kept lines">
                {keptLines.map((line) => (
                  <KeptLineCard key={line.id} line={line} onShare={() => void shareLine(line)} />
                ))}
              </Rail>
            )}
          </section>
        ) : null}

        {hydrated ? (
          <section>
            <SectionTitle>Together</SectionTitle>
            {pendingPledges.length === 0 ? (
              <EmptyCopy>No tonight-notes on this phone.</EmptyCopy>
            ) : (
              <Rail label="Tonight notes">
                {pendingPledges.map((pledge) => (
                  <PledgeCard
                    key={pledge.id}
                    pledge={pledge}
                    mine={me === pledge.fromHandle}
                    onSat={() => setPledgeStatus(pledge.id, "done")}
                    onAside={() => setPledgeStatus(pledge.id, "cancelled")}
                  />
                ))}
              </Rail>
            )}
            {mySits.length === 0 ? (
              <EmptyCopy>No sit to join or host on this phone.</EmptyCopy>
            ) : (
              <Rail label="Sits">
                {mySits.map((sit) => (
                  <SitCard key={sit.id} sit={sit} onShare={() => void shareSit(sit)} />
                ))}
              </Rail>
            )}
            {togetherKeeps.length === 0 ? (
              <EmptyCopy>No together-keeps yet.</EmptyCopy>
            ) : (
              <Rail label="Together keeps">
                {togetherKeeps.map((pair) => (
                  <TogetherCard key={pair.id} pair={pair} selfHandle={me} />
                ))}
              </Rail>
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
              <Rail label="I'll sit tonight">
                {EVENING_WINDOWS.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    role="listitem"
                    onClick={() => setPledgeWindow(row.id)}
                    className={cn(
                      "you-tile is-sit font-sans text-sm",
                      pledgeWindow === row.id ? "bg-ink text-paper" : "bg-paper text-ink",
                    )}
                  >
                    {row.label}
                  </button>
                ))}
              </Rail>
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
              <Rail label="Suggestions">
                {suggestions.map((row) => (
                  <FriendListRow key={row.handle} row={row} onFollow={() => onFollow(row)} />
                ))}
              </Rail>
            )}
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
              <Rail label="Club rooms">
                {rooms.map((room) => (
                  <Link
                    key={room.id}
                    to="/club/$clubId"
                    params={{ clubId: room.id }}
                    role="listitem"
                    className={cn("you-tile is-wide", fillClass(room.fill), fillInk(room.fill))}
                  >
                    <span className="type-kicker opacity-80">{room.place}</span>
                    <span className="mt-1 type-lede">{room.name}</span>
                    {room.workTitle ? (
                      <span className="mt-1 font-serif text-sm opacity-80">{room.workTitle}</span>
                    ) : null}
                    <span className="mt-2 font-serif text-sm opacity-75">
                      You joined. Other people appear only when they are on this phone.
                    </span>
                    <span className="mt-2 font-sans text-xs opacity-80">Open</span>
                  </Link>
                ))}
              </Rail>
            )}
          </section>
        ) : null}

        <p className="px-4 py-6 font-serif text-sm text-ink/60">
          {remote.signedIn
            ? "Signed in. Follows and reading sync with tbr. This phone keeps its own copy."
            : "Handles, keeps, sits, and tonight-notes stay on this phone until you sign in."}
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <p className="border-b border-ink px-4 py-3 type-kicker text-muted">{children}</p>;
}

function Rail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rail" role="list" aria-label={label}>
      {children}
    </div>
  );
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

function AuthorFollowRow({
  author,
  following,
  onFollow,
}: {
  author: CatalogAuthor;
  following: boolean;
  onFollow: () => void;
}) {
  const fill = planeOf(author.slug);
  const initial = (author.name.slice(0, 1) || "?").toUpperCase();
  return (
    <div role="listitem" className={cn("you-tile is-wide is-flush", fillClass(fill), fillInk(fill))}>
      <Link
        to="/friends/author/$slug"
        params={{ slug: author.slug }}
        aria-label={`Open ${author.name}`}
        className="you-tile-link"
      >
        <span
          aria-hidden
          className="mb-3 flex size-8 items-center justify-center border border-current font-sans text-sm"
        >
          {initial}
        </span>
        <span className="type-kicker opacity-80">Author</span>
        <span className="mt-1 type-lede">{author.name}</span>
        <span className="mt-1 font-serif text-sm opacity-80">{booksOnTbrLabel(author.books.length)}</span>
        <span className="mt-2 font-sans text-xs opacity-80">Open</span>
      </Link>
      <button
        type="button"
        onClick={onFollow}
        aria-pressed={following}
        className={cn("you-tile-action", followBar(following, fill))}
      >
        {following ? "Following" : "Follow"}
      </button>
    </div>
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
    <div role="listitem" className={cn("you-tile is-wide is-flush", fillClass(fill), fillInk(fill))}>
      <Link
        to="/friends/$handle"
        params={{ handle: row.handle }}
        aria-label={`Open ${formatHandle(row.handle)}`}
        className="you-tile-link"
      >
        <span
          aria-hidden
          className="mb-3 flex size-8 items-center justify-center border border-current font-sans text-sm"
        >
          {initial}
        </span>
        <span className="type-kicker opacity-80">{row.isSelf ? "This device" : "Friend"}</span>
        <span className="mt-1 type-lede">{formatHandle(row.handle)}</span>
        <span className="mt-1 font-serif text-sm opacity-80">{reading}</span>
        <span className="mt-1 type-kicker opacity-70">
          {row.waiting ? "Waiting" : row.latest || "No activity on this phone yet"}
        </span>
        <span className="mt-2 font-sans text-xs opacity-80">Open</span>
      </Link>
      {row.isSelf ? null : (
        <button
          type="button"
          onClick={onFollow}
          aria-pressed={row.following}
          className={cn("you-tile-action", followBar(row.following, fill))}
        >
          {row.following ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
}

function followBar(following: boolean, fill: ReturnType<typeof planeOf>) {
  if (!following) return "bg-paper text-ink";
  if (fill === "ink") return "bg-yellow text-ink";
  return "bg-ink text-paper";
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
  const fill = planeOf(handle);
  return (
    <article role="listitem" className={cn("you-tile is-wide is-flush", fillClass(fill), fillInk(fill))}>
      <Link to="/friends/$handle" params={{ handle }} className="you-tile-link">
        <span className="type-kicker opacity-80">{formatHandle(handle)}</span>
        <span className="mt-1 type-lede">{workTitle || "Open book"}</span>
        {author ? <span className="mt-1 font-serif text-sm opacity-80">{author}</span> : null}
        {line ? <span className="mt-2 font-serif text-base italic leading-snug">{line.line}</span> : null}
        {latest ? <span className="mt-1 type-kicker opacity-70">{latest}</span> : null}
        <span className="mt-2 font-sans text-xs opacity-80">Open</span>
      </Link>
      {echo ? (
        <Link
          to="/read/$workId"
          params={{ workId }}
          search={{ echo }}
          className={cn("you-tile-action", followBar(false, fill))}
        >
          Keep with them
        </Link>
      ) : (
        <Link to="/read/$workId" params={{ workId }} className={cn("you-tile-action", followBar(false, fill))}>
          Sit
        </Link>
      )}
    </article>
  );
}

function KeptLineCard({ line, onShare }: { line: BoardKeptLine; onShare: () => void }) {
  const fill = planeOf(line.handle);
  return (
    <article role="listitem" className={cn("you-tile is-quote", fillClass(fill), fillInk(fill))}>
      <Link to="/friends/$handle" params={{ handle: line.handle }} className="you-tile-link">
        <span className="type-kicker opacity-80">{formatHandle(line.handle)} · Open</span>
        <span className="mt-1 font-serif text-lg italic leading-snug">{line.line}</span>
        <span className="mt-1 font-serif text-sm opacity-80">{line.workTitle}</span>
      </Link>
      <div className="you-tile-actions">
        <Link
          to="/read/$workId"
          params={{ workId: line.workId }}
          search={line.atIndex >= 0 ? { at: line.atIndex } : {}}
          className={followBar(false, fill)}
        >
          Read
        </Link>
        <button type="button" onClick={onShare} className={followBar(true, fill)}>
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
    <article role="listitem" className="you-tile is-wide is-flush bg-yellow text-ink">
      <Link to="/friends/$handle" params={{ handle: other }} className="you-tile-link">
        <span className="type-kicker opacity-70">
          {mine ? "You said you would sit" : "A friend will sit"}
        </span>
        <span className="mt-1 type-lede">
          {mine
            ? `${formatHandle(pledge.toHandle)} has your word`
            : `${formatHandle(pledge.fromHandle)} · ${pledgeLine(pledge)}`}
        </span>
        <span className="mt-2 font-sans text-xs opacity-80">Open</span>
      </Link>
      <div className="you-tile-actions">
        <button type="button" onClick={onSat} className="bg-ink text-paper">
          {mine ? "I sat" : "They sat"}
        </button>
        <button type="button" onClick={onAside} className="bg-paper text-ink">
          Set aside
        </button>
      </div>
    </article>
  );
}

function SitCard({ sit, onShare }: { sit: HostedSit; onShare: () => void }) {
  const phase = sitPhase(sit);
  const ghost = phase === "ghost";
  return (
    <article
      role="listitem"
      className={cn("you-tile is-wide is-flush", ghost ? "bg-paper text-ink" : "bg-forest text-paper")}
    >
      <Link to="/friends/$handle" params={{ handle: sit.hostHandle }} className="you-tile-link">
        <span className="type-kicker opacity-80">
          {formatHandle(sit.hostHandle)} · {sitDurationLabel(sit.minutes)}
          {ghost ? " · replay" : ""}
        </span>
        <span className="mt-1 type-lede">{sit.workTitle || "A sit"}</span>
        <span className="mt-2 font-sans text-xs opacity-80">Open</span>
      </Link>
      <div className="you-tile-actions">
        <Link to="/sit/$token" params={{ token: encodeHostedSit(sit) }} className={ghost ? "bg-ink text-paper" : "bg-paper text-ink"}>
          {ghost ? "Replay" : "Join"}
        </Link>
        <button type="button" onClick={onShare} className={ghost ? "bg-paper text-ink" : "bg-ink text-paper"}>
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
  const fill = planeOf(other);
  return (
    <article role="listitem" className={cn("you-tile is-quote", fillClass(fill), fillInk(fill))}>
      <Link to="/friends/$handle" params={{ handle: other }} className="you-tile-link">
        <span className="type-kicker opacity-80">Together · {formatHandle(other)} · Open</span>
        {line ? <span className="mt-1 type-lede italic leading-snug">{line}</span> : null}
        {echo && echo !== line ? (
          <span className="mt-2 font-serif text-sm opacity-75">{echo}</span>
        ) : null}
        <span className="mt-2 type-kicker opacity-70">{pair.workTitle}</span>
      </Link>
      <Link
        to="/read/$workId"
        params={{ workId: pair.workId }}
        search={{ at: pair.yours.at }}
        className={cn("you-tile-action", followBar(false, fill))}
      >
        Read
      </Link>
    </article>
  );
}
