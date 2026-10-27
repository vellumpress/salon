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
  assert.equal(DOOR_LOOP_SECONDS.rituals, 80);
  assert.equal(DOOR_LOOP_SECONDS.together, 60);
  assert.equal(DOOR_LOOP_SECONDS.curated, 100);
});

test("ritual door starts on Rituals, then a real book for each hour", () => {
  const slides = ritualDoorSlides(3);
  assert.equal(slides[0]?.id, "heading");
  assert.equal(slides[0]?.title, "Rituals");
  assert.equal(slides[0]?.kicker, "Right now");
  assert.deepEqual(
    slides.slice(1).map((slide) => slide.title),
    [
      "Wind down with a story",
      "Ease into your morning",
      "Take a story on your walk",
      "Let the day go",
    ],
  );
  for (const slide of slides.slice(1)) {
    assert.equal(slide.kind, "rituals");
    if (slide.kind !== "rituals") continue;
    assert.equal(slide.lane, slide.id);
    const title = slide.line.split(" · ")[0]?.trim() ?? "";
    assert.ok(title.length > 1, `${slide.title} has no book`);
    assert.match(slide.line, / · /);
  }
});

test("together door starts on Read together and never invents a reader", () => {
  const cold = togetherDoorSlides({});
  assert.equal(cold[0]?.title, "Read together");
  assert.deepEqual(
    cold.slice(1).map((slide) => slide.title),
    [
      "Start a reading room",
      "Read side by side",
      "Read with a friend tonight",
      "Start a book club",
    ],
  );
  const text = cold.map((slide) => `${slide.kicker} ${slide.title} ${slide.line}`).join(" ");
  assert.doesNotMatch(text, /Ada Voss|Jules Mallard|Nora Chen|Vera S\.|Ivo Reed/);
  assert.doesNotMatch(text, /\b(sit|sits|sitting|lane|lanes|door|doors)\b|for the hour/i);

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
  assert.equal(warm[0]?.title, "Read together");
  assert.equal(warm[1]?.title, "Passing");
  assert.equal(warm[1]?.kind, "sit");
  assert.equal(warm[2]?.title, "Botchan");
  assert.equal(warm[2]?.kind, "read");
  assert.equal(warm.length, 5);
});

test("curated door starts on Curated, then a place and a shelf from the real mix", () => {
  const cold = curatedDoorSlides(homeMixRows(emptyMixHistory(), DAY));
  assert.equal(cold[0]?.title, "Curated");
  assert.ok(cold.length >= 4 && cold.length <= 5, `cold curated slides ${cold.length}`);
  assert.equal(
    cold.some((slide) => slide.title.startsWith("Because you read")),
    false,
  );
  assert.ok(cold.some((slide) => slide.title.startsWith("Travel to ")));
  assert.ok(cold.some((slide) => slide.kicker === "If you like"));

  const history = emptyMixHistory();
  history.opened = ["the-house-of-mirth"];
  history.minutesByWork["the-house-of-mirth"] = 40;
  const warm = curatedDoorSlides(homeMixRows(history, DAY));
  assert.equal(warm[0]?.title, "Curated");
  assert.ok(warm.some((slide) => slide.title.startsWith("Because you read")));
  assert.ok(warm.some((slide) => slide.title.startsWith("Travel to ")));
  assert.ok(warm.length <= 5);
});
