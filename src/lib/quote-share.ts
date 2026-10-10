import { cardFileName, downloadBlob, renderSalonCard } from "./salon-card.ts";
import { clipLine, decodeShare, encodeShare } from "./share-codec.ts";
import { shareOrCopy, type ShareOrCopyResult } from "./invite-share.ts";
import { APP_BASE_PATH, publicUrl, salonShareText, salonShareTitle } from "./site.ts";
import { SUPABASE_URL } from "./supabase.ts";

/** Pages cannot mint per-link HTML. This function returns it once deployed. */
export const SHARE_CARD_FUNCTION = `${SUPABASE_URL}/functions/v1/share-card`;

export type QuoteCard = {
  v: 1;
  k: "line";
  w: string;
  i: number;
  t: string;
  n: string;
  a: string;
};

export type QuoteShareResult = ShareOrCopyResult | "downloaded";

function unfurlOverride(): string {
  try {
    const env = (import.meta as { env?: Record<string, string | undefined> }).env;
    const value = env?.VITE_SHARE_UNFURL_URL;
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}

export function encodeQuoteCard(input: {
  workId: string;
  at?: number;
  text: string;
  title: string;
  author: string;
}): string {
  const card: QuoteCard = {
    v: 1,
    k: "line",
    w: input.workId,
    i: Math.max(0, Math.floor(input.at ?? 0)),
    t: clipLine(input.text, 180),
    n: clipLine(input.title, 80),
    a: clipLine(input.author, 80),
  };
  return encodeShare(card);
}

export function decodeQuoteCard(token: string): QuoteCard | null {
  const card = decodeShare<QuoteCard>(token);
  if (!card || card.v !== 1 || card.k !== "line") return null;
  if (!card.w || !card.t) return null;
  return {
    v: 1,
    k: "line",
    w: String(card.w).slice(0, 80),
    i: Math.max(0, Math.floor(Number(card.i) || 0)),
    t: clipLine(String(card.t), 220),
    n: clipLine(String(card.n ?? ""), 80),
    a: clipLine(String(card.a ?? ""), 80),
  };
}

export function quoteReadPath(card: Pick<QuoteCard, "w" | "i">) {
  return `/read/${encodeURIComponent(card.w)}?at=${card.i}`;
}

/** Same-origin landing. Works on Pages because the sentence is inside the token. */
export function quoteLandingPath(token: string) {
  return `/s/${encodeURIComponent(token)}`;
}

function localPreviewHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
}

/**
 * Link crawlers fetch. On a local server this is `/og/<token>`, which returns
 * the sentence in the HTML. On Pages it is the Supabase share-card function.
 */
export function quoteShareUrl(token: string): string {
  const override = unfurlOverride();
  if (override) {
    const base = override.replace(/\/$/, "");
    return `${base}${base.includes("?") ? "&" : "?"}t=${encodeURIComponent(token)}`;
  }
  if (typeof window !== "undefined" && localPreviewHost(window.location.hostname)) {
    return publicUrl(`/og/${encodeURIComponent(token)}`);
  }
  return `${SHARE_CARD_FUNCTION}?t=${encodeURIComponent(token)}`;
}

export function quoteImageUrl(token: string): string {
  const page = quoteShareUrl(token);
  if (page.includes("/functions/v1/share-card")) {
    return `${page}${page.includes("?") ? "&" : "?"}img=1`;
  }
  return page.replace(/\/?$/, "") + ".png";
}

function canShareFiles(files: File[]) {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files })
  );
}

/** Image file via the share sheet, or a download plus the unfurl link. */
export async function shareQuoteCard(input: {
  workId: string;
  at?: number;
  text: string;
  title: string;
  author: string;
}): Promise<QuoteShareResult> {
  const token = encodeQuoteCard(input);
  const url = quoteShareUrl(token);
  const title = salonShareTitle(input.title || "A sitting");
  const text = salonShareText(clipLine(input.text, 160));
  let file: File | null = null;
  try {
    const blob = await renderSalonCard({
      text: input.text,
      title: input.title,
      author: input.author,
      workId: input.workId,
    });
    file = new File([blob], `${cardFileName(input.title)}.png`, { type: "image/png" });
  } catch {
    file = null;
  }

  if (file && canShareFiles([file])) {
    try {
      await navigator.share({ files: [file], title, text, url });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "aborted";
    }
  }

  if (file) downloadBlob(file, file.name);
  const linked = await shareOrCopy({ title, text, url });
  if (file && linked !== "shared") return "downloaded";
  return linked;
}

export function quoteOpenPath(card: QuoteCard) {
  return `${APP_BASE_PATH}${quoteReadPath(card)}`.replace(/\/{2,}/g, "/");
}
