import { useEffect, useRef } from "react";
import { usePersistHydrated } from "@/components/resume-link";
import { draftsFromLocal } from "@/lib/remote-activity";
import { ensureProfile } from "@/lib/remote-auth";
import {
  dropFollows,
  publishActivity,
  pullFollows,
  pushFollows,
  readPublishedKeys,
  refreshFollowedActivity,
  rememberPublishedKeys,
  setRemoteSession,
  wantedFollowHandles,
} from "@/lib/remote-directory";
import { normalizeHandle } from "@/lib/social";
import { getSupabase } from "@/lib/supabase";
import { useVellum } from "@/lib/store";

/**
 * Best-effort bridge. Local reading stays the source of truth on this phone.
 * Hosted writes never block the sit, and a signed-out phone keeps working.
 */
export function RemoteSync() {
  const hydrated = usePersistHydrated();
  const seenFollows = useRef<Set<string> | null>(null);
  const followSignature = useRef("");

  useEffect(() => {
    const supabase = getSupabase();
    const apply = (id: string | null) => setRemoteSession(id);
    void supabase.auth.getSession().then(({ data }) => apply(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancel = false;

    const claimAndFollow = async (refreshActivity: boolean) => {
      const state = useVellum.getState();
      const mine = normalizeHandle(state.handle ?? "");
      const wanted = wantedFollowHandles(mine, state.following ?? [], state.contacts ?? []);
      const signature = `${mine}|${[...wanted].sort().join(",")}`;
      if (!refreshActivity && signature === followSignature.current) return;
      const { data } = await getSupabase().auth.getSession();
      const session = data.session;
      if (cancel || !session) return;
      const followsChanged = signature !== followSignature.current;
      if (followsChanged) {
        followSignature.current = signature;
        if (mine.length >= 2) void ensureProfile(mine);
        await pushFollows(session.user.id, wanted);
        const pulled = await pullFollows(session.user.id);
        if (cancel) return;
        const contacts = useVellum.getState().contacts ?? [];
        for (const profile of pulled) {
          if (profile.handle === mine) continue;
          if (contacts.some((row) => row.handle === profile.handle)) continue;
          useVellum.getState().addContact({ handle: profile.handle, name: profile.name || undefined });
        }
        const previous = seenFollows.current;
        if (previous) {
          const dropped = [...previous].filter((row) => !wanted.has(row));
          if (dropped.length) await dropFollows(session.user.id, dropped);
        }
        seenFollows.current = wanted;
      }
      if (!cancel && (refreshActivity || followsChanged)) {
        await refreshFollowedActivity(session.user.id);
      }
    };

    void claimAndFollow(true);
    const timer = window.setInterval(() => void claimAndFollow(true), 8_000);
    const onFocus = () => void claimAndFollow(true);
    window.addEventListener("focus", onFocus);
    const unsub = useVellum.subscribe(() => void claimAndFollow(false));
    return () => {
      cancel = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      unsub();
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
          const { data } = await getSupabase().auth.getSession();
          const session = data.session;
          if (cancel || !session) return;
          const state = useVellum.getState();
          const drafts = draftsFromLocal({
            handle: state.handle ?? "",
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
    const unsub = useVellum.subscribe(flush);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
      unsub();
    };
  }, [hydrated]);

  return null;
}
