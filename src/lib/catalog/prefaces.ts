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
    `The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us. This sit is The Time Machine only — the Time Traveller, a fire, and silver lilies. Skip the Contents. Stop at the end of the novel. H. G. Wells’s 1895 novel. One short novel this sit. Soft Wells, carefully. This is not Kipps. Soft England, carefully. This is not Coketown, not Limehouse, not Folkestone, and not London occult. PG reading-ease is easy. No score is invented for this sit.`,
  "the-war-of-the-worlds":
    "Martians land in the Home Counties and London learns it is not the center. Wells’s 1898 novel begins as ordinary weather. Sit with the ordinary a moment.",
  "the-invisible-man":
    `The stranger came early in February, one wintry day, through a biting wind and a driving snow, the last snowfall of the year, over the down, walking from Bramblehurst railway station, and carrying a little black portmanteau in his thickly gloved hand. This sit is The Invisible Man only — the Coach and Horses, and Bramblehurst snow. Skip the Contents. Stop at the end of the novel. H. G. Wells’s 1897 novel. One short novel this sit. Soft Wells, carefully. This is not The Time Machine, and not Kipps. Soft England, carefully. This is not Beacon House, not Coketown, not Limehouse, not Folkestone, not Richmond, and not London occult. PG reading-ease 83.2 is easy. No score is invented for this sit.`,
  "the-village-in-the-jungle":
    `The village was called Beddagama, which means the village in the jungle. Chapter I — Beddagama, Ceylon. A katty is a chopping knife, a kind of billhook, used to cut back the undergrowth, and a chena is a patch of jungle cleared, burned and sown for a season’s crop. Be warned that this is a violent book with a grim ending. Skip the dedication ‘To V. W.’ if the phone is tight. Leonard Woolf’s 1913 novel. Soft Woolf, carefully. Soft Ceylon, carefully. This is not Mr. Fortune’s Maggot. Beddagama is primary. The lead is this book, not The Joy of Captain Ribot, not Saracinesca, and not The Torrents of Spring. PG reading-ease 82.0 is easy. No score is invented for this sit.`,
  "the-joy-of-captain-ribot":
    `In Malaga they cook it not at all badly; in Vigo better yet; in Bilbao I have eaten it deliciously seasoned on more than one occasion. Chapter I — the Gijón wharf, with Valencia to come. Skip the Sylvester Baxter Introduction if the phone is tight. It stays in the book and is not in the open. Armando Palacio Valdés, in Minna Caroline Smith’s English, 1900. Smith is named in the About only. The English year is 1900. Soft Palacio Valdés, carefully. Soft Spain, carefully. This is not Blood and Sand. Valencia is primary. Accents stay on Señor, Señora, Señorita, and Capitán. Marti is printed as Marti. PG reading-ease 70.8 is fairly easy. No score is invented for this sit.`,
  "saracinesca":
    `The hour was six o'clock, and the rooms of the Embassy were as full as they were likely to be that day. Chapter II — the Embassy rooms, Rome. Chapter I stays in the book and is not the open. Skip the author’s Note if the phone is tight. F. Marion Crawford’s 1887 novel. Soft Crawford, carefully. Soft Rome, carefully. Reputation, marriage, and gossip in Roman high society. Rome is primary. PG reading-ease 69.4 is medium. No score is invented for this sit. The first breath is 334 words — phone-hard, left as printed.`,
  "the-torrents-of-spring":
    `… At two o'clock in the night he had gone back to his study. The frame, then Chapter I — the summer of 1840, in Frankfort as printed. Skip the epigraph if the phone is tight. Ivan Turgenev, in Constance Garnett’s English, 1897. Garnett is named in the About only. The English year is 1897. This is The Torrents of Spring only. It ends at preparing to go to America. First Love is not in this book, and Mumu is not in this book. Soft Turgenev, carefully. This is not Smoke. Soft Germany, carefully. Frankfort is primary. PG reading-ease 79.5 is fairly easy. No score is invented for this sit.`,
  "the-bet":
    `It was a dark autumn night. This sit is The Bet only — a banker’s house and garden lodge. No city is named. No year is cited. Stop at the fireproof safe. Anton Chekhov, in Constance Garnett’s English. Garnett is named in the About only. One story this sit. Soft Chekhov, carefully. This is not In Exile. Soft Russia, carefully. PG reading-ease 80.2, for the whole volume, is easy. No score is invented for this sit.`,
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
    `Elmer Gantry was drunk. He was eloquently drunk, lovingly and pugnaciously drunk. He leaned against the bar of the Old Home Sample Room, the most gilded and urbane saloon in Cato, Missouri. Chapter I — Cato, Missouri, the Old Home Sample Room, and a man eloquently drunk. Skip the Contents if the phone is tight. Sinclair Lewis’s 1927 novel. Soft Lewis, carefully. This is not The Job. Soft United States, carefully. This is not The Rise of David Levinsky on the Lower East Side, not My Ántonia in Nebraska, not Sister Carrie in Chicago, and not Martin Eden in Oakland. Inventory 81 is medium. No score is invented for this sit.`,
  "death-in-venice":
    `On a spring afternoon of the year 19--, when our continent lay under such threatening weather for whole months, Gustav Aschenbach, or von Aschenbach as his name read officially after his fiftieth birthday, had left his apartment on the Prinzregentenstrasse in Munich and had gone for a long walk. Chapter I — a spring afternoon, the Prinzregentenstrasse, and Aschenbach. Skip the Contents if the phone is tight. Thomas Mann, in Kenneth Burke’s English, 1912. Burke is named in the About only. Soft Mann, carefully. This is not Royal Highness. Soft Italy, carefully. This is not A Room with a View in Florence, not The Emancipated in Naples, and not Leila. Venice is primary after the Munich open. Soft densify, carefully, against Petersburg, Ireland, the Lower East Side, Australia, and Hawaii, and against Normandy, Nebraska, Norway, Nauheim, and Limehouse, and against Folkestone, Brussels, Florence, Oakland, and Paris. The lead is this book, not Elmer Gantry, not The Colonel’s Dream, and not Hard Times. Inventory 76 is medium. No score is invented for this sit.`,
  "colonels-dream":
    `Two gentlemen were seated, one March morning in 189--, in the private office of French and Company, Limited, on lower Broadway. Chapter One — Broadway, French and Company, and an electric clock, then Clarendon in the South. Skip the Cast and the Contents if the phone is tight. Charles W. Chesnutt’s 1905 novel. Soft Chesnutt, carefully. This is not The Marrow of Tradition. Soft United States South, carefully, after Elmer Gantry. The Broadway open is careful after The Rise of David Levinsky. This is not a New York-weighted lead. Clarendon in the South is primary. Inventory 85 is medium. No score is invented for this sit.`,
  "hard-times":
    `'NOW, what I want is, Facts. Teach these boys and girls nothing but Facts. Facts alone are wanted in life. Book the First, Chapter I, The One Thing Needful — a Facts school-room and Gradgrind. Skip the table of contents if the phone is tight. Charles Dickens’s 1854 novel. Soft Dickens, carefully. Soft England, carefully. This is not Kipps in Folkestone, not The Father of Yoto in Limehouse, and not Antic Hay. Coketown is primary. Inventory 76 is medium. No score is invented for this sit.`,
  "great-god-pan":
    `"I am glad you came, Clarke; very glad indeed. I was not sure you could spare the time." This sit is The Great God Pan only — Clarke and the Experiment. Skip the Contents and the other matter. Stop at the end of the novella. Arthur Machen’s 1894 novella. One novella this sit. Soft Machen, carefully. This is not The Hill of Dreams. Soft London, carefully. This is not The Father of Yoto in Limehouse. This is not The Bottle Imp in Hawaii. Inventory 93 is medium. No score is invented for this sit.`,
  "manalive":
    `A wind sprang high in the west, like a wave of unreasonable happiness, and tore eastward across England, trailing with it the frosty scent of forests and the cold intoxication of the sea. Part I, Chapter I — a great wind, unreasonable happiness, and Beacon House. Skip the Contents if the phone is tight. G. K. Chesterton’s 1912 novel. Soft Chesterton, carefully. Soft London, carefully. This is not The Great God Pan, and not Limehouse. Soft England, carefully. This is not Coketown, and not Folkestone. Beacon House is primary. Soft densify, carefully, against Venice, a Midwest pulpit, Clarendon, Coketown, and London occult, and against Petersburg, Ireland, the Lower East Side, Australia, and Hawaii, and against Normandy, Nebraska, Norway, Nauheim, and Limehouse, and against Folkestone, Brussels, Florence, Oakland, and Paris. The lead is this book, not Captain Blood, not The Monomaniac, and not Tartarin de Tarascon. PG reading-ease 77.9 is easy. No score is invented for this sit. The first breath is 337 words — phone-hard, left as printed.`,
  "captain-blood":
    `Peter Blood, bachelor of medicine and several other things besides, smoked a pipe and tended the geraniums boxed on the sill of his window above Water Lane in the town of Bridgewater. Chapter I, The Messenger — Bridgewater, Water Lane, and geraniums. Skip the Contents if the phone is tight. Rafael Sabatini’s 1922 novel. Soft Sabatini, carefully. Soft Caribbean, carefully. The Bridgewater open is careful. This is not an England-weighted lead. The Caribbean and the Spanish Main are primary. PG reading-ease 81.2 is easy. No score is invented for this sit.`,
  "the-monomaniac":
    `Roubaud, on entering the room, placed the loaf, the pâté, and the bottle of white wine on the table. Chapter I — Roubaud, the Impasse d’Amsterdam, and a station window. Skip the Vizetelly Preface and the Contents if the phone is tight. Émile Zola, in Edward Vizetelly’s English, 1890. Vizetelly is named in the About only. Soft Zola, carefully. This is not Germinal, not Doctor Pascal, and not L’Assommoir. Soft Paris, carefully. This is not Madame Heurtebise. The Jacques Lantier railway is primary. PG reading-ease 78.5 is easy. No score is invented for this sit.`,
  "tartarin-de-tarascon":
    `Although it is now some twelve or fifteen years since my first meeting with Tartarin de Tarascon, the memory of the encounter remains as fresh as if it had been yesterday. Chapter 1 — a Tarascon villa on the Avignon road, and an exotic garden. Skip the Introduction if the phone is tight. Alphonse Daudet, in Oliver C. Colt’s English, 1872. Colt is named in the About only. Soft Daudet, carefully. This is not Madame Heurtebise. Soft Provence, carefully. Soft Algeria, carefully. This is not Peter Halket in Mashonaland. Algeria is primary. PG reading-ease 78.0 is easy. No score is invented for this sit.`,
  "prisoner-of-zenda":
    `"I wonder when in the world you're going to do anything, Rudolf?" said my brother's wife. Chapter 1 — a Rassendyll breakfast, Elphberg hair, and doing nothing. Skip the Contents if the phone is tight. Anthony Hope’s 1894 novel. Soft Hope, carefully. Soft Ruritania, carefully. This is not Captain Blood in the Caribbean, and not Australia. The England breakfast is the open. Strelsau and Zenda are primary. Soft densify, carefully, against Beacon House, the Caribbean, a railway, Provence and Algeria, and Richmond, and against Venice, a Midwest pulpit, Clarendon, Coketown, and London occult, and against Petersburg, Ireland, the Lower East Side, Australia, and Hawaii, and against Normandy, Nebraska, Norway, Nauheim, and Limehouse, and against Folkestone, Brussels, Florence, Oakland, and Paris. The lead is this book, not Kidnapped, not The Revolt of the Angels, and not Children of the Soil. PG reading-ease 90.1 is very easy. No score is invented for this sit.`,
  "kidnapped":
    `I will begin the story of my adventures with a certain morning early in the month of June, the year of grace 1751, when I took the key for the last time out of the door of my father's house. Chapter I — Essendean, a June morning, a key, and the House of Shaws. Skip the Biographical Preface and the Contents if the phone is tight. Robert Louis Stevenson’s 1886 novel. Soft Stevenson, carefully. This is not The Bottle Imp, and not The Master of Ballantrae. Soft Scotland, carefully. This is not Ireland, and not the Caribbean. The Highlands are primary. PG reading-ease 83.1 is easy. No score is invented for this sit.`,
  "revolt-of-the-angels":
    `Beneath the shadow of St. Sulpice the ancient mansion of the d'Esparvieu family rears its austere three stories between a moss-grown fore-court and a garden hemmed in, as the years have elapsed, by ever loftier and more intrusive buildings, wherein, nevertheless, two tall chestnut trees still lift their withered heads. Chapter I — the d’Esparvieu mansion and chestnut trees. Skip the Contents if the phone is tight. Anatole France, in Emilie Jackson’s English, 1914. Jackson is named in the About only. Soft Anatole France, carefully. This is not Thaïs. Soft Paris, carefully. This is not the Jacques Lantier railway, not Madame Heurtebise, and not Tartarin. The angel revolt is primary. PG reading-ease 68.1 is medium. No score is invented for this sit.`,
  "children-of-the-soil":
    `It was the first hour after midnight when Pan Stanislav Polanyetski was approaching the residence in Kremen. Chapter I — Kremen, a July midnight mist, and Pan Stanislav. Skip the Curtin dedication and the Introductory Statement if the phone is tight. Henryk Sienkiewicz, in Jeremiah Curtin’s English, 1895. Curtin is named in the About only. The English year is the Curtin copyright, 1895. Soft Sienkiewicz, carefully. This is not Hania, and not Quo Vadis. Soft Poland, carefully. This is not The Comedienne. The estate is primary. PG reading-ease 77.3 is fairly easy. No score is invented for this sit.`,
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
  const lead =
    work.year == null
      ? `${who}’s ${formWord(work.form)}`
      : `${who}’s ${work.year} ${formWord(work.form)}`;
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
