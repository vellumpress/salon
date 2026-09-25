import { Link } from "@tanstack/react-router";
import { CollectionHeader } from "@/components/collection-header";
import { FavoriteMark } from "@/components/favorite-mark";
import { PlaceChip } from "@/components/place-chip";
import { favoriteWorks, YOU_PREVIEW } from "@/lib/favorites";
import { fillClass, fillInk, mosaicFills } from "@/lib/mondrian";
import { cn } from "@/lib/utils";
import { prefetchWork } from "@/lib/prefetch-work";

export function FavoriteWorks({
  ids,
  hydrated,
  preview = false,
  rail = false,
  heading,
  empty,
  sectionId,
}: {
  ids: string[];
  hydrated: boolean;
  preview?: boolean;
  /** You page: one horizontal snap row. The collection stays a vertical shelf. */
  rail?: boolean;
  heading: string;
  empty: string;
  sectionId?: string;
}) {
  const all = favoriteWorks(ids);
  const shown = preview ? all.slice(0, YOU_PREVIEW) : all;
  const hidden = preview ? Math.max(0, all.length - shown.length) : 0;
  const fills = mosaicFills(shown.length, "favorites");

  return (
    <section id={sectionId}>
      <CollectionHeader linked={preview} hash="books">
        {heading}
      </CollectionHeader>
      {!hydrated ? (
        <p className="border-b border-ink px-4 py-5 font-serif text-sm text-ink/70">
          Works you heart wait here.
        </p>
      ) : shown.length === 0 ? (
        <p className="border-b border-ink px-4 py-5 font-serif text-lg text-ink/80">
          {empty}
        </p>
      ) : rail ? (
        <div className="rail" role="list" aria-label={heading}>
          {shown.map((work, i) => {
            const fill = fills[i] ?? "paper";
            return (
              <div
                key={work.id}
                role="listitem"
                className={cn("you-tile is-wide is-flush relative", fillClass(fill), fillInk(fill))}
              >
                <FavoriteMark
                  workId={work.id}
                  className="absolute right-0 top-0 z-10 h-12 w-12 border-b border-l border-ink px-0"
                />
                <Link
                  to="/read/$workId"
                  params={{ workId: work.id }}
                  preload="intent"
                  onPointerDown={() => prefetchWork(work.id)}
                  onFocus={() => prefetchWork(work.id)}
                  className="you-tile-link has-mark"
                >
                  {work.author ? (
                    <span className="type-kicker opacity-80">
                      {work.author}
                    </span>
                  ) : null}
                  <PlaceChip workId={work.id} className="mt-1.5 opacity-80" />
                  <span
                    className={cn(
                      "type-lede",
                      work.author && "mt-1",
                    )}
                  >
                    {work.title}
                  </span>
                </Link>
              </div>
            );
          })}
          {hidden > 0 ? (
            <Link
              to="/profile/collection"
              hash="books"
              role="listitem"
              className="you-tile is-wide bg-ink text-paper"
            >
              <span className="type-kicker opacity-80">Collection</span>
              <span className="mt-1 type-lede">
                {hidden === 1 ? "One more on the shelf" : `${hidden} more on the shelf`}
              </span>
              <span className="mt-2 font-sans text-sm opacity-80">See all</span>
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          {shown.map((work, i) => {
            const fill = fills[i] ?? "paper";
            return (
              <div
                key={work.id}
                className={cn(
                  "flex items-stretch border-b border-ink",
                  fillClass(fill),
                  fillInk(fill),
                )}
              >
                <Link
                  to="/read/$workId"
                  params={{ workId: work.id }}
                  preload="intent"
                  onPointerDown={() => prefetchWork(work.id)}
                  onFocus={() => prefetchWork(work.id)}
                  className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5"
                >
                  {work.author ? (
                    <span className="type-kicker opacity-80">
                      {work.author}
                    </span>
                  ) : null}
                  <PlaceChip workId={work.id} className="mt-1.5 opacity-80" />
                  <span
                    className={cn(
                      "type-lede",
                      work.author && "mt-1",
                    )}
                  >
                    {work.title}
                  </span>
                </Link>
                <FavoriteMark
                  workId={work.id}
                  className="h-auto min-h-12 self-stretch border-l border-ink"
                />
              </div>
            );
          })}
          {hidden > 0 ? (
            <Link
              to="/profile/collection"
              hash="books"
              className="flex items-center justify-between border-b border-ink bg-ink px-4 py-5 text-paper"
            >
              <span className="type-lede">
                {hidden === 1 ? "One more on the shelf" : `${hidden} more on the shelf`}
              </span>
              <span className="font-sans text-sm">See all</span>
            </Link>
          ) : null}
        </>
      )}
    </section>
  );
}
