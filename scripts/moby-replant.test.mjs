import assert from "node:assert/strict";
import test from "node:test";
import { chunkNeedsReplant, MOBY_REPLANT_MARK, replantStamp } from "./moby-replant.mjs";

test("the replant stamp is a trailing assignment", () => {
  const stamp = replantStamp();
  assert.match(stamp, new RegExp(`globalThis\\.__mobyReplant=${JSON.stringify(MOBY_REPLANT_MARK)}`));
  assert.equal(stamp.includes("Call me Ishmael"), false);
});

test("Moby-Dick book chunks and the reader chunk are stamped", () => {
  assert.equal(
    chunkNeedsReplant({
      name: "moby-dick",
      fileName: "moby-dick-aaaaaaaa.js",
      moduleIds: ["/src/lib/catalog/texts/moby-dick.json"],
    }),
    true,
  );
  assert.equal(
    chunkNeedsReplant({
      name: "moby-dick",
      fileName: "moby-dick-bbbbbbbb.js",
      moduleIds: ["/src/lib/catalog/openings/moby-dick.json"],
    }),
    true,
  );
  assert.equal(
    chunkNeedsReplant({
      name: "read._workId",
      fileName: "read._workId-cccccccc.js",
      moduleIds: ["/src/routes/read.$workId.tsx"],
    }),
    true,
  );
  assert.equal(
    chunkNeedsReplant({
      name: "index",
      fileName: "index-dddddddd.js",
      moduleIds: ["/src/routes/__root.tsx", "/src/lib/catalog/texts/pride-and-prejudice.json"],
    }),
    false,
  );
  assert.equal(chunkNeedsReplant({ name: "at-remap", fileName: "at-remap-eeeeeeee.js" }), false);
});
