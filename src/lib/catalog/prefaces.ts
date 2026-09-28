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
    "When Caroline Meeber boarded the afternoon train for Chicago, her total outfit consisted of a small trunk and four dollars. Chapter I — Caroline Meeber, the afternoon train, and August 1889. Skip the Contents. Theodore Dreiser’s 1900 novel. Soft United States, carefully. This is not The Pit. Chicago is primary. Soft Dreiser, carefully. The lead is this book, not Antic Hay, not A spring-time case, and not Eline Vere. Inventory 80 is easy. No score is invented for this sit.",
  smoke:
    "On the 10th of August 1862, at four o'clock in the afternoon, a great number of people were thronging before the well-known Konversation in Baden-Baden. Chapter I — the Konversation, Baden-Baden, and holiday sunshine. Skip the Introduction and the Illustrations list. Ivan Turgenev, in Constance Garnett’s English, 1867. The Russian year is 1867; the English is 1906. Soft Russia, carefully. This is not In the World, Resurrection, or Virgin Soil. Baden is primary. Soft Turgenev, carefully. The lead is this book, not Niels Lyhne, not The Emancipated, and not Germinal. Inventory 76 is medium. No score is invented for this sit.",
  "niels-lyhne":
    "She had the black, luminous eyes of the Blid family. Chapter I — Bartholine, poetry and faith, and Lönborggaard. Skip the Foundation and the translator introduction. J. P. Jacobsen, in Hanna Astrup Larsen’s English, 1880. The Danish year is 1880; the English is 1919. Soft Jacobsen, carefully. This is not Mogens. Soft Scandinavia, carefully. This is not The Family at Gilje, The Great Hunger, or Ditte. Inventory 67 is medium, carefully thinner. No score is invented for this sit.",
  "the-emancipated":
    "By a window looking from Posillipo upon the Bay of Naples sat an English lady, engaged in letter-writing. Part I, Chapter I — Posillipo, a widow’s letter, and November sunlight. Skip the Contents. George Gissing’s 1890 novel. Soft Gissing, carefully. This is not Born in Exile. Soft Italy, carefully. This is not Leila. Naples is secular. Inventory 81 is medium. No score is invented for this sit. The first breath is 251 words — phone-hard, left as printed.",
  germinal:
    "Over the open plain, beneath a starless sky as dark and thick as ink, a man walked alone along the highway from Marchiennes to Montsou. Part One, Chapter I — the Marchiennes–Montsou highway, a starless sky, and beetroot fields. Skip the Ellis introduction. Émile Zola, in Havelock Ellis’s English, 1885. Soft Zola, carefully. This is not Doctor Pascal, Theresa Raquin, or L’Assommoir. Soft France, carefully. Montsou is not the war of Three Soldiers. Inventory 71 is medium. No score is invented for this sit.",
  "our-lady-of-the-pillar":
    "In 1474, a year abounding in divine favours for all Christendom, when King Henry IV. reigned in Castile, there came to live in the city of Segovia a youthful knight named Don Ruy de Cardenas. This sit is Our Lady of the Pillar only — 1474 Segovia and Don Ruy de Cardenas. Skip To the Reader and the translator preface. Stop at the end of the tale. Eça de Queirós, in Edgar Prestage’s English, 1906. One tale this sit. Soft Eça, carefully. This is not Dragon’s Teeth. Soft Spain, carefully. This is not Toledo. No wider inventory score. No score is invented for this sit.",
  kipps:
    "Until he was nearly arrived at adolescence it did not become clear to Kipps how it was that he was under the care of an aunt and uncle instead of having a father and mother like other boys. Book I, Chapter I — the New Romney little shop, an aunt and uncle, and a white-dress mother. Skip the Contents. H. G. Wells’s 1905 novel. The Scribner imprint is 1906. Soft Wells, carefully. This is not Ann Veronica. Soft England, carefully. This is not Antic Hay. New Romney is primary. The lead is this book, not The Professor, not A Room with a View, and not Martin Eden. Inventory 79 is easy. No score is invented for this sit.",
  "the-professor":
    "The other day, in looking over my papers, I found in my desk the following copy of a letter, sent by me a year since to an old school acquaintance. Chapter I, Introductory — an Eton letter and Crimsworth the outsider. Skip the Preface and the Contents. Charlotte Brontë’s 1857 novel. Soft Brontë, carefully. This is not Wildfell. Inventory 77 is medium. No score is invented for this sit.",
  "a-room-with-a-view":
    "\"The Signora had no business to do it,\" said Miss Bartlett, \"no business at all.\" Part One, Chapter I — the Bertolini, south rooms with a view, and a Cockney accent. Skip the Contents. E. M. Forster’s 1908 novel. Soft Forster, carefully. This is not Where Angels Fear. Soft Italy, carefully. This is not Naples, and not Leila. Florence is primary. Inventory 75 is medium. No score is invented for this sit.",
  "martin-eden":
    "The one opened the door with a latch-key and went in, followed by a young fellow who awkwardly removed his cap. Chapter I — a latch-key hall, sea-smacked rough clothes, and a rolling gait. Skip the Contents. Jack London’s 1909 novel. Soft London, carefully. This is not The Law of Life. Soft United States, carefully. This is not Sister Carrie. Oakland is primary. Inventory 75 is easy. No score is invented for this sit.",
  "madame-heurtebise":
    "She was certainly not intended for an artist's wife, above all for such an artist as this outrageous fellow. This sit is Madame Heurtebise only — a jeweller’s-shop wife and the poet Heurtebise. Skip the translator preface and the other sketches. Stop at the end of the sketch. Alphonse Daudet, in Laura Ensor’s English, 1874. One sketch this sit. Soft Daudet, carefully. This is not Numa Roumestan or The Nabob. Soft France, carefully. This is not Germinal, Doctor Pascal, or Three Soldiers. Inventory 80 is easy. No score is invented for this sit.",
  "une-vie":
    "The weather was most distressing. It had rained all night. Chapter I, The Home by the Sea — Jeanne free of the convent, rain gutters, and an 1819 calendar. Skip the Introduction, the Contents, and the other stories. Guy de Maupassant, in Albert M. C. McMaster and A. E. Henderson’s English, 1883. The imprint names them; no separate Translator is listed. Soft Maupassant, carefully. This is not Bel-Ami. Soft France, carefully. This is not Artists’ Wives in Paris, Germinal, Doctor Pascal, or Three Soldiers. Normandy is primary. The lead is this book, not My Ántonia, not Look Back on Happiness, and not The Good Soldier. Inventory 81 is medium. No score is invented for this sit. The first breath is 582 words — phone-hard, left as printed.",
  "look-back-on-happiness":
    "I have gone to the forest. Chapter I — the forest, overfed success, and a hair-shirt. Skip the Contents. Knut Hamsun, in Paula Wiking’s English, 1912. Soft Hamsun, carefully. This is not The Family at Gilje, Hunger, or Wanderers. Soft Scandinavia, carefully. This is not Niels Lyhne. Inventory 84 is medium. No score is invented for this sit.",
  "father-of-yoto":
    "Sweet human hearts—a tale of carnival, moon-haunted nights. This sit is The Father of Yoto only — Marigold Vassiloff, Tai Ling, and West India Dock Road. Skip the Contents and the other sketches. Stop at the end of the sketch. Thomas Burke’s 1916 sketch. One sketch this sit. Soft Burke, carefully. Soft England, carefully. This is not Kipps, and not Antic Hay. This is not Madame Heurtebise in Paris. Inventory 76 is medium. No score is invented for this sit.",
  "crime-and-punishment":
    `On an exceptionally hot evening early in July a young man came out of the garret in which he lodged in S. Place and walked slowly, as though in hesitation, towards K. bridge. Part One, Chapter I — a hot July garret, the landlady’s kitchen, and K. bridge. Skip the Contents if the phone is tight. Fyodor Dostoevsky, in Constance Garnett’s English, 1866. Garnett is named in the About only. Soft Russia, carefully. This is not Smoke in Baden, not Resurrection, and not In the World. Petersburg is primary. Soft densify, carefully, against Folkestone, Brussels, Florence, Oakland, and Paris, and against Normandy, Nebraska, Norway, Nauheim, and Limehouse. The lead is this book, not Uncle Silas, not The Rise of David Levinsky, and not For the Term of His Natural Life. Inventory 79 is medium. No score is invented for this sit.`,
  "uncle-silas":
    `It was winter--that is, about the second week in November--and great gusts were rattling at the windows, and wailing and thundering among our tall trees and ivied chimneys. Chapter I — Austin Ruthyn of Knowl, a winter fire, and ivied chimneys. Skip the Contents if the phone is tight. Joseph Sheridan Le Fanu’s 1864 novel. Soft Ireland, carefully. This is not Irish Fairy Tales. Soft gothic, carefully. This is not Widdershins. This is not The Professor in Brussels. Inventory 73 is medium. No score is invented for this sit.`,
  "rise-of-david-levinsky":
    `Sometimes, when I think of my past in a superficial, casual way, the metamorphosis I have gone through strikes me as nothing short of a miracle. Book I, Chapter I — four cents, the cloak-and-suit trade, and a metamorphosis. Skip the Contents if the phone is tight. Abraham Cahan’s 1917 novel. Soft New York, carefully. This is not Hungry Hearts. This is not a New York-weighted lead. Soft United States, carefully. This is not My Ántonia in Nebraska, not Sister Carrie in Chicago, and not Martin Eden in Oakland. The Lower East Side is primary. Inventory 90 is medium. No score is invented for this sit.`,
  "for-the-term-of-his-natural-life":
    `In the breathless stillness of a tropical afternoon, when the air was hot and heavy, and the sky brazen and cloudless, the shadow of the Malabar lay solitary on the surface of the glittering sea. Book I, Chapter I, The Prison Ship — the Malabar in the tropics, and a poop-deck awning. Skip the Hampstead prologue and the Contents. Marcus Clarke’s 1874 novel. Soft Australia, carefully. This is not My Brilliant Career, and not Kangaroo. This is not Martin Eden in Oakland. The sit is longer, carefully. The Prison Ship is primary. Inventory 70 is medium. No score is invented for this sit.`,
  "bottle-imp":
    `There was a man of the Island of Hawaii, whom I shall call Keawe; for the truth is, he still lives, and his name must be kept secret. This sit is The Bottle Imp only — Keawe in Hawaii, Honaunau, and the Hamakua coast. Skip the Note, the Contents, The Beach of Falesá, and The Isle of Voices. Stop at the end of the story. Robert Louis Stevenson’s 1893 tale. One story this sit. Soft Stevenson, carefully. This is not The Master of Ballantrae. Soft Pacific, carefully. This is not Typee. This is not The Father of Yoto in Limehouse. Inventory 78 is easy. No score is invented for this sit.`,
  "the-age-of-innocence":
    "Old New York marries correctly and then spends a lifetime paying for it. Wharton’s 1920 drawing rooms are already watching. Sit with the manners before anyone speaks.",
  "ethan-frome":
    "A Starkfield winter, a sick wife, and a sled that does not forgive a wish. Wharton’s 1911 novella is cold on purpose. Give the snow a moment, then enter.",
  "my-antonia":
    "I first heard of Ántonia on what seemed to me an interminable journey across the great midland plain of North America. Book I, Chapter I — the midland plain, Jake Marpole, and Nebraska grandparents. Skip the Introduction and the Contents. Willa Cather’s 1918 novel. Soft Cather, carefully. This is not Death Comes for the Archbishop. Soft United States, carefully. This is not Martin Eden, and not Sister Carrie. Inventory 79 is easy. No score is invented for this sit.",
  "winesburg-ohio":
    "A Midwest town speaks in grotesques — people who almost said the true thing. Anderson’s 1919 stories ask you to listen in small rooms. Enter one voice at a time.",
  "howards-end":
    "Who will inherit the house — and the England attached to it. Forster’s 1910 novel begins in letters and a country place. Sit with the house before the first breath.",
  "sons-and-lovers":
    "A Nottingham miner’s son cannot leave his mother’s claim on him. Lawrence’s 1913 novel is close, heated, domestic. Sit with the kitchen a moment, then enter.",
  "heart-of-darkness":
    "The Nellie, a cruising yawl, lies at Gravesend. The frame turns toward the Congo after the Thames. Conrad’s 1902 novel. The book year is 1902; the serial is 1899. Soft Conrad, carefully. This is not Borneo.",
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
    "This is the saddest story I have ever heard. Part I, Chapter I — the Ashburnhams and nine seasons at Nauheim. Skip the Contents. Ford Madox Ford’s 1915 novel. Soft England, carefully. This is not Kipps, and not Antic Hay. Soft Germany, carefully. This is not Smoke. Nauheim is primary. Inventory 72 is medium. No score is invented for this sit.",
  "pointed-roofs":
    "Miriam leaves the gaslit hall and goes slowly upstairs, the Saratoga trunk already in the firelight, deciding what she will say to the Fraeulein. Skip the Beresford introduction. The sit stops on governessing and old age. Richardson’s 1915 novel, Pilgrimage volume 1 only.",
  "the-autobiography-of-an-ex-colored-man":
    "A musician chooses passing, then has to live inside the choice. Johnson’s 1912 novel is told as if to one listener. Sit with that confidence before the first breath.",
  "the-awakening":
    "A green and yellow parrot at Grand Isle keeps repeating Allez vous-en. The sit is the Pontellier gallery, Chapter I. The novel continues; the selected shorts stay out.",
  "lord-jim":
    "A jump from a ship, and a life spent trying to outrun it. Conrad’s 1900 novel begins in rumor. Sit with the story before you meet the man.",
  "billy-budd":
    "In the time before steamships, a stroller along the docks would notice the Handsome Sailor. This sit is Billy Budd, Foretopman only — Chapter I. Skip the other pieces. Herman Melville’s 1924 novella. Soft Melville, carefully. This is not White Jacket. Inventory is medium. No score is invented for this sit.",
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
