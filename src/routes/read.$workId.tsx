import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { VellumReader } from "@/components/chamber-reader";
import { shelfWork } from "@/lib/catalog/shelf";
import { loadWork, peekWork, type Work } from "@/lib/works";
import { useVellum } from "@/lib/store";
import { asSittingMinutes } from "@/lib/sitting";
import { asPairCode, searchFlag } from "@/lib/shuffle";

type ReadSearch = {
  shuffle?: boolean;
  sit?: number;
  pair?: string;
  at?: number;
  episode?: number;
  echo?: string;
  hosted?: string;
};

function asEpisodeNumber(value: unknown): number | undefined {
  if (typeof value === "string" && /^\d+$/.test(value)) {
    value = Number.parseInt(value, 10);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const n = Math.floor(value);
  if (n < 1 || n > 40) return undefined;
  return n;
}

export const Route = createFileRoute("/read/$workId")({
  validateSearch: (search: Record<string, unknown>): ReadSearch => {
    const next: ReadSearch = {};
    if (searchFlag(search.shuffle)) next.shuffle = true;
    if (search.sit !== undefined && search.sit !== null && search.sit !== "") {
      next.sit = asSittingMinutes(search.sit);
    }
    const pair = asPairCode(search.pair);
    if (pair) next.pair = pair;
    if (typeof search.at === "number" && Number.isFinite(search.at) && search.at >= 0) {
      next.at = Math.floor(search.at);
    } else if (typeof search.at === "string" && /^\d+$/.test(search.at)) {
      next.at = Number.parseInt(search.at, 10);
    }
    const episode = asEpisodeNumber(search.episode);
    if (episode) next.episode = episode;
    if (typeof search.echo === "string" && search.echo.length >= 8 && search.echo.length <= 2400) {
      next.echo = search.echo;
    }
    if (typeof search.hosted === "string" && search.hosted.length >= 8 && search.hosted.length <= 2400) {
      next.hosted = search.hosted;
    }
    return next;
  },
  component: ReadPage,
});

function ReadPage() {
  const { workId } = Route.useParams();
  const { shuffle, sit, pair, at, episode, echo, hosted } = Route.useSearch();
  const pageWork = useVellum((s) => s.pageWork);
  const meta = workId === "page" ? pageWork : shelfWork(workId);
  const [work, setWork] = useState<Work | null | undefined>(() =>
    workId === "page" ? pageWork : (peekWork(workId) ?? undefined),
  );

  useEffect(() => {
    if (workId === "page") {
      setWork(pageWork);
      return;
    }
    let live = true;
    const cached = peekWork(workId);
    if (cached) setWork(cached);
    else setWork(undefined);
    void loadWork(workId, (next) => {
      if (live) setWork(next);
    }).then((next) => {
      if (live) setWork(next ?? null);
    });
    return () => {
      live = false;
    };
  }, [workId, pageWork]);

  if (work === undefined) {
    return (
      <div className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/"
            className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
          >
            Home
          </Link>
        </header>
        <div className="flex min-h-0 flex-1 flex-col justify-end p-5 sm:p-8">
          <p className="type-kicker text-muted">{meta?.author ?? ""}</p>
          <p className="mt-2 type-title">
            {meta?.title ?? "Opening"}
          </p>
        </div>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/"
            className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
          >
            Home
          </Link>
        </header>
        <div className="flex min-h-0 flex-1 flex-col justify-end p-5 sm:p-8">
          <p className="type-kicker text-muted">{meta?.author ?? ""}</p>
          <p className="mt-2 type-title">
            {meta?.title ?? "This sitting"}
          </p>
          <p className="mt-3 font-serif text-lg text-ink/70">This text would not come.</p>
          {workId === "page" ? (
            <Link
              to="/page"
              className="mt-8 flex h-14 items-center justify-center bg-ink font-sans text-sm text-paper"
            >
              Import
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <VellumReader
      key={`${work.id}-${pair ?? ""}-${at ?? ""}-${episode ?? ""}-${echo ?? ""}-${hosted ?? ""}`}
      work={work}
      shuffle={Boolean(shuffle)}
      sit={sit}
      pair={pair}
      at={at}
      episode={episode}
      echo={echo}
      hosted={hosted}
    />
  );
}
