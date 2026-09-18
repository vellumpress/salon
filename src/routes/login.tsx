import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { claimStaff } from "@/lib/account";
import {
  GROK_PROVIDERS,
  authClient,
  authEnabled,
  signIn,
} from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { withBase } from "@/lib/site";
import { cn } from "@/lib/utils";

type Door = "reader" | "staff";

const STAFF_DOMAIN = "@vellum.press";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { door?: Door } => {
    if (search.door === "staff") return { door: "staff" };
    if (search.door === "reader") return { door: "reader" };
    return {};
  },
  pendingMs: 0,
  pendingMinMs: 0,
  pendingComponent: LoginPending,
  component: LoginPage,
});

function isVellumPressEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return false;
  return trimmed.slice(at) === STAFF_DOMAIN;
}

function LoginPending() {
  return (
    <div className="frame-screen bg-paper text-ink">
      <LoginHeader />
      <div className="flex min-h-36 flex-col justify-end bg-ink p-5 text-paper sm:p-8">
        <p className="font-sans text-xs tracking-wide opacity-80">This sitting</p>
        <p className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          Sign in to sit
        </p>
      </div>
    </div>
  );
}

function LoginHeader() {
  return (
    <header className="flex shrink-0 items-stretch border-b border-ink">
      <Link
        to="/"
        preload="intent"
        className="inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 font-sans text-sm text-paper [touch-action:manipulation]"
      >
        Home
      </Link>
      <h1 className="flex min-w-0 flex-1 items-center px-4 font-display text-xl font-medium tracking-tight">
        Salon
      </h1>
    </header>
  );
}

function LoginPage() {
  const { door } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "x" | "in" | "up" | "staff-in" | "staff-up" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [staffError, setStaffError] = useState("");

  useEffect(() => {
    if (door !== "staff") return;
    const jump = () => document.getElementById("staff")?.scrollIntoView({ block: "start" });
    jump();
    const id = window.requestAnimationFrame(jump);
    return () => window.cancelAnimationFrame(id);
  }, [door]);

  if (!isPending && user && !busy) {
    return <Navigate to={door === "staff" ? "/desk" : "/profile"} />;
  }

  async function withReaderEmail(mode: "in" | "up") {
    const address = email.trim().toLowerCase();
    if (!address || !address.includes("@")) {
      setError("A real email, please.");
      return;
    }
    if (password.length < 8) {
      setError("Eight characters at least.");
      return;
    }
    setBusy(mode);
    setError("");
    try {
      await runEmail(mode, address, password, address.split("@")[0] || "Reader");
      window.location.assign(withBase("/profile"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setBusy(null);
    }
  }

  async function withStaffEmail(mode: "staff-in" | "staff-up") {
    const address = staffEmail.trim().toLowerCase();
    if (!isVellumPressEmail(address)) {
      setStaffError("Staff sit at vellum.press");
      return;
    }
    if (staffPassword.length < 8) {
      setStaffError("Eight characters at least.");
      return;
    }
    setBusy(mode);
    setStaffError("");
    try {
      await runEmail(
        mode === "staff-up" ? "up" : "in",
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
          <p className="font-sans text-xs tracking-wide opacity-80">This sitting</p>
          <p className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Sign in to sit
          </p>
        </div>

        {authEnabled ? (
          <div className="flex flex-col gap-px bg-ink">
            {GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                disabled={Boolean(busy)}
                onClick={() => {
                  setBusy(provider.providerId === "grok-google" ? "google" : "x");
                  setError("");
                  void signIn(provider.providerId, {
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
        ) : (
          <p className="border-b border-ink px-5 py-6 font-serif text-lg text-ink/70">
            Accounts need a hosted backend. This Pages build is the static reader —
            progress and favorites stay on this phone.
          </p>
        )}

        {authEnabled ? (
          <EmailForm
            email={email}
            password={password}
            emailName="email"
            passwordName="password"
            emailPlaceholder="you@vellum"
            error={error}
            busyIn={busy === "in"}
            busyUp={busy === "up"}
            disabled={Boolean(busy)}
            onEmail={setEmail}
            onPassword={setPassword}
            onSignIn={() => void withReaderEmail("in")}
            onCreate={() => void withReaderEmail("up")}
          />
        ) : null}

        <div
          id="staff"
          className="flex min-h-36 flex-col justify-end bg-red p-5 text-paper sm:p-8"
        >
          <p className="font-sans text-xs tracking-wide opacity-80">Staff</p>
          <p className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            The desk
          </p>
          <p className="mt-3 max-w-xl font-serif text-lg text-paper/80">
            A vellum.press email, then the shelf.
          </p>
        </div>

        {authEnabled ? (
          <EmailForm
            email={staffEmail}
            password={staffPassword}
            emailName="staff-email"
            passwordName="staff-password"
            emailPlaceholder="you@vellum.press"
            error={staffError}
            busyIn={busy === "staff-in"}
            busyUp={busy === "staff-up"}
            disabled={Boolean(busy)}
            onEmail={setStaffEmail}
            onPassword={setStaffPassword}
            onSignIn={() => void withStaffEmail("staff-in")}
            onCreate={() => void withStaffEmail("staff-up")}
          />
        ) : null}
      </div>
    </div>
  );
}

function EmailForm({
  email,
  password,
  emailName,
  passwordName,
  emailPlaceholder,
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
  emailName: string;
  passwordName: string;
  emailPlaceholder: string;
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
        <span className="flex w-24 shrink-0 items-center px-4 font-sans text-xs tracking-wide text-muted">
          Email
        </span>
        <input
          type="email"
          name={emailName}
          autoComplete="email"
          value={email}
          onChange={(event) => onEmail(event.target.value)}
          className="h-14 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl text-ink placeholder:text-muted focus-visible:outline-none"
          placeholder={emailPlaceholder}
        />
      </label>
      <label className="flex items-stretch border-b border-ink">
        <span className="flex w-24 shrink-0 items-center px-4 font-sans text-xs tracking-wide text-muted">
          Password
        </span>
        <input
          type="password"
          name={passwordName}
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
