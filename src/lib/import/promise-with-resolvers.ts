type PromiseWithResolvers<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

type PromiseWithResolversCtor = PromiseConstructor & {
  withResolvers?: <T>() => PromiseWithResolvers<T>;
};

/**
 * iOS Safari before 17.4 has no Promise.withResolvers.
 * pdf.js legacy still calls it while opening a document.
 */
export function installPromiseWithResolvers() {
  const ctor = Promise as PromiseWithResolversCtor;
  if (typeof ctor.withResolvers === "function") return;
  ctor.withResolvers = function withResolvers<T>(): PromiseWithResolvers<T> {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

installPromiseWithResolvers();
