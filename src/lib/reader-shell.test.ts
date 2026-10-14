import assert from "node:assert/strict";
import test from "node:test";
import { readerHrefOpen, shellMayReload } from "./reader-shell.ts";

test("a new shell does not replace an open book", () => {
  assert.equal(readerHrefOpen("/salon/read/salome"), true);
  assert.equal(readerHrefOpen("/salon/?/read/salome"), true);
  assert.equal(readerHrefOpen("/salon/?/read/the-house-of-mirth&at=306"), true);
  assert.equal(readerHrefOpen("/salon/"), false);
  assert.equal(readerHrefOpen("/salon/?/you"), false);

  assert.equal(shellMayReload("/salon/read/salome", false), false);
  assert.equal(shellMayReload("/salon/?/read/salome", false), false);
  assert.equal(shellMayReload("/salon/", true), false);
  assert.equal(shellMayReload("/salon/", false), true);
  assert.equal(shellMayReload("/salon/?/rituals", false), true);
});
