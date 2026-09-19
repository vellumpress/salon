/** User-facing product name. Repo / Pages path are `salon`. */
export const APP_NAME = "Salon";

/** GitHub Pages subdirectory (no trailing slash). */
export const APP_BASE_PATH = "/salon";

/**
 * True when this build can call same-origin API routes and server functions
 * (auth, clubs, RTC, curator, Gutenberg fetch). GitHub Pages is static, so
 * the default is off. Set `VITE_LIVE_BACKEND=true` on a hosted backend.
 */
export const liveBackendEnabled = import.meta.env.VITE_LIVE_BACKEND === "true";

/**
 * True when Better Auth `/api/auth` can actually run (hosted backend + auth
 * flag). Pages keeps both flags false so a fake Dev User is not a session.
 */
export const liveAuthAvailable =
  liveBackendEnabled && import.meta.env.VITE_AUTH_ENABLED !== "false";

/** Prefix a root-relative app path with the Vite / Pages base. */
export function withBase(path: string) {
  const base = String(import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}` || "/";
}

/** Absolute URL for share links (includes origin + Pages base). */
export function publicUrl(path: string) {
  if (typeof window === "undefined") return withBase(path);
  return `${window.location.origin}${withBase(path)}`;
}
