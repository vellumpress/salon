import { splitIntoBreaths, workFromPage } from "./page-text";
import { getSupabase } from "./supabase";

const PRIVATE_HOST =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|::1|\[::1\])/i;
const PRIVATE_172 = /^172\.(1[6-9]|2\d|3[0-1])\./;

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
  const host = url.hostname;
  if (PRIVATE_HOST.test(host) || PRIVATE_172.test(host) || host.endsWith(".local")) {
    throw new Error("That address cannot be read.");
  }
  return url;
}

const FUNCTION = "import-page";

type ImportPayload = {
  url?: string;
  title?: string;
  author?: string;
  text?: string;
  error?: string;
};

function inputUrl(input: { url: string } | { data: { url: string } }) {
  if ("data" in input) return input.data.url;
  return input.url;
}

async function tryDirect(raw: string) {
  let url: URL;
  try {
    url = assertPublicUrl(raw);
  } catch (err) {
    throw err instanceof Error ? err : new Error("Need a full web address.");
  }
  try {
    const response = await fetch(url.toString(), {
      mode: "cors",
      redirect: "follow",
      headers: { Accept: "text/plain,text/html;q=0.9,*/*;q=0.1" },
    });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (/pdf/i.test(type)) {
      throw new Error("A PDF still opens from this phone. Paste the file instead of the link.");
    }
    const text = await response.text();
    if (text.length < 80) return null;
    return { url: url.toString(), title: url.hostname.replace(/^www\./, ""), author: url.hostname, text };
  } catch (err) {
    if (err instanceof Error && /PDF/.test(err.message)) throw err;
    return null;
  }
}

/**
 * Read a public page in the browser.
 * Gutenberg does not send CORS headers, so a blocked fetch falls through to
 * the `import-page` Supabase function (`supabase/functions/import-page`).
 */
export async function fetchPage(input: { url: string } | { data: { url: string } }) {
  const raw = inputUrl(input).trim();
  const direct = await tryDirect(raw);
  const page = direct ?? (await invokeImport(raw));
  const breaths = splitIntoBreaths(page.text);
  if (breaths.length < 2) throw new Error("Nothing to read there.");
  return workFromPage({
    url: page.url,
    title: page.title,
    author: page.author,
    breaths,
  });
}

async function invokeImport(raw: string): Promise<{ url: string; title: string; author: string; text: string }> {
  const { data, error } = await getSupabase().functions.invoke<ImportPayload>(FUNCTION, {
    body: { url: raw },
  });
  if (data?.text && data.url) {
    return {
      url: data.url,
      title: data.title?.trim() || "Untitled",
      author: data.author?.trim() || "",
      text: data.text,
    };
  }
  const detail = data?.error || error?.message || "";
  if (/not found|404|failed to send a request/i.test(detail) || !detail) {
    throw new Error(
      "This page cannot be read from the browser yet. Deploy supabase/functions/import-page. A PDF still opens on this phone.",
    );
  }
  throw new Error(detail);
}
