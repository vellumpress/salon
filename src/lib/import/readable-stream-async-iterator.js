// @ts-check
/**
 * iOS Safari 16–18 has ReadableStream#getReader but no
 * ReadableStream.prototype[Symbol.asyncIterator] or .values.
 * pdf.js legacy does `for await (const x of readableStream)` in
 * getTextContent (main thread) and over DecompressionStream (worker).
 * Same install runs on the main thread before pdf.js, and is prepended
 * into the worker next to the Promise.withResolvers polyfill.
 *
 * @param {typeof globalThis} [scope]
 */
export function installReadableStreamAsyncIterator(scope) {
  const root = scope ?? globalThis;
  const RS = root.ReadableStream;
  if (typeof RS !== "function") return;
  /** @type {any} */
  const proto = RS.prototype;
  if (!proto || typeof proto.getReader !== "function") return;

  if (typeof proto.values !== "function") {
    /**
     * @param {{ preventCancel?: boolean }} [options]
     * @returns {AsyncIterator<unknown>}
     */
    proto.values = function values(options) {
      const preventCancel = Boolean(options && options.preventCancel);
      const reader = this.getReader();
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        try {
          reader.releaseLock();
        } catch {
          /* already released */
        }
      };
      const iterator = {
        /**
         * @returns {Promise<IteratorResult<unknown>>}
         */
        next() {
          return reader.read().then(
            /** @param {ReadableStreamReadResult<unknown>} result */
            (result) => {
              if (result.done) release();
              return result;
            },
            /** @param {unknown} err */
            (err) => {
              release();
              throw err;
            },
          );
        },
        /**
         * @param {unknown} [value]
         * @returns {Promise<IteratorResult<unknown>>}
         */
        return(value) {
          const cancel = preventCancel ? Promise.resolve() : Promise.resolve().then(() => reader.cancel(value));
          return cancel.then(
            () => {
              release();
              return { done: true, value };
            },
            /** @param {unknown} err */
            (err) => {
              release();
              throw err;
            },
          );
        },
      };
      Object.defineProperty(iterator, Symbol.asyncIterator, {
        value() {
          return iterator;
        },
      });
      return iterator;
    };
  }

  if (typeof proto[Symbol.asyncIterator] !== "function") {
    proto[Symbol.asyncIterator] = function asyncIterator() {
      return this.values();
    };
  }
}

installReadableStreamAsyncIterator();
