import { URL_BAD, URL_PRIVATE, URL_SCHEME } from "./messages.ts";

/**
 * http(s) only, and not a loopback or private address.
 * Hostnames that merely resolve to a private IP are not looked up here.
 */
export function assertImportUrl(raw: string): URL {
  const trimmed = raw.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(URL_BAD);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(URL_SCHEME);
  }
  if (url.username || url.password) {
    throw new Error(URL_PRIVATE);
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || isPrivateHost(host)) {
    throw new Error(URL_PRIVATE);
  }
  return url;
}

function isPrivateHost(host: string): boolean {
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal" ||
    host === "metadata.internal"
  ) {
    return true;
  }
  if (host.startsWith("::ffff:")) return isPrivateHost(host.slice("::ffff:".length));
  if (/^(0|10|127)\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (host.includes(":")) return isPrivateIpv6(host);
  if (/^\d+$/.test(host)) {
    const n = Number(host);
    if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) return true;
    return isPrivateOctets([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
  }
  const v4 = host.split(".");
  if (v4.length === 4 && v4.every((part) => /^\d{1,3}$/.test(part))) {
    const octets = v4.map((part) => Number(part));
    if (octets.every((n) => n >= 0 && n <= 255)) return isPrivateOctets(octets);
  }
  return false;
}

function isPrivateOctets(octets: number[]): boolean {
  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b !== undefined && b >= 64 && b <= 127) return true;
  if (a === 255 && octets.every((n) => n === 255)) return true;
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "::" || h === "::1") return true;
  if (h.startsWith("fe80:")) return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}
