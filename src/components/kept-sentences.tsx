import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CollectionHeader } from "@/components/collection-header";
import { SalonCardShare } from "@/components/salon-card-share";
import { YOU_PREVIEW } from "@/lib/favorites";
import { fillClass, fillInk, mosaicFills } from "@/lib/mondrian";
import { cn } from "@/lib/utils";
import { shelfWork } from "@/lib/catalog/shelf";
import { breathRemapLoaded, loadBreathRemap, readBreathRemap } from "@/lib/breath-remap";
import {
  keptIdsNeedRemap,
  keptProgressKey,
  resolveKeptOpen,
  visibleKeptLines,
  type VisibleKeptLine,
} from "@/lib/kept-lines";
import { isDeviceImport } from "@/lib/import/private";
import { loadWork, peekWork, workIsComplete } from "@/lib/works";
import { useTbr, type WorkProgress } from "@/lib/store";

export type KeptLine = VisibleKeptLine;

export function useKeptLines(
  progress: Record<string, WorkProgress>,
  hydrated: boolean,
  limit = 24,
): { lines: KeptLine[]; total: number } {
  const keptKey = useMemo(() => (hydrated ? keptProgressKey(progress) : ""), [hydrated, progress]);
  const [lines, setLines] = useState<KeptLine[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!hydrated || !keptKey) {
      setLines([]);
      setTotal(0);
      return;
    }
    let live = true;
    const workIds = Object.entries(progress)
      .filter(([id, item]) => !isDeviceImport(id) && (item.kept?.length ?? 0) > 0)
      .map(([id]) => id);

    function paint() {
      if (!live) return;
      const all = visibleKeptLines(progress, (id) => peekWork(id), {
        remap: readBreathRemap(),
        complete: workIsComplete,
        skip: isDeviceImport,
        meta: (id) => {
          const shelf = shelfWork(id);
          return shelf ? { title: shelf.title, author: shelf.author } : undefined;
        },
      });
      const cap = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : all.length;
      setLines(all.slice(0, cap));
      setTotal(all.length);
    }

    function warmRemap() {
      if (breathRemapLoaded()) return;
      const missing = workIds.some((id) =>
        keptIdsNeedRemap(progress[id]?.kept, peekWork(id)?.breaths),
      );
      if (!missing) return;
      void loadBreathRemap().then(() => {
        if (live) paint();
      });
    }

    paint();
    warmRemap();
    void Promise.all(
      workIds.map((id) =>
        loadWork(id, () => {
          paint();
          warmRemap();
        }),
      ),
    ).then(() => {
      paint();
      warmRemap();
    });

    return () => {
      live = false;
    };
  }, [hydrated, keptKey, limit, progress]);

  return { lines, total };
}

async function openKeptLine(
  navigate: ReturnType<typeof useNavigate>,
  target: { workId: string; breathId?: string; text?: string },
) {
  try {
    const load = (id: string) => loadWork(id);
    let remap = readBreathRemap();
    let opened = await resolveKeptOpen({
      workId: target.workId,
      breathId: target.breathId,
      text: target.text,
      remap,
      load,
    });
    if (target.breathId && !breathRemapLoaded()) {
      const work = await load(target.workId);
      const live = work?.breaths.some((breath) => breath.id === target.breathId);
      if (work && !live) {
        remap = await loadBreathRemap();
        opened = await resolveKeptOpen({
          workId: target.workId,
          breathId: target.breathId,
          text: target.text,
          remap,
          load,
        });
      }
    }
    if (opened.nextId && target.breathId && opened.nextId !== target.breathId) {
      useTbr.getState().retargetKept(target.workId, target.breathId, opened.nextId);
    }
    await navigate({
      to: "/read/$workId",
      params: { workId: target.workId },
      search: typeof opened.at === "number" ? { at: opened.at } : {},
    });
  } catch {
    try {
      await navigate({
        to: "/read/$workId",
        params: { workId: target.workId },
        search: {},
      });
    } catch {
      /* Stay on the page. The book is still on the shelf. */
    }
  }
}

export function KeptReadLink({
  workId,
  breathId,
  text,
  at = -1,
  className,
  children,
}: {
  workId: string;
  breathId?: string;
  text?: string;
  at?: number;
  className?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const search = typeof at === "number" && at >= 0 ? { at } : {};
  return (
    <Link
      to="/read/$workId"
      params={{ workId }}
      search={search}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        void openKeptLine(navigate, { workId, breathId, text });
      }}
    >
      {children}
    </Link>
  );
}

export function KeptSentences({
  progress,
  hydrated,
  preview = false,
  rail = false,
  heading = "Kept",
  empty = "Tap Keep on a sentence. It will live here, on You.",
  sectionId,
}: {
  progress: Record<string, WorkProgress>;
  hydrated: boolean;
  preview?: boolean;
  /** You page: one horizontal snap row. The collection stays a vertical shelf. */
  rail?: boolean;
  heading?: string;
  empty?: string;
  sectionId?: string;
}) {
  const cap = preview ? YOU_PREVIEW : Number.POSITIVE_INFINITY;
  const { lines, total } = useKeptLines(progress, hydrated, cap);
  const hidden = preview ? Math.max(0, total - lines.length) : 0;
  const fills = mosaicFills(lines.length + (hidden > 0 ? 1 : 0), "kept");

  return (
    <section id={sectionId}>
      <CollectionHeader linked={preview} hash="lines">
        {heading}
      </CollectionHeader>
      {!hydrated ? (
        <p className="border-b border-ink px-4 py-5 font-serif text-sm text-ink/70">
          Sentences you keep while reading wait here.
        </p>
      ) : lines.length === 0 ? (
        <p className="border-b border-ink px-4 py-5 font-serif text-lg text-ink/80">
          {empty}
        </p>
      ) : rail ? (
        <div className="rail" role="list" aria-label={heading}>
          {lines.map((line, i) => {
            const fill = fills[i] ?? "paper";
            const ink = fill === "yellow" || fill === "paper";
            return (
              <div
                key={`${line.workId}-${line.breathId}`}
                role="listitem"
                className={cn("you-tile is-quote", fillClass(fill), fillInk(fill))}
              >
                <KeptReadLink
                  workId={line.workId}
                  breathId={line.breathId}
                  text={line.text}
                  at={line.at}
                  className="you-tile-link"
                >
                  <p className="type-lede italic leading-snug">{line.text}</p>
                  <p className="mt-2 type-kicker opacity-80">
                    {line.title}
                    {line.author ? ` · ${line.author}` : ""}
                  </p>
                </KeptReadLink>
                <SalonCardShare
                  workId={line.workId}
                  at={line.at}
                  text={line.text}
                  title={line.title}
                  author={line.author}
                  className={cn(
                    "h-12 w-full shrink-0 border-t border-ink",
                    ink ? "bg-ink text-paper" : "bg-paper text-ink",
                  )}
                />
              </div>
            );
          })}
          {hidden > 0 ? (
            <Link
              to="/profile/collection"
              hash="lines"
              role="listitem"
              className="you-tile is-quote bg-ink text-paper"
            >
              <span className="type-kicker opacity-80">Collection</span>
              <span className="mt-1 type-lede">
                {hidden === 1 ? "One more line" : `${hidden} more lines`}
              </span>
              <span className="mt-2 font-sans text-sm opacity-80">See all</span>
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          {lines.map((line) => (
            <div key={`${line.workId}-${line.breathId}`} className="border-b border-ink">
              <KeptReadLink
                workId={line.workId}
                breathId={line.breathId}
                text={line.text}
                at={line.at}
                className="block px-4 py-5"
              >
                <p className="type-lede italic leading-snug">
                  {line.text}
                </p>
                <p className="mt-2 type-kicker text-muted">
                  {line.title}
                  {line.author ? ` · ${line.author}` : ""}
                </p>
              </KeptReadLink>
              <SalonCardShare
                workId={line.workId}
                at={line.at}
                text={line.text}
                title={line.title}
                author={line.author}
                className="w-full border-t border-ink bg-paper text-ink"
              />
            </div>
          ))}
          {hidden > 0 ? (
            <Link
              to="/profile/collection"
              hash="lines"
              className="flex items-center justify-between border-b border-ink bg-ink px-4 py-5 text-paper"
            >
              <span className="type-lede">
                {hidden === 1 ? "One more line" : `${hidden} more lines`}
              </span>
              <span className="font-sans text-sm">See all</span>
            </Link>
          ) : null}
        </>
      )}
    </section>
  );
}
