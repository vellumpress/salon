export type EmphasisPart =
  | { type: "text"; value: string }
  | { type: "em"; value: string };

/** PG `_italics_`, markdown `*italics*`, or `<em>` → parts. */
const EMPHASIS_RE = /<em>([\s\S]*?)<\/em>|_([^_\n]+)_|\*([^*\n]+)\*/g;

export function splitEmphasis(text: string): EmphasisPart[] {
  const parts: EmphasisPart[] = [];
  let last = 0;
  for (const match of text.matchAll(EMPHASIS_RE)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ type: "text", value: text.slice(last, index) });
    const inner = match[1] ?? match[2] ?? match[3] ?? "";
    parts.push({ type: "em", value: inner });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts.length > 0 ? parts : [{ type: "text", value: text }];
}
