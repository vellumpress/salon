import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { parseSetCookieHeader } from "better-auth/cookies";
import { setCookie } from "@tanstack/react-start/server";
import { toStartCookieOptions, type StartCookieOptions } from "./start-cookie-options";

const LOG = "[start-cookies]";

/**
 * Write a cookie through TanStack Start without throwing when the helper is
 * missing (Nitro/Vercel server-fn context) or the request ALS is empty.
 *
 * Better Auth's stock `tanstackStartCookies` plugin does
 * `const { setCookie } = await import("@tanstack/react-start/server")`.
 * If that dynamic import resolves to `undefined`, the destructure throws:
 * `Cannot destructure property 'setCookie' of '(intermediate value)' as it is undefined.`
 * A static import plus a try/catch keeps guest server functions (create club)
 * alive even when a session cookie refresh tries to write.
 */
export function setStartCookie(
  name: string,
  value: string,
  options?: StartCookieOptions,
): boolean {
  try {
    if (typeof setCookie !== "function") return false;
    setCookie(name, value, options);
    return true;
  } catch (err) {
    console.error(`${LOG} setCookie failed`, err);
    return false;
  }
}

/**
 * Drop-in replacement for `tanstackStartCookies()` — same after-hook, last in
 * the plugin list — but never crashes the request if Start's cookie store is
 * unavailable.
 */
export function startCookies() {
  return {
    id: "tanstack-start-cookies",
    hooks: {
      after: [
        {
          matcher() {
            return true;
          },
          handler: createAuthMiddleware(async (ctx) => {
            const returned = ctx.context.responseHeaders;
            if ("_flag" in ctx && ctx._flag === "router") return;
            if (!(returned instanceof Headers)) return;
            const setCookies = returned.get("set-cookie");
            if (!setCookies) return;
            const parsed = parseSetCookieHeader(setCookies);
            parsed.forEach((entry, key) => {
              if (!key) return;
              setStartCookie(key, entry.value, toStartCookieOptions(entry));
            });
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
}
