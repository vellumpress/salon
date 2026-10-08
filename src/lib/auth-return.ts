/** Paths a signed-out invite may return to. No open redirects. */
const ALLOWED = [
  /^\/club\/invite\/[A-Za-z0-9_-]{10,24}$/,
  /^\/club\/[a-z0-9]{4,16}$/,
  /^\/together$/,
  /^\/sit\/[^/]+$/,
  /^\/read\/[^/]+$/,
  /^\/friends$/,
  /^\/friends\/[^/]+$/,
  /^\/shuffle$/,
];

export function safeAuthNext(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return undefined;
  if (raw.includes("\\") || raw.includes("://") || raw.includes("@")) return undefined;
  const path = raw.split(/[?#]/)[0] ?? "";
  if (!ALLOWED.some((re) => re.test(path))) return undefined;
  return raw.slice(0, 240);
}
