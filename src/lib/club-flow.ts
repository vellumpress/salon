/**
 * Club rules shared by the client and tests.
 * SQL in supabase/migrations/20261008120000_club_social.sql follows these.
 */

export type ClubActor = {
  userId: string;
  ownerId: string;
  member: boolean;
};

export function canReadClubRow(actor: ClubActor | null): boolean {
  if (!actor) return false;
  return actor.member || actor.userId === actor.ownerId;
}

export function canReadClubMessages(actor: ClubActor | null): boolean {
  return Boolean(actor?.member);
}

export function canInsertClubMessage(actor: ClubActor | null, authorId: string): boolean {
  return Boolean(actor?.member && actor.userId === authorId);
}

/** Direct table updates (name, book, owner, invite) stay with the owner. */
export function canDirectUpdateClub(actor: ClubActor | null): boolean {
  return Boolean(actor && actor.userId === actor.ownerId);
}

export function canAddSitting(actor: ClubActor | null): boolean {
  return Boolean(actor && (actor.member || actor.userId === actor.ownerId));
}

export function canLeaveClub(actor: ClubActor | null): boolean {
  return Boolean(actor?.member);
}

export function canReadProgress(actor: ClubActor | null): boolean {
  return Boolean(actor?.member);
}

export function canWriteProgress(actor: ClubActor | null, authorId: string): boolean {
  return Boolean(actor?.member && actor.userId === authorId);
}

export function shouldAutoJoin(left: readonly string[], clubId: string): boolean {
  return !left.includes(clubId);
}

export const SIGN_IN_OPEN_CLUB = "Sign in to open a club.";
export const SIGN_IN_START_CLUB = "Sign in to start a club.";
export const SIGN_IN_JOIN_CLUB = "Sign in to join a club.";
export const SIGN_IN_LEAVE_CLUB = "Sign in to leave a club.";
export const SIGN_IN_EDIT_CLUB = "Sign in to edit a club.";
export const SIGN_IN_WRITE_CLUB = "Sign in to write in a club.";
export const SIGN_IN_ADD_SITTING = "Sign in to add a sitting.";

const CLUBS_MIGRATION = "supabase/migrations/20260929180000_clubs.sql";

const SPECIFIC_SIGN_IN: Array<[RegExp, string]> = [
  [/sign in to leave/i, SIGN_IN_LEAVE_CLUB],
  [/sign in to join/i, SIGN_IN_JOIN_CLUB],
  [/sign in to edit/i, SIGN_IN_EDIT_CLUB],
  [/sign in to write/i, SIGN_IN_WRITE_CLUB],
  [/sign in to add/i, SIGN_IN_ADD_SITTING],
  [/sign in to start/i, SIGN_IN_START_CLUB],
];

/** Keep a specific sign-in sentence. A bare auth failure stays on the caller's line. */
export function clubDirectoryMessage(error: unknown, fallback = SIGN_IN_OPEN_CLUB) {
  const row = error as { code?: string; message?: string } | null;
  const message = row?.message ?? (error instanceof Error ? error.message : String(error ?? ""));
  if (
    row?.code === "42P01" ||
    row?.code === "PGRST205" ||
    /schema cache|does not exist|relation .*clubs/i.test(message)
  ) {
    return `Book clubs are not on the directory yet. Apply ${CLUBS_MIGRATION}.`;
  }
  for (const [pattern, line] of SPECIFIC_SIGN_IN) {
    if (pattern.test(message)) return line;
  }
  if (/sign in/i.test(message) || row?.code === "PGRST301") return fallback;
  return message || "The club would not open.";
}

export function mergeClubMessages<T extends { id: number }>(prev: T[], incoming: T[]): T[] {
  const seen = new Set<number>();
  const next: T[] = [];
  for (const row of [...prev, ...incoming]) {
    if (!Number.isFinite(row.id) || seen.has(row.id)) continue;
    seen.add(row.id);
    next.push(row);
  }
  next.sort((a, b) => a.id - b.id);
  return next;
}
