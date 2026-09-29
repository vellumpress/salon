// Fetch a public page for Import. No secret. Deploy with:
//   supabase functions deploy import-page
// Browser calls use the publishable key. Gutenberg does not send CORS headers,
// so the Pages client cannot fetch those URLs itself.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 1_800_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function assertPublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Need a full web address.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Need a web address.");
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    throw new Error("That address cannot be read.");
  }
  return url;
}

function titleFrom(html: string, url: URL) {
  const titled = html.match(/<title[^>]*>([^<]{1,180})<\/title>/i);
  const text = titled?.[1]?.replace(/\s+/g, " ").trim();
  if (text) return text;
  return url.pathname.split("/").filter(Boolean).at(-1) || url.hostname;
}

function textFrom(html: string, contentType: string) {
  if (/text\/plain/i.test(contentType)) return html;
  const cut = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');
  return cut.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST a url." }, 405);
  try {
    const payload = (await req.json()) as { url?: string };
    const url = assertPublicUrl(String(payload.url ?? ""));
    const response = await fetch(url.toString(), {
      redirect: "follow",
      headers: {
        Accept: "text/html,text/plain;q=0.9,*/*;q=0.1",
        "User-Agent": "tbr/1.0 (literary reader)",
      },
    });
    if (!response.ok) return json({ error: "This page would not come." }, 422);
    const type = response.headers.get("content-type") ?? "";
    if (/pdf/i.test(type) || /\.pdf(?:$|[?#])/i.test(url.pathname)) {
      return json({ error: "A PDF still opens from this phone. Paste the file instead of the link." }, 422);
    }
    const buf = await response.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return json({ error: "This page is too long." }, 422);
    const raw = new TextDecoder("utf-8").decode(buf);
    const text = textFrom(raw, type);
    if (text.length < 80) return json({ error: "Nothing to read there." }, 422);
    return json({
      url: url.toString(),
      title: titleFrom(raw, url).slice(0, 180),
      author: url.hostname.replace(/^www\./, ""),
      text: text.slice(0, 900_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "This page would not come.";
    return json({ error: message }, 400);
  }
});
