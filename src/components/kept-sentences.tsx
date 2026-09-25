import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CollectionHeader } from "@/components/collection-header";
import { SalonCardShare } from "@/components/salon-card-share";
import { keptRefs } from "@/lib/continuity";
import { YOU_PREVIEW } from "@/lib/favorites";
import { boardWork, fillClass, fillInk, mosaicFills } from "@/lib/mondrian";
import { cn } from "@/lib/utils";
import { shelfWork } from "@/lib/catalog/shelf";
import { loadWork, peekWork } from "@/lib/works";
import type { WorkProgress } from "@/lib/store";

export type KeptLine = {
  workId: string;
  breathId: string;
  text: string;
  title: string;
  author: string;
  at: number;
};

function lineFromWork(
  workId: string,
  breathId: string,
  work: { title: string; author: string; breaths: { id: string; text: string }[] } | undefined,
): KeptLine | null {
  const meta = shelfWork(workId) ?? boardWork(workId);
  const at = work?.breaths.findIndex((breath) => breath.id === breathId) ?? -1;
  const text = at >= 0 ? (work?.breaths[at]?.text ?? "").trim() : "";
  if (!text) return null;
  return {
    workId,
    breathId,
    text,
    title: work?.title ?? meta?.title ?? workId,
    author: work?.author ?? meta?.author ?? "",
    at,
  };
}

export function useKeptLines(
  progress: Record<string, WorkProgress>,
  hydrated: boolean,
  limit = 24,
): KeptLine[] {
  const keptKey = useMemo(
    () =>
      Object.entries(progress)
        .map(([id, item]) => `${id}:${(item.kept ?? []).join(",")}`)
        .sort()
        .join("|"),
    [progress],
  );
  const refs = useMemo(
    () => (hydrated ? keptRefs(progress, limit) : []),
    [hydrated, keptKey, progress, limit],
  );
  const [lines, setLines] = useState<KeptLine[]>([]);

  useEffect(() => {
    if (refs.length === 0) {
      setLines([]);
      return;
    }
    let live = true;
    const workIds = [...new Set(refs.map((ref) => ref.workId))];

    function paint() {
      if (!live) return;
      const next: KeptLine[] = [];
      for (const ref of refs) {
        const line = lineFromWork(ref.workId, ref.breathId, peekWork(ref.workId));
        if (line) next.push(line);
      }
      setLines(next);
    }

    paint();
    void Promise.all(
      workIds.map((id) =>
        loadWork(id, () => {
          paint();
        }),
      ),
    ).then(() => paint());

    return () => {
      live = false;
    };
  }, [refs]);

  return lines;
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
  const lines = useKeptLines(progress, hydrated, cap);
  const keptCount = useMemo(() => {
    if (!hydrated) return 0;
    return keptRefs(progress, Number.POSITIVE_INFINITY).length;
  }, [hydrated, progress]);
  const hidden = preview ? Math.max(0, keptCount - lines.length) : 0;
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
                <Link
                  to="/read/$workId"
                  params={{ workId: line.workId }}
                  search={{ at: line.at }}
                  className="you-tile-link"
                >
                  <p className="type-lede italic leading-snug">{line.text}</p>
                  <p className="mt-2 type-kicker opacity-80">
                    {line.title}
                    {line.author ? ` · ${line.author}` : ""}
                  </p>
                </Link>
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
              <Link
                to="/read/$workId"
                params={{ workId: line.workId }}
                search={{ at: line.at }}
                className="block px-4 py-5"
              >
                <p className="type-lede italic leading-snug">
                  {line.text}
                </p>
                <p className="mt-2 type-kicker text-muted">
                  {line.title}
                  {line.author ? ` · ${line.author}` : ""}
                </p>
              </Link>
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
