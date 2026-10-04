import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { isOffline } from "../net.ts";
import { getSupabase } from "../supabase.ts";
import { workFromArticleHtml, workFromPlainText } from "./html-text.ts";
import { PAGE_EMPTY, PAGE_FAIL, PAGE_TOO_LARGE, URL_BAD, URL_PRIVATE, URL_SCHEME } from "./messages.ts";
import { assertImportUrl } from "./url.ts";
import type { Work } from "../literature.ts";

type ImportPayload = {
  url?: string;
  html?: string;
  text?: string;
  contentType?: string;
  error?: string;
};

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function byline(value: string | null | undefined, host: string) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  const stripped = text.replace(/^by\s+/i, "").trim();
  return stripped || host || "Imported";
}

function articleFrom(html: string, pageUrl: string) {
  const { document } = parseHTML(html);
  try {
    if (!document.querySelector("base")) {
      const base = document.createElement("base");
      base.setAttribute("href", pageUrl);
      document.head?.appendChild(base);
    }
  } catch {
    /* linkedom documents still parse without a base */
  }
  try {
    return new Readability(document).parse();
  } catch {
    return null;
  }
}

const KNOWN = new Set([PAGE_FAIL, PAGE_EMPTY, PAGE_TOO_LARGE, URL_BAD, URL_SCHEME, URL_PRIVATE]);

async function functionMessage(error: { message?: string; context?: unknown } | null) {
  const context = error?.context;
  if (context && typeof context === "object" && "json" in context && typeof (context as Response).json === "function") {
    try {
      const body = (await (context as Response).clone().json()) as { error?: string };
      if (typeof body?.error === "string" && body.error.trim()) return body.error.trim();
    } catch {
      /* not json */
    }
  }
  return error?.message ?? "";
}

function throwForMessage(message: string): never {
  if (/too long|too large/i.test(message)) throw new Error(PAGE_TOO_LARGE);
  if (/empty|wall|nothing to read/i.test(message)) throw new Error(PAGE_EMPTY);
  if (message === URL_BAD || message === URL_SCHEME || message === URL_PRIVATE) throw new Error(message);
  throw new Error(PAGE_FAIL);
}

/**
 * Ask the import-url edge function for the page, then bind it on this phone.
 * supabase-js sends the publishable key as `apikey`. A signed-in session also
 * sends its JWT as Authorization, which is what verify_jwt checks. The
 * publishable key is not a JWT, so it is not placed in Authorization.
 */
export async function workFromLink(raw: string): Promise<Work> {
  if (isOffline()) throw new Error(PAGE_FAIL);
  const url = assertImportUrl(raw);
  let payload: ImportPayload | null = null;
  try {
    const invoked = await getSupabase().functions.invoke<ImportPayload>("import-url", {
      body: { url: url.toString() },
    });
    payload = invoked.data ?? null;
    if (!payload?.html && !payload?.text) {
      throwForMessage(payload?.error || (await functionMessage(invoked.error)));
    }
  } catch (err) {
    if (err instanceof Error && KNOWN.has(err.message)) throw err;
    throw new Error(PAGE_FAIL);
  }

  if (!payload) throw new Error(PAGE_FAIL);
  const finalUrl = payload.url || url.toString();
  const host = hostOf(finalUrl);
  if (payload.text && !payload.html) {
    return workFromPlainText({
      text: payload.text,
      title: host || "Imported",
      author: host || "Imported",
      source: finalUrl,
    });
  }

  const html = payload.html ?? "";
  const article = articleFrom(html, finalUrl);
  const content = article?.content?.trim() ? article.content : html;
  const title = article?.title?.replace(/\s+/g, " ").trim() || host || "Imported";
  try {
    return workFromArticleHtml({
      html: content,
      title,
      author: byline(article?.byline, host),
      source: finalUrl,
    });
  } catch (err) {
    if (err instanceof Error && err.message === PAGE_EMPTY) throw err;
    throw new Error(PAGE_EMPTY);
  }
}
