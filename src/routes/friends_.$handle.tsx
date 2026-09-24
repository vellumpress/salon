import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useKeptLines } from "@/components/kept-sentences";
import { usePersistHydrated } from "@/components/resume-link";
import {
  compactWhen,
  friendProfilePath,
  localFriendProfiles,
  type FriendActivity,
  type FriendGraph,
} from "@/lib/friend-profile";
import { fillClass, fillInk, planeOf } from "@/lib/mondrian";
import { streakLine } from "@/lib/reading-stats";
import { withRemoteActivity } from "@/lib/remote-activity";
import { fetchProfile, refreshFollowedActivity, useRemoteBundle, type DirectoryProfile } from "@/lib/remote-directory";
import { formatHandle, normalizeHandle } from "@/lib/social";
import { APP_NAME, publicUrl, salonShareText, salonShareTitle } from "@/lib/site";
import { isPledgePending } from "@/lib/sit-pledge";
import { useVellum } from "@/lib/store";
import { shareOrCopy } from "@/lib/shuffle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/friends_/$handle")({
  component: FriendProfilePage,
});

function FriendProfilePage() {
  const { handle: rawHandle } = Route.useParams();
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
  const addContact = useVellum((s) => s.addContact);
  const toggleFollow = useVellum((s) => s.toggleFollow);
  const setPledgeStatus = useVellum((s) => s.setPledgeStatus);
  const [message, setMessage] = useState("");
  const remote = useRemoteBundle();
  const lookedUp = normalizeHandle(rawHandle);
  const directory = remote.profiles[lookedUp] ?? null;
  const [fetched, setFetched] = useState<DirectoryProfile | null>(null);

  useEffect(() => {
    if (lookedUp.length < 2) return;
    let cancel = false;
    void fetchProfile(lookedUp).then((row) => {
      if (!cancel) setFetched(row);
    });
    if (remote.userId) void refreshFollowedActivity(remote.userId);
    return () => {
      cancel = true;
    };
  }, [lookedUp, remote.userId]);

  const hosted = directory ?? fetched;

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

  const profile = useMemo(() => {
    if (!hydrated) return null;
    const base = localFriendProfiles.profile(rawHandle, graph);
    if (!base || !hosted) return base;
    const name = hosted.name.trim();
    if (!name || name === formatHandle(base.handle)) return base;
    return { ...base, name };
  }, [hydrated, rawHandle, graph, hosted]);
  const kept = useKeptLines(profile?.isSelf ? progress : {}, hydrated);
  const activity = useMemo(() => {
    if (!profile) return [];
    return profile.activity.map((item) => {
      if (item.line || !item.breathId) return item;
      const line = kept.find((row) => row.workId === item.workId && row.breathId === item.breathId);
      if (!line) return item;
      return { ...item, line: line.text, atIndex: item.atIndex ?? line.at };
    });
  }, [profile, kept]);

  if (!hydrated) {
    return (
      <ProfileFrame title="Friend">
        <div className="min-h-24 bg-paper" />
      </ProfileFrame>
    );
  }

  if (!profile) {
    return (
      <ProfileFrame title="Friend">
        <div className="px-4 py-8">
          <p className="type-lede">That name is not a profile.</p>
          <p className="mt-2 font-serif text-base text-ink/70">Use at least two letters.</p>
        </div>
      </ProfileFrame>
    );
  }

  const fill = planeOf(profile.handle);
  const initial = profile.handle.slice(0, 1).toUpperCase();

  async function share() {
    const result = await shareOrCopy({
      title: salonShareTitle(formatHandle(profile!.handle)),
      text: salonShareText(`${formatHandle(profile!.handle)} on ${APP_NAME}.`),
      url: publicUrl(friendProfilePath(profile!.handle)),
    });
    setMessage(result === "failed" ? "The link would not copy." : "Profile link ready.");
  }

  async function invite() {
    const mine = normalizeHandle(handle);
    if (!mine) {
      setMessage("Claim an @name first. The invite is your profile.");
      return;
    }
    const result = await shareOrCopy({
      title: `${formatHandle(mine)} on tbr`,
      text: `${formatHandle(mine)} invited you to sit on tbr.`,
      url: publicUrl(friendProfilePath(mine)),
    });
    setMessage(result === "failed" ? "The invite would not copy." : "Invite ready.");
  }

  function onFollow() {
    if (!profile || profile.isSelf) return;
    if (profile.following) {
      if (following.includes(profile.id)) toggleFollow(profile.id);
      if (following.includes(profile.handle)) toggleFollow(profile.handle);
      return;
    }
    const known = contacts.some((item) => item.handle === profile.handle);
    if (known) {
      if (!following.includes(profile.id)) toggleFollow(profile.id);
      return;
    }
    const result = addContact({ handle: profile.handle, name: profile.name });
    if (!result.ok) setMessage(result.error);
  }

  return (
    <ProfileFrame
      title={formatHandle(profile.handle)}
      action={
        profile.isSelf ? (
          <span className="inline-flex h-12 shrink-0 items-center border-l border-ink px-3 font-sans text-sm text-muted">
            You
          </span>
        ) : (
          <button
            type="button"
            onClick={onFollow}
            aria-pressed={profile.following}
            className={cn(
              "inline-flex h-12 shrink-0 items-center border-l border-ink px-3 font-sans text-sm",
              profile.following ? "bg-ink text-paper" : "bg-paper text-ink",
            )}
          >
            {profile.following ? "Following" : "Follow"}
          </button>
        )
      }
    >
      <div className="border-b border-ink px-4 py-5">
        <div className="flex items-end gap-3">
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
          <div className="min-w-0 flex-1">
            <p className="type-kicker text-muted">
              {profile.isSelf ? "This device" : hosted ? "On tbr" : profile.place || "On this phone"}
            </p>
            <p className="mt-1 truncate type-title">{formatHandle(profile.handle)}</p>
            {profile.name && profile.name !== formatHandle(profile.handle) ? (
              <p className="mt-1 truncate font-serif text-base text-ink/70">{profile.name}</p>
            ) : null}
            {hosted?.bio ? (
              <p className="mt-2 font-serif text-base text-ink/70">{hosted.bio}</p>
            ) : null}
          </div>
        </div>
        {profile.score ? (
          <p className="mt-4 font-serif text-lg text-ink">
            {profile.score.hasSignal ? (
              <>
                Score {profile.score.total}
                <span className="text-ink/60"> · {profile.score.label}</span>
              </>
            ) : (
              <span className="text-ink/70">No score yet</span>
            )}
            {profile.score.streak > 0 ? (
              <span className="mt-1 block font-serif text-base text-ink/70">{streakLine(profile.score.streak)}</span>
            ) : null}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void share()}
          className="mt-4 inline-flex h-11 items-center border border-ink px-4 font-sans text-sm"
        >
          Share profile
        </button>
      </div>

      {message ? (
        <p className="border-b border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">{message}</p>
      ) : null}

      {profile.readingNow ? (
        <ReadAlong
          workId={profile.readingNow.workId}
          atIndex={profile.readingNow.atIndex}
          className="bg-forest text-paper"
          kicker="Reading now"
          title={profile.readingNow.workTitle}
          detail={[profile.readingNow.author, profile.readingNow.progress].filter(Boolean).join(" · ")}
        />
      ) : (
        <p className="border-b border-ink px-4 py-5 font-serif text-lg text-ink/70">
          No open book on this phone.
        </p>
      )}

      <p className="border-b border-ink px-4 py-3 type-kicker text-muted">Activity</p>
      {activity.length === 0 ? (
        <div className="border-b border-ink px-4 py-6">
          <p className="font-serif text-lg leading-snug text-ink/70">
            No sits, keeps, or tonight-notes
            {profile.isSelf ? " yet." : " have reached this phone."}
          </p>
          {profile.isSelf ? null : (
            <>
              <p className="mt-2 font-serif text-base leading-snug text-ink/70">
                {hosted
                  ? profile.following
                    ? "Nothing synced yet."
                    : "Follow them to see what they're reading."
                  : "Their activity appears once you share a sit or invite link with them."}
              </p>
              <button
                type="button"
                onClick={() => void invite()}
                className="mt-4 inline-flex h-11 items-center border border-ink px-4 font-sans text-sm"
              >
                Invite
              </button>
            </>
          )}
        </div>
      ) : (
        activity.map((item) => (
          <ActivityRow
            key={item.id}
            item={item}
            pledgePending={
              item.pledgeId
                ? sitPledges.some((row) => row.id === item.pledgeId && isPledgePending(row))
                : false
            }
            onSat={
              item.pledgeId
                ? () => setPledgeStatus(item.pledgeId!, "done")
                : undefined
            }
            onAside={
              item.pledgeId
                ? () => setPledgeStatus(item.pledgeId!, "cancelled")
                : undefined
            }
          />
        ))
      )}

      <p className="px-4 py-6 font-serif text-sm text-ink/60">
        {profile.isSelf
          ? "Your sits, keeps, and notes stay on this phone, and sync when you are signed in."
          : hosted
            ? `This profile is on ${APP_NAME}. Activity shows for people you follow.`
            : "Only what this phone already has from a shared link or sit."}
      </p>
    </ProfileFrame>
  );
}

function ProfileFrame({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/friends"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Friends
        </Link>
        <h1 className="type-mark flex min-w-0 flex-1 items-center truncate px-4">{title}</h1>
        {action}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function ReadAlong({
  workId,
  atIndex,
  className,
  kicker,
  title,
  detail,
}: {
  workId: string;
  atIndex?: number;
  className?: string;
  kicker: string;
  title: string;
  detail?: string;
}) {
  const search = typeof atIndex === "number" && atIndex >= 0 ? { at: atIndex } : {};
  return (
    <Link
      to="/read/$workId"
      params={{ workId }}
      search={search}
      className={cn("flex items-stretch border-b border-ink", className)}
    >
      <span className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5">
        <span className="type-kicker opacity-80">{kicker}</span>
        <span className="mt-1 type-lede">{title}</span>
        {detail ? <span className="mt-1 font-serif text-sm opacity-80">{detail}</span> : null}
      </span>
      <span className="inline-flex shrink-0 items-center px-4 font-sans text-sm">Read along</span>
    </Link>
  );
}

function ActivityRow({
  item,
  pledgePending,
  onSat,
  onAside,
}: {
  item: FriendActivity;
  pledgePending: boolean;
  onSat?: () => void;
  onAside?: () => void;
}) {
  const when = compactWhen(item.at);
  return (
    <article className="border-b border-ink">
      <div className="px-4 py-4">
        <p className="type-kicker text-muted">
          {item.label}
          {when ? ` · ${when}` : ""}
        </p>
        {item.line ? (
          <p className="mt-1 font-serif text-lg italic leading-snug">{item.line}</p>
        ) : (
          <p className="mt-1 font-serif text-lg leading-snug">{item.summary}</p>
        )}
        {item.workTitle ? (
          <p className="mt-1 font-serif text-sm text-ink/70">
            {item.workTitle}
            {item.author ? ` · ${item.author}` : ""}
            {item.progress ? ` · ${item.progress}` : ""}
          </p>
        ) : null}
      </div>
      {item.workId ? (
        <Link
          to="/read/$workId"
          params={{ workId: item.workId }}
          search={typeof item.atIndex === "number" && item.atIndex >= 0 ? { at: item.atIndex } : {}}
          className="flex h-12 items-center gap-3 border-t border-ink px-4 font-sans text-sm"
        >
          <span className="shrink-0">Read along</span>
          {item.workTitle ? (
            <span className="min-w-0 flex-1 truncate text-right font-serif text-ink/60">{item.workTitle}</span>
          ) : null}
        </Link>
      ) : null}
      {pledgePending && onSat && onAside ? (
        <div className="grid grid-cols-2 border-t border-ink">
          <button
            type="button"
            onClick={onSat}
            className="flex h-12 items-center justify-center bg-ink font-sans text-sm text-paper"
          >
            They sat
          </button>
          <button
            type="button"
            onClick={onAside}
            className="flex h-12 items-center justify-center border-l border-ink bg-paper font-sans text-sm text-ink"
          >
            Set aside
          </button>
        </div>
      ) : null}
    </article>
  );
}
