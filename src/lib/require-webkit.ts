import type { TestContext } from "node:test";

/** Deploy smoke sets this. A missing WebKit then fails the job instead of skipping. */
export function webKitRequired() {
  return process.env.REQUIRE_WEBKIT === "1";
}

/**
 * Local and catalog runs skip when WebKit is absent.
 * Pages deploy smoke sets REQUIRE_WEBKIT=1 and must fail closed.
 */
export function skipWithoutWebKit(t: TestContext, detail = "WebKit is not installed"): void {
  if (webKitRequired()) {
    throw new Error(`${detail}; REQUIRE_WEBKIT=1`);
  }
  t.skip(detail);
}
