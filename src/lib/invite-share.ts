export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      field.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** True when the Web Share API can be invoked. */
export function canNativeShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export type ShareOrCopyResult = "shared" | "copied" | "aborted" | "failed";

export function mailtoShareHref(payload: { title: string; text: string; url: string }) {
  const subject = encodeURIComponent(payload.title);
  const body = encodeURIComponent([payload.text, payload.url].filter(Boolean).join("\n\n"));
  return `mailto:?subject=${subject}&body=${body}`;
}

function openMailtoShare(payload: { title: string; text: string; url: string }) {
  if (typeof document === "undefined") return false;
  try {
    const link = document.createElement("a");
    link.href = mailtoShareHref(payload);
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch {
    return false;
  }
}

/**
 * Prefer the OS share sheet (Messages, WhatsApp, Instagram, …).
 * If share is missing or fails (except a user cancel), copy the URL.
 * If the clipboard is blocked, open a mailto: draft so the button is never dead.
 */
export async function shareOrCopy(payload: {
  title: string;
  text: string;
  url: string;
}): Promise<ShareOrCopyResult> {
  if (canNativeShare()) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "aborted";
    }
  }
  const ok = await copyText(payload.url);
  if (ok) return "copied";
  return openMailtoShare(payload) ? "copied" : "failed";
}
