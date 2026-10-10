import assert from "node:assert/strict";
import test from "node:test";
import { firstPaintIndex, holdOpeningForAt, pendingLinkAt } from "./deep-link-breath.ts";

test("a mid-book at link is not in the opening, and the first paint is that breath", () => {
  assert.equal(holdOpeningForAt(1658, 6, false), true);
  assert.equal(pendingLinkAt(1658, 6), null);
  assert.equal(holdOpeningForAt(1658, 2355, true), false);
  assert.equal(pendingLinkAt(1658, 2355), 1658);
  assert.equal(
    firstPaintIndex({ at: 1658, breathCount: 2355, storedIndex: 0, linkApplied: false }),
    1658,
  );
  assert.equal(
    firstPaintIndex({ at: 569, breathCount: 1008, storedIndex: 0, linkApplied: false }),
    569,
  );
});

test("once the link is in the store, taps and a reload without at keep the stored breath", () => {
  assert.equal(
    firstPaintIndex({ at: 1658, breathCount: 2355, storedIndex: 1659, linkApplied: true }),
    1659,
  );
  assert.equal(
    firstPaintIndex({ breathCount: 2355, storedIndex: 12, linkApplied: false }),
    12,
  );
  assert.equal(holdOpeningForAt(undefined, 6, false), false);
  assert.equal(pendingLinkAt(undefined, 2355), null);
  assert.equal(firstPaintIndex({ at: 0, breathCount: 40, storedIndex: 0, linkApplied: false }), 0);
});
