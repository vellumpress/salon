import assert from "node:assert/strict";
import test from "node:test";
import { emptyMixHistory, homeMixRows } from "./catalog/home-mix.ts";
import {
  DOOR_LOOP_SECONDS,
  curatedDoorSlides,
  ritualDoorSlides,
  togetherDoorSlides,
} from "./home-doors.ts";
import type { HostedSit } from "./hosted-sit.ts";

const DAY = "2026-10-19";

test("home doors loop at different slow speeds", () => {
  assert.equal(DOOR_LOOP_SECONDS.rituals, 40);
  assert.equal(DOOR_LOOP_SECONDS.together, 30);
  assert.equal(DOOR_LOOP_SECONDS.curated, 50);
});

test("ritual door shows the hour lanes and a real book on each", () => {
  const slides = ritualDoorSlides(3);
  assert.deepEqual(
    slides.map((slide) => slide.title),
    ["Before sleep", "Waking up", "On a walk", "Unwind"],
  );
  for (const slide of slides) {
    assert.equal(slide.kind, "rituals");
    if (slide.kind !== "rituals") continue;
    assert.equal(slide.lane, slide.id);
    const title = slide.line.split(" · ")[0]?.trim() ?? "";
    assert.ok(title.length > 1, `${slide.title} has no book`);
    assert.match(slide.line, / · /);
  }
});

test("together door uses live rooms and friends, never a made-up reader", () => {
  const cold = togetherDoorSlides({});
  assert.deepEqual(
    cold.map((slide) => slide.title),
    ["Open a room", "Sit with a friend", "Host a sit", "Start a book club"],
  );
  const text = cold.map((slide) => `${slide.title} ${slide.line}`).join(" ");
  assert.doesNotMatch(text, /Ada Voss|Jules Mallard|Nora Chen|Vera S\.|Ivo Reed/);

  const sit: HostedSit = {
    id: "sit-1",
    hostHandle: "mina",
    hostName: "Mina",
    workId: "passing",
    workTitle: "Passing",
    author: "Nella Larsen",
    minutes: 20,
    createdAt: 1,
    invitees: [],
    rsvps: [],
    keeps: [],
    endedAt: null,
  };
  const warm = togetherDoorSlides({
    hostedSits: [sit],
    contacts: [
      {
        id: "local:leo",
        handle: "leo",
        name: "Leo",
        addedAt: 1,
        reading: "botchan",
        workTitle: "Botchan",
      },
    ],
  });
  assert.equal(warm[0]?.title, "Passing");
  assert.equal(warm[0]?.kind, "sit");
  assert.equal(warm[1]?.title, "Botchan");
  assert.equal(warm[1]?.kind, "read");
  assert.equal(warm.length, 4);
});

test("curated door takes because-you-read, a place, and a genre from the real mix", () => {
  const cold = curatedDoorSlides(homeMixRows(emptyMixHistory(), DAY));
  assert.ok(cold.length >= 3 && cold.length <= 4, `cold curated slides ${cold.length}`);
  assert.equal(
    cold.some((slide) => slide.title.startsWith("Because you read")),
    false,
  );
  assert.ok(cold.some((slide) => slide.kicker === "A place"));
  assert.ok(cold.some((slide) => slide.kicker === "A shelf"));

  const history = emptyMixHistory();
  history.opened = ["the-house-of-mirth"];
  history.minutesByWork["the-house-of-mirth"] = 40;
  const warm = curatedDoorSlides(homeMixRows(history, DAY));
  assert.ok(warm.some((slide) => slide.title.startsWith("Because you read")));
  assert.ok(warm.some((slide) => slide.kicker === "A place"));
  assert.ok(warm.length <= 4);
});
