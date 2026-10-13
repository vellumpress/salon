import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  adoptFrameIndex,
  atFromLocationSearch,
  bootShouldKeepPlace,
  firstPaintIndex,
  holdOpeningForAt,
  pendingLinkAt,
} from "./deep-link-breath.ts";

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

test("a tap during boot is not overwritten by the link or the chapter start", () => {
  assert.equal(bootShouldKeepPlace(0, 0), false);
  assert.equal(bootShouldKeepPlace(118, 117), true);
  assert.equal(bootShouldKeepPlace(0, 62), true);
  const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
  assert.match(reader, /bootShouldKeepPlace/);
  assert.match(reader, /data-breath-index/);
  assert.match(reader, /steppedPlace/);
  assert.match(reader, /if \(!movedWhileSettling\) setBreath\(work\.id, deepLink/);
  const route = readFileSync(new URL("../routes/read.$workId.tsx", import.meta.url), "utf8");
  assert.match(route, /atFromLocationSearch\(window\.location\.search\)/);
});

test("the address keeps at when the router search dropped it", () => {
  assert.equal(atFromLocationSearch("?at=136"), 136);
  assert.equal(atFromLocationSearch("?sit=20&at=118"), 118);
  assert.equal(atFromLocationSearch("?/read/fraternity&at=136"), 136);
  assert.equal(atFromLocationSearch("?at=0"), 0);
  assert.equal(atFromLocationSearch(""), null);
  assert.equal(atFromLocationSearch("?at=nope"), null);
});

test("a link past the opening is not painted as breath 0, and a short cache is not the whole book", () => {
  assert.equal(holdOpeningForAt(314, 96, true, 6090), true);
  assert.equal(holdOpeningForAt(314, 6090, true, 6090), false);
  assert.equal(holdOpeningForAt(5, 5, true, 466), true);
  const route = readFileSync(new URL("../routes/read.$workId.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(route, /setWork\(ready \?\? next/);
  assert.match(route, /const deadline = Date\.now\(\) \+ 20000/);
  assert.match(route, /setWork\(workReadyForAt\(edition, at\) \?\? null\)/);
  assert.match(route, /shelfWork\(book\.id\)\?\.breaths/);
  const works = readFileSync(new URL("./works.ts", import.meta.url), "utf8");
  assert.match(works, /function editionCoversShelf/);
  assert.match(works, /function editionReady/);
  assert.match(works, /if \(!work && editionCoversShelf\(id, cached\)\) complete\.set\(id, true\)/);
  assert.match(works, /claimedComplete && editionCoversShelf\(id, chosen\)/);
  assert.match(works, /else if \(!editionCoversShelf\(id, chosen\)\) complete\.set\(id, false\)/);
});

test("a burst keeps the store once the link is applied, and the first tap can use the frame", () => {
  assert.equal(
    adoptFrameIndex({ storeIndex: 64, frameIndex: 65, linkApplied: true, breathCount: 200 }),
    64,
  );
  assert.equal(
    adoptFrameIndex({ storeIndex: 0, frameIndex: 65, linkApplied: false, breathCount: 200 }),
    65,
  );
  assert.equal(
    adoptFrameIndex({ storeIndex: 0, frameIndex: 118, linkApplied: true, breathCount: 3046 }),
    118,
  );
  assert.equal(
    adoptFrameIndex({ storeIndex: 65, frameIndex: 65, linkApplied: false, breathCount: 200 }),
    65,
  );
  const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
  assert.match(reader, /adoptFrameIndex/);
  assert.match(reader, /pendingLinkAt\(at, work\.breaths\.length\)/);
  assert.match(reader, /userStepped/);
});
