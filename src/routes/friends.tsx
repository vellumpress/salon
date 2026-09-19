import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { ResumeLink, usePersistHydrated } from "@/components/resume-link";
import { fillClass, fillInk, planeOf } from "@/lib/mondrian";
import { friendsFeed, searchPeople, youCard } from "@/lib/friends";
import { formatHandle, handleError } from "@/lib/social";
import { liveBackendEnabled } from "@/lib/site";
import { useVellum } from "@/lib/store";
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
  const setHandle = useVellum((s) => s.setHandle);
  const addContact = useVellum((s) => s.addContact);
  const toggleFollow = useVellum((s) => s.toggleFollow);
  const [draft, setDraft] = useState("");
  const [find, setFind] = useState("");
  const [message, setMessage] = useState("");

  const you = useMemo(
    () => youCard({ handle, progress }),
    [handle, progress],
  );
  const feed = useMemo(
    () => (hydrated ? friendsFeed(following, contacts) : []),
    [hydrated, following, contacts],
  );
  const people = useMemo(
    () => (hydrated ? searchPeople(find, contacts) : []),
    [hydrated, find, contacts],
  );

  function claim(event: FormEvent) {
    event.preventDefault();
    const result = setHandle(draft || handle);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
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
    setMessage("Connected.");
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
          Friends
        </h1>
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
        <div className="flex min-h-36 flex-col justify-end bg-red p-5 text-paper sm:min-h-44 sm:p-8">
          <p className="type-kicker opacity-80">
            {handle ? formatHandle(handle) : "Claim a name"}
          </p>
          <p className="type-title mt-2">
            {handle ? formatHandle(handle) : "Who is sitting?"}
          </p>
          <p className="type-pitch mt-2.5 max-w-xl text-paper/80">
            Follow what others are reading. On this phone first; a live room can sync later.
          </p>
        </div>

        <section>
          <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
            Your @username
          </p>
          <form onSubmit={claim} className="flex items-stretch border-b border-ink">
            <label className="flex min-w-0 flex-1 items-center">
              <span className="px-4 font-sans text-sm text-muted">@</span>
              <input
                value={draft || handle}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setMessage("");
                }}
                placeholder="mina"
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
          {message ? (
            <p className="border-b border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">
              {message}
            </p>
          ) : handleError(draft || handle || "ab") && (draft || !handle) ? (
            <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
              Two to twenty letters. Friends find you by this name.
            </p>
          ) : null}
        </section>

        {you.reading ? (
          <section>
            <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
              You are reading
            </p>
            <Link
              to="/read/$workId"
              params={{ workId: you.reading }}
              className="flex items-stretch border-b border-ink bg-forest text-paper"
            >
              <span className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5">
                <span className="type-kicker opacity-80">
                  {you.author || "This sitting"}
                </span>
                <span className="mt-1 type-lede">
                  {you.workTitle || you.reading}
                </span>
              </span>
              <span className="flex items-center px-4 font-sans text-sm">Continue</span>
            </Link>
          </section>
        ) : null}

        <section>
          <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
            Friends are reading
          </p>
          {!hydrated ? (
            <div className="min-h-24 border-b border-ink bg-paper" />
          ) : feed.length === 0 ? (
            <p className="border-b border-ink px-4 py-5 font-serif text-lg text-ink/70">
              Follow someone below. Their current sit will gather here.
            </p>
          ) : (
            feed.map((row) => {
              const fill = planeOf(row.handle);
              return (
                <div
                  key={row.id}
                  className={cn(
                    "flex items-stretch border-b border-ink",
                    fillClass(fill),
                    fillInk(fill),
                  )}
                >
                  {row.catalog ? (
                    <Link
                      to="/reader/$readerId"
                      params={{ readerId: row.id }}
                      className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5"
                    >
                      <span className="type-kicker opacity-80">
                        {formatHandle(row.handle)}
                      </span>
                      <span className="mt-1 type-lede">
                        {row.name}
                      </span>
                      <span className="mt-1 font-serif text-base opacity-90">
                        {row.workTitle}
                      </span>
                    </Link>
                  ) : (
                    <span className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5">
                      <span className="type-kicker opacity-80">
                        {formatHandle(row.handle)}
                      </span>
                      <span className="mt-1 type-lede">
                        {row.name}
                      </span>
                      <span className="mt-1 font-serif text-base opacity-90">
                        {row.workTitle || "Waiting for a sit"}
                      </span>
                    </span>
                  )}
                  {row.reading ? (
                    <Link
                      to="/read/$workId"
                      params={{ workId: row.reading }}
                      className={cn(
                        "inline-flex shrink-0 items-center px-4 font-sans text-sm",
                        fill === "yellow" || fill === "paper"
                          ? "bg-ink text-paper"
                          : "bg-paper text-ink",
                      )}
                    >
                      Sit
                    </Link>
                  ) : null}
                </div>
              );
            })
          )}
        </section>

        <section>
          <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
            Find / follow
          </p>
          <form onSubmit={connect} className="flex items-stretch border-b border-ink">
            <input
              value={find}
              onChange={(event) => {
                setFind(event.target.value);
                setMessage("");
              }}
              placeholder="@ada or a name"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="h-14 min-w-0 flex-1 border-0 bg-transparent px-4 font-serif text-xl text-ink focus-visible:outline-none"
            />
            <button
              type="submit"
              className="inline-flex h-14 shrink-0 items-center bg-blue px-5 font-sans text-sm text-paper"
            >
              Connect
            </button>
          </form>
          {people.map((row) => {
            const isYou = handle && row.handle === handle;
            const isFollowed = following.includes(row.id);
            return (
              <div key={row.id} className="flex items-stretch border-b border-ink">
                {row.catalog ? (
                  <Link
                    to="/reader/$readerId"
                    params={{ readerId: row.id }}
                    className="flex min-w-0 flex-1 flex-col justify-center px-4 py-4"
                  >
                    <span className="type-kicker text-muted">
                      {formatHandle(row.handle)} · {row.city}
                    </span>
                    <span className="mt-1 type-lede">
                      {row.name}
                    </span>
                    <span className="mt-1 font-serif text-sm text-ink/70">
                      {row.workTitle}
                    </span>
                  </Link>
                ) : (
                  <span className="flex min-w-0 flex-1 flex-col justify-center px-4 py-4">
                    <span className="type-kicker text-muted">
                      {formatHandle(row.handle)} · {row.city}
                    </span>
                    <span className="mt-1 type-lede">
                      {row.name}
                    </span>
                  </span>
                )}
                {isYou ? (
                  <span className="inline-flex shrink-0 items-center px-4 font-sans text-sm text-muted">
                    You
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleFollow(row.id)}
                    className={cn(
                      "inline-flex h-auto shrink-0 items-center px-4 font-sans text-sm",
                      isFollowed ? "bg-ink text-paper" : "bg-red text-paper",
                    )}
                  >
                    {isFollowed ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            );
          })}
        </section>

        {!liveBackendEnabled ? (
          <p className="px-4 py-6 font-serif text-sm text-ink/60">
            Handles and follows stay on this device. A hosted Salon can share them between phones.
          </p>
        ) : (
          <p className="px-4 py-6 font-serif text-sm text-ink/60">
            Live backend is on, but handle and follow APIs are not in this tree yet. The graph stays local.
          </p>
        )}
      </div>
    </div>
  );
}
