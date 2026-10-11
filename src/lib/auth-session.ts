/** Auth events the hosted client reports. */
export type AuthEventName =
  | "INITIAL_SESSION"
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED"
  | "PASSWORD_RECOVERY"
  | string;

/**
 * A missing session on the first event is not a sign-out. Clearing the
 * reader id there makes Friends wait for a second login.
 */
export function sessionFromAuthEvent(
  event: AuthEventName,
  sessionUserId: string | null | undefined,
  currentUserId: string | null,
): { userId: string | null; sync: boolean } {
  if (event === "SIGNED_OUT") return { userId: null, sync: false };
  if (sessionUserId) return { userId: sessionUserId, sync: true };
  return { userId: currentUserId, sync: false };
}
