import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { ResumeLink, usePersistHydrated } from "@/components/resume-link";
import {
  friendProfilePath,
  localFriendProfiles,
  type FriendGraph,
  type FriendRow,
} from "@/lib/friend-profile";
import { fillClass, fillInk, planeOf } from "@/lib/mondrian";
import { renameActiveHandle } from "@/lib/reader-account";
import { formatHandle, handleError, normalizeHandle } from "@/lib/social";
import { APP_NAME, liveBackendEnabled, publicUrl, salonShareText, salonShareTitle } from "@/lib/site";
import { useVellum } from "@/lib/store";
import { shareOrCopy } from "@/lib/shuffle";
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
  const [draft, setDraft] = useState("");
  const [find, setFind] = useState("");
  const [message, setMessage] = useState("");

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
  const friends = rows.filter((row) => !row.isSelf);

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

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-ink px-4 py-5">
          <p className="type-kicker text-muted">On this phone</p>
          <p className="mt-1 type-lede">What friends are reading</p>
        </div>

        {!hydrated ? <div className="min-h-24 border-b border-ink bg-paper" /> : null}

        {hydrated && !handle ? (
          <section>
            <p className="border-b border-ink px-4 py-3 type-kicker text-muted">Your @name</p>
            <form onSubmit={claim} className="flex items-stretch border-b border-ink">
              <label className="flex min-w-0 flex-1 items-center">
                <span className="px-4 font-sans text-sm text-muted">@</span>
                <input
                  value={draft}
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
                Claim
              </button>
            </form>
            {handleError(draft || "ab") && draft ? (
              <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
                Two to twenty letters. Friends open your profile by this name.
              </p>
            ) : null}
          </section>
        ) : null}

        {hydrated
          ? rows.map((row) => (
              <FriendListRow key={row.handle} row={row} onFollow={() => onFollow(row)} />
            ))
          : null}

        {hydrated && friends.length === 0 ? (
          <section className="border-b border-ink px-4 py-8">
            <p className="type-lede">No friends on this phone yet.</p>
            <p className="mt-2 max-w-md font-serif text-base text-ink/70">
              Invite someone. A sit, a follow, or their reply is what shows up here — nothing invented.
            </p>
            <button
              type="button"
              onClick={() => void invite()}
              className="mt-5 inline-flex h-12 items-center bg-ink px-5 font-sans text-sm text-paper"
            >
              Invite a friend
            </button>
          </section>
        ) : null}

        {hydrated ? (
          <section>
            <p className="border-b border-ink px-4 py-3 type-kicker text-muted">Follow a name</p>
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
            {friends.length > 0 ? (
              <button
                type="button"
                onClick={() => void invite()}
                className="flex h-12 w-full items-center border-b border-ink px-4 font-sans text-sm"
              >
                Invite a friend
              </button>
            ) : null}
          </section>
        ) : null}

        {message ? (
          <p className="border-b border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">{message}</p>
        ) : null}

        <p className="px-4 py-6 font-serif text-sm text-ink/60">
          {liveBackendEnabled
            ? `Handles, keeps, sits, and tonight-notes stay on this device. Live sync is not in this tree yet.`
            : `Handles, keeps, sits, and tonight-notes stay on this device. A hosted ${APP_NAME} can sync them later.`}
        </p>
      </div>
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
    <div className="flex items-stretch border-b border-ink">
      <Link
        to="/friends/$handle"
        params={{ handle: row.handle }}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3"
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
          {row.latest ? (
            <span className="mt-0.5 block truncate type-kicker text-muted">{row.latest}</span>
          ) : (
            <span className="mt-0.5 block truncate type-kicker text-muted">No activity on this phone yet</span>
          )}
        </span>
      </Link>
      {row.isSelf ? (
        <span className="inline-flex shrink-0 items-center px-3 font-sans text-sm text-muted">You</span>
      ) : (
        <button
          type="button"
          onClick={onFollow}
          aria-pressed={row.following}
          className={cn(
            "my-auto mr-3 inline-flex h-11 shrink-0 items-center border border-ink px-3 font-sans text-sm",
            row.following ? "bg-ink text-paper" : "bg-paper text-ink",
          )}
        >
          {row.following ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
}
