import assert from "node:assert/strict";
import test from "node:test";
import { installReadableStreamAsyncIterator } from "./readable-stream-async-iterator.js";

const proto = ReadableStream.prototype as unknown as {
  values?: (options?: { preventCancel?: boolean }) => AsyncIterator<unknown>;
  [Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
};

function withoutNativeAsyncIterator(run: () => Promise<void>) {
  const previousIterator = proto[Symbol.asyncIterator];
  const previousValues = proto.values;
  Object.defineProperty(proto, Symbol.asyncIterator, {
    configurable: true,
    writable: true,
    value: undefined,
  });
  Object.defineProperty(proto, "values", {
    configurable: true,
    writable: true,
    value: undefined,
  });
  installReadableStreamAsyncIterator();
  return run().finally(() => {
    Object.defineProperty(proto, Symbol.asyncIterator, {
      configurable: true,
      writable: true,
      value: previousIterator,
    });
    Object.defineProperty(proto, "values", {
      configurable: true,
      writable: true,
      value: previousValues,
    });
  });
}

test("ReadableStream for-await works when Safari has no async iterator", async () => {
  await withoutNativeAsyncIterator(async () => {
    const stream = new ReadableStream<number>({
      start(controller) {
        controller.enqueue(1);
        controller.enqueue(2);
        controller.close();
      },
    });
    const seen: number[] = [];
    for await (const value of stream as unknown as AsyncIterable<number>) seen.push(value);
    assert.deepEqual(seen, [1, 2]);

    let released = 0;
    let cancelled = 0;
    const fake = {
      getReader() {
        return {
          read: () => Promise.resolve({ done: false, value: 1 }),
          cancel: () => {
            cancelled += 1;
            return Promise.resolve();
          },
          releaseLock: () => {
            released += 1;
          },
        };
      },
    };
    const iterator = proto.values?.call(fake as unknown as ReadableStream<number>);
    assert.equal(typeof iterator?.return, "function");
    await iterator?.return?.("stop");
    assert.equal(cancelled, 1);
    assert.equal(released, 1);
  });
});
