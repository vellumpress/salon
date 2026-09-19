/** Compact URL-safe payloads for Pages deep links (no server). */

const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{8,2400}$/;

export function asShareToken(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const token = value.trim();
  if (!SHARE_TOKEN_RE.test(token)) return undefined;
  return token;
}

export function encodeShare(payload: unknown): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeShare<T>(token: string): T | null {
  const clean = asShareToken(token);
  if (!clean) return null;
  try {
    let b64 = clean.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function clipLine(text: string, max = 280): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function makeShortId(prefix = ""): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let code = prefix;
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code.slice(0, 12);
}
