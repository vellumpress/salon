import { useEffect, useState, type FormEvent } from "react";
import { formatHandle, handleError, normalizeHandle } from "@/lib/social";
import { cn } from "@/lib/utils";
import type { ReaderAuthMode } from "@/lib/use-reader-session";

export function ReaderAuthForm({
  mode,
  onMode,
  defaultHandle = "",
  busy = false,
  error = "",
  onCreate,
  onSignIn,
}: {
  mode: ReaderAuthMode;
  onMode: (mode: ReaderAuthMode) => void;
  defaultHandle?: string;
  busy?: boolean;
  error?: string;
  onCreate: (input: { handle: string; email: string; password: string }) => void;
  onSignIn: (input: { email: string; password: string }) => void;
}) {
  const [handle, setHandle] = useState(defaultHandle);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (defaultHandle && !handle) setHandle(defaultHandle);
  }, [defaultHandle, handle]);
  const hint = handleError(handle || "ab");
  const shown = normalizeHandle(handle);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "up") {
      onCreate({ handle, email, password });
      return;
    }
    onSignIn({ email, password });
  }

  return (
    <form className="flex flex-col" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-px bg-ink">
        <button
          type="button"
          onClick={() => onMode("up")}
          className={cn(
            "flex h-14 items-center justify-center font-sans text-sm",
            mode === "up" ? "bg-yellow text-ink" : "bg-paper text-ink",
          )}
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => onMode("in")}
          className={cn(
            "flex h-14 items-center justify-center font-sans text-sm",
            mode === "in" ? "bg-ink text-paper" : "bg-paper text-ink",
          )}
        >
          Sign in
        </button>
      </div>

      {mode === "up" ? (
        <label className="flex items-stretch border-b border-ink">
          <span className="flex w-24 shrink-0 items-center px-4 type-kicker text-muted">
            @name
          </span>
          <span className="flex min-w-0 flex-1 items-center">
            <span className="font-serif text-xl text-muted">@</span>
            <input
              name="handle"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder="mina"
              className="h-14 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl text-ink placeholder:text-muted focus-visible:outline-none"
            />
          </span>
        </label>
      ) : null}

      <label className="flex items-stretch border-b border-ink">
        <span className="flex w-24 shrink-0 items-center px-4 type-kicker text-muted">
          Email
        </span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@vellum.press"
          className="h-14 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl text-ink placeholder:text-muted focus-visible:outline-none"
        />
      </label>
      <label className="flex items-stretch border-b border-ink">
        <span className="flex w-24 shrink-0 items-center px-4 type-kicker text-muted">
          Password
        </span>
        <input
          type="password"
          name="password"
          autoComplete={mode === "up" ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Eight at least"
          className="h-14 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl text-ink placeholder:text-muted focus-visible:outline-none"
        />
      </label>

      {mode === "up" && hint && handle ? (
        <p className="border-b border-ink px-4 py-3 font-sans text-sm text-ink/70">
          {hint}
        </p>
      ) : mode === "up" && shown ? (
        <p className="border-b border-ink px-4 py-3 font-sans text-sm text-ink/70">
          Friends will find you as {formatHandle(shown)}.
        </p>
      ) : null}

      {error ? (
        <p className="border-b border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="flex h-16 items-center justify-center bg-ink font-sans text-sm text-paper disabled:opacity-60"
      >
        {busy
          ? mode === "up"
            ? "Opening…"
            : "In…"
          : mode === "up"
            ? "Create account"
            : "Sign in"}
      </button>
    </form>
  );
}
