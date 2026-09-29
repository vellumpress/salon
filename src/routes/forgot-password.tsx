import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Wordmark } from "@/components/wordmark";
import { emailError, normalizeEmail } from "@/lib/reader-account";
import { resetEmailNotice } from "@/lib/remote-auth";
import { withBase } from "@/lib/site";
import { getSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [rate, setRate] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const fail = emailError(email);
    if (fail) {
      setNote("");
      setRate(fail);
      return;
    }
    setBusy(true);
    setNote("");
    setRate("");
    const address = normalizeEmail(email);
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(address, {
        redirectTo: window.location.origin + withBase("/reset-password"),
      });
      const notice = resetEmailNotice(error);
      if (notice.tone === "rate") setRate(notice.text);
      else setNote(notice.text);
    } catch (err) {
      const notice = resetEmailNotice({
        message: err instanceof Error ? err.message : "",
      });
      if (notice.tone === "rate") setRate(notice.text);
      else setNote(notice.text);
    } finally {
      setBusy(false);
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
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-36 flex-col justify-end bg-ink p-5 text-paper sm:p-8">
          <p className="type-kicker opacity-80">This sitting</p>
          <p className="mt-2 type-title">Forgot password</p>
          <p className="type-pitch mt-2.5 max-w-xl text-paper/70">
            The email on the account. A reset link comes back to this phone.
          </p>
        </div>
        <form className="flex flex-col" onSubmit={(event) => void submit(event)}>
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
              placeholder="you@email.com"
              className="h-14 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl text-ink placeholder:text-muted focus-visible:outline-none"
            />
          </label>
          {rate ? (
            <p className="border-b border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">{rate}</p>
          ) : null}
          {note ? (
            <p className="border-b border-ink px-4 py-3 font-serif text-lg text-ink">{note}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="flex h-16 items-center justify-center bg-ink font-sans text-sm text-paper disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      </div>
    </div>
  );
}
