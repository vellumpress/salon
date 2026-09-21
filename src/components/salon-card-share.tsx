import { useState } from "react";
import { cardReadUrl, type SalonCardInput } from "@/lib/salon-card";
import { clipLine } from "@/lib/share-codec";
import { liveBackendEnabled, salonShareText, salonShareTitle } from "@/lib/site";
import { createSentenceShare } from "@/lib/sentence-share";
import { shareOrCopy } from "@/lib/shuffle";
import { cn } from "@/lib/utils";

export function SalonCardShare({
  workId,
  at,
  text,
  title,
  className,
  compact = false,
}: SalonCardInput & {
  workId: string;
  at?: number;
  className?: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<"idle" | "busy" | "shared" | "copied">("idle");

  async function share() {
    if (state === "busy") return;
    setState("busy");
    const shareUrl = cardReadUrl({ workId, at });
    const snippet = clipLine(text, 160);
    const name = title || "Salon";
    const result = await shareOrCopy({
      title: salonShareTitle(name),
      text: salonShareText(snippet),
      url: shareUrl,
    });
    if (liveBackendEnabled) {
      void createSentenceShare({
        data: {
          workId,
          breathIndex: Math.max(0, at ?? 0),
          sentenceText: clipLine(text, 400),
        },
      }).catch(() => undefined);
    }
    if (result === "shared") setState("shared");
    else if (result === "copied") setState("copied");
    else setState("idle");
    if (result === "shared" || result === "copied") {
      window.setTimeout(() => setState("idle"), 1600);
    }
  }

  const label =
    state === "busy"
      ? "Sharing…"
      : state === "shared"
        ? "Shared"
        : state === "copied"
          ? "Copied"
          : compact
            ? "Card"
            : "Salon card";

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
