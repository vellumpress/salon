import assert from "node:assert/strict";
import test from "node:test";
import { canNativeShare, mailtoShareHref, shareOrCopy } from "./invite-share.ts";

function stubNavigator(value: object) {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function stubDocument(value: Document) {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

test("canNativeShare is true whenever navigator.share exists", () => {
  stubNavigator({ share: async () => undefined });
  assert.equal(canNativeShare(), true);
});

test("shareOrCopy invokes navigator.share with the absolute URL", async () => {
  const shared: Array<{ title?: string; text?: string; url?: string }> = [];
  stubNavigator({
    share: async (data: ShareData) => {
      shared.push(data);
    },
  });
  const result = await shareOrCopy({
    title: "Passing · tbr",
    text: "The envelope is still unopened.",
    url: "https://vellumpress.github.io/salon/read/passing?at=1",
  });
  assert.equal(result, "shared");
  assert.equal(shared[0]?.url, "https://vellumpress.github.io/salon/read/passing?at=1");
  assert.match(shared[0]?.title ?? "", /tbr/);
});

test("shareOrCopy copies the URL when share is missing", async () => {
  const writes: string[] = [];
  stubNavigator({
    clipboard: {
      writeText: async (text: string) => {
        writes.push(text);
      },
    },
  });
  const result = await shareOrCopy({
    title: "tbr",
    text: "A sitting",
    url: "https://vellumpress.github.io/salon/together",
  });
  assert.equal(result, "copied");
  assert.deepEqual(writes, ["https://vellumpress.github.io/salon/together"]);
});

test("shareOrCopy falls back to mailto when share and clipboard fail", async () => {
  const clicks: string[] = [];
  stubNavigator({});
  stubDocument({
    createElement: (tag: string) => {
      if (tag === "a") {
        const el = {
          href: "",
          rel: "",
          click() {
            clicks.push(el.href);
          },
          remove() {},
        };
        return el;
      }
      throw new Error("no clipboard field");
    },
    body: { appendChild() {} },
  } as unknown as Document);
  const result = await shareOrCopy({
    title: "Passing · tbr",
    text: "A sitting from tbr.",
    url: "https://vellumpress.github.io/salon/read/passing?at=1",
  });
  assert.equal(result, "copied");
  assert.equal(clicks.length, 1);
  assert.match(clicks[0] ?? "", /^mailto:/);
  assert.match(clicks[0] ?? "", /salon%2Fread%2Fpassing/);
});

test("mailtoShareHref carries title, line, and URL", () => {
  const href = mailtoShareHref({
    title: "Passing · tbr",
    text: "The envelope is still unopened.",
    url: "https://vellumpress.github.io/salon/read/passing?at=1",
  });
  assert.match(href, /^mailto:\?subject=/);
  assert.match(href, /Passing/);
  assert.match(href, /envelope/);
  assert.match(href, /salon%2Fread%2Fpassing/);
});
