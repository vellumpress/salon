import { boardWork } from "./mondrian.ts";

export const YOU_PREVIEW = 3;

export type FavoriteWork = {
  id: string;
  title: string;
  author: string;
};

/** Resolve a favorited work id to title/author for You and Collection. */
export function resolveFavoriteWork(id: string): FavoriteWork {
  const work = boardWork(id);
  return {
    id,
    title: work?.title?.trim() || id,
    author: work?.author?.trim() ?? "",
  };
}

/** Newest heart first, unique. Unknown ids still appear so they can be unset. */
export function favoriteWorks(ids: string[]): FavoriteWork[] {
  const seen = new Set<string>();
  const out: FavoriteWork[] = [];
  for (let i = ids.length - 1; i >= 0; i--) {
    const id = ids[i];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(resolveFavoriteWork(id));
  }
  return out;
}
