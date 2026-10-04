import { useEffect, useState } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { forceChunkReload, isChunkLoadError, isOfflineNow, recoverFromChunkLoad } from "@/lib/chunk-reload";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const chunk = isChunkLoadError(error);
  const [mode, setMode] = useState<"refresh" | "reload" | "offline" | "error">(
    chunk ? "refresh" : "error",
  );

  useEffect(() => {
    if (!chunk) return;
    if (isOfflineNow()) {
      setMode("offline");
      return;
    }
    setMode(recoverFromChunkLoad() ? "refresh" : "reload");
  }, [chunk]);

  if (mode === "offline") {
    return (
      <main
        className="flex min-h-svh flex-col justify-end bg-paper p-8 text-ink"
        data-offline=""
        aria-live="polite"
      >
        <p className="type-kicker text-muted">Offline</p>
        <p className="mt-2 type-title">tbr is on this phone.</p>
        <button
          type="button"
          className="mt-6 inline-flex h-12 w-fit items-center justify-center bg-ink px-4 text-sm text-paper"
          onClick={() => location.reload()}
        >
          Retry
        </button>
      </main>
    );
  }

  if (mode === "refresh") {
    return (
      <main
        className={
          "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
          "bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
        }
        aria-live="polite"
      >
        <h1 className="text-lg font-semibold">Refreshing the shelf</h1>
        <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          This copy of the library is out of date. Loading the current one.
        </p>
      </main>
    );
  }

  return (
    <main
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
      }
    >
      <span className="text-red-500" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400">
        {error.message || "An unexpected error occurred. Try reloading the page."}
      </p>
      {mode === "reload" ? (
        <button
          type="button"
          className="mt-2 inline-flex h-12 items-center justify-center border border-zinc-900 px-5 text-sm font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
          onClick={() => forceChunkReload()}
        >
          Reload
        </button>
      ) : null}
    </main>
  );
}
