/** User-facing product name. Always lowercase. Repo / Pages path stay `salon`. */
export const APP_NAME = "tbr";

/** Meta, Open Graph, and Twitter description. */
export const APP_DESCRIPTION =
  "tbr. Timed reading rituals. Public-domain sitting, on this phone.";

/** GitHub Pages subdirectory (no trailing slash). */
export const APP_BASE_PATH = "/salon";

function viteEnv(): { BASE_URL?: string; VITE_LIVE_BACKEND?: string; VITE_AUTH_ENABLED?: string } {
  try {
    return ((import.meta as { env?: Record<string, string | boolean | undefined> }).env ??
      {}) as {
      BASE_URL?: string;
      VITE_LIVE_BACKEND?: string;
      VITE_AUTH_ENABLED?: string;
    };
  } catch {
    return {};
  }
}

/**
 * True when this build can call same-origin API routes and server functions
 * (auth, clubs, RTC, curator, Gutenberg fetch). GitHub Pages is static, so
 * the default is off. Set `VITE_LIVE_BACKEND=true` on a hosted backend.
 */
export const liveBackendEnabled = viteEnv().VITE_LIVE_BACKEND === "true";

/**
 * True when Better Auth `/api/auth` can actually run (hosted backend + auth
 * flag). Pages keeps both flags false so a fake Dev User is not a session.
 */
export const liveAuthAvailable =
  liveBackendEnabled && viteEnv().VITE_AUTH_ENABLED !== "false";

function viteBase(): string {
  const value = viteEnv().BASE_URL;
  if (typeof value === "string" && value.length > 0) return value;
  return APP_BASE_PATH;
}

/** Prefix a root-relative app path with the Vite / Pages base. */
export function withBase(path: string) {
  const base = viteBase().replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (base && (suffix === base || suffix.startsWith(`${base}/`))) return suffix;
  return `${base}${suffix}` || "/";
}

/** Absolute URL for share links (includes origin + Pages base). */
export function publicUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const prefixed = withBase(path);
  if (typeof window === "undefined") return prefixed;
  return `${window.location.origin}${prefixed}`;
}

export function salonShareTitle(title: string) {
  const name = title.trim() || APP_NAME;
  if (name === APP_NAME || name.includes(APP_NAME)) return name;
  return `${name} · ${APP_NAME}`;
}

export function salonShareText(line: string) {
  const snippet = line.trim();
  const brand = `A sitting from ${APP_NAME}.`;
  if (!snippet) return brand;
  if (snippet.includes(APP_NAME)) return snippet;
  return `${snippet}\n\n${brand}`;
}
