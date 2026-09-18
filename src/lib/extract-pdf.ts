import { extractText, getDocumentProxy, getMeta } from "unpdf";
import { splitSentences } from "./sentences";
import { workFromPage } from "./page-text";
import type { Work } from "./literature";

export const MAX_IMPORT_BYTES = 12_000_000;
const MAX_BREATHS = 8_000;

export function isPdfMagic(bytes: Uint8Array) {
  if (bytes.byteLength < 5) return false;
  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export function looksLikePdf(name: string, type = "") {
  if (/pdf/i.test(type)) return true;
  return /\.pdf(?:$|[?#])/i.test(name);
}

function titleFromName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? name;
  return base
    .replace(/\.pdf$/i, "")
    .replace(/[_+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMeta(value: unknown) {
  if (typeof value !== "string") return "";
  const next = value.replace(/\s+/g, " ").trim();
  if (!next || /^untitled$/i.test(next)) return "";
  return next.slice(0, 120);
}

function failMessage(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/password/i.test(msg)) return "This PDF is locked.";
  if (/invalid pdf|not a pdf/i.test(msg)) return "That is not a PDF.";
  return "This PDF would not open.";
}

export async function workFromPdfBytes(
  bytes: Uint8Array,
  meta: { title?: string; author?: string; url?: string } = {},
): Promise<Work> {
  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new Error("This PDF is too large.");
  }
  if (!isPdfMagic(bytes)) {
    throw new Error("That is not a PDF.");
  }

  try {
    const pdf = await getDocumentProxy(bytes);
    const info = await getMeta(pdf).catch(() => null);
    const extracted = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(extracted.text) ? extracted.text : [extracted.text];
    const raw = pages
      .map((page) => page.replace(/\u0000/g, " ").trim())
      .filter((page) => page.length > 0)
      .join("\n\n");
    const breaths = splitSentences(raw, MAX_BREATHS);
    if (breaths.length < 1) {
      throw new Error("This PDF has no text to sit with.");
    }
    const infoTitle = cleanMeta(info?.info?.Title);
    const infoAuthor = cleanMeta(info?.info?.Author);
    return workFromPage({
      url: meta.url ?? "",
      title: infoTitle || meta.title || "Imported",
      author: infoAuthor || meta.author || "Imported",
      breaths,
    });
  } catch (err) {
    if (err instanceof Error && /no text to sit|too large|not a PDF/i.test(err.message)) {
      throw err;
    }
    throw new Error(failMessage(err));
  }
}

export function nameFromUrl(url: URL) {
  const last = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
  return titleFromName(last) || url.hostname.replace(/^www\./, "");
}

export function nameFromFile(file: File) {
  return titleFromName(file.name) || "Imported";
}
