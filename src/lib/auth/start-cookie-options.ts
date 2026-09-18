/**
 * Map Better Auth's parsed Set-Cookie entries onto TanStack Start's setCookie
 * options. Kept free of server imports so tests can run in plain Node.
 */
export type ParsedSetCookie = {
  value: string;
  path?: string;
  domain?: string;
  secure?: boolean;
  httponly?: boolean;
  samesite?: string;
  "max-age"?: number | string;
};

export type StartCookieOptions = {
  path: string;
  domain?: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none";
  maxAge?: number;
};

export function toStartCookieOptions(
  cookie: ParsedSetCookie & Record<string, unknown>,
): StartCookieOptions {
  const sameSiteRaw = cookie.samesite?.toLowerCase();
  const sameSite =
    sameSiteRaw === "strict" || sameSiteRaw === "none" ? sameSiteRaw : "lax";
  const maxAgeRaw = cookie["max-age"];
  const maxAge = typeof maxAgeRaw === "number" ? maxAgeRaw : Number(maxAgeRaw);
  return {
    path: cookie.path ?? "/",
    domain: cookie.domain,
    secure: cookie.secure ?? true,
    httpOnly: cookie.httponly ?? true,
    sameSite,
    maxAge: Number.isFinite(maxAge) ? maxAge : undefined,
  };
}
