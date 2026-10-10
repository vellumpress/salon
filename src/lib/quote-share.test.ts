import assert from "node:assert/strict";
import test from "node:test";
import { decodeQuoteCard, encodeQuoteCard, quoteShareUrl, SHARE_CARD_FUNCTION } from "./quote-share.ts";

test("a quote card token round-trips the sentence", () => {
  const token = encodeQuoteCard({
    workId: "passing",
    at: 4,
    text: "The envelope is still unopened.",
    title: "Passing",
    author: "Nella Larsen",
  });
  const card = decodeQuoteCard(token);
  assert.ok(card);
  assert.equal(card?.t, "The envelope is still unopened.");
  assert.equal(card?.n, "Passing");
  assert.equal(card?.a, "Nella Larsen");
  assert.equal(card?.w, "passing");
  assert.equal(card?.i, 4);
});

test("local preview links unfurl on this origin", () => {
  const prev = (globalThis as { window?: unknown }).window;
  (globalThis as { window: { location: { origin: string; hostname: string } } }).window = {
    location: { origin: "http://127.0.0.1:8080", hostname: "127.0.0.1" },
  };
  try {
    const token = encodeQuoteCard({
      workId: "passing",
      text: "A sentence.",
      title: "Passing",
      author: "Nella Larsen",
    });
    const url = quoteShareUrl(token);
    assert.match(url, /^http:\/\/127\.0\.0\.1:8080\/salon\/og\//);
  } finally {
    if (prev === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window: unknown }).window = prev;
  }
});

test("Pages links point at the share-card function", () => {
  const prev = (globalThis as { window?: unknown }).window;
  (globalThis as { window: { location: { origin: string; hostname: string } } }).window = {
    location: { origin: "https://vellumpress.github.io", hostname: "vellumpress.github.io" },
  };
  try {
    const token = encodeQuoteCard({
      workId: "passing",
      text: "A sentence.",
      title: "Passing",
      author: "Nella Larsen",
    });
    const url = quoteShareUrl(token);
    assert.equal(SHARE_CARD_FUNCTION, "https://thuxsshowkxacbfjdaks.supabase.co/functions/v1/share-card");
    assert.equal(url, `${SHARE_CARD_FUNCTION}?t=${encodeURIComponent(token)}`);
    assert.match(url, /^https:\/\/thuxsshowkxacbfjdaks\.supabase\.co\/functions\/v1\/share-card\?t=/);
  } finally {
    if (prev === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window: unknown }).window = prev;
  }
});
