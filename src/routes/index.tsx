import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { ResumeLink, useLastRead } from "@/components/resume-link";
import { WorksStrip } from "@/components/works-strip";
import {
  ShelfSearchBar,
  ShelfSearchHits,
  useShelfSearch,
} from "@/components/shelf-search";
import { fillClass, fillInk, mosaicFills, type Fill } from "@/lib/mondrian";
import { useVisitSeed } from "@/lib/use-visit-seed";
import { prefetchWork } from "@/lib/works";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Home,
});

const DOORS = [
  {
    to: "/rituals" as const,
    label: "Rituals",
    kicker: "Timed sits",
    pitch:
      "Pick a lane for the hour you are in — before sleep, waking, a walk, unwind. One work. A sitting that ends.",
    aria: "Rituals — timed reading sits",
  },
  {
    to: "/together" as const,
    label: "Read together",
    kicker: "Friends and clubs",
    pitch:
      "The same page, a live room. Sit with a friend, or join a club that reads in real time while you talk.",
    aria: "Read together — friends and book clubs",
  },
] as const;

function Home() {
  const router = useRouter();
  const last = useLastRead();
  const visit = useVisitSeed();
  const { query, setQuery, searching, matches, poolSize } = useShelfSearch("fullPdf");

  // Fresh Mondrian palette every full open/reload (visit seed).
  // Order: [resume?, door0, door1] — neighbors avoid the same fill.
  const blockFills = useMemo(() => {
    const count = (last ? 1 : 0) + DOORS.length;
    return mosaicFills(count, `home-doors-${visit || "pending"}`);
  }, [last, visit]);

  const resumeFill: Fill | undefined = last ? blockFills[0] : undefined;
  const doorFills = last ? blockFills.slice(1) : blockFills;

  useEffect(() => {
    void router.preloadRoute({ to: "/login" });
    void router.preloadRoute({ to: "/rituals" });
    void router.preloadRoute({ to: "/together" });
    void router.preloadRoute({ to: "/shuffle", search: { together: true } });
    void router.preloadRoute({ to: "/profile" });
  }, [router]);
  useEffect(() => {
    if (last) prefetchWork(last.id);
  }, [last]);

  return (
    <main
      className={cn(
        "board board-alive board-doors",
        last && !searching && "has-resume",
        searching && "is-searching",
      )}
      data-hydrated={last ? "1" : "0"}
    >
      <div className="cell-mark flex bg-paper">
        <span className="flex h-full min-w-0 flex-1 items-center self-stretch bg-paper px-4 font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
          Vellum
        </span>
        <ResumeLink />
        <AuthSlot />
      </div>

      {searching ? (
        <ShelfSearchHits matches={matches} query={query} />
      ) : (
        <>
          {last && resumeFill ? (
            <Link
              to="/read/$workId"
              params={{ workId: last.id }}
              search={{ at: last.breathIndex }}
              preload="intent"
              aria-label={`Continue ${last.title}`}
              className={cn(
                "cell-resume relative flex min-h-0 items-stretch",
                fillClass(resumeFill),
                fillInk(resumeFill),
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3 sm:px-5">
                <span className="font-sans text-xs tracking-wide opacity-80">Resume</span>
                <span className="mt-0.5 truncate font-display text-lg font-medium tracking-tight sm:text-xl">
                  {last.title}
                </span>
                <span className="truncate font-sans text-xs tracking-wide opacity-75">
                  {last.author}
                </span>
              </span>
              <span className="flex shrink-0 items-center px-4 font-sans text-sm sm:px-5">
                Continue
              </span>
            </Link>
          ) : null}

          {DOORS.map((door, i) => {
            const fill = doorFills[i] ?? "yellow";
            return (
              <Link
                key={door.label}
                to={door.to}
                preload="intent"
                aria-label={door.aria}
                className={cn(
                  "cell-pillar relative flex min-h-0 flex-col justify-end p-5 sm:p-8",
                  fillClass(fill),
                  fillInk(fill),
                )}
              >
                <span className="font-sans text-xs tracking-wide opacity-70">{door.kicker}</span>
                <span className="pillar-title mt-1">{door.label}</span>
                <span className="pillar-pitch mt-3 max-w-md font-serif text-base leading-snug opacity-90 sm:text-lg">
                  {door.pitch}
                </span>
              </Link>
            );
          })}

          <WorksStrip />
        </>
      )}

      <ShelfSearchBar
        id="home-shelf-search"
        query={query}
        setQuery={setQuery}
        count={searching ? matches.length : poolSize}
      />
    </main>
  );
}

function AuthSlot() {
  const slot =
    "flex h-full shrink-0 items-center self-stretch border-l border-ink/15 bg-paper px-4 font-sans text-sm text-ink [touch-action:manipulation]";
  return (
    <Link to="/profile" preload="intent" className={slot}>
      You
    </Link>
  );
}