import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { claimStaff } from "@/lib/account";
import {
  GROK_PROVIDERS,
  authClient,
  signIn as signInProvider,
} from "@/lib/auth/client";
import { ReaderAuthForm } from "@/components/reader-auth-form";
import { liveAuthAvailable, withBase } from "@/lib/site";
import { useReaderSession, type ReaderAuthMode } from "@/lib/use-reader-session";
import { cn } from "@/lib/utils";

type Door = "reader" | "staff";

const STAFF_DOMAIN = "@vellum.press";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { door?: Door } => {
    if (search.door === "staff") return { door: "staff" };
    if (search.door === "reader") return { door: "reader" };
    return {};
  },
  component: LoginPage,
});

function isVellumPressEmail(email: string): boolean {
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
      <h1 className="type-mark flex min-w-0 flex-1 items-center px-4">
        Salon
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
  const { door } = Route.useSearch();
  const { identity, isPending, hasAccounts, storeHandle, createAccount, signIn } =
    useReaderSession();
  const [mode, setMode] = useState<ReaderAuthMode>(hasAccounts ? "in" : "up");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "x" | "reader" | "staff-in" | "staff-up" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [staffError, setStaffError] = useState("");
  const [showStaff, setShowStaff] = useState(door === "staff");
  const [leave, setLeave] = useState(false);

  useEffect(() => {
    if (hasAccounts) setMode("in");
  }, [hasAccounts]);

  useEffect(() => {
    if (!isPending && identity) setLeave(true);
  }, [identity, isPending]);

  useEffect(() => {
    if (door !== "staff") return;
    setShowStaff(true);
    const jump = () => document.getElementById("staff")?.scrollIntoView({ block: "start" });
    jump();
    const id = window.requestAnimationFrame(jump);
    return () => window.cancelAnimationFrame(id);
  }, [door]);

  if (leave && identity && !busy) {
    return <Navigate to={door === "staff" ? "/desk" : "/profile"} />;
  }

  async function withReaderCreate(input: { handle: string; email: string; password: string }) {
    setBusy("reader");
    setError("");
    try {
      await createAccount(input);
      window.location.assign(withBase("/profile"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account");
      setBusy(null);
    }
  }

  async function withReaderSignIn(input: { email: string; password: string }) {
    setBusy("reader");
    setError("");
    try {
      await signIn(input);
      window.location.assign(withBase("/profile"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setBusy(null);
    }
  }

  async function withStaffEmail(staffMode: "staff-in" | "staff-up") {
    const address = staffEmail.trim().toLowerCase();
    if (!isVellumPressEmail(address)) {
      setStaffError("Staff sit at vellum.press");
      return;
    }
    if (staffPassword.length < 8) {
      setStaffError("Eight characters at least.");
      return;
    }
    if (!liveAuthAvailable) {
      setStaffError("The desk needs a hosted backend.");
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
        <div className="flex min-h-36 flex-col justify-end bg-ink p-5 text-paper sm:p-8">
          <p className="type-kicker opacity-80">This sitting</p>
          <p className="mt-2 type-title">
            {mode === "up" ? "Create an account" : "Sign in"}
          </p>
          <p className="type-pitch mt-2.5 max-w-xl text-paper/70">
            An @name, an email, a password. No staff door for readers.
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
        />

        {showStaff ? (
          <>
            <div
              id="staff"
              className="flex min-h-36 flex-col justify-end bg-red p-5 text-paper sm:p-8"
            >
              <p className="type-kicker opacity-80">Staff</p>
              <p className="mt-2 type-title">The desk</p>
              <p className="mt-3 max-w-xl font-serif text-lg text-paper/80">
                A vellum.press email, then the shelf. Readers do not need this door.
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
                Staff accounts need a hosted backend. This Pages build keeps the desk closed.
              </p>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowStaff(true)}
            className="flex h-12 w-full items-center justify-center border-b border-ink font-sans text-xs uppercase tracking-chrome text-muted"
          >
            Staff desk
          </button>
        )}
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
          className="h-14 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl text-ink placeholder:text-muted focus-visible:outline-none"
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
          className="h-14 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl text-ink placeholder:text-muted focus-visible:outline-none"
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
