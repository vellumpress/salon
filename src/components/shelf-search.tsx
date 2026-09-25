import { Link } from "@tanstack/react-router";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { searchShelf, type ShelfWork } from "@/lib/catalog/shelf";
import {
  FULL_TEXT_WORKS,
  LOCAL_WORKS,
  withFullPdf,
  withLocalBound,
} from "@/lib/catalog/full-pdf";
import { PlaceChip } from "@/components/place-chip";
import { prefetchWork } from "@/lib/prefetch-work";
import { cn } from "@/lib/utils";

export type ShelfSearchGate = "fullPdf" | "local";

export function useShelfSearch(gate: ShelfSearchGate = "fullPdf") {
  const [query, setQuery] = useState("");
  const searching = Boolean(query.trim());
  const matches = useMemo(() => {
    const found = searchShelf(query);
    return gate === "local" ? withLocalBound(found) : withFullPdf(found);
  }, [query, gate]);
  const poolSize = gate === "local" ? LOCAL_WORKS.length : FULL_TEXT_WORKS.length;
  return { query, setQuery, searching, matches, poolSize };
}

export function ShelfSearchBar({
  id,
  query,
  setQuery,
  count,
  className,
}: {
  id: string;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  count: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "cell-search cell-search-quiet flex items-stretch bg-paper",
        className,
      )}
    >
      <label
        htmlFor={id}
        className="type-kicker flex shrink-0 items-center px-3 uppercase text-muted"
      >
        Search
      </label>
      <input
        id={id}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Title, author, year"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        className="h-9 min-w-0 flex-1 border-0 bg-transparent font-serif text-base tracking-pitch text-ink placeholder:text-muted/70 focus-visible:outline-none"
      />
      <span className="type-kicker flex shrink-0 items-center px-3 tabular-nums text-muted">
        {count}
      </span>
    </div>
  );
}

export function ShelfSearchHits({
  matches,
  query,
}: {
  matches: ShelfWork[];
  query: string;
}) {
  if (matches.length === 0) {
    return (
      <div className="cell-wide flex min-h-0 flex-col justify-end bg-paper p-5 text-ink">
        <span className="type-kicker opacity-70">The shelf</span>
        <span className="type-lede mt-1">
          Nothing matches
        </span>
        <span className="type-pitch mt-2 opacity-70">
          No title, author, or year for “{query.trim()}”.
        </span>
      </div>
    );
  }

  return (
    <>
      {matches.map((item) => (
        <ShelfSearchHit key={item.id} item={item} />
      ))}
    </>
  );
}

function ShelfSearchHit({ item }: { item: ShelfWork }) {
  return (
    <Link
      to="/read/$workId"
      params={{ workId: item.id }}
      onPointerDown={() => prefetchWork(item.id)}
      onFocus={() => prefetchWork(item.id)}
      className="cell-search-hit relative flex min-h-0 flex-col justify-end overflow-hidden bg-paper p-4 text-ink sm:p-5"
    >
      <span className="type-kicker opacity-70">
        {item.author}
        <span className="opacity-60"> · {item.year}</span>
      </span>
      <PlaceChip work={item} tone="accent" className="mt-1.5" />
      <span className="type-lede mt-1">
        {item.title}
      </span>
    </Link>
  );
}
