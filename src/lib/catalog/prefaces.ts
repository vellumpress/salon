import { blurbFor } from "./blurbs.ts";
import { RITUAL_LANES } from "./rituals.ts";
import { SERIALIZE_LANE_ID } from "./serialize.ts";
import { shelfWork, type ShelfForm, type ShelfWork } from "./shelf.ts";
import { STORED_PREFACES } from "./prefaces-stored.ts";

/**
 * Hand-tuned settle-in copy for first-open. Wins over the stored catalog
 * fill, loses to locked recommend / Ritual pitches and shelf.intro.
 */
export const PREFACES: Record<string, string> = {
  "of-human-bondage":
    "A club foot, a medical student, and a love that humiliates on purpose. Skip the title matter and open Chapter I on the gray morning — Wake up, Philip — and keep the first sit to that chapter only. Sit with that weather before the first breath.",
  gatsby:
    "West Egg money, a green light, and a man who throws parties for a ghost. Fitzgerald’s 1925 summer asks you to watch the lights before anyone arrives. Sit with the bay a moment, then enter.",
  ulysses:
    "One Dublin day, walked until language itself starts to sweat. Joyce’s 1922 novel does not hurry you toward a plot. Let the city arrive a sentence at a time.",
  dubliners:
    "North Richmond Street is blind until the Christian Brothers’ School lets the boys out. This sit is Araby only, through the bazaar. One story; the cycle continues.",
  "sister-carrie":
    "A small-town girl arrives in Chicago and learns what the city charges for a rise. Dreiser’s 1900 novel opens on the train and the new weather. Sit with the arrival before the first breath.",
  "the-age-of-innocence":
    "Old New York marries correctly and then spends a lifetime paying for it. Wharton’s 1920 drawing rooms are already watching. Sit with the manners before anyone speaks.",
  "ethan-frome":
    "A Starkfield winter, a sick wife, and a sled that does not forgive a wish. Wharton’s 1911 novella is cold on purpose. Give the snow a moment, then enter.",
  "my-antonia":
    "Nebraska prairie, immigrant labor, and a girl who outlasts the men who remember her. Cather’s 1918 novel opens on land before it opens on love. Sit with the grass a moment.",
  "winesburg-ohio":
    "A Midwest town speaks in grotesques — people who almost said the true thing. Anderson’s 1919 stories ask you to listen in small rooms. Enter one voice at a time.",
  "howards-end":
    "Who will inherit the house — and the England attached to it. Forster’s 1910 novel begins in letters and a country place. Sit with the house before the first breath.",
  "sons-and-lovers":
    "A Nottingham miner’s son cannot leave his mother’s claim on him. Lawrence’s 1913 novel is close, heated, domestic. Sit with the kitchen a moment, then enter.",
  "heart-of-darkness":
    "A steamer upriver toward a man the company still calls its agent. Conrad’s 1899 novella waits on the Thames before it leaves. Sit with the river first.",
  "the-time-machine":
    "A machine, a dinner table, and a future split between Eloi and Morlocks. Wells’s 1895 invention starts as talk among friends. Sit with the evening before the first leap.",
  "the-war-of-the-worlds":
    "Martians land in the Home Counties and London learns it is not the center. Wells’s 1898 novel begins as ordinary weather. Sit with the ordinary a moment.",
  "the-invisible-man":
    "A chemist disappears — then the bandages, and the terror, come off. Wells’s 1897 novel arrives as a stranger in a country inn. Sit with the door before it opens.",
  "the-secret-agent":
    "Conrad’s London anarchists, a shop in Soho, and a bomb that lands on the wrong person. The 1907 novel is fog, errands, and a marriage. Sit with the shop a moment.",
  "a-portrait-of-the-artist-as-a-young-man":
    "Stephen Dedalus talks his way out of church, family, and Ireland. Joyce’s 1916 novel begins in a child’s ear. Sit with the first sounds before they become argument.",
  "the-voyage-out":
    "A young woman sails toward a first love and does not sail home unchanged. Woolf’s 1915 first novel is ship, heat, and talk. Sit with the water before the first breath.",
  "jacob-s-room":
    "Betty Flanders writing in the sand — Cornwall, then the room that will be Jacob’s. The experimental voice is the sit.",
  "the-good-soldier":
    "Nine seasons at Bad Nauheim — intimacy like a good glove, and still they knew nothing. Ford’s 1915 confession starts in the shallows. Sit with that voice before you trust it.",
  "pointed-roofs":
    "Miriam leaves the gaslit hall and goes slowly upstairs, the Saratoga trunk already in the firelight, deciding what she will say to the Fraeulein. Skip the Beresford introduction. The sit stops on governessing and old age. Richardson’s 1915 novel, Pilgrimage volume 1 only.",
  "the-autobiography-of-an-ex-colored-man":
    "A musician chooses passing, then has to live inside the choice. Johnson’s 1912 novel is told as if to one listener. Sit with that confidence before the first breath.",
  "the-awakening":
    "A green and yellow parrot at Grand Isle keeps repeating Allez vous-en. The sit is the Pontellier gallery, Chapter I. The novel continues; the selected shorts stay out.",
  "lord-jim":
    "A jump from a ship, and a life spent trying to outrun it. Conrad’s 1900 novel begins in rumor. Sit with the story before you meet the man.",
  "billy-budd":
    "A handsome sailor, a ship’s law, and a blow that cannot be taken back. Melville’s late tale is deck, duty, and light. Sit with the sea a moment.",
  "elmer-gantry":
    "American professions as a hustle you can still try to stay honest inside. Lewis’s 1927 preacher novel is heat, tents, and appetite. Sit with the noise before the first breath.",
  "the-painted-veil":
    "Shuttered Hong Kong room after tiffin; someone tries the door; Kitty whispers “Walter.” The closed sit is Chapter I only. The sit opens on “How shall I get out?”",
  "the-moon-and-sixpence":
    "I confess that when first I made acquaintance with Charles Strickland I never for a moment discerned that there was in him anything out of the ordinary. Yet now few will be found to deny his greatness. Tahiti later is not Hong Kong.",
  "o-pioneers":
    "Alexandra Bergson stays with the land when everyone else wants to leave it. Cather’s 1913 Nebraska novel is work before romance. Sit with the Divide a moment.",
  falcon:
    "Spade keeps the falcon, the lies, and the one rule he will not break for a woman. Hammett’s 1930 San Francisco night is already in motion. Sit with the office before the first knock.",
};

const LANE_SIT: Record<string, string> = {
  "for-you": "A first sitting. Start here.",
  "before-sleep": "A night sitting — let the dark arrive first.",
  "waking-up": "A morning sitting — start before the day has an opinion.",
  unwind: "A quiet sitting — no hurry toward the first line.",
  "the-body": "Sit in the body a moment before the first line.",
  "on-a-walk": "Read as if walking — one sentence, then the next.",
  "soft-mourning": "A soft sitting. Nothing here asks you to be finished.",
  "bite-sized": "A short sitting. The door is close.",
};

function formWord(form: ShelfForm) {
  switch (form) {
    case "novel":
      return "novel";
    case "stories":
      return "stories";
    case "play":
      return "play";
    case "poem":
      return "poems";
    default:
      return "work";
  }
}

function shortAuthor(author: string) {
  return author.replace(/\s*\([^)]*tr\.[\s\S]*$/i, "").replace(/;.*$/, "").trim();
}

function laneSit(id: string): string {
  for (const lane of RITUAL_LANES) {
    if (lane.id === SERIALIZE_LANE_ID) continue;
    if (!lane.workIds.includes(id)) continue;
    const sit = LANE_SIT[lane.id];
    if (sit) return sit;
  }
  return "";
}

function invitationOnly(work: ShelfWork): string {
  const lane = laneSit(work.id);
  if (lane) return lane;
  switch (work.form) {
    case "stories":
      return "Enter one room at a time.";
    case "play":
      return "The house is still dark.";
    case "poem":
      return "Let the first line arrive when you are ready.";
    default:
      return "Sit with the world a moment before the first breath.";
  }
}

function settleSentence(work: ShelfWork): string {
  const who = shortAuthor(work.author);
  const lead = `${who}’s ${work.year} ${formWord(work.form)}`;
  return `${lead}. ${invitationOnly(work)}`;
}

/** Documented fallback when no stored preface / pitch / intro exists. */
export function composePreface(work: ShelfWork): string {
  const hook = blurbFor(work).replace(/\s+/g, " ").trim();
  const invite = invitationOnly(work);
  if (hook && invite) {
    if (hook.includes(invite.slice(0, 18))) return hook;
    return `${hook} ${invite}`;
  }
  return settleSentence(work) || hook;
}

export function prefaceFor(id: string): string | undefined {
  const tuned = PREFACES[id];
  if (tuned) return tuned;
  const stored = STORED_PREFACES[id];
  if (stored) return stored;
  const shelf = shelfWork(id);
  return shelf ? composePreface(shelf) : undefined;
}
