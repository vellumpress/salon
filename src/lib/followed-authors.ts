import { useCallback, useEffect, useState } from "react";

/** New key. Existing reading data stays on `vellum-v1`. */
export const FOLLOWED_AUTHORS_KEY = "tbr-followed-authors";

const CHANGE = "tbr-followed-authors-change";

export function readFollowedAuthorSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FOLLOWED_AUTHORS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const slugs: string[] = [];
    for (const item of parsed) {
      if (typeof item !== "string") continue;
      const slug = item.trim();
      if (!slug || slugs.includes(slug)) continue;
      slugs.push(slug);
    }
    return slugs.slice(0, 40);
  } catch {
    return [];
  }
}

export function writeFollowedAuthorSlugs(slugs: string[]) {
  if (typeof window === "undefined") return;
  const next = slugs.filter((slug, index) => slug && slugs.indexOf(slug) === index).slice(0, 40);
  window.localStorage.setItem(FOLLOWED_AUTHORS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE));
}

export function useFollowedAuthors() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      const next = readFollowedAuthorSlugs();
      setSlugs((current) => (current.join("|") === next.join("|") ? current : next));
    };
    sync();
    setReady(true);
    window.addEventListener(CHANGE, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((slug: string) => {
    const current = readFollowedAuthorSlugs();
    const next = current.includes(slug)
      ? current.filter((item) => item !== slug)
      : [...current, slug];
    writeFollowedAuthorSlugs(next);
    setSlugs(next);
  }, []);

  return { slugs, ready, toggle, follows: (slug: string) => slugs.includes(slug) };
}
