/**
 * Activity select is public: handle, current book, progress, and kept lines.
 * Writes stay with the owner. Emails are not on these tables.
 */
export type FollowEdge = { followerId: string; followeeId: string };

export function canReadActivity(
  _readerId: string | null,
  ownerId: string,
  _follows: FollowEdge[],
): boolean {
  return Boolean(ownerId);
}

export function canWriteActivity(readerId: string | null, ownerId: string): boolean {
  return Boolean(readerId) && readerId === ownerId;
}

export function canWriteFollow(readerId: string | null, followerId: string): boolean {
  return Boolean(readerId) && readerId === followerId;
}
