import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { decodeQuoteCard, encodeQuoteCard } from "./quote-share.ts";
import { fillOf } from "./mondrian.ts";
import { cardFill, decodeQuoteToken, renderQuoteHtml, renderQuotePng, shareCardFunctionUrl } from "./quote-unfurl-server.ts";

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

test("unfurl PNG is a 1080×1350 card in the reading fonts", async () => {
  const png = await renderQuotePng(token());
  assert.ok(png);
  assert.equal(Buffer.from(png).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  assert.equal(view.getUint32(16), 1080);
  assert.equal(view.getUint32(20), 1350);
  assert.ok((png?.length ?? 0) > 20_000);
});
