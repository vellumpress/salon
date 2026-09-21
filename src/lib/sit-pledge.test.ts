import assert from "node:assert/strict";
import test from "node:test";
import {
  createSitPledge,
  decodeSitPledge,
  dueAtForWindow,
  encodeSitPledge,
  isPledgePending,
  mergePledge,
  setPledgeStatus,
  sitPledgeUrl,
  windowHours,
} from "./sit-pledge.ts";

test("createSitPledge refuses sitting with yourself", () => {
  assert.equal(
    createSitPledge({ fromHandle: "mina", toHandle: "@Mina", window: "tonight" }),
    null,
  );
});

test("tonight is due the same evening unless it has already closed", () => {
  const afternoon = new Date("2026-09-19T15:00:00");
  const late = new Date("2026-09-19T23:30:00");
  const due = new Date(dueAtForWindow("tonight", afternoon));
  assert.equal(due.getHours(), 23);
  assert.equal(due.getDate(), 19);
  const next = new Date(dueAtForWindow("tonight", late));
  assert.equal(next.getDate(), 20);
  assert.deepEqual(windowHours("early"), { start: 19, end: 21 });
});

test("pledge tokens carry done and cancel without guilt fields", () => {
  const pledge = createSitPledge({
    fromHandle: "mina",
    toHandle: "ada",
    window: "late",
    createdAt: 1_000,
  });
  assert.ok(pledge);
  assert.equal(pledge.status, "pending");
  assert.equal(isPledgePending(pledge, 1_000), true);
  const done = setPledgeStatus(pledge, "done");
  const round = decodeSitPledge(encodeSitPledge(done));
  assert.equal(round?.status, "done");
  const cancelled = mergePledge(done, setPledgeStatus(pledge, "cancelled"));
  assert.equal(cancelled.status, "cancelled");
});

test("sitPledgeUrl is an absolute Pages invite", () => {
  const pledge = createSitPledge({
    fromHandle: "mina",
    toHandle: "ada",
    window: "tonight",
    createdAt: 1_000,
  });
  assert.ok(pledge);
  const prev = (globalThis as { window?: unknown }).window;
  (globalThis as { window: { location: { origin: string } } }).window = {
    location: { origin: "https://vellumpress.github.io" },
  };
  try {
    const url = sitPledgeUrl(pledge);
    assert.match(url, /^https:\/\/vellumpress\.github\.io\/salon\/pledge\//);
  } finally {
    if (prev === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window: unknown }).window = prev;
  }
});
