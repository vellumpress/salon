/**
 * Text extraction for one PDF page.
 * getTextContent() is what pdf.js uses, and on iOS Safari it throws
 * TypeError from `for await` over a ReadableStream. That signal sends the
 * import onto the main-thread worker. If it still throws there, read the
 * same stream with getReader() — no for-await.
 */

export const TEXT_CONTENT_TYPE_ERROR = "TextContentTypeError";

export type PageTextContent = {
  items: unknown[];
  styles: Record<string, { fontFamily?: string }>;
  lang: string | null;
};

type TextChunk = {
  items?: unknown[];
  styles?: Record<string, { fontFamily?: string }> | null;
  lang?: string | null;
};

type PageLike = {
  getTextContent: () => Promise<{
    items?: unknown[];
    styles?: Record<string, { fontFamily?: string }> | null;
    lang?: string | null;
  }>;
  streamTextContent: () => ReadableStream<TextChunk>;
};

export function isTypeError(err: unknown): err is Error {
  return err instanceof TypeError || (err instanceof Error && err.name === "TypeError");
}

export function isTextContentTypeError(err: unknown): boolean {
  return err instanceof Error && err.name === TEXT_CONTENT_TYPE_ERROR;
}

function asTextContent(content: {
  items?: unknown[];
  styles?: Record<string, { fontFamily?: string }> | null;
  lang?: string | null;
}): PageTextContent {
  return {
    items: Array.isArray(content.items) ? content.items : [],
    styles: content.styles ?? {},
    lang: content.lang ?? null,
  };
}

async function readTextStream(page: PageLike): Promise<PageTextContent> {
  const reader = page.streamTextContent().getReader();
  const items: unknown[] = [];
  const styles: Record<string, { fontFamily?: string }> = Object.create(null);
  let lang: string | null = null;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      const value = next.value;
      if (!value || typeof value !== "object") continue;
      if (lang == null && value.lang != null) lang = value.lang;
      if (value.styles) Object.assign(styles, value.styles);
      const chunkItems = value.items;
      if (!Array.isArray(chunkItems)) continue;
      for (let i = 0; i < chunkItems.length; i += 1) items.push(chunkItems[i]);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }
  return { items, styles, lang };
}

export async function loadPageText(page: PageLike, mainThread: boolean): Promise<PageTextContent> {
  try {
    return asTextContent(await page.getTextContent());
  } catch (err) {
    if (!isTypeError(err)) throw err;
    if (!mainThread) {
      const signal = new Error(err.message);
      signal.name = TEXT_CONTENT_TYPE_ERROR;
      signal.cause = err;
      throw signal;
    }
    return readTextStream(page);
  }
}
