/** Friend codes are 6 chars; club rooms reuse the club id (up to 16). */
export const PAIR_CODE = /^[a-z0-9]{4,16}$/i;

export function asPairCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!PAIR_CODE.test(value)) return undefined;
  return value.toLowerCase();
}

/** Stable RTC room key for a book club sitting. */
export function clubPair(clubId: string) {
  const direct = asPairCode(clubId);
  if (direct) return direct;
  const compact = clubId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  return compact || "clubrm";
}
