import { SHELF, shelfWork } from "./catalog/shelf";
import { LOCAL_WORKS } from "./catalog/full-pdf";
import { FEATURED_CAROUSEL_IDS } from "./catalog/pitches";

export function searchFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export type SittingLength = 12 | 20 | 0;

/** Shuffle / sit-together pool: local binds only (homepage search uses the same gate). */
export const CURATED = LOCAL_WORKS.map((item) => item.id);

export const WORK_MINUTES: Record<string, number> = Object.fromEntries(
  SHELF.map((item) => [item.id, item.minutes]),
);

export function pickShuffle(except?: string | null, _sitting: SittingLength = 20, taste?: string) {
  const pool = CURATED.filter((id) => id !== except);
  const source = pool.length > 0 ? pool : [...CURATED];
  const words = (taste ?? "")
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3);
  const liked =
    words.length > 0
      ? source.filter((id) => {
          const cell = shelfWork(id);
          const blob = `${id} ${cell?.title ?? ""} ${cell?.author ?? ""} ${cell?.language ?? ""}`.toLowerCase();
          return words.some((word) => blob.includes(word));
        })
      : [];
  const priority = FEATURED_CAROUSEL_IDS.filter((id) => source.includes(id));
  const pickFrom =
    liked.length > 0 ? liked : priority.length > 0 ? priority : source;
  const next = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  return next ?? priority[0] ?? "passing";
}

export function makePair() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export { asPairCode, clubPair, PAIR_CODE } from "./pair";

/** Build a /read link for a timed sit; include pair for together. Keeps shuffle for invite continuity. */
export function sittingSharePath(workId: string, sit: number, pair?: string, episode?: number) {
  const query = new URLSearchParams();
  if (!episode) query.set("shuffle", "1");
  query.set("sit", String(sit));
  if (pair) query.set("pair", pair);
  if (episode) query.set("episode", String(episode));
  return `/read/${workId}?${query.toString()}`;
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  }
}


/** True when Web Share is likely usable (touch devices with navigator.share). */
export function canNativeShare() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    navigator.maxTouchPoints > 0
  );
}

export type ShareOrCopyResult = "shared" | "copied" | "aborted" | "failed";

/** Prefer OS share sheet on phones; otherwise copy the URL. AbortError → aborted (no copy). */
export async function shareOrCopy(payload: {
  title: string;
  text: string;
  url: string;
}): Promise<ShareOrCopyResult> {
  if (canNativeShare()) {
    try {
      await navigator.share(payload);
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "aborted";
    }
  }
  const ok = await copyText(payload.url);
  return ok ? "copied" : "failed";
}