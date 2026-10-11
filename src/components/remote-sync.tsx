import { useEffect, useRef } from "react";
import { usePersistHydrated } from "@/components/resume-link";
import { sessionFromAuthEvent } from "@/lib/auth-session";
import { pushCurrentShelf, reconcileShelf, shelfPatch, type ReaderShelf } from "@/lib/library-sync";
import { draftsFromLocal, publishingHandle } from "@/lib/remote-activity";
import { ensureProfile } from "@/lib/remote-auth";
import {
  dropFollows,
  planFollowSync,
  publishActivity,
  pullFollows,
  pushFollows,
  readPublishedKeys,
  refreshFollowedActivity,
  rememberPublishedKeys,
  setRemoteSession,
  subscribeFriendActivity,
  wantedFollowHandles,
} from "@/lib/remote-directory";
import { readReaderVault, sessionFromVault } from "@/lib/reader-account";
import { normalizeHandle } from "@/lib/social";
import { isOffline } from "@/lib/net";
import { getSupabase } from "@/lib/supabase";
import { useTbr } from "@/lib/store";

/**
 * Best-effort bridge. Local reading stays the source of truth on this phone.
 * Hosted writes never block the sit, and a signed-out phone keeps working.
 */
export function RemoteSync() {
  const hydrated = usePersistHydrated();
  const seenFollows = useRef<string[] | null>(null);
  const emptyFollowStreak = useRef(0);
  const followSignature = useRef("");

  useEffect(() => {
    const supabase = getSupabase();
    const apply = (id: string | null) => setRemoteSession(id);
    if (!isOffline()) {
      void supabase.auth.getSession().then(({ data }) => apply(data.session?.user.id ?? null));
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancel = false;
    let watched = "";
    let stopWatch: () => void = () => undefined;
    const ensureWatch = (userId: string) => {
      if (!userId || watched === userId) return;
      stopWatch();
      watched = userId;
      stopWatch = subscribeFriendActivity(userId, () => {
        void refreshFollowedActivity(userId);
      });
    };

    const claimAndFollow = async (refreshActivity: boolean) => {
      if (isOffline()) return;
      const state = useTbr.getState();
      const mine = normalizeHandle(state.handle ?? "");
      const wanted = wantedFollowHandles(mine, state.following ?? [], state.contacts ?? []);
      const signature = `${mine}|${[...wanted].sort().join(",")}`;
      if (!refreshActivity && signature === followSignature.current) return;
      const { data } = await getSupabase().auth.getSession();
      const session = data.session;
      if (cancel || !session) return;
      ensureWatch(session.user.id);
      const followsChanged = signature !== followSignature.current;
      if (followsChanged) {
        followSignature.current = signature;
        if (mine.length >= 2) void ensureProfile(mine);
        await pushFollows(session.user.id, wanted);
        const pulled = await pullFollows(session.user.id);
        if (cancel) return;
        const contacts = useTbr.getState().contacts ?? [];
        for (const profile of pulled) {
          if (profile.handle === mine) continue;
          if (contacts.some((row) => row.handle === profile.handle)) continue;
          useTbr.getState().addContact({ handle: profile.handle, name: profile.name || undefined });
        }
        const plan = planFollowSync(seenFollows.current, wanted, emptyFollowStreak.current);
        emptyFollowStreak.current = plan.emptyStreak;
        if (plan.drop.length) await dropFollows(session.user.id, plan.drop);
        seenFollows.current = plan.next;
      }
      if (!cancel && (refreshActivity || followsChanged)) {
        await refreshFollowedActivity(session.user.id);
      }
    };

    void claimAndFollow(true);
    const timer = window.setInterval(() => void claimAndFollow(true), 8_000);
    const onFocus = () => void claimAndFollow(true);
    window.addEventListener("focus", onFocus);
    const unsub = useTbr.subscribe(() => void claimAndFollow(false));
    return () => {
      cancel = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      unsub();
      stopWatch();
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let cancel = false;
    let timer = 0;

    const flush = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void (async () => {
          if (isOffline()) return;
          const { data } = await getSupabase().auth.getSession();
          const session = data.session;
          if (cancel || !session) return;
          const state = useTbr.getState();
          const seated = sessionFromVault(readReaderVault())?.handle ?? "";
          const share = publishingHandle(state.handle ?? "", seated);
          if (share.length >= 2 && normalizeHandle(state.handle ?? "") !== share) {
            useTbr.getState().setHandle(share);
            void ensureProfile(share);
          }
          const drafts = draftsFromLocal({
            handle: share,
            progress: state.progress,
            sitHistory: state.sitHistory ?? [],
            hostedSits: state.hostedSits ?? [],
            sitPledges: state.sitPledges ?? [],
            togetherKeeps: state.togetherKeeps ?? [],
          });
          let guard = 0;
          while (!cancel && guard < 8) {
            guard += 1;
            const saved = await publishActivity(session.user.id, drafts, readPublishedKeys());
            if (!saved.length) break;
            rememberPublishedKeys(saved);
            if (saved.length < 40) break;
          }
        })();
      }, 400);
    };

    flush();
    const unsub = useTbr.subscribe(flush);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
      unsub();
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let cancel = false;
    let timer = 0;
    let syncedFor = "";
    let userId = "";
    let merging = "";
    let applying = false;

    const readShelf = () => useTbr.getState();
    const writeShelf = (shelf: ReaderShelf) => {
      applying = true;
      useTbr.setState(shelfPatch(shelf) as Partial<ReturnType<typeof useTbr.getState>>);
      applying = false;
    };

    const mergeNow = (id: string) => {
      if (!id || merging === id || syncedFor === id) return;
      merging = id;
      window.clearTimeout(timer);
      void (async () => {
        if (cancel || isOffline()) {
          merging = "";
          return;
        }
        const handle = normalizeHandle(useTbr.getState().handle ?? "");
        if (handle.length >= 2) await ensureProfile(handle);
        const result = await reconcileShelf(id, readShelf, writeShelf);
        if (merging === id) merging = "";
        if (cancel) return;
        if (result === "synced" || result === "skipped") syncedFor = id;
      })();
    };

    const schedulePush = (id: string) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (cancel || syncedFor !== id || applying) return;
        void pushCurrentShelf(id, readShelf, writeShelf);
      }, 700);
    };

    const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
      const next = sessionFromAuthEvent(event, session?.user.id, userId || null);
      userId = next.userId ?? "";
      if (!next.userId) {
        syncedFor = "";
        return;
      }
      if (!next.sync || syncedFor === next.userId) return;
      window.setTimeout(() => mergeNow(next.userId!), 0);
    });

    if (!isOffline()) {
      window.setTimeout(() => {
        void getSupabase().auth.getSession().then(({ data: sessionData }) => {
          const id = sessionData.session?.user.id ?? "";
          if (cancel || !id || syncedFor === id) return;
          userId = id;
          mergeNow(id);
        });
      }, 0);
    }

    const unsub = useTbr.subscribe(() => {
      if (!userId || applying) return;
      if (syncedFor !== userId) {
        mergeNow(userId);
        return;
      }
      schedulePush(userId);
    });

    return () => {
      cancel = true;
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
      unsub();
    };
  }, [hydrated]);

  return null;
}
