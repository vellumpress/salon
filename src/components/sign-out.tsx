import { useState } from "react";
import { useReaderSession } from "@/lib/use-reader-session";
import { cn } from "@/lib/utils";

export function SignOutMark({
  to = "/",
  className,
}: {
  to?: string;
  className?: string;
}) {
  const { signOut } = useReaderSession();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      aria-label="Sign out"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void signOut(to).catch(() => setBusy(false));
      }}
      className={cn(
        "inline-flex h-12 w-14 shrink-0 items-center justify-center bg-ink px-3 font-sans text-sm text-paper disabled:opacity-60 sm:w-auto sm:px-4",
        className,
      )}
    >
      {busy ? "Out…" : "Out"}
    </button>
  );
}
