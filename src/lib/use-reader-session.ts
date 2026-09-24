import { useCallback, useEffect, useMemo, useState } from "react";
import { authClient, authEnabled, signOut as signOutLive } from "@/lib/auth/client";
import { useCurrentUserState, type AppUser } from "@/lib/auth/use-current-user";
import {
  createReaderAccount,
  emptyVault,
  handlesInVault,
  openSessionForEmail,
  persistReaderVault,
  readReaderVault,
  renameVaultHandle,
  sessionFromVault,
  signInReaderAccount,
  signOutReaderVault,
  type ReaderSession,
  type ReaderVault,
} from "@/lib/reader-account";
import { liveAuthAvailable, withBase } from "@/lib/site";
import { formatHandle, normalizeHandle } from "@/lib/social";
import { useTbr } from "@/lib/store";

export type ReaderIdentity = {
  id: string;
  email: string;
  handle: string;
  displayName: string;
  source: "local" | "live";
};

export type ReaderAuthMode = "up" | "in";

function liveUserOf(user: AppUser | null): AppUser | null {
  if (!user || user.isDevFallback) return null;
  return user;
}

function identityFromSession(session: ReaderSession, source: ReaderIdentity["source"]): ReaderIdentity {
  return {
    id: source === "live" ? `live:${session.email}` : `local:${session.email}`,
    email: session.email,
    handle: session.handle,
    displayName: session.name.trim() || formatHandle(session.handle) || session.email,
    source,
  };
}

/**
 * Reader session for You / login. Ignores the auth-disabled Dev User so GitHub
 * Pages can show real create-account / sign-in. Local vault always persists;
 * Better Auth email/password is used only when a live backend is on.
 */
export function useReaderSession() {
  const { user, isPending: authPending } = useCurrentUserState();
  const liveUser = liveAuthAvailable ? liveUserOf(user) : null;
  const storeHandle = useTbr((s) => s.handle) ?? "";
  const contacts = useTbr((s) => s.contacts) ?? [];
  const setHandle = useTbr((s) => s.setHandle);
  const [vault, setVault] = useState<ReaderVault>(emptyVault);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setVault(readReaderVault());
    setHydrated(true);
  }, []);

  const commit = useCallback((next: ReaderVault) => {
    setVault(persistReaderVault(next));
    return next;
  }, []);

  const localSession = hydrated ? sessionFromVault(vault) : null;

  const identity = useMemo<ReaderIdentity | null>(() => {
    if (liveUser) {
      const email = (liveUser.primaryEmail ?? localSession?.email ?? "").trim().toLowerCase();
      const handle =
        localSession?.handle ||
        storeHandle ||
        normalizeHandle(liveUser.displayName ?? email.split("@")[0] ?? "");
      return identityFromSession(
        {
          email,
          handle,
          name: liveUser.displayName ?? localSession?.name ?? "",
        },
        "live",
      );
    }
    return localSession ? identityFromSession(localSession, "local") : null;
  }, [liveUser, localSession, storeHandle]);

  useEffect(() => {
    if (!identity?.handle) return;
    if (normalizeHandle(storeHandle) === identity.handle) return;
    setHandle(identity.handle);
  }, [identity?.handle, setHandle, storeHandle]);

  const extras = useMemo(
    () => (contacts ?? []).map((row) => row.handle),
    [contacts],
  );

  const createAccount = useCallback(
    async (input: { handle: string; email: string; password: string }) => {
      const current = readReaderVault();
      const local = await createReaderAccount(input, current, extras, storeHandle);
      if (!local.ok) throw new Error(local.error);
      if (liveAuthAvailable && authEnabled) {
        const { error } = await authClient.signUp.email({
          email: local.session.email,
          password: input.password,
          name: local.session.handle,
        });
        if (error) throw new Error(error.message ?? "Could not create the account");
      }
      commit(local.vault);
      const claimed = setHandle(local.session.handle);
      if (!claimed.ok) throw new Error(claimed.error);
      return local.session;
    },
    [commit, extras, setHandle, storeHandle],
  );

  const signIn = useCallback(
    async (input: { email: string; password: string }) => {
      const current = readReaderVault();
      if (liveAuthAvailable && authEnabled) {
        const { error } = await authClient.signIn.email({
          email: input.email.trim().toLowerCase(),
          password: input.password,
        });
        if (!error) {
          const local = await signInReaderAccount(input, current);
          if (local.ok) {
            commit(local.vault);
            setHandle(local.session.handle);
            return local.session;
          }
          const handle = storeHandle || normalizeHandle(input.email.split("@")[0] ?? "");
          commit(openSessionForEmail(current, input.email, handle));
          if (handle) setHandle(handle);
          return { email: input.email.trim().toLowerCase(), handle, name: "" };
        }
      }
      const local = await signInReaderAccount(input, current);
      if (!local.ok) throw new Error(local.error);
      commit(local.vault);
      setHandle(local.session.handle);
      return local.session;
    },
    [commit, setHandle, storeHandle],
  );

  const signOut = useCallback(
    async (redirectTo = "/") => {
      commit(signOutReaderVault(readReaderVault()));
      const dest = withBase(redirectTo);
      if (liveAuthAvailable && authEnabled && liveUser) {
        try {
          await signOutLive(dest);
          return;
        } catch {
          /* local session is already cleared */
        }
      }
      window.location.assign(dest);
    },
    [commit, liveUser],
  );

  const syncHandle = useCallback(
    (handle: string) => {
      const claimed = setHandle(handle);
      if (!claimed.ok) return claimed;
      commit(renameVaultHandle(readReaderVault(), claimed.handle));
      return claimed;
    },
    [commit, setHandle],
  );

  const isPending = !hydrated || (liveAuthAvailable && authPending);

  return {
    identity,
    liveUser,
    isPending,
    hasAccounts: vault.accounts.length > 0 || handlesInVault(vault).length > 0,
    storeHandle,
    createAccount,
    signIn,
    signOut,
    syncHandle,
  };
}
