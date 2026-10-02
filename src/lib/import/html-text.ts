import type { Work } from "../literature.ts";
import { assembleWork, type ImportBlock } from "./assemble.ts";
import { PAGE_EMPTY } from "./messages.ts";

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  mdash: "—",
  ndash: "–",
  hellip: "…",
};

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, n: string) => fromCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => fromCode(Number.parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED[name.toLowerCase()] ?? match);
}

function fromCode(code: number) {
  if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/** `<em>` / `<i>` become `_underscores_` so the reader can set them in italic. */
export function inlineText(html: string) {
  let s = html.replace(/<br\s*\/?>/gi, " ");
  const em = /<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/i;
  for (let i = 0; i < 8 && em.test(s); i += 1) {
    s = s.replace(new RegExp(em.source, "gi"), (_match, _tag: string, inner: string) => {
      const text = decodeEntities(inner.replace(/<[^>]+>/g, ""))
        .replace(/_/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return text ? `_${text}_` : "";
    });
  }
  s = s.replace(/<[^>]+>/g, "");
  return decodeEntities(s).replace(/\s+/g, " ").trim();
}

function prepare(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(nav|header|footer|aside|form)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

export function blocksFromHtml(html: string): { blocks: ImportBlock[]; hadHeading: boolean } {
  const source = prepare(html);
  const re = /<(h[1-6]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const blocks: ImportBlock[] = [];
  let hadHeading = false;
  let current: ImportBlock | null = null;
  const ensure = () => {
    if (!current) {
      current = { title: "", paragraphs: [] };
      blocks.push(current);
    }
    return current;
  };

  let match: RegExpExecArray | null;
  let found = false;
  while ((match = re.exec(source))) {
    found = true;
    const tag = (match[1] ?? "").toLowerCase();
    const text = inlineText(match[2] ?? "");
    if (!text) continue;
    if (tag === "h1" || tag === "h2" || tag === "h3") {
      hadHeading = true;
      current = { title: text.replace(/^_+|_+$/g, ""), paragraphs: [] };
      blocks.push(current);
      continue;
    }
    ensure().paragraphs.push(text);
  }

  if (!found) {
    const plain = inlineText(source);
    if (plain) blocks.push({ title: "", paragraphs: plain.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) });
  }
  return { blocks, hadHeading };
}

/** Article HTML (headings plus paragraphs) into scenes and sentences. */
export function workFromArticleHtml(input: {
  html: string;
  title: string;
  author: string;
  source: string;
  id?: string;
}): Work {
  const { blocks, hadHeading } = blocksFromHtml(input.html);
  const work = assembleWork({
    id: input.id,
    title: input.title,
    author: input.author,
    source: input.source,
    blocks,
    hadHeading,
  });
  const joined = work.breaths.map((breath) => breath.text).join(" ");
  if (!work.breaths.length || joined.length < 80) throw new Error(PAGE_EMPTY);
  return work;
}

export function workFromPlainText(input: {
  text: string;
  title: string;
  author: string;
  source: string;
  id?: string;
}): Work {
  const paragraphs = input.text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((para) => para.replace(/\s+/g, " ").trim())
    .filter((para) => para.length > 0);
  const work = assembleWork({
    id: input.id,
    title: input.title,
    author: input.author,
    source: input.source,
    blocks: [{ title: "", paragraphs }],
    hadHeading: false,
  });
  if (!work.breaths.length) throw new Error(PAGE_EMPTY);
  return work;
}
