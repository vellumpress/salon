import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { PagesShell } from "@/components/pages-shell";
import { TbrReader } from "@/components/chamber-reader";
import { documentIsWordmarkShell } from "@/lib/wordmark-shell";
import { shelfWork } from "@/lib/catalog/shelf";
import { canonicalWorkId } from "@/lib/work-id-alias";
import { getImport } from "@/lib/import/idb";
import { isDeviceImport } from "@/lib/import/private";
import { atFromLocationSearch, holdOpeningForAt } from "@/lib/deep-link-breath";
import { loadWork, peekWork, workIsComplete, type Work } from "@/lib/works";
import { useTbr } from "@/lib/store";
import { asSittingMinutes } from "@/lib/sitting";
import { asPairCode, searchFlag } from "@/lib/shuffle";
import { useReaderDaylight } from "@/lib/use-reader-daylight";
import { cn } from "@/lib/utils";

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
  beforeLoad: ({ params, search }) => {
    const workId = canonicalWorkId(params.workId);
    if (workId !== params.workId) {
      throw redirect({
        to: "/read/$workId",
        params: { workId },
        search,
      });
    }
  },
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
    if (
      typeof search.hosted === "string" &&
      search.hosted.length >= 8 &&
      search.hosted.length <= 2400
    ) {
      next.hosted = search.hosted;
    }
    return next;
  },
  component: ReadPage,
});

function ReadPage() {
  // A warm reader chunk paints this page into the wordmark document and
  // WebKit raises hydration error #418. The recovered tree then drops `?at=`.
  const [booted, setBooted] = useState(
    () => typeof document !== "undefined" && !documentIsWordmarkShell(document),
  );
  useLayoutEffect(() => {
    setBooted(true);
  }, []);
  if (!booted) return <PagesShell />;
  return <ReadBody />;
}

/**
 * Loading and error frames sit on the same daylight path as `TbrReader`.
 * A device import paints this gate first; when the reader mounts it reuses
 * the clock already published to `--status-page`, so the bar does not stay paper.
 */
function ReadGate({ children }: { children: ReactNode }) {
  const daylight = useReaderDaylight();
  return (
    <div
      className={cn("frame-screen bg-paper text-ink", daylight.className)}
      style={daylight.style}
      data-daylight={daylight.active ? daylight.sample.phase : "off"}
    >
      {children}
    </div>
  );
}

/** Opening excerpt that does not contain `at` must not paint breath 0. */
function workReadyForAt(book: Work | null | undefined, at: number | undefined) {
  if (!book) return book;
  if (
    holdOpeningForAt(at, book.breaths.length, workIsComplete(book.id), shelfWork(book.id)?.breaths)
  ) {
    return undefined;
  }
  return book;
}

function ReadBody() {
  const { workId } = Route.useParams();
  const { shuffle, sit, pair, at: routeAt, episode, echo, hosted } = Route.useSearch();
  // Hydration recovery can drop `at` from the router while the address keeps it.
  // Painting that as breath 0 is the catalog walk's "opened on chapter I".
  const at =
    routeAt ??
    (typeof window !== "undefined"
      ? (atFromLocationSearch(window.location.search) ?? undefined)
      : undefined);
  const pageWork = useTbr((s) => s.pageWork);
  const device = isDeviceImport(workId);
  const meta = workId === "page" ? pageWork : shelfWork(workId);
  const [work, setWork] = useState<Work | null | undefined>(() =>
    workId === "page" ? pageWork : device ? undefined : workReadyForAt(peekWork(workId), at),
  );

  useEffect(() => {
    if (workId === "page") {
      setWork(pageWork);
      return;
    }
    if (device) {
      let live = true;
      setWork(undefined);
      void getImport(workId).then((row) => {
        if (live) setWork(row?.work ?? null);
      });
      return () => {
        live = false;
      };
    }
    let live = true;
    const cached = workReadyForAt(peekWork(workId), at);
    if (cached) setWork(cached);
    else setWork(undefined);
    void loadWork(workId, (next) => {
      const ready = workReadyForAt(next, at);
      if (live && ready) setWork(ready);
    })
      .then(async (next) => {
        if (!live) return;
        let edition = next;
        const deadline = Date.now() + 20000;
        while (live) {
          const ready = workReadyForAt(edition, at);
          if (ready) {
            setWork(ready);
            return;
          }
          // The opening is loaded and `at` is still past it. Keep the title
          // frame and try the full text again instead of painting breath 0.
          if (Date.now() >= deadline) break;
          await new Promise<void>((resolve) => setTimeout(resolve, 1000));
          if (!live) return;
          try {
            edition = (await loadWork(workId)) ?? peekWork(workId) ?? edition;
          } catch {
            edition = peekWork(workId) ?? edition;
          }
        }
        if (!live) return;
        setWork(workReadyForAt(edition, at) ?? null);
      })
      .catch(() => {
        if (!live) return;
        setWork(workReadyForAt(peekWork(workId), at) ?? null);
      });
    return () => {
      live = false;
    };
  }, [workId, pageWork, device, at]);

  if (work === undefined) {
    return (
      <ReadGate>
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
          <p className="mt-2 type-title">{meta?.title ?? "Opening"}</p>
        </div>
      </ReadGate>
    );
  }

  if (!work) {
    return (
      <ReadGate>
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
          <p className="mt-2 type-title">{meta?.title ?? "This sitting"}</p>
          <p className="mt-3 font-serif text-lg text-muted">
            {typeof navigator !== "undefined" && navigator.onLine === false
              ? "Offline"
              : "This text would not come."}
          </p>
          {workId === "page" ? (
            <Link
              to="/page"
              className="mt-8 flex h-14 items-center justify-center bg-ink font-sans text-sm text-paper"
            >
              Import
            </Link>
          ) : null}
        </div>
      </ReadGate>
    );
  }

  return (
    <TbrReader
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
