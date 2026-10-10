import { useState } from "react";
import type { SalonCardInput } from "@/lib/salon-card";
import { shareQuoteCard, type QuoteShareResult } from "@/lib/quote-share";
import { APP_NAME, liveBackendEnabled } from "@/lib/site";
import { createSentenceShare } from "@/lib/sentence-share";
import { clipLine } from "@/lib/share-codec";
import { cn } from "@/lib/utils";

export function SalonCardShare({
  workId,
  at,
  text,
  title,
  author,
  className,
  compact = false,
}: SalonCardInput & {
  workId: string;
  at?: number;
  className?: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<"idle" | "busy" | QuoteShareResult>("idle");

  async function share() {
    if (state === "busy") return;
    setState("busy");
    const result = await shareQuoteCard({ workId, at, text, title, author });
    if (liveBackendEnabled) {
      void createSentenceShare({
        data: {
          workId,
          breathIndex: Math.max(0, at ?? 0),
          sentenceText: clipLine(text, 400),
        },
      }).catch(() => undefined);
    }
    if (result === "aborted" || result === "failed") setState("idle");
    else setState(result);
    if (result === "shared" || result === "copied" || result === "downloaded") {
      window.setTimeout(() => setState("idle"), 1600);
    }
  }

  const label =
    state === "busy"
      ? "Drawing…"
      : state === "shared"
        ? "Shared"
        : state === "copied"
          ? "Copied"
          : state === "downloaded"
            ? "Saved"
            : compact
              ? "Card"
              : `${APP_NAME} card`;

  return (
    <button
      type="button"
      onClick={() => void share()}
      className={cn(
        "inline-flex items-center justify-center font-sans text-sm",
        compact ? "h-12 px-4" : "h-14 px-5",
        className,
      )}
    >
      {label}
    </button>
  );
}
