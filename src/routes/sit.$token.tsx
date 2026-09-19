import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ResumeLink, usePersistHydrated } from "@/components/resume-link";
import {
  decodeHostedSit,
  encodeHostedSit,
  ghostKeeps,
  hostedSitUrl,
  isSitGhost,
  sitDurationLabel,
  sitPhase,
} from "@/lib/hosted-sit";
import { asShareToken } from "@/lib/share-codec";
import { publicUrl } from "@/lib/site";
import { formatHandle, normalizeHandle } from "@/lib/social";
import { shareOrCopy } from "@/lib/shuffle";
import { fillClass, fillInk, planeOf } from "@/lib/mondrian";
import { useVellum } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sit/$token")({
  component: HostedSitPage,
});

function HostedSitPage() {
  const { token: raw } = Route.useParams();
  const token = asShareToken(raw) ?? raw;
  const hydrated = usePersistHydrated();
  const handle = useVellum((s) => s.handle) ?? "";
  const hostedSits = useVellum((s) => s.hostedSits) ?? [];
  const rememberHostedSit = useVellum((s) => s.rememberHostedSit);
  const rsvpSit = useVellum((s) => s.rsvpSit);
  const endHostedSit = useVellum((s) => s.endHostedSit);
  const decoded = useMemo(() => decodeHostedSit(token), [token]);
  const stored = hostedSits.find((row) => row.id === decoded?.id);
  const sit = stored ?? decoded ?? null;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (decoded) rememberHostedSit(decoded);
  }, [decoded, rememberHostedSit]);

  if (!hydrated) {
    return (
      <div className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/together"
            className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
          >
            Together
          </Link>
        </header>
      </div>
    );
  }

  if (!sit) {
    return (
      <div className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/together"
            className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
          >
            Together
          </Link>
        </header>
        <div className="flex min-h-0 flex-1 flex-col justify-end p-5 sm:p-8">
          <p className="type-kicker text-muted">A sitting</p>
          <p className="mt-2 type-title">This sit would not come</p>
          <p className="mt-3 max-w-md font-serif text-lg text-ink/70">
            The link may have been copied short. Ask the host to send it again.
          </p>
        </div>
      </div>
    );
  }

  const room = sit;
  const me = normalizeHandle(handle);
  const phase = sitPhase(room);
  const ghost = isSitGhost(room);
  const keeps = ghostKeeps(room);
  const myRsvp = room.rsvps.find((row) => row.handle === me);
  const isHost = me === room.hostHandle;
  const fill = planeOf(room.workId);
  const missed = ghost && myRsvp?.status !== "yes" && !isHost;

  async function share() {
    const result = await shareOrCopy({
      title: room.workTitle,
      text: `${room.hostName} is hosting ${sitDurationLabel(room.minutes)} with ${room.workTitle}.`,
      url: publicUrl(hostedSitUrl(room)),
    });
    if (result === "copied" || result === "shared") {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  }

  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/together"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Together
        </Link>
        <h1 className="type-mark flex min-w-0 flex-1 items-center px-4">A sit</h1>
        <ResumeLink className="h-12 border-l border-ink" />
        <Link
          to="/friends"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-paper px-4 text-ink"
        >
          Friends
        </Link>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn("flex min-h-40 flex-col justify-end p-5 sm:p-8", fillClass(fill), fillInk(fill))}>
          <p className="type-kicker opacity-80">
            {formatHandle(room.hostHandle)} · {sitDurationLabel(room.minutes)}
          </p>
          <p className="mt-2 type-title">{room.workTitle}</p>
          <p className="mt-2 font-serif text-lg opacity-80">{room.author}</p>
          <p className="mt-3 max-w-xl font-serif text-base leading-snug opacity-85">
            {ghost
              ? missed
                ? "The hour has passed. The kept lines remain, quietly."
                : "The sitting is closed. These are the lines that stayed."
              : "One hour, one work. Say you’ll come, or take the door later."}
          </p>
        </div>

        {!me ? (
          <p className="border-b border-ink bg-yellow px-4 py-4 font-serif text-base text-ink">
            Claim an @name on Friends so your RSVP can sit with the room.
          </p>
        ) : null}

        {!ghost ? (
          <div className="grid grid-cols-2 border-b border-ink">
            <button
              type="button"
              disabled={!me}
              onClick={() => me && rsvpSit(room.id, { handle: me, status: "yes" })}
              className={cn(
                "flex h-14 items-center justify-center font-sans text-sm disabled:opacity-50",
                myRsvp?.status === "yes" ? "bg-ink text-paper" : "bg-red text-paper",
              )}
            >
              {myRsvp?.status === "yes" ? "Coming" : "I’ll be there"}
            </button>
            <button
              type="button"
              disabled={!me}
              onClick={() => me && rsvpSit(room.id, { handle: me, status: "later" })}
              className={cn(
                "flex h-14 items-center justify-center border-l border-ink font-sans text-sm disabled:opacity-50",
                myRsvp?.status === "later" ? "bg-ink text-paper" : "bg-paper text-ink",
              )}
            >
              {myRsvp?.status === "later" ? "Later" : "Not this hour"}
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 border-b border-ink sm:grid-cols-2">
          <Link
            to="/read/$workId"
            params={{ workId: room.workId }}
            search={{ sit: room.minutes, hosted: encodeHostedSit(room) }}
            className="flex h-14 items-center justify-center bg-ink font-sans text-sm text-paper"
          >
            {ghost ? "Open the work" : "Sit"}
          </Link>
          <button
            type="button"
            onClick={() => void share()}
            className="flex h-14 items-center justify-center border-t border-ink bg-yellow font-sans text-sm text-ink sm:border-l sm:border-t-0"
          >
            {copied ? "Copied" : "Invite"}
          </button>
        </div>

        {room.rsvps.length > 0 ? (
          <section>
            <p className="border-b border-ink px-4 py-3 type-kicker text-muted">Who is coming</p>
            {room.rsvps.map((row) => (
              <p key={row.handle} className="border-b border-ink px-4 py-4 font-serif text-lg">
                {formatHandle(row.handle)}
                <span className="ml-2 type-kicker text-muted">
                  {row.status === "yes" ? "yes" : "later"}
                </span>
              </p>
            ))}
          </section>
        ) : null}

        <section>
          <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
            {ghost ? "Ghost replay" : "Kept in this sit"}
          </p>
          {keeps.length === 0 ? (
            <p className="border-b border-ink px-4 py-5 font-serif text-lg text-ink/70">
              {ghost
                ? "No lines were kept. The room was still."
                : "Lines kept during the sit will gather here."}
            </p>
          ) : (
            keeps.map((row) => (
              <Link
                key={`${row.handle}-${row.breathId}`}
                to="/read/$workId"
                params={{ workId: room.workId }}
                search={{ at: row.at }}
                className="block border-b border-ink px-4 py-5"
              >
                <p className="type-kicker text-muted">{formatHandle(row.handle)}</p>
                <p className="mt-1 type-lede italic leading-snug">{row.line}</p>
              </Link>
            ))
          )}
        </section>

        {isHost && phase !== "ghost" ? (
          <button
            type="button"
            onClick={() => endHostedSit(room.id)}
            className="flex h-14 w-full items-center justify-center border-b border-ink bg-paper font-sans text-sm text-ink"
          >
            Close the sit
          </button>
        ) : null}
      </div>
    </div>
  );
}
