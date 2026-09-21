import assert from "node:assert/strict";
import test from "node:test";
import {
  addCalendarDays,
  asClubFill,
  asClubId,
  asInviteToken,
  clubInvitePath,
  clubInviteUrl,
  clubJoinPath,
  defaultSitClock,
  etWallToIso,
  formatClubWhen,
  formatClubWhenLong,
} from "./club-time.ts";

test("etWallToIso maps Eastern wall time to UTC", () => {
  assert.equal(etWallToIso("2026-09-20", "19:00"), "2026-09-20T23:00:00.000Z");
  assert.equal(etWallToIso("2026-01-15", "19:00"), "2026-01-16T00:00:00.000Z");
  assert.equal(etWallToIso("2026-09-20", "24:00"), null);
  assert.equal(etWallToIso("nope", "19:00"), null);
});

test("default sit is tomorrow at 7pm ET", () => {
  const clock = defaultSitClock(new Date("2026-09-20T15:00:00.000Z"));
  assert.equal(clock.time, "19:00");
  assert.match(clock.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(addCalendarDays("2026-09-20", 1), "2026-09-21");
});

test("formats Eastern sitting times", () => {
  const when = formatClubWhen("2026-09-20T23:00:00.000Z", new Date("2026-09-19T12:00:00.000Z"));
  assert.match(when, /Sep/);
  assert.match(when, /ET/);
  const long = formatClubWhenLong("2026-09-20T23:00:00.000Z");
  assert.match(long, /September/);
});

test("invite tokens and club ids stay strict", () => {
  assert.equal(asInviteToken("abcdefghijklmnop"), "abcdefghijklmnop");
  assert.equal(asInviteToken("short"), undefined);
  assert.equal(asClubId("Drayton"), "drayton");
  assert.equal(asClubId("ab"), undefined);
  assert.equal(asClubFill("red"), "red");
  assert.equal(asClubFill("ink"), "ink");
  assert.equal(asClubFill("nope"), "paper");
  assert.equal(clubInvitePath("tok_en-123456"), "/club/invite/tok_en-123456");
  assert.equal(clubJoinPath("tok_en-123456"), "/together?join=tok_en-123456");
});

test("clubInviteUrl is an absolute Pages link", () => {
  const prev = (globalThis as { window?: unknown }).window;
  (globalThis as { window: { location: { origin: string } } }).window = {
    location: { origin: "https://vellumpress.github.io" },
  };
  try {
    assert.equal(
      clubInviteUrl("tok_en-123456"),
      "https://vellumpress.github.io/salon/club/invite/tok_en-123456",
    );
  } finally {
    if (prev === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window: unknown }).window = prev;
  }
});
