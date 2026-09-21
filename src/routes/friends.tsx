import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { ResumeLink, usePersistHydrated } from "@/components/resume-link";
import { fillClass, fillInk, planeOf } from "@/lib/mondrian";
import { friendKeptLine, friendsFeed, searchPeople, youCard } from "@/lib/friends";
import { renameActiveHandle } from "@/lib/reader-account";
import { formatHandle, handleError, normalizeHandle, readerByHandle } from "@/lib/social";
import { liveBackendEnabled, salonShareText, salonShareTitle } from "@/lib/site";
import { useVellum } from "@/lib/store";
import { cn } from "@/lib/utils";
import { encodeEchoInvite } from "@/lib/together-keep";
import {
  encodeHostedSit,
  sitDurationLabel,
  sitInvolves,
  sitPhase,
} from "@/lib/hosted-sit";
import {
  createSitPledge,
  EVENING_WINDOWS,
  isPledgePending,
  pledgeLine,
  remindPledgeLocally,
  sitPledgeUrl,
  type EveningWindow,
} from "@/lib/sit-pledge";
import { shareOrCopy } from "@/lib/shuffle";

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
  const me = normalizeHandle(handle);
  const pendingPledges = useMemo(
    () =>
      hydrated
        ? sitPledges.filter(
            (row) =>
              isPledgePending(row) &&
              (row.fromHandle === me || row.toHandle === me || !me),
          )
        : [],
    [hydrated, sitPledges, me],
  );
  const mySits = useMemo(
    () =>
      hydrated
        ? hostedSits.filter((row) => !me || sitInvolves(row, me))
        : [],
    [hydrated, hostedSits, me],
  );

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

        {pendingPledges.length > 0 || mySits.length > 0 || togetherKeeps.length > 0 ? (
          <section>
            <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
              Together
            </p>
            {pendingPledges.map((pledge) => {
              const mine = normalizeHandle(handle) === pledge.fromHandle;
              return (
                <div key={pledge.id} className="border-b border-ink bg-yellow text-ink">
                  <div className="px-4 py-5">
                    <p className="type-kicker opacity-70">
                      {mine ? "You said you would sit" : "A friend will sit"}
                    </p>
                    <p className="mt-1 type-lede">
                      {mine
                        ? `${formatHandle(pledge.toHandle)} has your word`
                        : `${formatHandle(pledge.fromHandle)} · ${pledgeLine(pledge)}`}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 border-t border-ink">
                    <button
                      type="button"
                      onClick={() => setPledgeStatus(pledge.id, "done")}
                      className="flex h-12 items-center justify-center bg-ink font-sans text-sm text-paper"
                    >
                      {mine ? "I sat" : "They sat"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPledgeStatus(pledge.id, "cancelled")}
                      className="flex h-12 items-center justify-center border-l border-ink bg-paper font-sans text-sm text-ink"
                    >
                      Set aside
                    </button>
                  </div>
                </div>
              );
            })}
            {mySits.map((sit) => (
              <Link
                key={sit.id}
                to="/sit/$token"
                params={{ token: encodeHostedSit(sit) }}
                className="flex items-stretch border-b border-ink bg-forest text-paper"
              >
                <span className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5">
                  <span className="type-kicker opacity-80">
                    {formatHandle(sit.hostHandle)} · {sitDurationLabel(sit.minutes)}
                    {sitPhase(sit) === "ghost" ? " · replay" : ""}
                  </span>
                  <span className="mt-1 type-lede">{sit.workTitle}</span>
                </span>
                <span className="inline-flex shrink-0 items-center px-4 font-sans text-sm">
                  Open
                </span>
              </Link>
            ))}
            {togetherKeeps.map((pair) => (
              <Link
                key={pair.id}
                to="/read/$workId"
                params={{ workId: pair.workId }}
                search={{ at: pair.yours.at }}
                className="block border-b border-ink px-4 py-5"
              >
                <p className="type-kicker text-muted">
                  Together · {formatHandle(pair.theirs.handle)}
                </p>
                <p className="mt-1 type-lede italic leading-snug">{pair.yours.line}</p>
                <p className="mt-2 font-serif text-sm text-ink/60">{pair.theirs.line}</p>
                <p className="mt-2 type-kicker text-muted">{pair.workTitle}</p>
              </Link>
            ))}
          </section>
        ) : null}

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
              const line = friendKeptLine(row);
              const echo =
                row.kind === "kept" && row.reading && line
                  ? encodeEchoInvite({
                      workId: row.reading,
                      handle: row.handle,
                      name: row.name,
                      line,
                      word: readerByHandle(row.handle)?.kept,
                    })
                  : null;
              return (
                <div
                  key={`${row.kind}-${row.id}`}
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
                        {row.kind === "kept" ? " · kept" : ""}
                      </span>
                      <span className="mt-1 type-lede">
                        {row.kind === "kept" && line ? line : row.name}
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
                  {echo && row.reading ? (
                    <Link
                      to="/read/$workId"
                      params={{ workId: row.reading }}
                      search={{ echo }}
                      className={cn(
                        "inline-flex shrink-0 items-center px-4 font-sans text-sm",
                        fill === "yellow" || fill === "paper"
                          ? "bg-ink text-paper"
                          : "bg-paper text-ink",
                      )}
                    >
                      Keep with them
                    </Link>
                  ) : row.reading ? (
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
            I’ll sit tonight
          </p>
          <form onSubmit={sendPledge} className="border-b border-ink">
            <div className="flex flex-wrap gap-px bg-ink">
              {EVENING_WINDOWS.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setPledgeWindow(row.id)}
                  className={cn(
                    "flex h-12 min-w-[6.5rem] flex-1 items-center justify-center font-sans text-sm",
                    pledgeWindow === row.id ? "bg-ink text-paper" : "bg-paper text-ink",
                  )}
                >
                  {row.label}
                </button>
              ))}
            </div>
            <div className="flex items-stretch border-t border-ink">
              <input
                value={pledgeTo}
                onChange={(event) => setPledgeTo(event.target.value)}
                placeholder="@ada"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="h-14 min-w-0 flex-1 border-0 bg-transparent px-4 font-serif text-xl text-ink focus-visible:outline-none"
              />
              <button
                type="submit"
                className="inline-flex h-14 shrink-0 items-center bg-forest px-5 font-sans text-sm text-paper"
              >
                Send word
              </button>
            </div>
          </form>
          <Link
            to="/together"
            search={{ host: true }}
            className="flex items-center justify-between border-b border-ink bg-blue px-4 py-5 text-paper"
          >
            <span>
              <span className="block type-kicker opacity-80">Or host the hour</span>
              <span className="mt-1 block type-lede">Host a sit</span>
            </span>
            <span className="font-sans text-sm">Open</span>
          </Link>
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
            Handles, together-keeps, sits, and tonight-notes stay on this device.
            Share the link so another phone can hold the same sitting. A hosted Salon can sync them later.
          </p>
        ) : (
          <p className="px-4 py-6 font-serif text-sm text-ink/60">
            Live backend is on, but handle, together-keep, sit, and pledge APIs are not in this tree yet. The graph stays local; sentence cards can still use a hosted share link when you Send.
          </p>
        )}
      </div>
    </div>
  );
}
