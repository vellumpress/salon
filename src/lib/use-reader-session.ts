import { useCallback, useEffect, useMemo, useState } from "react";
import { authClient, authEnabled, signOut as signOutLive } from "@/lib/auth/client";
import { useCurrentUserState, type AppUser } from "@/lib/auth/use-current-user";
import {
  createReaderAccount,
  emptyVault,
  handlesInVault,
  normalizeEmail,
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
import {
  confirmEmailMessage,
  connectHostedAccount,
  ensureProfile,
  signOutHosted,
  updateHostedHandle,
} from "@/lib/remote-auth";
import { getSupabase } from "@/lib/supabase";
import { liveAuthAvailable, withBase } from "@/lib/site";
import { formatHandle, normalizeHandle } from "@/lib/social";
import { useVellum } from "@/lib/store";

export type ReaderAuthResult = ReaderSession & {
  confirmEmail: boolean;
  notice: string;
};

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
  const storeHandle = useVellum((s) => s.handle) ?? "";
  const contacts = useVellum((s) => s.contacts) ?? [];
  const setHandle = useVellum((s) => s.setHandle);
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

  const adoptHosted = useCallback(
    async (email: string, preferredHandle: string, name = "") => {
      const claimed = await ensureProfile(preferredHandle, name);
      if (!claimed.ok) {
        if (claimed.error === "offline") return null;
        if (claimed.error.includes("taken")) throw new Error(claimed.error);
        return null;
      }
      const vault = readReaderVault();
      const local = sessionFromVault(vault);
      if (!local || normalizeEmail(local.email) !== normalizeEmail(email)) {
        commit(openSessionForEmail(vault, email, claimed.handle));
      } else if (local.handle !== claimed.handle) {
        commit(renameVaultHandle(readReaderVault(), claimed.handle));
      }
      setHandle(claimed.handle);
      return claimed.handle;
    },
    [commit, setHandle],
  );

  useEffect(() => {
    if (!hydrated) return;
    let ignore = false;
    const apply = async (session: { user: { email?: string | null; user_metadata?: Record<string, unknown> } } | null) => {
      if (ignore || !session?.user.email) return;
      const email = normalizeEmail(session.user.email);
      const vault = readReaderVault();
      const local = sessionFromVault(vault);
      if (local && local.email !== email) {
        try {
          await getSupabase().auth.signOut();
        } catch {
          /* keep the phone session */
        }
        return;
      }
      const preferred =
        local?.handle ||
        normalizeHandle(String(session.user.user_metadata?.handle ?? "")) ||
        normalizeHandle(email.split("@")[0] ?? "");
      try {
        await adoptHosted(email, preferred, local?.name ?? "");
      } catch {
        /* handle-taken stays on the form that caused it */
      }
    };
    void getSupabase()
      .auth.getSession()
      .then(({ data }) => apply(data.session));
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      void apply(session);
    });
    return () => {
      ignore = true;
      data.subscription.unsubscribe();
    };
  }, [adoptHosted, hydrated]);

  const createAccount = useCallback(
    async (input: { handle: string; email: string; password: string }): Promise<ReaderAuthResult> => {
      const current = readReaderVault();
      const local = await createReaderAccount(input, current, extras, storeHandle);
      if (!local.ok) throw new Error(local.error);
      const remote = await connectHostedAccount({
        mode: "up",
        email: local.session.email,
        password: input.password,
        handle: local.session.handle,
        name: local.session.name,
      });
      if (remote.status === "handle_taken") throw new Error(remote.message);
      if (remote.status === "error" && /password/i.test(remote.message)) {
        throw new Error(remote.message);
      }
      if (remote.status === "error" && /already sits/i.test(remote.message)) {
        throw new Error(remote.message);
      }
      if (liveAuthAvailable && authEnabled) {
        const { error } = await authClient.signUp.email({
          email: local.session.email,
          password: input.password,
          name: local.session.handle,
        });
        if (error) throw new Error(error.message ?? "Could not create the account");
      }
      commit(local.vault);
      const hostedHandle = remote.status === "session" ? remote.handle : local.session.handle;
      const claimed = setHandle(hostedHandle);
      if (!claimed.ok) throw new Error(claimed.error);
      if (hostedHandle !== local.session.handle) {
        commit(renameVaultHandle(readReaderVault(), hostedHandle));
      }
      return {
        email: local.session.email,
        handle: hostedHandle,
        name: local.session.name,
        confirmEmail: remote.status === "confirm_email",
        notice: remote.status === "error" ? remote.message : "",
      };
    },
    [commit, extras, setHandle, storeHandle],
  );

  const signIn = useCallback(
    async (input: { email: string; password: string }): Promise<ReaderAuthResult> => {
      const current = readReaderVault();
      const email = normalizeEmail(input.email);
      const local = await signInReaderAccount(input, current);
      if (!local.ok && local.error !== "No account for that email. Create one.") {
        throw new Error(local.error);
      }
      const preferred = local.ok
        ? local.session.handle
        : storeHandle || normalizeHandle(email.split("@")[0] ?? "");
      let remote = await connectHostedAccount({
        mode: "in",
        email,
        password: input.password,
        handle: preferred,
        name: local.ok ? local.session.name : "",
      });
      if (
        local.ok &&
        (remote.status === "invalid" ||
          (remote.status === "error" && /already sits/i.test(remote.message)))
      ) {
        remote = await connectHostedAccount({
          mode: "up",
          email,
          password: input.password,
          handle: local.session.handle,
          name: local.session.name,
        });
      }
      if (remote.status === "handle_taken" && !local.ok) throw new Error(remote.message);
      if (liveAuthAvailable && authEnabled) {
        await authClient.signIn.email({ email, password: input.password });
      }
      if (local.ok) {
        const handle = remote.status === "session" ? remote.handle : local.session.handle;
        commit(local.vault);
        if (handle !== local.session.handle) {
          commit(renameVaultHandle(readReaderVault(), handle));
        }
        const claimed = setHandle(handle);
        if (!claimed.ok) throw new Error(claimed.error);
        return {
          email: local.session.email,
          handle,
          name: local.session.name,
          confirmEmail: remote.status === "confirm_email",
          notice:
            remote.status === "confirm_email"
              ? confirmEmailMessage(handle)
              : remote.status === "handle_taken"
                ? remote.message
                : remote.status === "error"
                  ? remote.message
                  : "",
        };
      }
      if (remote.status === "session") {
        commit(openSessionForEmail(current, email, remote.handle));
        const claimed = setHandle(remote.handle);
        if (!claimed.ok) throw new Error(claimed.error);
        return {
          email,
          handle: remote.handle,
          name: "",
          confirmEmail: false,
          notice: "",
        };
      }
      if (remote.status === "confirm_email") throw new Error(confirmEmailMessage(preferred));
      if (remote.status === "error" && !local.ok) {
        throw new Error(local.error === "No account for that email. Create one." ? remote.message : local.error);
      }
      if (!local.ok) throw new Error(local.error);
      throw new Error("Could not sign in");
    },
    [commit, setHandle, storeHandle],
  );

  const signOut = useCallback(
    async (redirectTo = "/") => {
      commit(signOutReaderVault(readReaderVault()));
      await signOutHosted();
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
    async (handle: string) => {
      const claimed = setHandle(handle);
      if (!claimed.ok) return claimed;
      const remote = await updateHostedHandle(claimed.handle);
      if (!remote.ok) {
        const previous = sessionFromVault(readReaderVault())?.handle ?? "";
        if (previous) setHandle(previous);
        return { ok: false as const, error: remote.error };
      }
      const nextHandle = remote.handle || claimed.handle;
      if (nextHandle !== claimed.handle) setHandle(nextHandle);
      commit(renameVaultHandle(readReaderVault(), nextHandle));
      return { ok: true as const, handle: nextHandle };
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
