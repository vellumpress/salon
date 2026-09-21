import assert from "node:assert/strict";
import test from "node:test";
import {
  addSitKeep,
  createHostedSit,
  decodeHostedSit,
  encodeHostedSit,
  hostedSitUrl,
  ghostKeeps,
  isSitGhost,
  mergeHostedSit,
  rsvpHostedSit,
  sitInvolves,
  sitPhase,
} from "./hosted-sit.ts";

test("createHostedSit uses sit presets and invite handles", () => {
  const sit = createHostedSit({
    hostHandle: "@Mina",
    hostName: "Mina",
    workId: "passing",
    minutes: 20,
    invitees: ["ada", "mina", "x"],
    createdAt: 1_000,
  });
  assert.ok(sit);
  assert.equal(sit.hostHandle, "mina");
  assert.equal(sit.workTitle, "Passing");
  assert.deepEqual(sit.invitees, ["ada"]);
  assert.equal(sitPhase(sit, 1_000), "live");
  assert.equal(isSitGhost(sit, 1_000 + 21 * 60 * 1000 + 21 * 60 * 1000), true);
});

test("RSVP and keeps survive a share-token round trip", () => {
  let sit = createHostedSit({
    hostHandle: "mina",
    workId: "we",
    minutes: 12,
    createdAt: 50,
  });
  assert.ok(sit);
  sit = rsvpHostedSit(sit, { handle: "ada", name: "Ada Voss", status: "yes" }, 60);
  sit = addSitKeep(sit, {
    handle: "ada",
    name: "Ada Voss",
    breathId: "s0-1",
    line: "The Integral is almost finished.",
    at: 1,
    keptAt: 80,
  });
  const again = decodeHostedSit(encodeHostedSit(sit));
  assert.ok(again);
  assert.equal(again.rsvps[0]?.status, "yes");
  assert.equal(ghostKeeps(again)[0]?.line.includes("Integral"), true);
  assert.equal(sitInvolves(again, "ada"), true);
});

test("mergeHostedSit unions RSVPs and keeps from another phone", () => {
  const host = createHostedSit({
    hostHandle: "mina",
    workId: "gold",
    minutes: 5,
    createdAt: 10,
  });
  assert.ok(host);
  const guest = addSitKeep(host, {
    handle: "jules",
    name: "Jules Mallard",
    breathId: "s0-0",
    line: "The pushcarts are out.",
    at: 0,
    keptAt: 20,
  });
  const merged = mergeHostedSit(rsvpHostedSit(host, { handle: "jules", status: "later" }), guest);
  assert.equal(merged.rsvps[0]?.status, "later");
  assert.equal(merged.keeps.length, 1);
});

test("hostedSitUrl is an absolute Pages invite", () => {
  const sit = createHostedSit({
    hostHandle: "mina",
    workId: "passing",
    minutes: 20,
    createdAt: 1_000,
  });
  assert.ok(sit);
  const prev = (globalThis as { window?: unknown }).window;
  (globalThis as { window: { location: { origin: string } } }).window = {
    location: { origin: "https://vellumpress.github.io" },
  };
  try {
    const url = hostedSitUrl(sit);
    assert.match(url, /^https:\/\/vellumpress\.github\.io\/salon\/sit\//);
  } finally {
    if (prev === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window: unknown }).window = prev;
  }
});
