import { isDeviceImport } from "./import/private.ts";
import { canonicalWorkId } from "./work-id-alias.ts";

/**
 * The personal shelf is the existing favorites list.
 * It already lives on this phone and in the account library row.
 * Device-only imports stay out: the file never leaves this phone.
 */
export function toggleShelfId(ids: readonly string[] | null | undefined, workId: string): string[] {
  const id = canonicalWorkId(workId);
  const current = (ids ?? []).map((item) => canonicalWorkId(item)).filter((item) => item.length > 0);
  if (!id || isDeviceImport(id)) return current;
  if (current.includes(id)) return current.filter((item) => item !== id);
  return [...current, id];
}

export function shelfButtonLabel(on: boolean) {
  return on ? "On shelf" : "Shelf";
}

export function shelfButtonName(on: boolean) {
  return on ? "Remove from shelf" : "Add to shelf";
}
