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
