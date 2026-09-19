import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CLUBS } from "@/lib/social";
import { clubPair, searchFlag, shareOrCopy } from "@/lib/shuffle";
import { ResumeLink } from "@/components/resume-link";
import { fillClass, fillInk, type Fill } from "@/lib/mondrian";
import { useVellum } from "@/lib/store";
import { cn } from "@/lib/utils";
import { isLocalBound } from "@/lib/catalog/full-pdf";
import { shelfWork } from "@/lib/catalog/shelf";
import {
  SERIALIZE_PLANS,
  isSerializeBound,
  serializePlan,
  serializeSitSearch,
  serializeTonight,
  serializeClubReadSearch,
  type SerializePlan,
} from "@/lib/catalog/serialize";
import {
  createClub,
  getClubByInvite,
  joinClubByInvite,
  listBookClubs,
  listUpcomingSessions,
  asInviteToken,
  clubInviteUrl,
  type BookClubView,
  type UpcomingSit,
} from "@/lib/clubs";
import { defaultSitClock, etWallToIso, formatClubWhen, formatClubWhenLong } from "@/lib/club-time";
import { enterClubCompose, exitClubCompose, syncVisualViewport } from "@/lib/vvh";
import { liveBackendEnabled } from "@/lib/site";
import { useShelfSearch } from "@/components/shelf-search";

type TogetherSearch = { join?: string; start?: boolean };

export const Route = createFileRoute("/together")({
  validateSearch: (search: Record<string, unknown>): TogetherSearch => {
    const next: TogetherSearch = {};
    const join = asInviteToken(search.join);
    if (join) next.join = join;
    if (searchFlag(search.start)) next.start = true;
    return next;
  },
  component: TogetherPage,
  errorComponent: ({ error }) => (
    <div className="frame-screen bg-paper p-8 text-ink">
      <p className="type-kicker opacity-70">Read together</p>
      <p className="type-title mt-2">The room is dark on Pages.</p>
      <p className="type-pitch mt-2.5 max-w-md text-ink/70">
        Clubs and live sitting need a hosted backend. {error.message}
      </p>
    </div>
  ),
});

function TogetherPage() {
  const { join, start } = Route.useSearch();
  const joined = useVellum((s) => s.joined) ?? [];
  const lastShuffle = useVellum((s) => s.lastShuffle);
  const toggleJoin = useVellum((s) => s.toggleJoin);
  const joinClub = useVellum((s) => s.joinClub);
  const rememberInvite = useVellum((s) => s.rememberInvite);
  const [hydrated, setHydrated] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingSit[]>([]);
  const [userClubs, setUserClubs] = useState<BookClubView[]>([]);
  const [creating, setCreating] = useState(Boolean(start));
  const [created, setCreated] = useState<BookClubView | null>(null);
  const [welcome, setWelcome] = useState<BookClubView | null>(null);
  const [joinMissing, setJoinMissing] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!liveBackendEnabled) {
      setUpcoming([]);
      return;
    }
    let live = true;
    void listUpcomingSessions()
      .then((rows) => {
        if (live) setUpcoming(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (live) setUpcoming([]);
      });
    return () => {
      live = false;
    };
  }, [created]);

  useEffect(() => {
    if (!hydrated) return;
    const ids = joined.filter((id) => !CLUBS.some((club) => club.id === id));
    if (ids.length === 0) {
      setUserClubs([]);
      return;
    }
    if (!liveBackendEnabled) {
      setUserClubs([]);
      return;
    }
    let live = true;
    void listBookClubs({ data: { ids } })
      .then((rows) => {
        if (live) setUserClubs(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (live) setUserClubs([]);
      });
    return () => {
      live = false;
    };
  }, [hydrated, joined, created]);

  useEffect(() => {
    if (!join) {
      setWelcome(null);
      setJoinMissing(false);
      return;
    }
    if (!liveBackendEnabled) {
      setWelcome(null);
      setJoinMissing(true);
      return;
    }
    let live = true;
    void getClubByInvite({ data: { token: join } })
      .then(async (club) => {
        if (!live) return;
        if (!club) {
          setJoinMissing(true);
          setWelcome(null);
          return;
        }
        joinClub(club.id);
        rememberInvite(club.id, club.inviteToken);
        setWelcome(club);
        setJoinMissing(false);
        try {
          await joinClubByInvite({ data: { token: club.inviteToken } });
        } catch {
          /* logged-out join still holds locally */
        }
      })
      .catch(() => {
        if (live) {
          setJoinMissing(true);
          setWelcome(null);
        }
      });
    return () => {
      live = false;
    };
  }, [join, joinClub, rememberInvite]);

  const mineStatic = hydrated ? CLUBS.filter((club) => joined.includes(club.id)) : [];
  const restStatic = hydrated ? CLUBS.filter((club) => !joined.includes(club.id)) : CLUBS;
  const mineLive = hydrated
    ? userClubs.filter((club) => joined.includes(club.id) || created?.id === club.id)
    : [];
  const extraLive =
    created && !mineLive.some((club) => club.id === created.id) ? [created] : [];
  const liveRooms = [...extraLive, ...mineLive];
  const sessionByClub = useMemo(() => {
    const map = new Map<string, UpcomingSit>();
    for (const sit of upcoming) {
      if (!map.has(sit.clubId)) map.set(sit.clubId, sit);
    }
    return map;
  }, [upcoming]);

  const defaultWork = lastShuffle && isLocalBound(lastShuffle) ? lastShuffle : "passing";

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
          Read together
        </h1>
        <ResumeLink className="h-12 border-l border-ink" />
        <Link
          to="/friends"
          preload="intent"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-paper px-4 text-ink"
        >
          Friends
        </Link>
        <Link
          to="/profile"
          preload="intent"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-paper px-4 text-ink"
        >
          You
        </Link>
      </header>

      {creating ? (
        <StartClubForm
          defaultWorkId={defaultWork}
          onClose={() => {
            setCreating(false);
            setCreated(null);
          }}
          onCreated={(club) => {
            joinClub(club.id);
            rememberInvite(club.id, club.inviteToken);
            setCreated(club);
            setCreating(false);
            setUserClubs((current) =>
              current.some((row) => row.id === club.id) ? current : [club, ...current],
            );
          }}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-40 flex-col justify-end bg-red p-5 text-paper sm:min-h-48 sm:p-8">
            <p className="type-kicker opacity-80">Friends</p>
            <p className="type-title mt-2">
              Sit the same page.
            </p>
            <p className="type-pitch mt-2.5 max-w-xl text-paper/85">
              Share a link. Name a night. The room holds both of you — two phones, one hour,
              live chat on the page.
            </p>
            {!liveBackendEnabled ? (
              <p className="type-pitch mt-2.5 max-w-xl text-paper/70">
                This Pages build has no live backend. Clubs, invites, and RTC sitting stay
                local until auth and `/api/rtc` are hosted.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 border-b border-ink sm:grid-cols-2">
            <Link
              to="/shuffle"
              search={{ together: true }}
              preload="intent"
              className="flex h-14 items-center justify-center bg-ink font-sans text-sm text-paper"
            >
              Sit with a friend
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreating(true);
                setCreated(null);
              }}
              className="flex h-14 items-center justify-center border-t border-ink bg-yellow font-sans text-sm text-ink sm:border-l sm:border-t-0"
            >
              Start a book club
            </button>
          </div>

          {created ? <InviteCard club={created} kicker="Your club is set" /> : null}

          {joinMissing ? (
            <div className="border-b border-ink bg-paper px-5 py-6 sm:px-8">
              <p className="type-kicker text-muted">Invite</p>
              <p className="mt-2 type-lede">
                This invite would not come
              </p>
            </div>
          ) : null}

          {welcome && welcome.id !== created?.id ? (
            <InviteCard club={welcome} kicker="You're in" />
          ) : null}

          <section>
            <div className="border-b border-ink bg-forest px-5 py-6 text-paper sm:px-8">
              <p className="type-kicker opacity-80">Upcoming</p>
              <p className="mt-2 type-lede">
                Day and time, already named.
              </p>
              <p className="mt-2 max-w-xl font-serif text-base leading-snug text-paper/85 sm:text-lg">
                Book clubs keep an Eastern hour. Walk in when it starts — or sooner. The door
                stays open.
              </p>
            </div>
            {upcoming.length === 0 ? (
              <p className="border-b border-ink px-5 py-6 font-serif text-lg text-ink/70 sm:px-8">
                No sits on the board yet. Start a club and name a night.
              </p>
            ) : (
              upcoming.map((sit) => (
                <ClubRoom
                  key={`${sit.clubId}-${sit.sessionId}`}
                  id={sit.clubId}
                  name={sit.name}
                  place={formatClubWhen(sit.startsAt)}
                  workId={sit.workId}
                  workTitle={sit.workTitle}
                  author={sit.author}
                  fill={sit.fill}
                  bookLine={sit.serializeLabel}
                  sitSearch={upcomingReadSearch(sit)}
                  joined={joined.includes(sit.clubId)}
                  onSit={() => {
                    joinClub(sit.clubId);
                    rememberInvite(sit.clubId, sit.inviteToken);
                  }}
                />
              ))
            )}
          </section>

          {liveRooms.length > 0 || mineStatic.length > 0 ? (
            <section>
              <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
                Your rooms
              </p>
              {liveRooms.map((club) => (
                <ClubRoom
                  key={club.id}
                  id={club.id}
                  name={club.name}
                  place={
                    club.nextSession
                      ? formatClubWhen(club.nextSession.startsAt)
                      : sessionByClub.get(club.id)
                        ? formatClubWhen(sessionByClub.get(club.id)!.startsAt)
                        : "your club"
                  }
                  workId={club.workId}
                  workTitle={club.workTitle}
                  author={club.author}
                  fill={club.fill}
                  bookLine={club.serializeLabel}
                  sitSearch={clubReadSearch(club)}
                  joined
                  onSit={() => undefined}
                />
              ))}
              {mineStatic.map((club) => (
                <ClubRoom
                  key={club.id}
                  id={club.id}
                  name={club.name}
                  place={club.place}
                  workId={club.workId}
                  workTitle={club.workTitle}
                  author={club.author}
                  fill={club.fill}
                  joined
                  onSit={() => undefined}
                />
              ))}
            </section>
          ) : null}

          <div className="border-b border-ink bg-yellow px-5 py-6 text-ink sm:px-8">
            <p className="type-kicker opacity-70">House clubs</p>
            <p className="mt-2 type-lede">
              Live rooms, one book each.
            </p>
            <p className="mt-2 max-w-xl font-serif text-base leading-snug opacity-80 sm:text-lg">
              The house keeps a few rooms open. Join, then sit. Everyone in the room reads
              the same work in real time.
            </p>
          </div>

          <section>
            {restStatic.map((club) => (
              <ClubRoom
                key={club.id}
                id={club.id}
                name={club.name}
                place={club.place}
                workId={club.workId}
                workTitle={club.workTitle}
                author={club.author}
                fill={club.fill}
                onSit={() => {
                  if (!joined.includes(club.id)) toggleJoin(club.id);
                }}
              />
            ))}
          </section>
        </div>
      )}
    </div>
  );
}

function InviteCard({ club, kicker }: { club: BookClubView; kicker: string }) {
  const [copied, setCopied] = useState(false);
  const when = club.nextSession ? formatClubWhenLong(club.nextSession.startsAt) : "";
  const bookLine = club.serializeLabel;
  const sitSearch = clubReadSearch(club);

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

  return (
    <div className="border-b border-ink bg-blue p-5 text-paper sm:p-8">
      <p className="type-kicker opacity-80">{kicker}</p>
      <p className="mt-2 type-title">{club.name}</p>
      {when ? <p className="mt-2 font-serif text-lg text-paper/85">{when}</p> : null}
      <p className="mt-1 font-sans text-sm opacity-80">
        {bookLine ? (
          bookLine
        ) : (
          <>
            {club.workTitle}
            <span className="opacity-70"> · {club.author}</span>
          </>
        )}
      </p>
      {club.note ? <p className="mt-3 font-serif text-base text-paper/85">{club.note}</p> : null}
      <p className="mt-4 break-all type-kicker text-paper/75">
        {clubInviteUrl(club.inviteToken)}
      </p>
      <div className="mt-6 grid grid-cols-1 gap-px bg-paper/30 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void share()}
          className="flex h-14 items-center justify-center bg-paper font-sans text-sm text-ink"
        >
          {copied ? "Copied" : "Invite"}
        </button>
        <Link
          to="/read/$workId"
          params={{ workId: club.workId }}
          search={sitSearch}
          className="flex h-14 items-center justify-center bg-ink font-sans text-sm text-paper"
        >
          Sit together
        </Link>
      </div>
    </div>
  );
}

function StartClubForm({
  defaultWorkId,
  onCreated,
  onClose,
}: {
  defaultWorkId: string;
  onCreated: (club: BookClubView) => void;
  onClose: () => void;
}) {
  const clock = useMemo(() => defaultSitClock(), []);
  const serializeNight = useVellum((s) => s.serializeNight);
  const boundSeries = useMemo(() => SERIALIZE_PLANS.filter(isSerializeBound), []);
  const [name, setName] = useState("");
  const [workId, setWorkId] = useState(defaultWorkId);
  const [serializePlanId, setSerializePlanId] = useState<string | null>(null);
  const [startEpisode, setStartEpisode] = useState(1);
  const [date, setDate] = useState(clock.date);
  const [time, setTime] = useState(clock.time);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const search = useShelfSearch("local");
  const selected = shelfWork(workId);
  const series = serializePlanId ? serializePlan(serializePlanId) : undefined;

  useEffect(() => {
    enterClubCompose();
    return () => exitClubCompose();
  }, []);

  function keepFieldInView(target: HTMLElement) {
    const scroller = target.closest("[data-compose-scroll]");
    if (!(scroller instanceof HTMLElement)) return;
    const align = () => {
      const extra = 8;
      const t = target.getBoundingClientRect();
      const s = scroller.getBoundingClientRect();
      if (t.bottom > s.bottom - extra) {
        scroller.scrollTop += t.bottom - s.bottom + extra;
      } else if (t.top < s.top + extra) {
        scroller.scrollTop -= s.top - t.top + extra;
      }
    };
    syncVisualViewport();
    align();
    requestAnimationFrame(() => {
      syncVisualViewport();
      align();
    });
  }

  function pickWork(id: string) {
    setWorkId(id);
    setSerializePlanId(null);
    setStartEpisode(1);
    search.setQuery("");
  }

  function pickSeries(plan: SerializePlan) {
    if (!plan.shelfWorkId || !isSerializeBound(plan)) return;
    setWorkId(plan.shelfWorkId);
    setSerializePlanId(plan.id);
    setStartEpisode(serializeTonight(plan, serializeNight?.[plan.id] ?? 0));
    search.setQuery("");
  }

  async function submit() {
    const title = name.trim();
    if (!title) {
      setError("Name the club.");
      return;
    }
    if (!isLocalBound(workId)) {
      setError("Pick a bound book from the shelf.");
      return;
    }
    if (serializePlanId) {
      const plan = serializePlan(serializePlanId);
      if (!plan || !isSerializeBound(plan) || plan.shelfWorkId !== workId) {
        setError("Pick a bound series from the shelf.");
        return;
      }
    }
    const startsAt = etWallToIso(date, time);
    if (!startsAt) {
      setError("Pick a day and time in Eastern time.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const club = await createClub({
        data: {
          name: title,
          workId,
          startsAt,
          note: note.trim() || undefined,
          serializePlanId: serializePlanId ?? undefined,
          startEpisode: serializePlanId ? startEpisode : undefined,
        },
      });
      onCreated(club);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The club would not open");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="club-compose-form flex min-h-0 flex-1 flex-col bg-paper text-ink"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex shrink-0 items-stretch border-b border-ink">
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center px-5 py-3 sm:px-8",
            fillClass("yellow"),
            fillInk("yellow"),
          )}
        >
          <p className="type-kicker opacity-70">New club</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "flex h-12 shrink-0 items-center justify-center border-l border-ink px-4 font-sans text-sm",
            fillClass("red"),
            fillInk("red"),
          )}
        >
          Close
        </button>
      </div>

      <div
        data-compose-scroll
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className={cn("px-5 py-5 sm:px-8", fillClass("red"), fillInk("red"))}>
          <p className="type-lede">
            Name a night. Send the door.
          </p>
          <p className="mt-2 max-w-xl font-serif text-base leading-snug text-paper/85">
            Times are Eastern. Friends walk in with the invite — chat is already on the page.
          </p>
        </div>
        {error ? (
          <p className="border-t border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">{error}</p>
        ) : null}
        <ComposeField fill="paper" label="Club">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onFocus={(event) => keepFieldInView(event.currentTarget)}
            placeholder="Sunday readers"
            maxLength={80}
            className={composeInputClass}
          />
        </ComposeField>
        <ComposeField fill="yellow" label="Book">
          <input
            type="search"
            value={search.query}
            onChange={(event) => search.setQuery(event.target.value)}
            onFocus={(event) => keepFieldInView(event.currentTarget)}
            placeholder={selected ? `${selected.title}` : "Title, author"}
            className={composeInputClass}
          />
        </ComposeField>
        {selected && !search.query.trim() ? (
          <p
            className={cn(
              "border-t border-ink px-4 py-3 font-sans text-sm",
              fillClass("forest"),
              fillInk("forest"),
            )}
          >
            {selected.title}
            <span className="opacity-70"> · {selected.author}</span>
            {series ? (
              <span className="mt-1 block type-kicker opacity-70">
                Serialize · {series.nights} nights
              </span>
            ) : null}
          </p>
        ) : null}
        {search.query.trim()
          ? search.matches.slice(0, 6).map((item, index) => {
              const fill = COMPOSE_HIT_FILLS[index % COMPOSE_HIT_FILLS.length]!;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pickWork(item.id)}
                  className={cn(
                    "flex w-full items-center justify-between border-t border-ink px-4 py-4 text-left",
                    fillClass(fill),
                    fillInk(fill),
                  )}
                >
                  <span className="min-w-0">
                    <span className="block type-lede">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block truncate type-kicker opacity-70">
                      {item.author}
                    </span>
                  </span>
                  <span className="font-sans text-sm">{item.id === workId ? "In" : "Pick"}</span>
                </button>
              );
            })
          : null}
        <div
          className={cn(
            "border-t border-ink px-4 py-3",
            fillClass("yellow"),
            fillInk("yellow"),
          )}
        >
          <p className="type-kicker opacity-70">Or a Serialize series</p>
        </div>
        {boundSeries.map((plan, index) => {
          const on = plan.id === serializePlanId;
          const fill = COMPOSE_HIT_FILLS[index % COMPOSE_HIT_FILLS.length]!;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => pickSeries(plan)}
              className={cn(
                "flex w-full items-center justify-between border-t border-ink px-4 py-4 text-left",
                fillClass(fill),
                fillInk(fill),
              )}
            >
              <span className="min-w-0">
                <span className="block type-lede">
                  {plan.title}
                </span>
                <span className="mt-0.5 block truncate type-kicker opacity-70">
                  {plan.nights} nights · {plan.author}
                </span>
              </span>
              <span className="font-sans text-sm">{on ? "In" : "Pick"}</span>
            </button>
          );
        })}
        {series ? (
          <ComposeField fill="forest" label="Night">
            <select
              value={startEpisode}
              onChange={(event) => setStartEpisode(Number.parseInt(event.target.value, 10) || 1)}
              onFocus={(event) => keepFieldInView(event.currentTarget)}
              className={cn(composeInputClass, "px-2")}
            >
              {series.episodes.map((episode) => (
                <option key={episode.n} value={episode.n}>
                  {episode.n}. {episode.title}
                </option>
              ))}
            </select>
          </ComposeField>
        ) : null}
        <div className="grid grid-cols-2 border-t border-ink">
          <ComposeField fill="paper" label="Day" stacked className="border-t-0 border-r border-ink">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              onFocus={(event) => keepFieldInView(event.currentTarget)}
              className={composeDateClass}
            />
          </ComposeField>
          <ComposeField fill="yellow" label="Time · ET" stacked className="border-t-0">
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              onFocus={(event) => keepFieldInView(event.currentTarget)}
              className={composeDateClass}
            />
          </ComposeField>
        </div>
        <ComposeField fill="blue" label="Note">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onFocus={(event) => keepFieldInView(event.currentTarget)}
            placeholder="Optional — bring tea"
            maxLength={240}
            className={composeInputClass}
          />
        </ComposeField>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="flex h-14 w-full shrink-0 items-center justify-center border-t border-ink bg-ink font-sans text-sm text-paper disabled:opacity-60"
      >
        {saving ? "Opening…" : "Create club"}
      </button>
    </form>
  );
}

const COMPOSE_HIT_FILLS: Fill[] = ["paper", "blue", "yellow", "forest", "paper", "yellow"];

const composeInputClass =
  "h-12 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl placeholder:opacity-40 focus-visible:outline-none";

const composeDateClass =
  "h-12 min-w-0 border-0 bg-transparent px-4 font-sans text-base focus-visible:outline-none";

function composeDark(fill: Fill) {
  return fill === "red" || fill === "blue" || fill === "forest" || fill === "ink";
}

function ComposeField({
  fill,
  label,
  stacked,
  className,
  children,
}: {
  fill: Fill;
  label: string;
  stacked?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const dark = composeDark(fill);
  return (
    <label
      className={cn(
        stacked ? "flex min-w-0 flex-col" : "flex items-stretch",
        "border-t border-ink",
        fillClass(fill),
        fillInk(fill),
        dark ? "scheme-dark" : "scheme-light",
        className,
      )}
    >
      <span
        className={cn(
          stacked ? "px-4 pt-3" : "flex w-24 shrink-0 items-center px-4",
          "type-kicker opacity-70",
        )}
      >
        {label}
      </span>
      {children}
    </label>
  );
}


function ClubRoom({
  id,
  name,
  place,
  workId,
  workTitle,
  author,
  fill,
  bookLine,
  sitSearch,
  joined,
  onSit,
}: {
  id: string;
  name: string;
  place: string;
  workId: string;
  workTitle: string;
  author: string;
  fill: Fill;
  bookLine?: string | null;
  sitSearch?: { sit?: number; pair?: string; episode?: number };
  joined?: boolean;
  onSit: () => void;
}) {
  return (
    <div className={cn("flex items-stretch border-b border-ink", fillClass(fill), fillInk(fill))}>
      <Link
        to="/club/$clubId"
        params={{ clubId: id }}
        className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5"
      >
        <span className="type-kicker opacity-80">
          {place}
          {joined ? " · in" : ""}
        </span>
        <span className="mt-1 type-lede">{name}</span>
        <span className="mt-1 font-serif text-sm opacity-80">
          {bookLine ? (
            bookLine
          ) : (
            <>
              {workTitle}
              <span className="opacity-70"> · {author}</span>
            </>
          )}
        </span>
      </Link>
      <Link
        to="/read/$workId"
        params={{ workId }}
        search={sitSearch ?? { pair: clubPair(id), sit: 0 }}
        onClick={onSit}
        className={cn(
          "inline-flex shrink-0 items-center justify-center border-l px-4 font-sans text-sm",
          fill === "yellow" || fill === "paper"
            ? "border-ink bg-ink text-paper"
            : "border-paper/30 bg-paper text-ink",
        )}
      >
        Sit together
      </Link>
    </div>
  );
}

function clubReadSearch(club: BookClubView) {
  return serializeClubReadSearch(club, clubPair(club.id));
}

function upcomingReadSearch(sit: UpcomingSit) {
  const pair = clubPair(sit.clubId);
  const plan = serializePlan(sit.serializePlanId);
  if (!plan || !sit.episode) return { pair, sit: 0 };
  return serializeSitSearch(plan, sit.episode, { pair });
}
