import assert from "node:assert/strict";
import test from "node:test";
import { isTextContentTypeError, loadPageText, TEXT_CONTENT_TYPE_ERROR } from "./pdf-page-text.ts";

const safari = new TypeError("undefined is not a function (near '...e of t...')");

test("getTextContent TypeError asks for the main-thread path and keeps the message", async () => {
  const err = await loadPageText(
    {
      getTextContent: async () => {
        throw safari;
      },
      streamTextContent: () => {
        throw new Error("stream should wait for the main thread");
      },
    },
    false,
  ).then(
    () => null,
    (caught: unknown) => caught,
  );
  assert.ok(isTextContentTypeError(err));
  assert.ok(err instanceof Error);
  assert.equal(err.name, TEXT_CONTENT_TYPE_ERROR);
  assert.equal(err.message, safari.message);
  assert.equal(err.cause, safari);
});

test("on the main thread a TypeError is read with getReader", async () => {
  const content = await loadPageText(
    {
      getTextContent: async () => {
        throw safari;
      },
      streamTextContent: () =>
        new ReadableStream({
          start(controller) {
            controller.enqueue({
              lang: "en",
              styles: { F1: { fontFamily: "Times" } },
              items: [{ str: "Hello" }, { str: "there" }],
            });
            controller.close();
          },
        }),
    },
    true,
  );
  assert.equal(content.lang, "en");
  assert.equal(content.styles.F1?.fontFamily, "Times");
  assert.equal(content.items.length, 2);
});

test("other failures stay untouched", async () => {
  const boom = new Error("Invalid PDF structure.");
  const err = await loadPageText(
    {
      getTextContent: async () => {
        throw boom;
      },
      streamTextContent: () => {
        throw new Error("unused");
      },
    },
    false,
  ).then(
    () => null,
    (caught: unknown) => caught,
  );
  assert.equal(err, boom);
});
