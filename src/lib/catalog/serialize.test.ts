import assert from "node:assert/strict";
import test from "node:test";
import { isLocalBound } from "./full-pdf.ts";
import {
  SERIALIZE_BOUND_IDS,
  SERIALIZE_PENDING_IDS,
  SERIALIZE_PLANS,
  isSerializeBound,
  serializeClubNight,
  serializeClubNightLine,
  serializeClubReadSearch,
  serializeDurationLabel,
  serializePlan,
  serializePlanByWorkId,
  serializeTonight,
  serializeTypicalMinutes,
} from "./serialize.ts";

const INDEX_NIGHTS: Record<string, number> = {
  "the-sun-also-rises": 18,
  "the-bridge-of-san-luis-rey": 8,
  passing: 6,
  "lolly-willowes": 12,
  "plum-bun": 12,
  "a-passage-to-india": 14,
  "death-comes-for-the-archbishop": 16,
  "the-great-gatsby": 12,
  dracula: 16,
  "the-master-of-ballantrae": 16,
};

const SHELF_MAP: Record<string, string | null> = {
  passing: "passing",
  "the-great-gatsby": "gatsby",
  dracula: "dracula",
  "the-master-of-ballantrae": "the-master-of-ballantrae",
  "death-comes-for-the-archbishop": "death-comes-for-the-archbishop",
  "the-sun-also-rises": "the-sun-also-rises",
  "the-bridge-of-san-luis-rey": "the-bridge-of-san-luis-rey",
  "lolly-willowes": "lolly-willowes",
  "plum-bun": "plum-bun",
  "a-passage-to-india": "a-passage-to-india",
};

test("Thea’s shortlist is ten plans with INDEX night counts", () => {
  assert.equal(SERIALIZE_PLANS.length, 10);
  assert.deepEqual(
    SERIALIZE_PLANS.map((plan) => plan.id),
    Object.keys(INDEX_NIGHTS),
  );
  for (const plan of SERIALIZE_PLANS) {
    assert.equal(plan.nights, INDEX_NIGHTS[plan.id], plan.id);
    assert.equal(plan.episodes.length, plan.nights, plan.id);
    assert.deepEqual(
      plan.episodes.map((episode) => episode.n),
      Array.from({ length: plan.nights }, (_, i) => i + 1),
      plan.id,
    );
    for (const episode of plan.episodes) {
      assert.ok(episode.title, `${plan.id} ${episode.n} title`);
      assert.ok(episode.source, `${plan.id} ${episode.n} source`);
      assert.ok(episode.summary, `${plan.id} ${episode.n} summary`);
      assert.ok(episode.hook, `${plan.id} ${episode.n} hook`);
      assert.ok(episode.minutes > 0, `${plan.id} ${episode.n} minutes`);
      assert.ok(episode.words > 0, `${plan.id} ${episode.n} words`);
    }
    assert.ok(plan.framing.includes("—") || plan.framing.length > 40, plan.id);
    assert.ok(plan.geography, plan.id);
    assert.ok(plan.cadence, plan.id);
    assert.ok(plan.openAt, plan.id);
    assert.ok(plan.why.length > 80, plan.id);
  }
});

test("shelf maps: all ten plans are local LIVE binds", () => {
  for (const [id, shelfId] of Object.entries(SHELF_MAP)) {
    const plan = serializePlan(id);
    assert.ok(plan, id);
    assert.equal(plan!.shelfWorkId, shelfId, id);
  }
  assert.equal(SERIALIZE_BOUND_IDS.length, 10);
  assert.equal(SERIALIZE_PENDING_IDS.length, 0);
  assert.deepEqual(SERIALIZE_PENDING_IDS, []);
  assert.equal(serializePlanByWorkId("gatsby")?.id, "the-great-gatsby");
  assert.equal(serializePlanByWorkId("passing")?.id, "passing");
  assert.equal(serializePlanByWorkId("the-bridge-of-san-luis-rey")?.id, "the-bridge-of-san-luis-rey");
  assert.equal(serializePlanByWorkId("the-sun-also-rises")?.id, "the-sun-also-rises");
  assert.equal(serializePlanByWorkId("lolly-willowes")?.id, "lolly-willowes");
  assert.equal(serializePlanByWorkId("a-passage-to-india")?.id, "a-passage-to-india");
  assert.equal(serializePlanByWorkId("plum-bun")?.id, "plum-bun");
});

test("only local-bound shelf ids are readable", () => {
  for (const plan of SERIALIZE_PLANS) {
    if (plan.shelfWorkId) {
      assert.equal(isSerializeBound(plan), isLocalBound(plan.shelfWorkId), plan.id);
      assert.equal(isSerializeBound(plan), true, plan.id);
    } else {
      assert.equal(isSerializeBound(plan), false, plan.id);
    }
  }
});

test("duration labels are nights plus a typical night, not the whole novel", () => {
  const passing = serializePlan("passing")!;
  assert.equal(serializeDurationLabel(passing), "6 nights · ~13 min");
  assert.ok(serializeTypicalMinutes(passing) < passing.totalMinutes);
  const gatsby = serializePlan("the-great-gatsby")!;
  assert.match(serializeDurationLabel(gatsby), /^12 nights · ~1[45] min$/);
});

test("tonight and club nights walk forward", () => {
  const gatsby = serializePlan("the-great-gatsby")!;
  assert.equal(serializeTonight(gatsby, 0), 1);
  assert.equal(serializeTonight(gatsby, 3), 4);
  assert.equal(serializeTonight(gatsby, 12), 12);
  assert.equal(serializeClubNight(1, 0, 12), 1);
  assert.equal(serializeClubNight(3, 2, 12), 5);
  assert.equal(serializeClubNight(12, 4, 12), 12);
  assert.equal(
    serializeClubNightLine(gatsby, 1),
    "Night 1 of 12 · The Great Gatsby",
  );
});

test("club read search uses the next sitting's night", () => {
  const gatsby = serializePlan("the-great-gatsby")!;
  const first = serializeClubReadSearch(
    { serializePlanId: gatsby.id, startEpisode: 3, sessions: [{ id: 1 }, { id: 2 }], nextSession: { id: 2 } },
    "abc123",
  );
  assert.equal(first.episode, 4);
  assert.equal(first.pair, "abc123");
  assert.ok((first.sit ?? 0) > 0);
});
