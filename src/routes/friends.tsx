import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useKeptLines } from "@/components/kept-sentences";
import { ResumeLink, usePersistHydrated } from "@/components/resume-link";
import {
  localFriendProfiles,
  type FriendGraph,
  type FriendRow,
} from "@/lib/friend-profile";
import { boardKeptLines, type BoardKeptLine } from "@/lib/friends";
import { mergeDirectorySearch, searchHandles } from "@/lib/handle-search";
import { shelfFromActivity, withRemoteActivity } from "@/lib/remote-activity";
import { updateHostedHandle } from "@/lib/remote-auth";
import { isOffline } from "@/lib/net";
import { refreshFollowedActivity, useRemoteBundle, useRemoteHandleSearch } from "@/lib/remote-directory";
import { renameActiveHandle } from "@/lib/reader-account";
import { formatHandle, normalizeHandle } from "@/lib/social";
import { useTbr } from "@/lib/store";
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
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const remote = useRemoteBundle();
  const remoteSearch = useRemoteHandleSearch(query);

  useEffect(() => {
    if (!remote.userId || isOffline()) return;
    void refreshFollowedActivity(remote.userId).catch(() => undefined);
  }, [remote.userId]);

  const { lines: kept } = useKeptLines(progress, hydrated);
  const shelves = useMemo(() => {
    const map = new Map<string, ReturnType<typeof shelfFromActivity>>();
    for (const [person, events] of Object.entries(remote.byHandle)) {
      map.set(normalizeHandle(person), shelfFromActivity(events));
    }
    return map;
  }, [remote.byHandle]);
  const remoteKept = useMemo(() => {
    const lines: Array<{
      handle: string;
      name: string;
      line: string;
      workId: string;
      workTitle: string;
      atIndex: number;
      breathId?: string;
    }> = [];
    for (const [person, shelf] of shelves) {
      const name = remote.profiles[person]?.name || formatHandle(person);
      for (const line of shelf.kept) lines.push({ handle: person, name, ...line });
    }
    return lines;
  }, [shelves, remote.profiles]);

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
  const me = normalizeHandle(handle);
  const people = rows.filter((row) => !row.isSelf && row.following);
  const keptLines = useMemo(
    () =>
      hydrated
        ? boardKeptLines({
            selfHandle: handle,
            selfLines: kept,
            togetherKeeps,
            hostedSits,
            remoteKept,
          }).filter((line) => line.handle !== me)
        : [],
    [hydrated, handle, kept, togetherKeeps, hostedSits, remoteKept, me],
  );
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
    setQuery("");
    setMessage(
      remote.signedIn
        ? `Following ${formatHandle(search.offer)}.`
        : `Following ${formatHandle(search.offer)} on this phone. Sign in to see their book and kept lines.`,
    );
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
    else setQuery("");
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
        {hydrated && !handle ? (
          <form onSubmit={(event) => void claim(event)} className="flex items-stretch border-b border-ink">
            <label className="flex min-w-0 flex-1 items-center">
              <span className="sr-only">Your @handle</span>
              <input
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setMessage("");
                }}
                placeholder="Your @handle"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="h-12 min-w-0 flex-1 border-0 bg-transparent px-4 font-serif text-base text-ink placeholder:text-ink/40 focus-visible:outline-none"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-12 shrink-0 items-center bg-ink px-4 font-sans text-sm text-paper"
            >
              Claim
            </button>
          </form>
        ) : null}

        {hydrated && handle ? (
          <p className="border-b border-ink px-4 py-3 font-serif text-base text-ink">{formatHandle(handle)}</p>
        ) : null}

        {hydrated ? (
          <section aria-label="Find a handle">
            <label className="flex min-w-0 items-center border-b border-ink">
              <span className="sr-only">Find @handle</span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setMessage("");
                }}
                placeholder="Find @handle"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                className="h-12 min-w-0 flex-1 border-0 bg-transparent px-4 font-serif text-base text-ink placeholder:text-ink/40 focus-visible:outline-none"
              />
            </label>
            {search.matches
              .filter((row) => !row.isSelf)
              .map((row) => (
                <SearchRow key={row.handle} row={row} onFollow={() => onFollow(row)} />
              ))}
            {search.offer ? (
              <button
                type="button"
                onClick={followOffer}
                className="flex min-h-12 w-full items-center border-b border-ink px-4 py-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-base leading-snug">Follow {formatHandle(search.offer)}</span>
                  <span className="mt-1 block font-sans text-sm text-ink/70">
                    {remote.signedIn
                      ? "Their open book and kept lines show here."
                      : "Sign in to see their open book and kept lines."}
                  </span>
                </span>
              </button>
            ) : null}
            {search.message ? (
              <p className="border-b border-ink px-4 py-3 font-sans text-sm text-ink/70">{search.message}</p>
            ) : null}
            {remote.followMissing.length > 0 ? (
              <p className="border-b border-ink px-4 py-3 font-sans text-sm text-ink/70">
                No account yet for {remote.followMissing.map((row) => formatHandle(row)).join(", ")}.
              </p>
            ) : null}
          </section>
        ) : null}

        {hydrated && !remote.signedIn && people.length > 0 ? (
          <p className="border-b border-ink px-4 py-3 font-sans text-sm text-ink/70">
            Sign in to see their books and the lines they keep.
          </p>
        ) : null}

        {hydrated ? (
          <section aria-label="Friends">
            {people.length === 0 ? (
              <p className="border-b border-ink px-4 py-8 font-serif text-base leading-snug text-ink/70">
                Follow someone by @handle. Their book and the lines they keep show here.
              </p>
            ) : (
              people.map((row) => (
                <FriendFeed
                  key={row.handle}
                  row={row}
                  reading={shelves.get(row.handle)?.reading}
                  lines={keptLines.filter((line) => line.handle === row.handle).slice(0, 3)}
                  onFollow={() => onFollow(row)}
                />
              ))
            )}
          </section>
        ) : null}

        <Link
          to="/together"
          className="block px-4 py-8 text-center font-sans text-sm text-ink/60"
        >
          Rooms
        </Link>
      </div>
    </div>
  );
}

function SearchRow({ row, onFollow }: { row: FriendRow; onFollow: () => void }) {
  return (
    <div className="flex min-h-12 items-center border-b border-ink">
      <Link
        to="/friends/$handle"
        params={{ handle: row.handle }}
        className="flex min-w-0 flex-1 items-center px-4 py-3 font-serif text-base"
      >
        {formatHandle(row.handle)}
      </Link>
      <button
        type="button"
        onClick={onFollow}
        aria-pressed={row.following}
        className={cn(
          "inline-flex h-12 shrink-0 items-center px-4 font-sans text-sm",
          row.following ? "bg-ink text-paper" : "bg-paper text-ink",
        )}
      >
        {row.following ? "Following" : "Follow"}
      </button>
    </div>
  );
}

function FriendFeed({
  row,
  reading,
  lines,
  onFollow,
}: {
  row: FriendRow;
  reading?: { workId: string; workTitle: string; author: string; progress?: string; atIndex?: number };
  lines: BoardKeptLine[];
  onFollow: () => void;
}) {
  const detail = [reading?.author, reading?.progress].filter(Boolean).join(" · ");
  return (
    <article className="border-b border-ink">
      <div className="flex items-start gap-3 px-4 pt-4">
        <div className="min-w-0 flex-1">
          <Link
            to="/friends/$handle"
            params={{ handle: row.handle }}
            className="type-kicker text-muted"
          >
            {formatHandle(row.handle)}
          </Link>
          {reading ? (
            <Link
              to="/read/$workId"
              params={{ workId: reading.workId }}
              search={typeof reading.atIndex === "number" ? { at: reading.atIndex } : {}}
              className="mt-2 block"
            >
              <span className="type-kicker text-forest">Reading</span>
              <span className="mt-1 block type-card">{reading.workTitle}</span>
              {detail ? <span className="mt-1 block font-serif text-sm text-ink/70">{detail}</span> : null}
            </Link>
          ) : (
            <p className="mt-2 font-serif text-base text-ink/70">No open book</p>
          )}
        </div>
        <button
          type="button"
          onClick={onFollow}
          aria-pressed={row.following}
          className="inline-flex h-11 shrink-0 items-center bg-ink px-3 font-sans text-sm text-paper"
        >
          Following
        </button>
      </div>
      {lines.length > 0 ? (
        <ul className="mt-2">
          {lines.map((line) => (
            <li key={line.id} className="border-t border-ink/15">
              <Link
                to="/read/$workId"
                params={{ workId: line.workId }}
                search={{ at: line.atIndex }}
                className="block px-4 py-3 font-serif text-base italic leading-snug"
              >
                {line.line}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="h-4" />
    </article>
  );
}
