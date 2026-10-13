import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useState } from "react";
import { claimStaff } from "@/lib/account";
import {
  GROK_PROVIDERS,
  authClient,
  signIn as signInProvider,
} from "@/lib/auth/client";
import { ReaderAuthForm } from "@/components/reader-auth-form";
import { PagesShell } from "@/components/pages-shell";
import { Wordmark } from "@/components/wordmark";
import { documentIsWordmarkShell } from "@/lib/wordmark-shell";
import { liveAuthAvailable, withBase } from "@/lib/site";
import { safeAuthNext } from "@/lib/auth-return";
import { authLinkNotice, confirmEmailMessage, sendSignInLink } from "@/lib/remote-auth";
import { useReaderSession, type ReaderAuthMode } from "@/lib/use-reader-session";
import { cn } from "@/lib/utils";

type Door = "reader" | "staff";

// Real staff mailbox. The domain stays; renaming it would lock the desk.
const STAFF_DOMAIN = "@vellum.press";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { door?: Door; next?: string } => {
    const next: { door?: Door; next?: string } = {};
    if (search.door === "staff") next.door = "staff";
    if (search.door === "reader") next.door = "reader";
    const back = safeAuthNext(search.next);
    if (back) next.next = back;
    return next;
  },
  component: LoginPage,
});

function isStaffEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return false;
  return trimmed.slice(at) === STAFF_DOMAIN;
}

function LoginHeader() {
  return (
    <header className="flex shrink-0 items-stretch border-b border-ink">
      <Link
        to="/"
        preload="intent"
        className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper [touch-action:manipulation]"
      >
        Home
      </Link>
      <h1 className="flex min-w-0 flex-1 items-center px-4">
        <Wordmark />
      </h1>
      <Link
        to="/profile"
        className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-paper px-4 text-ink"
      >
        You
      </Link>
    </header>
  );
}

function LoginPage() {
  // A warm login chunk paints this form into the wordmark document and
  // WebKit raises hydration error #418. Match that document first.
  const [booted, setBooted] = useState(
    () => typeof document !== "undefined" && !documentIsWordmarkShell(document),
  );
  useLayoutEffect(() => {
    setBooted(true);
  }, []);
  if (!booted) return <PagesShell />;
  return <LoginBody />;
}

function LoginBody() {
  const { door, next } = Route.useSearch();
  const navigate = useNavigate();
  const { identity, isPending, hasAccounts, storeHandle, createAccount, signIn, signInWithCode } =
    useReaderSession();
  const [mode, setMode] = useState<ReaderAuthMode>(hasAccounts ? "in" : "up");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "x" | "reader" | "staff-in" | "staff-up" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [staffError, setStaffError] = useState("");
  const showStaff = door === "staff";
  const [leave, setLeave] = useState(false);
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (hasAccounts) setMode("in");
  }, [hasAccounts]);

  useEffect(() => {
    const notice = authLinkNotice(window.location.search, window.location.hash);
    if (notice) setError(notice);
  }, []);

  useEffect(() => {
    if (!isPending && identity && !hold) setLeave(true);
  }, [identity, isPending, hold]);

  useEffect(() => {
    if (door !== "staff") return;
    const jump = () => document.getElementById("staff")?.scrollIntoView({ block: "start" });
    jump();
    const id = window.requestAnimationFrame(jump);
    return () => window.cancelAnimationFrame(id);
  }, [door]);

  if (leave && identity && !busy && !hold) {
    if (next) return <Navigate to="/" href={next} />;
    return <Navigate to={door === "staff" ? "/desk" : "/profile"} />;
  }

  async function withReaderCreate(input: { handle: string; email: string; password: string }) {
    setBusy("reader");
    setError("");
    setHold(true);
    try {
      const result = await createAccount(input);
      if (result.confirmEmail || result.notice) {
        setLeave(false);
        setError(result.confirmEmail ? confirmEmailMessage(result.handle) : result.notice);
        setBusy(null);
        return;
      }
      setBusy(null);
      setHold(false);
      setLeave(true);
    } catch (err) {
      setLeave(false);
      setHold(false);
      setError(err instanceof Error ? err.message : "Could not create the account");
      setBusy(null);
    }
  }

  async function withMagicLink(address: string) {
    setBusy("reader");
    setError("");
    setHold(true);
    try {
      const result = await sendSignInLink(address.trim().toLowerCase());
      setLeave(false);
      setError(result.message);
      setBusy(null);
    } catch (err) {
      setLeave(false);
      setHold(false);
      setError(err instanceof Error ? err.message : "Could not send the link.");
      setBusy(null);
    }
  }

  async function withCode(input: { email: string; token: string }) {
    setBusy("reader");
    setError("");
    setHold(true);
    try {
      const result = await signInWithCode(input);
      if (result.notice) {
        setLeave(false);
        setError(result.notice);
        if (!result.handle) setMode("up");
        setBusy(null);
        return;
      }
      setBusy(null);
      setHold(false);
      setLeave(true);
    } catch (err) {
      setLeave(false);
      setHold(false);
      setError(err instanceof Error ? err.message : "That code did not work.");
      setBusy(null);
    }
  }

  async function withReaderSignIn(input: { email: string; password: string }) {
    setBusy("reader");
    setError("");
    setHold(true);
    try {
      const result = await signIn(input);
      if (result.confirmEmail || result.notice) {
        setLeave(false);
        setError(result.confirmEmail ? confirmEmailMessage(result.handle) : result.notice);
        setBusy(null);
        return;
      }
      setBusy(null);
      setHold(false);
      setLeave(true);
    } catch (err) {
      setLeave(false);
      setHold(false);
      setError(err instanceof Error ? err.message : "Could not sign in");
      setBusy(null);
    }
  }

  async function withStaffEmail(staffMode: "staff-in" | "staff-up") {
    const address = staffEmail.trim().toLowerCase();
    if (!isStaffEmail(address)) {
      setStaffError("Staff sit at vellum.press");
      return;
    }
    if (staffPassword.length < 8) {
      setStaffError("Eight characters at least.");
      return;
    }
    if (!liveAuthAvailable) {
      setStaffError("The desk is closed here.");
      return;
    }
    setBusy(staffMode);
    setStaffError("");
    try {
      await runEmail(
        staffMode === "staff-up" ? "up" : "in",
        address,
        staffPassword,
        address.split("@")[0] || "Staff",
      );
      await claimStaff();
      window.location.assign(withBase("/desk"));
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : "Could not open the desk");
      setBusy(null);
    }
  }

  return (
    <div className="frame-screen bg-paper text-ink">
      <LoginHeader />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col justify-end bg-ink px-5 py-5 text-paper">
          <p className="type-kicker opacity-80">This sitting</p>
          <p className="mt-2 type-mark">
            {mode === "up" ? "Create an account" : "Sign in"}
          </p>
          <p className="mt-2 max-w-xl font-serif text-base text-paper/80">
            {mode === "up"
              ? "Pick an @name once. Then an email and a password."
              : "Email and password, or a code from your email."}
          </p>
        </div>

        {liveAuthAvailable ? (
          <div className="flex flex-col gap-px bg-ink">
            {GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                disabled={Boolean(busy)}
                onClick={() => {
                  setBusy(provider.providerId === "grok-google" ? "google" : "x");
                  setError("");
                  void signInProvider(provider.providerId, {
                    callbackURL: withBase("/profile"),
                    errorCallbackURL: withBase("/login"),
                  }).catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Could not sign in");
                    setBusy(null);
                  });
                }}
                className={cn(
                  "flex h-16 items-center justify-center font-sans text-sm [touch-action:manipulation] disabled:opacity-60",
                  provider.providerId === "grok-google"
                    ? "bg-blue text-paper"
                    : "bg-ink text-paper",
                )}
              >
                Continue with {provider.label}
              </button>
            ))}
          </div>
        ) : null}

        <ReaderAuthForm
          mode={mode}
          onMode={setMode}
          defaultHandle={storeHandle}
          busy={busy === "reader"}
          error={error}
          onCreate={(input) => void withReaderCreate(input)}
          onSignIn={(input) => void withReaderSignIn(input)}
          onMagicLink={(address) => void withMagicLink(address)}
          onCode={(input) => void withCode(input)}
        />
        {hold ? (
          <button
            type="button"
            onClick={() => {
              setBusy(null);
              setHold(false);
              void navigate({ to: "/profile" });
            }}
            className="flex h-14 w-full items-center justify-center border-b border-ink bg-paper font-sans text-sm"
          >
            Continue on this phone
          </button>
        ) : null}

        {showStaff ? (
          <>
            <div
              id="staff"
              className="flex min-h-36 flex-col justify-end bg-red p-5 text-paper sm:p-8"
            >
              <p className="type-kicker opacity-80">Staff</p>
              <p className="mt-2 type-mark">The desk</p>
              <p className="mt-2 max-w-xl font-serif text-base text-paper/80">
                A vellum.press email. Readers do not need this door.
              </p>
            </div>
            {liveAuthAvailable ? (
              <StaffForm
                email={staffEmail}
                password={staffPassword}
                error={staffError}
                busyIn={busy === "staff-in"}
                busyUp={busy === "staff-up"}
                disabled={Boolean(busy)}
                onEmail={setStaffEmail}
                onPassword={setStaffPassword}
                onSignIn={() => void withStaffEmail("staff-in")}
                onCreate={() => void withStaffEmail("staff-up")}
              />
            ) : (
              <p className="border-b border-ink px-5 py-6 font-serif text-lg text-ink/70">
                The desk is closed here.
              </p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function StaffForm({
  email,
  password,
  error,
  busyIn,
  busyUp,
  disabled,
  onEmail,
  onPassword,
  onSignIn,
  onCreate,
}: {
  email: string;
  password: string;
  error: string;
  busyIn: boolean;
  busyUp: boolean;
  disabled: boolean;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onSignIn: () => void;
  onCreate: () => void;
}) {
  return (
    <form
      className="flex flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        onSignIn();
      }}
    >
      <label className="flex items-stretch border-b border-ink">
        <span className="flex w-24 shrink-0 items-center px-4 type-kicker text-muted">
          Email
        </span>
        <input
          type="email"
          name="staff-email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmail(event.target.value)}
          className="h-14 min-w-0 flex-1 border-0 bg-transparent font-serif text-base text-ink placeholder:text-muted focus-visible:outline-none"
          placeholder="you@vellum.press"
        />
      </label>
      <label className="flex items-stretch border-b border-ink">
        <span className="flex w-24 shrink-0 items-center px-4 type-kicker text-muted">
          Password
        </span>
        <input
          type="password"
          name="staff-password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => onPassword(event.target.value)}
          className="h-14 min-w-0 flex-1 border-0 bg-transparent font-serif text-base text-ink placeholder:text-muted focus-visible:outline-none"
          placeholder="Eight at least"
        />
      </label>
      {error ? (
        <p className="border-b border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">{error}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-px bg-ink">
        <button
          type="submit"
          disabled={disabled}
          className="flex h-16 items-center justify-center bg-paper font-sans text-sm text-ink [touch-action:manipulation] disabled:opacity-60"
        >
          {busyIn ? "In…" : "Sign in"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onCreate}
          className="flex h-16 items-center justify-center bg-yellow font-sans text-sm text-ink [touch-action:manipulation] disabled:opacity-60"
        >
          {busyUp ? "Opening…" : "Create"}
        </button>
      </div>
    </form>
  );
}

async function runEmail(mode: "in" | "up", email: string, password: string, name: string) {
  if (mode === "up") {
    const { error: fail } = await authClient.signUp.email({ email, password, name });
    if (fail) throw new Error(fail.message ?? "Could not create the account");
    return;
  }
  const { error: fail } = await authClient.signIn.email({ email, password });
  if (fail) throw new Error(fail.message ?? "Could not sign in");
}
