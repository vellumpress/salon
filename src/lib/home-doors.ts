import { personFromContact, type FriendContact } from "./friends.ts";
import { encodeHostedSit, type HostedSit } from "./hosted-sit.ts";
import type { MixRow } from "./catalog/home-mix.ts";
import { RITUAL_LANES, ritualLaneStack } from "./catalog/rituals.ts";
import { shelfWork } from "./catalog/shelf.ts";

/** One full pass of each home door. Different speeds, all slow. */
export const DOOR_LOOP_SECONDS = {
  rituals: 80,
  together: 60,
  curated: 100,
} as const;

/** Lanes that name an hour. The home door shows these, not every chip. */
export const RITUAL_DOOR_LANE_IDS = ["before-sleep", "waking-up", "on-a-walk", "unwind"] as const;

type SlideCopy = {
  id: string;
  kicker: string;
  title: string;
  line: string;
};

export type DoorSlide = SlideCopy &
  (
    | { kind: "rituals"; lane: string }
    | { kind: "rituals-home" }
    | { kind: "together" }
    | { kind: "together-room" }
    | { kind: "together-host" }
    | { kind: "together-club" }
    | { kind: "shuffle" }
    | { kind: "friends" }
    | { kind: "curated" }
    | { kind: "read"; workId: string }
    | { kind: "sit"; token: string }
  );

export type DoorCta = {
  label: string;
  kind: "rituals" | "together" | "curated";
};

const TOGETHER_ACTIONS: DoorSlide[] = [
  {
    id: "room",
    kicker: "Now",
    title: "Start a reading room",
    line: "Two phones, one page, talk as you go.",
    kind: "together-room",
  },
  {
    id: "friend",
    kicker: "A friend",
    title: "Read side by side",
    line: "Share a link and read the same hour.",
    kind: "shuffle",
  },
  {
    id: "host",
    kicker: "Tonight",
    title: "Read with a friend tonight",
    line: "Pick a time and they can drop in.",
    kind: "together-host",
  },
  {
    id: "club",
    kicker: "A club",
    title: "Start a book club",
    line: "Same book, week after week.",
    kind: "together-club",
  },
];

const RITUAL_CARD: Record<(typeof RITUAL_DOOR_LANE_IDS)[number], { kicker: string; title: string }> = {
  "before-sleep": { kicker: "Tonight", title: "Wind down with a story" },
  "waking-up": { kicker: "Morning", title: "Ease into your morning" },
  "on-a-walk": { kicker: "Outside", title: "Take a story on your walk" },
  unwind: { kicker: "Later", title: "Let the day go" },
};

function headingSlide(
  door: "rituals" | "together" | "curated",
  kicker: string,
  title: string,
  line: string,
): DoorSlide {
  if (door === "rituals") {
    return { id: "heading", kicker, title, line, kind: "rituals-home" };
  }
  if (door === "together") {
    return { id: "heading", kicker, title, line, kind: "together" };
  }
  return { id: "heading", kicker, title, line, kind: "curated" };
}

function workLine(title: string, author: string) {
  const name = title.trim();
  const who = author.trim();
  if (!name) return "";
  return who ? `${name} · ${who}` : name;
}

/** The section itself, then a story for sleep, morning, a walk, or unwinding. */
export function ritualDoorSlides(visit: number): DoorSlide[] {
  const slides: DoorSlide[] = [
    headingSlide(
      "rituals",
      "Right now",
      "Rituals",
      "Before sleep, waking, a walk, or unwind.",
    ),
  ];
  for (const id of RITUAL_DOOR_LANE_IDS) {
    const lane = RITUAL_LANES.find((row) => row.id === id);
    const copy = RITUAL_CARD[id];
    if (!lane || !copy) continue;
    const lead = ritualLaneStack(lane, visit)[0];
    const onShelf = lead ? shelfWork(lead.id) : undefined;
    if (!onShelf) continue;
    slides.push({
      id: lane.id,
      kicker: copy.kicker,
      title: copy.title,
      line: workLine(onShelf.title, onShelf.author),
      kind: "rituals",
      lane: lane.id,
    });
  }
  return slides;
}

/**
 * The section itself first, then live rooms and friends' current reads.
 * When this device has neither, the other slides are the real ways to read
 * with someone — never a made-up reader.
 */
export function togetherDoorSlides(input: {
  hostedSits?: HostedSit[] | null;
  contacts?: FriendContact[] | null;
}): DoorSlide[] {
  const live: DoorSlide[] = [];
  for (const sit of input.hostedSits ?? []) {
    const title = sit.workTitle?.trim();
    if (!title || !sit.workId) continue;
    const who = sit.hostName?.trim() || sit.hostHandle?.trim() || "A friend";
    live.push({
      id: `sit:${sit.id}`,
      kicker: `With ${who}`,
      title,
      line: sit.author?.trim() || "Come read along.",
      kind: "sit",
      token: encodeHostedSit(sit),
    });
  }
  for (const contact of input.contacts ?? []) {
    const person = personFromContact(contact);
    if (!person.workTitle.trim() || !person.reading.trim()) continue;
    live.push({
      id: `friend:${person.handle}`,
      kicker: person.name,
      title: person.workTitle,
      line: person.author ? person.author : "Reading this now.",
      kind: "read",
      workId: person.reading,
    });
  }
  return [
    headingSlide(
      "together",
      "Friends and clubs",
      "Read together",
      "The same page, together, while you talk.",
    ),
    ...[...live, ...TOGETHER_ACTIONS].slice(0, 4),
  ];
}

function isBecause(id: string) {
  return id.startsWith("because:");
}

function isPlace(id: string) {
  return id.startsWith("place:");
}

function isGenre(id: string) {
  return id.startsWith("form:") || id.startsWith("genre:");
}

function travelTitle(label: string) {
  const place = label.replace(/^Stories from /i, "").replace(/^The /i, "the ");
  return `Travel to ${place} tonight`;
}

function shelfTitle(title: string) {
  switch (title) {
    case "Novels":
      return "A novel for tonight";
    case "Short stories":
      return "Short stories for tonight";
    case "Plays":
      return "A play for tonight";
    case "Poetry":
      return "Poems for tonight";
    case "Ghost stories":
      return "A ghost story tonight";
    case "Sea stories":
      return "Out on the sea tonight";
    case "More like what you finish":
      return "More like the ones you finish";
    case "Start here":
      return "A good place to start";
    case "Other":
      return "Something a little different";
    default:
      return title;
  }
}

function curatedSlide(row: MixRow): DoorSlide | null {
  const card = row.cards.find((item) => item.work.title.trim());
  if (!card) return null;
  const because = isBecause(row.id);
  const place = isPlace(row.id);
  return {
    id: row.id,
    kicker: because ? "For you" : place ? "Tonight" : "If you like",
    title: because ? row.title : place ? travelTitle(row.title) : shelfTitle(row.title),
    line: workLine(card.work.title, card.work.author),
    kind: "read",
    workId: card.work.id,
  };
}

/**
 * Because-you-read rows when this reader has a history, then a place and a
 * genre from today's mix. Nothing here is written by hand.
 */
export function curatedDoorSlides(rows: readonly MixRow[]): DoorSlide[] {
  const withCards = rows.filter((row) => row.cards.some((card) => card.work.title.trim()));
  const pick = (match: (id: string) => boolean, count: number) =>
    withCards.filter((row) => match(row.id)).slice(0, count);
  const chosen = [
    ...pick(isBecause, 2),
    ...pick(isPlace, 1),
    ...pick(isGenre, 1),
  ];
  const seen = new Set(chosen.map((row) => row.id));
  for (const row of withCards) {
    if (chosen.length >= 4) break;
    if (seen.has(row.id)) continue;
    chosen.push(row);
    seen.add(row.id);
  }
  return [
    headingSlide(
      "curated",
      "Today",
      "Curated",
      rows.some((row) => isBecause(row.id))
        ? rows.find((row) => isBecause(row.id))?.title || "A few shelves for today."
        : "A few shelves for today.",
    ),
    ...chosen.slice(0, 4).flatMap((row) => {
      const slide = curatedSlide(row);
      return slide ? [slide] : [];
    }),
  ];
}
