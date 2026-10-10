import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { decodeQuoteCard, encodeQuoteCard } from "./quote-share.ts";
import { fillOf } from "./mondrian.ts";
import { cardFill, decodeQuoteToken, renderQuoteHtml, renderQuotePng, shareCardFunctionUrl } from "./quote-unfurl-server.ts";
import { cormorantItalic, cormorantRegular, outfitMedium } from "../../supabase/functions/share-card/fonts.ts";

const sentence = "The envelope is still unopened.";

function token() {
  return encodeQuoteCard({
    workId: "passing",
    at: 2,
    text: sentence,
    title: "Passing",
    author: "Nella Larsen",
  });
}

test("unfurl HTML carries the sentence in title, description, and image", () => {
  const html = renderQuoteHtml(token(), {
    imageUrl: "https://example.test/card.png",
    openUrl: "https://vellumpress.github.io/salon/read/passing?at=2",
  });
  assert.ok(html);
  assert.match(html ?? "", /property="og:title" content="Passing · Nella Larsen"/);
  assert.match(html ?? "", /property="og:description" content="The envelope is still unopened\."/);
  assert.match(html ?? "", /property="og:image" content="https:\/\/example\.test\/card\.png"/);
  assert.match(html ?? "", /twitter:card" content="summary_large_image"/);
  assert.match(html ?? "", /font-family:"Outfit"/);
  assert.match(html ?? "", /font-family:"Cormorant Garamond"/);
  assert.match(html ?? "", /data:font\/woff2;base64,/);
  assert.doesNotMatch(html ?? "", /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.doesNotMatch(html ?? "", /font-family:[^;}]*\b(?:serif|sans-serif|Georgia|Arial|system-ui|font8x8)\b/);
});

test("the function reads the same sentence the app encoded", () => {
  const token = encodeQuoteCard({
    workId: "passing",
    at: 2,
    text: "Irene’s letter — still unopened.",
    title: "Passing",
    author: "Nella Larsen",
  });
  const app = decodeQuoteCard(token);
  const edge = decodeQuoteToken(token);
  assert.equal(edge?.t, app?.t);
  assert.equal(edge?.n, app?.n);
  assert.equal(edge?.a, app?.a);
});

test("card accent matches the reading app", () => {
  for (const id of ["passing", "gold", "manhattan", "berlin", "we", "cane", "the-awakening"]) {
    assert.equal(cardFill(id), fillOf(id), id);
  }
});

test("preview image URL keeps https and /functions/v1", () => {
  const token = "line.token";
  const expected = `https://thuxsshowkxacbfjdaks.supabase.co/functions/v1/share-card?t=${token}&img=1`;
  assert.equal(
    shareCardFunctionUrl("https://thuxsshowkxacbfjdaks.supabase.co", token, true),
    expected,
  );
  assert.equal(
    shareCardFunctionUrl("http://thuxsshowkxacbfjdaks.supabase.co/share-card", token, true),
    expected,
  );
  assert.equal(
    shareCardFunctionUrl("https://thuxsshowkxacbfjdaks.supabase.co/functions/v1/share-card/", token, true),
    expected,
  );
  assert.equal(
    shareCardFunctionUrl("", token, true),
    expected,
  );
});

test("share-card does not import a wasm module", () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "../../supabase/functions/share-card");
  const card = readFileSync(join(dir, "card.ts"), "utf8");
  const deno = readFileSync(join(dir, "deno.json"), "utf8");
  const index = readFileSync(join(dir, "index.ts"), "utf8");
  for (const source of [card, deno, index]) {
    assert.doesNotMatch(source, /index_bg\.wasm/);
    assert.doesNotMatch(source, /import\s*\(\s*["'][^"']+\.wasm["']/);
    assert.doesNotMatch(source, /from\s+["'][^"']+\.wasm["']/);
  }
});

function glyphId(bytes: Uint8Array, codePoint: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const numTables = view.getUint16(4);
  let cmapOffset = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(bytes[rec]!, bytes[rec + 1]!, bytes[rec + 2]!, bytes[rec + 3]!);
    if (tag === "cmap") cmapOffset = view.getUint32(rec + 8);
  }
  if (cmapOffset < 0) return 0;
  const count = view.getUint16(cmapOffset + 2);
  for (let i = 0; i < count; i++) {
    const start = cmapOffset + 4 + i * 8;
    const formatOff = cmapOffset + view.getUint32(start + 4);
    const format = view.getUint16(formatOff);
    if (format === 12) {
      const groups = view.getUint32(formatOff + 12);
      for (let g = 0; g < groups; g++) {
        const at = formatOff + 16 + g * 12;
        const first = view.getUint32(at);
        const last = view.getUint32(at + 4);
        if (codePoint < first || codePoint > last) continue;
        return view.getUint32(at + 8) + (codePoint - first);
      }
    }
    if (format === 4 && codePoint <= 0xffff) {
      const segCount = view.getUint16(formatOff + 6) / 2;
      const endBase = formatOff + 14;
      const startBase = endBase + segCount * 2 + 2;
      const deltaBase = startBase + segCount * 2;
      const offsetBase = deltaBase + segCount * 2;
      for (let s = 0; s < segCount; s++) {
        const end = view.getUint16(endBase + s * 2);
        const startCp = view.getUint16(startBase + s * 2);
        if (codePoint < startCp || codePoint > end) continue;
        const delta = view.getInt16(deltaBase + s * 2);
        const rangeOff = view.getUint16(offsetBase + s * 2);
        if (rangeOff === 0) return (codePoint + delta) & 0xffff;
        const glyphOff = offsetBase + s * 2 + rangeOff + (codePoint - startCp) * 2;
        const glyph = view.getUint16(glyphOff);
        if (glyph === 0) return 0;
        return (glyph + delta) & 0xffff;
      }
    }
  }
  return 0;
}

test("share-card fonts include Latin Extended-A for the shelf", () => {
  const needed = ["Wacław", "Żeromski", "Nasławska"].join("");
  for (const face of [outfitMedium, cormorantRegular, cormorantItalic]) {
    for (const char of needed) {
      assert.ok(glyphId(face, char.codePointAt(0)!) > 0, char);
    }
  }
});

test("unfurl PNG is a 1080×1350 card in the reading fonts", async () => {
  const png = await renderQuotePng(token());
  assert.ok(png);
  assert.equal(Buffer.from(png).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  assert.equal(view.getUint32(16), 1080);
  assert.equal(view.getUint32(20), 1350);
  assert.ok((png?.length ?? 0) > 20_000);
});
