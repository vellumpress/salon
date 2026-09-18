import { parseHTML } from "linkedom";
import { splitIntoBreaths, workFromPage } from "./page-text";
import { isPdfMagic, looksLikePdf, nameFromUrl, workFromPdfBytes } from "./extract-pdf";

const PRIVATE_HOST =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|::1|\[::1\])/i;
const PRIVATE_172 = /^172\.(1[6-9]|2\d|3[0-1])\./;
const MAX_PAGE_BYTES = 1_800_000;
const MAX_PDF_BYTES = 12_000_000;

export function assertPublicUrl(raw: string) {
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
  if (host === "metadata.google.internal" || host === "metadata.internal") {
    throw new Error("That address cannot be read.");
  }
  return url;
}

function textOf(node: { textContent?: string | null } | null) {
  return (node?.textContent ?? "").replace(/\s+/g, " ").trim();
}

export async function extractPage(raw: string) {
  const url = assertPublicUrl(raw);
  const response = await fetch(url.toString(), {
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
    headers: {
      Accept: "text/html,application/pdf,text/plain;q=0.9,*/*;q=0.1",
      "User-Agent": "Vellum/1.0 (literary reader)",
    },
  });
  if (!response.ok) {
    throw new Error("This page would not come.");
  }
  const type = response.headers.get("content-type") ?? "";
  const buf = await response.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const pdfHint = looksLikePdf(url.pathname, type) || isPdfMagic(bytes);

  if (pdfHint) {
    if (buf.byteLength > MAX_PDF_BYTES) {
      throw new Error("This PDF is too large.");
    }
    return workFromPdfBytes(bytes, {
      url: url.toString(),
      title: nameFromUrl(url),
      author: url.hostname.replace(/^www\./, ""),
    });
  }

  if (buf.byteLength > MAX_PAGE_BYTES) {
    throw new Error("This page is too long.");
  }
  if (!/text\/(html|plain)|application\/xhtml|\+xml/i.test(type) && type.length > 0) {
    throw new Error("That is not a page of writing.");
  }
  const html = new TextDecoder("utf-8").decode(buf);

  if (/text\/plain/i.test(type)) {
    const breaths = splitIntoBreaths(html);
    if (breaths.length < 2) throw new Error("Nothing to read there.");
    return workFromPage({
      url: url.toString(),
      title: url.pathname.split("/").filter(Boolean).at(-1) ?? url.hostname,
      author: url.hostname.replace(/^www\./, ""),
      breaths,
    });
  }

  const { document } = parseHTML(html);
  for (const el of document.querySelectorAll("script,style,nav,footer,form,noscript,iframe,svg,aside")) {
    el.remove();
  }
  const title =
    textOf(document.querySelector("h1")) ||
    textOf(document.querySelector("title")) ||
    url.hostname.replace(/^www\./, "");
  const authorMeta =
    document.querySelector('meta[name="author"]')?.getAttribute("content")?.trim() ||
    document.querySelector('meta[property="article:author"]')?.getAttribute("content")?.trim() ||
    "";
  const root =
    document.querySelector("article") ||
    document.querySelector('[role="main"]') ||
    document.querySelector("main") ||
    document.body;
  const blocks = [...root.querySelectorAll("p,h2,h3,blockquote,li")]
    .map((node) => textOf(node))
    .filter((t) => t.length > 24);
  const breaths = splitIntoBreaths(blocks.join("\n\n"));
  if (breaths.length < 2) {
    throw new Error("Nothing to read there.");
  }
  return workFromPage({
    url: url.toString(),
    title,
    author: authorMeta || url.hostname.replace(/^www\./, ""),
    breaths,
  });
}
