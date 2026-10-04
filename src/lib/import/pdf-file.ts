import { installReadableStreamAsyncIterator } from "./readable-stream-async-iterator.js";
import { getDocument, GlobalWorkerOptions, PasswordException, PDFWorker, shadow } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import type { Work } from "../literature.ts";
import { PDF_LOCKED, PDF_MAX_BYTES, PDF_NOT, PDF_TOO_LARGE, SCANNED_PDF } from "./messages.ts";
import { isKnownPdfMessage, isWorkerStartupError, pdfFail } from "./pdf-error.ts";
import { isTextContentTypeError, loadPageText } from "./pdf-page-text.ts";
import { workFromPdfPages, type PdfOutlineHeading, type PdfTextLine, type PdfTextPage } from "./pdf-text.ts";
import { installPromiseWithResolvers } from "./promise-with-resolvers.ts";

const PAGE_CAP = 500;

type TextItemLike = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  fontName?: string;
  hasEOL?: boolean;
};

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
  return next.slice(0, 180);
}

function isPdfMagic(bytes: Uint8Array) {
  return (
    bytes.byteLength >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

let workerSet = false;

function ensureWorker() {
  if (workerSet) return;
  // Vite emits /salon/assets/pdf.worker.min-<hash>.js, polyfill prepended.
  // The hash changes when the worker bytes change, so a cached copy cannot
  // outlive the build that produced it.
  GlobalWorkerOptions.workerSrc = workerUrl;
  workerSet = true;
}

function isLocked(err: unknown) {
  return err instanceof PasswordException || (err instanceof Error && /password/i.test(err.message));
}

function fail(err: unknown): never {
  console.error(err);
  throw pdfFail(err);
}

/**
 * pdf.js tries its own fake worker by importing workerSrc. If that import
 * already failed, the rejection is cached. Publishing the bundled worker on
 * globalThis.pdfjsWorker, and replacing that cache, runs the next open on
 * the main thread.
 */
async function useMainThreadWorker() {
  installReadableStreamAsyncIterator();
  installPromiseWithResolvers();
  const mod = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
  const handler = mod.WorkerMessageHandler;
  const scope = globalThis as typeof globalThis & {
    pdfjsWorker?: { WorkerMessageHandler: typeof handler };
  };
  scope.pdfjsWorker = { WorkerMessageHandler: handler };
  try {
    shadow(PDFWorker, "_setupFakeWorkerGlobal", Promise.resolve(handler));
  } catch {
    /* The getter still prefers globalThis.pdfjsWorker when it has not run. */
  }
}

function italicFace(family: string, fontName: string, font: { italic?: boolean; name?: string } | null) {
  if (font?.italic) return true;
  const name = `${family} ${fontName} ${font?.name ?? ""}`;
  return /italic|oblique/i.test(name);
}

async function pageLines(page: PDFPageProxy, mainThread: boolean): Promise<PdfTextLine[]> {
  const content = await loadPageText(page, mainThread);
  const styles = content.styles ?? {};
  const italicCache = new Map<string, boolean>();
  const buckets = new Map<number, TextItemLike[]>();

  for (const raw of content.items) {
    const item = raw as TextItemLike;
    if (!item || typeof item.str !== "string") continue;
    const transform = item.transform ?? [];
    const y = Math.round((Number(transform[5]) || 0) / 2) * 2;
    const list = buckets.get(y);
    if (list) list.push(item);
    else buckets.set(y, [item]);
  }

  const ys = [...buckets.keys()].sort((a, b) => b - a);
  const lines: PdfTextLine[] = [];
  for (const y of ys) {
    const items = (buckets.get(y) ?? []).slice().sort((a, b) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0));
    let text = "";
    let italicRun = false;
    let lastEnd = 0;
    let size = 0;
    let anyItalic = false;
    for (const item of items) {
      const chunk = item.str ?? "";
      if (!chunk) continue;
      const transform = item.transform ?? [];
      const fontSize = Math.hypot(Number(transform[2]) || 0, Number(transform[3]) || 0) || Number(item.height) || 0;
      if (fontSize > size) size = fontSize;
      const x = Number(transform[4]) || 0;
      const fontName = item.fontName ?? "";
      let italic = italicCache.get(fontName);
      if (italic === undefined) {
        let font: { italic?: boolean; name?: string } | null = null;
        try {
          const loaded = await page.commonObjs?.get(fontName);
          if (loaded && typeof loaded === "object") font = loaded as { italic?: boolean; name?: string };
        } catch {
          font = null;
        }
        italic = italicFace(styles[fontName]?.fontFamily ?? "", fontName, font);
        italicCache.set(fontName, italic);
      }
      if (text && x > lastEnd + Math.max(1.5, fontSize * 0.18)) {
        if (italicRun) {
          text += "_";
          italicRun = false;
        }
        text += " ";
      }
      if (italic && !italicRun) {
        text += "_";
        italicRun = true;
        anyItalic = true;
      }
      if (!italic && italicRun) {
        text += "_";
        italicRun = false;
      }
      text += chunk;
      lastEnd = x + (Number(item.width) || 0);
    }
    if (italicRun) text += "_";
    const cleaned = text.replace(/[ ]{2,}/g, " ").trim();
    if (!cleaned) continue;
    const fully = anyItalic && /^_[\s\S]*_$/.test(cleaned) && cleaned.slice(1, -1).indexOf("_") === -1;
    lines.push({
      text: fully ? cleaned.slice(1, -1) : cleaned,
      size: size || undefined,
      italic: fully,
    });
  }
  return lines;
}

async function outlineOf(doc: PDFDocumentProxy): Promise<PdfOutlineHeading[]> {
  const tree = await doc.getOutline().catch(() => null);
  const out: PdfOutlineHeading[] = [];
  const walk = async (nodes: Array<{ title?: string; dest?: unknown; items?: unknown[] }> | undefined) => {
    for (const node of nodes ?? []) {
      const title = String(node.title ?? "").replace(/\s+/g, " ").trim();
      let page = 0;
      try {
        const dest = typeof node.dest === "string" ? await doc.getDestination(node.dest) : node.dest;
        const ref = Array.isArray(dest) ? dest[0] : null;
        if (ref) page = (await doc.getPageIndex(ref)) + 1;
      } catch {
        page = 0;
      }
      if (title && page > 0) out.push({ title, page });
      const kids = Array.isArray(node.items) ? (node.items as Array<{ title?: string; dest?: unknown; items?: unknown[] }>) : [];
      if (kids.length) await walk(kids);
    }
  };
  await walk(tree ?? []);
  return out;
}

async function readPdf(bytes: Uint8Array, file: File, mainThread: boolean): Promise<Work> {
  const task = getDocument({
    data: bytes.slice(),
    disableRange: true,
    disableStream: true,
  });
  let doc: PDFDocumentProxy | null = null;
  try {
    doc = await task.promise;
    if (doc.numPages > PAGE_CAP) throw new Error(PDF_TOO_LARGE);
    const meta = await doc.getMetadata().catch(() => null);
    const info = (meta?.info ?? {}) as { Title?: string; Author?: string };
    const pages: PdfTextPage[] = [];
    let chars = 0;
    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n);
      try {
        const lines = await pageLines(page, mainThread);
        chars += lines.reduce((sum, line) => sum + line.text.length, 0);
        pages.push({ lines });
      } finally {
        page.cleanup();
      }
      if (n % 8 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (chars < 40) throw new Error(SCANNED_PDF);
    const outline = await outlineOf(doc);
    const source = file.name || "a PDF";
    return workFromPdfPages({
      title: cleanMeta(info.Title) || titleFromName(file.name) || "Imported",
      author: cleanMeta(info.Author) || "Imported",
      source,
      pages,
      outline,
    });
  } finally {
    await doc?.cleanup().catch(() => undefined);
    await task.destroy().catch(() => undefined);
  }
}

export async function workFromPdfFile(file: File): Promise<Work> {
  if (file.size > PDF_MAX_BYTES) throw new Error(PDF_TOO_LARGE);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > PDF_MAX_BYTES) throw new Error(PDF_TOO_LARGE);
  if (!isPdfMagic(bytes)) throw new Error(PDF_NOT);

  installReadableStreamAsyncIterator();
  installPromiseWithResolvers();
  ensureWorker();
  try {
    return await readPdf(bytes, file, false);
  } catch (err) {
    if (err instanceof Error && isKnownPdfMessage(err.message)) throw err;
    if (isLocked(err)) throw new Error(PDF_LOCKED);
    if (!isWorkerStartupError(err) && !isTextContentTypeError(err)) throw fail(err);
  }

  try {
    await useMainThreadWorker();
    return await readPdf(bytes, file, true);
  } catch (err) {
    if (err instanceof Error && isKnownPdfMessage(err.message)) throw err;
    if (isLocked(err)) throw new Error(PDF_LOCKED);
    throw fail(err);
  }
}
