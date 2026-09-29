import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Wordmark } from "@/components/wordmark";
import { passwordError, persistReaderVault, readReaderVault, rehashVaultPassword } from "@/lib/reader-account";
import { recoveryLinkKind, type RecoveryLinkKind } from "@/lib/remote-auth";
import { withBase } from "@/lib/site";
import { getSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

type Phase = "checking" | "ready" | "invalid";

function ResetPasswordPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const kind: RecoveryLinkKind = recoveryLinkKind(window.location.search, window.location.hash);
    if (kind === "invalid") {
      setPhase("invalid");
      return;
    }
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    const hasCode = new URLSearchParams(window.location.search).has("code");
    const supabase = getSupabase();
    let done = false;
    let priorToken = "";
    const ready = (address: string) => {
      if (done) return;
      done = true;
      setEmail(address);
      setPhase("ready");
    };
    void supabase.auth.getSession().then(({ data: current }) => {
      priorToken = current.session?.access_token ?? "";
      if (accessToken && current.session?.access_token === accessToken) {
        ready(current.session.user.email ?? "");
      }
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return;
      if (event === "PASSWORD_RECOVERY") ready(session.user.email ?? "");
      else if (accessToken && session.access_token === accessToken) ready(session.user.email ?? "");
    });
    const timer = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data: current }) => {
        const session = current.session;
        const token = session?.access_token ?? "";
        const exchanged = Boolean(hasCode && session && token && token !== priorToken);
        const hashMatch = Boolean(accessToken && token === accessToken);
        if (session && (exchanged || hashMatch)) ready(session.user.email ?? "");
        else if (!done) {
          done = true;
          setPhase("invalid");
        }
      });
    }, 2500);
    return () => {
      done = true;
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const fail = passwordError(password);
    if (fail) {
      setError(fail);
      return;
    }
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const supabase = getSupabase();
      const { data, error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError || !data.user) {
        const message = updateError?.message ?? "";
        if (/expired|invalid|session|otp|jwt/i.test(message) || !data.user) {
          setPhase("invalid");
          return;
        }
        setError(message || "That password would not save.");
        setBusy(false);
        return;
      }
      const address = data.user.email || email;
      if (address) {
        persistReaderVault(await rehashVaultPassword(readReaderVault(), address, password));
      }
      window.location.assign(withBase("/"));
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/expired|invalid|session/i.test(message)) setPhase("invalid");
      else {
        setError(message || "That password would not save.");
        setBusy(false);
      }
    }
  }

  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Home
        </Link>
        <h1 className="flex min-w-0 flex-1 items-center px-4">
          <Wordmark />
        </h1>
        <Link
          to="/login"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-paper px-4 text-ink"
        >
          Sign in
        </Link>
      </header>
      {phase === "checking" ? (
        <div className="min-h-24 flex-1 bg-paper" />
      ) : phase === "invalid" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-36 flex-col justify-end bg-ink p-5 text-paper sm:p-8">
            <p className="type-kicker opacity-80">Reset</p>
            <p className="mt-2 type-title">This link has expired.</p>
            <p className="type-pitch mt-2.5 max-w-xl text-paper/70">
              It may already have been used. Ask for another.
            </p>
          </div>
          <Link
            to="/forgot-password"
            className="flex h-16 items-center justify-center bg-yellow font-sans text-sm text-ink"
          >
            Forgot password
          </Link>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-36 flex-col justify-end bg-ink p-5 text-paper sm:p-8">
            <p className="type-kicker opacity-80">Reset</p>
            <p className="mt-2 type-title">A new password</p>
            <p className="type-pitch mt-2.5 max-w-xl text-paper/70">
              Eight characters at least. This phone will keep the same one.
            </p>
          </div>
          <form className="flex flex-col" onSubmit={(event) => void submit(event)}>
            <label className="flex items-stretch border-b border-ink">
              <span className="flex w-24 shrink-0 items-center px-4 type-kicker text-muted">
                Password
              </span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Eight at least"
                className="h-14 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl text-ink placeholder:text-muted focus-visible:outline-none"
              />
            </label>
            <label className="flex items-stretch border-b border-ink">
              <span className="flex w-24 shrink-0 items-center px-4 type-kicker text-muted">
                Again
              </span>
              <input
                type="password"
                name="confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="The same one"
                className="h-14 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl text-ink placeholder:text-muted focus-visible:outline-none"
              />
            </label>
            {error ? (
              <p className="border-b border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">{error}</p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="flex h-16 items-center justify-center bg-ink font-sans text-sm text-paper disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save password"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
