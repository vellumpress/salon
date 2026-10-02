// Fetch a public page for Import. No secret.
// GitHub Pages CI does not deploy this function.
//
// The browser calls it through supabase-js. The publishable key goes in
// `apikey`. A signed-in session also sends its JWT as Authorization, which
// is what verify_jwt checks. The publishable key is not a JWT.
//   supabase functions deploy import-url
//
// http/https only, no loopback or private addresses, 5MB cap, 15s timeout.
// Returns the HTML (or plain text). The phone runs Readability.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 5_000_000;
const TIMEOUT_MS = 15_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function isPrivateOctets(octets: number[]) {
  const a = octets[0] ?? 0;
  const b = octets[1] ?? 0;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 255 && octets.every((n) => n === 255)) return true;
  return false;
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
  if (host.includes(":")) {
    if (host === "::" || host === "::1" || host.startsWith("fe80:")) return true;
    if (host.startsWith("fc") || host.startsWith("fd")) return true;
    return false;
  }
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

function assertPublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(String(raw ?? "").trim());
  } catch {
    throw new Error("Need a full web address.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Need a web address.");
  }
  if (url.username || url.password) throw new Error("That address cannot be read.");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || isPrivateHost(host)) throw new Error("That address cannot be read.");
  return url;
}

async function readCapped(response: Response) {
  const claimed = Number(response.headers.get("content-length") || "0");
  if (Number.isFinite(claimed) && claimed > MAX_BYTES) {
    throw new Error("This page is too long to import.");
  }
  const reader = response.body?.getReader();
  if (!reader) {
    const buf = new Uint8Array(await response.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) throw new Error("This page is too long to import.");
    return buf;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const step = await reader.read();
    if (step.done) break;
    const value = step.value;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error("This page is too long to import.");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST a url." }, 405);
  try {
    const payload = (await req.json()) as { url?: string };
    let current = assertPublicUrl(String(payload.url ?? ""));
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    let response: Response | null = null;
    for (let hop = 0; hop < 5; hop += 1) {
      response = await fetch(current.toString(), {
        redirect: "manual",
        signal,
        headers: {
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
          "User-Agent": "tbr/1.0 (literary reader)",
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const loc = response.headers.get("location");
        if (!loc) return json({ error: "This page would not come." }, 422);
        current = assertPublicUrl(new URL(loc, current).toString());
        continue;
      }
      break;
    }
    if (!response || !response.ok) return json({ error: "This page would not come." }, 422);
    const type = response.headers.get("content-type") ?? "";
    if (/pdf/i.test(type) || /\.pdf(?:$|[?#])/i.test(current.pathname)) {
      return json({ error: "A PDF opens from this phone. Use Import a PDF." }, 422);
    }
    const buf = await readCapped(response);
    const raw = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const trimmed = raw.trim();
    if (trimmed.length < 40) return json({ error: "This page is empty or behind a wall." }, 422);
    const plain = /text\/plain/i.test(type) && !/html/i.test(type);
    if (plain) {
      return json({
        url: current.toString(),
        contentType: type || "text/plain",
        text: trimmed.slice(0, MAX_BYTES),
      });
    }
    return json({
      url: current.toString(),
      contentType: type || "text/html",
      html: raw.slice(0, MAX_BYTES),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "This page would not come.";
    if (/too long/i.test(message)) return json({ error: "This page is too long to import." }, 422);
    if (/cannot be read|web address/i.test(message)) return json({ error: message }, 400);
    if (/timeout|aborted/i.test(message)) return json({ error: "This page would not come." }, 422);
    return json({ error: "This page would not come." }, 422);
  }
});
