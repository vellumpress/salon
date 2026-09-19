import { useState } from "react";
import {
  cardFileName,
  cardReadPath,
  downloadBlob,
  renderSalonCard,
  type SalonCardInput,
} from "@/lib/salon-card";
import { clipLine } from "@/lib/share-codec";
import { liveBackendEnabled, publicUrl } from "@/lib/site";
import { createSentenceShare } from "@/lib/sentence-share";
import { canNativeShare, copyText, shareOrCopy } from "@/lib/shuffle";
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
  const [state, setState] = useState<"idle" | "busy" | "shared" | "copied" | "saved">("idle");

  async function share() {
    if (state === "busy") return;
    setState("busy");
    let shareUrl = publicUrl(cardReadPath({ workId, at }));
    if (liveBackendEnabled) {
      try {
        const row = await createSentenceShare({
          data: {
            workId,
            breathIndex: Math.max(0, at ?? 0),
            sentenceText: clipLine(text, 400),
          },
        });
        shareUrl = publicUrl(`/s/${row.token}`);
      } catch {
        /* reader deep link still works on Pages */
      }
    }
    const snippet = clipLine(text, 140);
    const name = title || "Salon";
    let blob: Blob | null = null;
    try {
      blob = await renderSalonCard({ text, title, author, workId });
    } catch {
      blob = null;
    }
    const file =
      blob && typeof File !== "undefined"
        ? new File([blob], `${cardFileName(name)}.png`, { type: "image/png" })
        : null;
    let result: "shared" | "downloaded" | "copied" | "aborted" | "failed" = "failed";
    if (file && canNativeShare()) {
      const payload: ShareData = { title: name, text: snippet, url: shareUrl, files: [file] };
      const shareWithFiles =
        typeof navigator.canShare === "function" ? navigator.canShare(payload) : true;
      if (shareWithFiles) {
        try {
          await navigator.share(payload);
          result = "shared";
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") result = "aborted";
        }
      }
    }
    if (result === "failed" && blob) {
      downloadBlob(blob, `${cardFileName(name)}.png`);
      result = (await copyText(shareUrl)) ? "downloaded" : "failed";
    }
    if (result === "failed") {
      const copied = await shareOrCopy({ title: name, text: snippet, url: shareUrl });
      result = copied === "shared" || copied === "copied" ? copied : "failed";
    }
    if (result === "shared") setState("shared");
    else if (result === "copied") setState("copied");
    else if (result === "downloaded") setState("saved");
    else setState("idle");
    if (result === "shared" || result === "copied" || result === "downloaded") {
      window.setTimeout(() => setState("idle"), 1600);
    }
  }

  const label =
    state === "busy"
      ? "Making…"
      : state === "shared"
        ? "Shared"
        : state === "copied"
          ? "Copied"
          : state === "saved"
            ? "Saved"
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
