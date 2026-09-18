import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { clubPair, shareOrCopy } from "@/lib/shuffle";
import { fillClass, fillInk } from "@/lib/mondrian";
import { useVellum } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  clubInviteUrl,
  getClubByInvite,
  joinClubByInvite,
  type BookClubView,
} from "@/lib/clubs";
import { asInviteToken, formatClubWhenLong } from "@/lib/club-time";
import { serializeClubReadSearch } from "@/lib/catalog/serialize";

export const Route = createFileRoute("/club/invite/$token")({
  component: InviteLanding,
});

function InviteLanding() {
  const { token: raw } = Route.useParams();
  const token = asInviteToken(raw) ?? raw;
  const joinClub = useVellum((s) => s.joinClub);
  const rememberInvite = useVellum((s) => s.rememberInvite);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "missing" }
    | { status: "ready"; club: BookClubView }
  >({ status: "loading" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    const invite = asInviteToken(token);
    if (!invite) {
      setState({ status: "missing" });
      return;
    }
    void getClubByInvite({ data: { token: invite } })
      .then(async (club) => {
        if (!live) return;
        if (!club) {
          setState({ status: "missing" });
          return;
        }
        joinClub(club.id);
        rememberInvite(club.id, club.inviteToken);
        setState({ status: "ready", club });
        try {
          await joinClubByInvite({ data: { token: club.inviteToken } });
        } catch {
          /* local join still holds */
        }
      })
      .catch(() => {
        if (live) setState({ status: "missing" });
      });
    return () => {
      live = false;
    };
  }, [token, joinClub, rememberInvite]);

  if (state.status === "loading") {
    return (
      <div className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/together"
            className="inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 font-sans text-sm text-paper"
          >
            Together
          </Link>
        </header>
        <div className="flex min-h-0 flex-1 flex-col justify-end bg-blue p-5 text-paper sm:p-8">
          <p className="font-sans text-xs tracking-wide opacity-80">Invite</p>
          <p className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            A sitting
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/together"
            className="inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 font-sans text-sm text-paper"
          >
            Together
          </Link>
        </header>
        <div className="flex min-h-0 flex-1 flex-col justify-end p-5 sm:p-8">
          <p className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            This invite
          </p>
          <p className="mt-3 font-serif text-lg text-ink/70">This invite would not come</p>
        </div>
      </div>
    );
  }

  const { club } = state;
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

  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/together"
          search={{ join: club.inviteToken }}
          className="inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 font-sans text-sm text-paper"
        >
          Together
        </Link>
        <h1 className="flex min-w-0 flex-1 items-center truncate px-4 font-display text-xl font-medium tracking-tight">
          {club.name}
        </h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col">
        <div
          className={cn(
            "flex min-h-48 flex-col justify-end p-5 sm:min-h-56 sm:p-8",
            fillClass(club.fill),
            fillInk(club.fill),
          )}
        >
          <p className="font-sans text-xs tracking-wide opacity-80">You're invited</p>
          <p className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {club.name}
          </p>
          {when ? (
            <p className="mt-3 font-serif text-lg leading-snug opacity-90">{when}</p>
          ) : null}
          <p className="mt-2 font-sans text-sm opacity-80">
            {club.serializeLabel ? (
              club.serializeLabel
            ) : (
              <>
                {club.workTitle}
                <span className="opacity-70"> · {club.author}</span>
              </>
            )}
          </p>
          <p className="mt-4 break-all font-sans text-xs tracking-wide opacity-75">
            {clubInviteUrl(club.inviteToken)}
          </p>
        </div>
        {club.note ? (
          <div className="border-b border-ink px-5 py-6 sm:px-8">
            <p className="font-display text-2xl font-medium tracking-tight">{club.note}</p>
          </div>
        ) : null}
        <Link
          to="/read/$workId"
          params={{ workId: club.workId }}
          search={clubInviteReadSearch(club)}
          className="flex h-14 items-center justify-center bg-ink font-sans text-sm text-paper"
        >
          Sit together
        </Link>
        <button
          type="button"
          onClick={() => void share()}
          className="flex h-14 w-full items-center justify-center border-b border-ink bg-yellow font-sans text-sm text-ink"
        >
          {copied ? "Copied" : "Invite someone else"}
        </button>
        <Link
          to="/club/$clubId"
          params={{ clubId: club.id }}
          className="flex h-14 items-center justify-center bg-paper font-sans text-sm text-ink"
        >
          The club
        </Link>
        <div
          className={cn(
            "flex min-h-32 flex-1 flex-col justify-end p-5 sm:p-8",
            fillClass(club.fill),
            fillInk(club.fill),
          )}
        >
          <p className="font-serif text-lg leading-snug opacity-90">
            The door stays open. Sit before the hour, or after.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}

function clubInviteReadSearch(club: BookClubView) {
  return serializeClubReadSearch(club, clubPair(club.id));
}
