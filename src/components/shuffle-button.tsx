import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { canNativeShare, shareOrCopy } from "@/lib/shuffle";
import { useVellum } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ShuffleButton({
  currentId,
  className,
}: {
  currentId?: string;
  className?: string;
}) {
  const endSitting = useVellum((s) => s.endSitting);

  return (
    <Link
      to="/shuffle"
      search={currentId ? { except: currentId } : {}}
      aria-label="Shuffle a story"
      className={cn(
        "inline-flex h-12 shrink-0 items-center justify-center bg-red px-4 font-sans text-sm text-paper",
        className,
      )}
      onClick={() => {
        if (currentId) endSitting(currentId);
      }}
    >
      Shuffle
    </Link>
  );
}

export function ShareLinkButton({ className }: { className?: string }) {
  const [status, setStatus] = useState<"idle" | "shared" | "copied">("idle");
  const canShare = canNativeShare();

  return (
    <button
      type="button"
      aria-label={canShare ? "Share sitting link" : "Copy sitting link"}
      className={cn(
        "inline-flex h-12 shrink-0 items-center justify-center bg-red px-4 font-sans text-sm text-paper",
        className,
      )}
      onClick={() => {
        void shareOrCopy({
          title: document.title || "Salon",
          text: "A sitting from Salon.",
          url: window.location.href,
        }).then((result) => {
          if (result !== "shared" && result !== "copied") return;
          setStatus(result);
          window.setTimeout(() => setStatus("idle"), 1400);
        });
      }}
    >
      {status === "shared" ? "Shared" : status === "copied" ? "Copied" : canShare ? "Share" : "Link"}
    </button>
  );
}