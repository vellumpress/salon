import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ReaderAuthForm } from "@/components/reader-auth-form";
import { SignOutMark } from "@/components/sign-out";
import { getMe, pushReading, saveSettings, type Me } from "@/lib/account";
import { confirmEmailMessage } from "@/lib/remote-auth";
import { useReaderSession, type ReaderAuthMode } from "@/lib/use-reader-session";
import { useFavoriteSync } from "@/lib/use-favorite-sync";
import { liveBackendEnabled } from "@/lib/site";
import { SIT_PRESETS } from "@/lib/sitting";
import { formatHandle } from "@/lib/social";
import { useTbr } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Account chrome for You. Loaded after the score, so a slow or failed
 * session chunk cannot keep the glass off the page.
 */
export function YouAccountShell({
  page,
}: {
  page: (slots: {
    headerEnd: ReactNode;
    settings: ReactNode;
    handle: string;
    notice?: string;
  }) => ReactNode;
}) {
  const session = useReaderSession();
  const { identity, liveUser, hasAccounts, storeHandle, createAccount, signIn } = session;
  const progress = useTbr((s) => s.progress);
  const sittingMinutes = useTbr((s) => s.sittingMinutes);
  const handle = useTbr((s) => s.handle) ?? "";
  const setTaste = useTbr((s) => s.setTaste);
  const setSittingMinutes = useTbr((s) => s.setSittingMinutes);
  const { hydrated } = useFavoriteSync(liveUser ?? null);
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState(identity?.displayName ?? "");
  const [sit, setSit] = useState<number>(sittingMinutes);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [authMode, setAuthMode] = useState<ReaderAuthMode>(hasAccounts ? "in" : "up");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [confirmNote, setConfirmNote] = useState("");

  useEffect(() => {
    if (hasAccounts) setAuthMode("in");
  }, [hasAccounts]);

  useEffect(() => {
    if (!liveUser || !liveBackendEnabled) return;
    let alive = true;
    void getMe({ data: { name: liveUser.displayName ?? "" } })
      .then((row) => {
        if (!alive) return;
        setMe(row);
        setName(row.name || liveUser.displayName || "");
        setSit(row.sittingMinutes);
        setSittingMinutes(row.sittingMinutes);
        setTaste(row.taste);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof Error && err.message !== "Unauthorized") {
          setError(err.message);
        }
      });
    return () => {
      alive = false;
    };
  }, [liveUser, setSittingMinutes, setTaste]);

  useEffect(() => {
    if (!hydrated || !liveUser || !liveBackendEnabled) return;
    const entries = Object.entries(progress)
      .filter((entry): entry is [string, NonNullable<(typeof progress)[string]>] => {
        const item = entry[1];
        return Boolean(item?.entered) && entry[0] !== "page" && !entry[0].startsWith("import-");
      })
      .slice(0, 80)
      .map(([id, item]) => ({
        workId: id,
        breathIndex: item.breathIndex,
        kept: item.kept?.length ?? 0,
        completed: Boolean(item.completedAt),
        lastOpenedAt: item.lastOpenedAt || Date.now(),
      }));
    if (entries.length === 0) return;
    void pushReading({ data: { entries } }).catch(() => undefined);
  }, [hydrated, progress, liveUser]);

  async function submitCreate(input: { handle: string; email: string; password: string }) {
    setAuthBusy(true);
    setAuthError("");
    try {
      const result = await createAccount(input);
      if (result.confirmEmail) setConfirmNote(confirmEmailMessage(result.handle));
      else if (result.notice) setConfirmNote(result.notice);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not create the account");
    } finally {
      setAuthBusy(false);
    }
  }

  async function submitSignIn(input: { email: string; password: string }) {
    setAuthBusy(true);
    setAuthError("");
    try {
      const result = await signIn(input);
      if (result.confirmEmail) setConfirmNote(confirmEmailMessage(result.handle));
      else if (result.notice) setConfirmNote(result.notice);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setAuthBusy(false);
    }
  }

  async function save() {
    if (!identity) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      setSittingMinutes(sit);
      if (liveUser && liveBackendEnabled) {
        const row = await saveSettings({
          data: {
            name: name.trim().slice(0, 80),
            sittingMinutes: sit,
            taste: me?.taste ?? "",
          },
        });
        setMe(row);
        setSittingMinutes(row.sittingMinutes);
        setTaste(row.taste);
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not keep that");
    } finally {
      setSaving(false);
    }
  }

  const headerEnd = (
    <>
      {me?.role === "staff" ? (
        <Link
          to="/desk"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-red px-4 text-paper"
        >
          Desk
        </Link>
      ) : null}
      {identity ? <SignOutMark className="border-l border-paper" /> : null}
      {!identity ? (
        <Link
          to="/login"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-red px-4 text-paper"
        >
          Sign in
        </Link>
      ) : null}
    </>
  );

  const settings = (
    <>
      {!identity ? (
        <section>
          <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
            {authMode === "up" ? "Create an account" : "Sign in"}
          </p>
          <ReaderAuthForm
            mode={authMode}
            onMode={setAuthMode}
            defaultHandle={storeHandle}
            busy={authBusy}
            error={authError}
            onCreate={(input) => void submitCreate(input)}
            onSignIn={(input) => void submitSignIn(input)}
          />
        </section>
      ) : (
        <section>
          <div className="flex items-stretch border-b border-ink">
            <span className="flex w-24 shrink-0 items-center px-4 type-kicker text-muted">@name</span>
            <span className="type-lede flex h-12 min-w-0 flex-1 items-center">{formatHandle(identity.handle)}</span>
          </div>
          <div className="flex items-stretch border-b border-ink">
            <span className="flex w-24 shrink-0 items-center px-4 type-kicker text-muted">Email</span>
            <span className="type-lede flex h-12 min-w-0 flex-1 items-center">{identity.email}</span>
          </div>
          <p className="border-b border-ink px-4 py-3 type-kicker text-muted">A sitting</p>
          <div className="rail" role="list" aria-label="A sitting">
            {SIT_PRESETS.map((option, i) => {
              const fills = [
                "bg-red text-paper",
                "bg-blue text-paper",
                "bg-yellow text-ink",
                "bg-forest text-paper",
                "bg-ink text-paper",
                "bg-paper-deep text-ink",
              ];
              return (
                <button
                  key={option.minutes}
                  type="button"
                  role="listitem"
                  onClick={() => setSit(option.minutes)}
                  className={cn(
                    "you-tile is-sit font-sans text-sm",
                    fills[i % fills.length],
                    sit === option.minutes ? "opacity-100" : "opacity-55",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {error ? (
            <p className="border-b border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">{error}</p>
          ) : null}
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="flex h-14 w-full items-center justify-center bg-ink font-sans text-sm text-paper disabled:opacity-60"
          >
            {saving ? "Keeping…" : saved ? "Kept" : "Keep"}
          </button>
          <SignOutMark className="h-14 w-full border-0" />
        </section>
      )}
    </>
  );

  return page({
    headerEnd,
    settings,
    handle: formatHandle(identity?.handle || handle),
    notice: confirmNote || undefined,
  });
}
