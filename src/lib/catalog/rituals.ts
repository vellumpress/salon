import { SHELF, type ShelfWork } from "./shelf.ts";
import { isLocalBound } from "./full-pdf.ts";
import { mixSeed, pinThenShuffle } from "../recommend.ts";
import { SERIALIZE_LANE_ID } from "./serialize.ts";

/** Ritual lanes — LE-polished local binds only (Gutenberg-only stay searchable elsewhere). */
export type RitualLane = {
  id: string;
  label: string;
  /** One-line blurb for the lane chip context (optional, unused in UI for now). */
  hint?: string;
  /** Ordered shelf work ids; missing / non-LIVE ids are skipped at resolve time. */
  workIds: string[];
};

/** Synopsis-style ritual pitches under each title (worldly NYC, concrete). */
export const RITUAL_PITCHES: Record<string, string> = {
  "the-wild-swans-at-coole":
    "Yeats returns to Coole’s autumn lake and counts the swans that will not stay. The poems hold rooms, roads, and the chill of what will not come again.",

  "kwaidan-stories-and-studies-of-strange-things":
    `One tale only: The Story of Mimi-Nashi-Hōïchi. More than seven hundred years after a drowned clan haunted the Straits of Shimonoséki, a blind minstrel named Hōïchi is about to be summoned by listeners who aren’t quite alive. Lafcadio Hearn’s 1904 ghost tale opens on Dan-no-ura—demon-fires on the water, a temple built to quiet the dead. Stop at the tale boundary.`,
 "the-listeners-and-other-poems":
    "A traveler knocks at a moonlit house that never answers. De la Mare’s poems keep the hallway listening after the footsteps fade.",
  "the-empty-house-and-other-ghost-stories":
    "Blackwood’s empty rooms still know you’ve crossed the threshold. Quiet dread in old houses — less jump-scare than a draft that will not leave.",
  "dark-of-the-moon":
    "Teasdale’s night lyrics for the hour when the mind won’t quiet. Short poems of love, weather, and the dark between streetlamps.",
  "love-songs":
    "Brief Teasdale lyrics you could tuck under a pillow — loveliness for sale, then the bill. Tenderness that knows it won’t last the night.",
  wallpaper:
    "A rented room, a yellow pattern, and a mind under careful watch. Gilman’s short shock of domestic confinement — go gently; it doesn’t let go.",
  "the-house-of-souls":
    "Machen’s occult stories blur at the edges of ordinary London evenings. Strange houses, stranger doors — atmosphere first, explanation last.",
  "michael-robartes-and-the-dancer":
    "Yeats at midnight: dance, opinion, and the occult arguing in the same room. Compact poems that turn on a phrase and won’t settle.",
  "the-rubaiyat-of-omar-khayyam":
    "FitzGerald’s Omar wakes in the bowl of night and pours the morning wine. Quatrains of time, dust, and appetite — a clear head before the day begins.",
  "spring-and-all":
    "Williams on the road to the contagious hospital, watching the first green push through. Spring as fact, not metaphor — cold air, then life.",
  "a-few-figs-from-thistles":
    "My candle burns at both ends. This sit is First Fig and Recuerdo — the ferry, the apples, the subway fare — about five minutes. Each poem is its own chapter; the book continues.",
  "a-hero-of-our-time":
    "Travelling post from Tiflis into the Koishaur Valley at sunset — a dukhan crowd and a caravan of camels. Imperial Caucasus violence in Bela; Host may name it, and don’t sanitize. Skip the translators’ foreword; the novel continues.",
  "strange-tales":
    "A Kiang-si gentleman and Mr. Chu step into a monastery chapel and find a painted wall: Chih Kung, and a fairy picking flowers. Skip the Giles introduction. This sit is The Painted Wall only; the studio continues.",
  "short-stories-from-the-balkans":
    "Leiba Zibal waits under the roof at Podeni for a stage that is already an hour late. Easter Candles only — never Brother Cœlestin. A later pogrom densifies; do not open there.",
  "the-awakening":
    "A green and yellow parrot at Grand Isle keeps repeating Allez vous-en. The sit is the Pontellier gallery, Chapter I. The novel continues; the selected shorts stay out.",
  tropic:
    "The whistle blew for eleven o'clock. One tale: Drought — a white hillside quarry, then Coggins Rum, then the walk home through the marl. Stop at the tale boundary. Heat, labor, and racial violence are in the stretch; name them if you Host further, and don’t sanitize.",
  "there-is-confusion":
    "Joanna climbs onto her father’s knee and asks for a story about somebody great. The sit runs through Mammy’s chair and stops when she wants a man who put out a fire. Chapter I continues. Fauset’s 1924 novel.",
  "pointed-roofs":
    "Miriam leaves the gaslit hall and goes slowly upstairs, the Saratoga trunk already in the firelight, deciding what she will say to the Fraeulein. Skip the Beresford introduction. The sit stops on governessing and old age. Richardson’s 1915 novel, Pilgrimage volume 1 only.",
  "the-rise-of-silas-lapham":
    "When Bartley Hubbard interviews Silas Lapham for the Solid Men of Boston series, Lapham receives him in his private office. The sit stops when Bartley cuts in on the mineral paint. Howells’s 1885 novel continues.",
  indiana:
    "On a cool, rainy evening in a small château in Brie, Colonel Delmare watches the fire. Skip the prefaces. Ives’s English of Sand’s 1832 novel. The sit stops on the dim interior. This is not the Arcade of the Pont Neuf.",
  "the-book-of-wonder":
    "Come with me, ladies and gentlemen who are in any wise weary of London. Preface, then The Bride of the Man-Horse only — stop when the silver horn sounds the wedding bells. One story this sit; the cycle continues.",
  buddenbrooks:
    "“And--and--what comes next?” Lübeck, the Mengstrasse house, Part One, Chapter I. This bind is the whole Lowe-Porter text of PG 72961. The novel continues.",
  "miss-lulu-bett":
    "The Deacons were at supper. A tulip under the gas jet, and creamed salmon. Chapter I, April — a Midwest house. Skip the contents. Gale’s novel, inventory Appleton 1920 / the 1921 header. Soft Midwest is new. Inventory is easy. No score is invented for this sit. The For you seat stays.",
  color:
    "I doubt not God is good, well-meaning, kind. Open Yet Do I Marvel, then Incident — a Baltimore memory that speaks a slur; warn the room before that poem. Each poem is its own chapter; the book continues.",
  "songs-of-innocence-and-of-experience":
    "Blake’s paired songs: nursery light on one side, harder truths on the other. Read them as morning weather — clear, then clouded.",
  "second-april":
    "April returns and Millay asks what for. Frogs, spring streets, and the work of starting over after a year that already spent you.",
  "renascence-and-other-poems":
    "A young Millay climbs a mountain of sky and comes back changed. Infinite space, then the small room of the self — still electric.",
  "mountain-interval":
    "Frost’s yellow wood, two roads, and the talk that gets you going. New England intervals — work, weather, and choices that look simple from here.",
  gitanjali:
    "Phone-clear devotion lyric. Skip the Yeats introduction — open on poem 1.",
  harmonium:
    "A mind of winter: frost, junipers, and the nothing that is. Open The Snow Man only — never Earthy Anecdote.",
  "a-hundred-and-seventy-chinese-poems":
    "Gentler China lyrics for a night sit. Open the Winter Night pack — not Battle.",
  bliss:
    "Desire floor lands hard; the open ends on the radiant mirror. Keep the dinner-party turn in the full story — that is the knife, not homework to soft-cut. Open on title story Bliss only — never Prelude.",
  dubliners:
    "North Richmond Street, being blind, was a quiet street except when the Christian Brothers’ School set the boys free. This sit is Araby only — through the bazaar, and stop when his eyes burn with anguish and anger. One story; the cycle continues — this is not Irish Fairy Tales.",
  "martin-bircks-youth":
    "Childhood dream: a green twilight garden, then the flower that turns red. Skip the Stork preface. Ship the 1930 English only.",
  "songs-of-kabir":
    "Kabir, through Tagore’s English: mystic poems that don’t need a church. Straight talk about God, dust, and the body walking between them.",
  "pictures-of-the-floating-world":
    "Lowell’s lacquer prints and quiet looking — Japan as color, surface, and pause. Poems that invite you to stand still and see.",
  silhouettes:
    "At Dieppe after sunset—the sea quieted, grape-flush on the clouds, a sickle moon and one gold star. Silhouettes opens on atmosphere, not argument. Arthur Symons’s 1892 seaside lyrics — a short After Sunset sit before sleep.",
  "the-garden-party-and-other-stories":
    "Very early morning. Crescent Bay is hidden under a white sea-mist until the shepherd is out of sight. At the Bay, part I only — one story this sit. The title story is a later sit in the same book, and this is not Bliss.",
  "bliss-and-other-stories":
    "More Mansfield rooms where the furniture shimmers and then stings. Marriage, desire, and the sentence that rearranges the afternoon.",
  "miss-brill-adapted":
    "She dresses for the audience she thinks she’s in — camel coat, fake-fur scarf, earbuds with nothing playing — until a couple on her bench tells the afternoon what she is. After Mansfield, Miss Brill, 1920.",
  "prefer-not":
    "A mild refusal becomes the office’s true architecture—and pity learns the shape of its limits. After Melville, Bartleby, 1853.",
  "late-season":
    "Off-season Yalta, a small white dog, and an affair that refuses to stay temporary once Moscow proves too small for what began. After Chekhov, The Lady with the Dog, 1899.",
  "between-the-drop-and-the-water":
    "The rope fails—or seems to—until the Hudson remembers what it meant. After Bierce, An Occurrence at Owl Creek Bridge, 1890.",
  "the-pattern":
    "Confined for her own good, she learns the wallpaper until the crawl is the only way out—calm, not thriller. After Gilman, The Yellow Wallpaper, 1892.",
  "bliss-tokyo":
    "Omotesando gold, a flowering pear on a terrace, and a young wife's perfect evening that turns on a single glance. After Mansfield, Bliss, 1918.",
  "open-window-singapore":
    "A nervous rest-cure visitor, a black-and-white bungalow off Bukit Timah, and a girl's exquisite lie about men who never came back from the green. After Saki, The Open Window, 1914.",
  "story-of-an-hour-buenos-aires":
    "A Recoleta apartment, a careful message about a crash, and one quiet hour in which a woman tastes a future that is not a room with one window. After Chopin, The Story of an Hour, 1894.",
  "masque-rio":
    "A sealed hillside compound above Rio, seven rooms of curated light, and a guest who does not RSVP to plague. After Poe, The Masque of the Red Death, 1842.",
  "boule-de-suif-istanbul":
    "A delayed van out of Kadıköy, a cabin of respectable passengers, and one woman whose generosity is spent and then despised. After Maupassant, Boule de Suif, 1880.",
  "the-nose-cape-town":
    "A Sea Point assessor wakes without his nose; on Long Street the missing feature has better meetings than he does. After Gogol, The Nose, 1836.",
  "garden-party-barcelona":
    "A Sarrià lawn, a marquee, and leftovers carried down to a death the party refused to see. After Mansfield, The Garden Party, 1922.",
  "usher-prague":
    "A villa above the Vltava, a twin sealed too soon, and a house that shares one death. After Poe, The Fall of the House of Usher, 1839.",
  "araby-seville":
    "A Triana crush, a promise at the night bazaar, and the ordinary failure of wanting. After Joyce, Araby, 1914.",
  "body-of-this-death":
    "Bogan on flesh, desire, and what it costs to keep living in a body. Spare, exact poems — no soft focus on the wound.",
  orlando:
    "Woolf’s Orlando outlives a century and changes sex along the way. Biography as carnival — fashion, poetry, and time refusing to stay put.",

  "the-weary-blues":
    `Harlem, late night—a piano that won’t quit, and a young poet listening hard. Langston Hughes’s 1926 first book opens with Proem (“I am a Negro”), then the title poem and a short run of cabaret pieces. Blues and jazz aren’t decoration here; they’re the beat the lines move to.`,
  cheri:
    "Léa’s wrought-iron bed; Chéri wants the pearls. Janet Flanner’s English is the only bind, with no catalog number invented. Desire and the kept boy stay in the sit — do not sanitize — and it stays soft against Bel-Ami.",
  dalloway:
    "One London day: Clarissa buys the flowers herself and walks the city awake. Parties, memory, and the war still echoing in the street.",
  "north-of-boston":
    "Frost north of Boston — pasture springs, stone walls, and talk that turns. Narrative poems of neighbors who say less than they mean.",
  "chicago-poems":
    "Sandburg’s big-shouldered city for the stride: hog butcher, tool maker, stacker of wheat. Poems that match the pace of the elevated.",
  "harlem-shadows":
    "McKay walking Harlem and the wider world — desire, exile, and the street that looks back. Lyric heat under cold city weather.",
  "sour-grapes":
    "Williams again on the street: spring returns, sour and exact. Short poems of looking hard at what is already in front of you.",
  precipitations:
    "Evelyn Scott’s midnight worship at Brooklyn Bridge and other sudden weathers. Modernist flashes — city, body, and storm in the same breath.",
  "spoon-river-anthology":
    "Masters’ village speaks from under the hill — epitaphs that refuse to flatter the living. Small-town America, voice by voice, after the fact.",
  "death-comes-for-the-archbishop":
    "ONE afternoon in the autumn of 1851 a solitary horseman pushes through central New Mexico. Skip the Rome prologue. Open Book One, The Cruciform Tree.",
  banjo:
    "Heaving along the Marseilles breakwater, Banjo carries the Ditch. McKay’s 1929 beach-boy dialect stays as written — do not sanitize.",
  anandamath:
    "A hot day in Padachinha, 1176 B.S-. Sen-Gupta’s 1906 Abbey of Bliss, not Poison Tree. Bengali year marks stay, and no catalog number is invented.",
  "african-tragedy":
    "Two reasons made Robert Zulu leave teaching at Siam Village School. Stop at the end of Chapter I. Lovedale’s mission frame moralizes town life — name that blind-spot, and do not sanitize.",
  demian:
    "Two worlds pass through a little-town Latin school — home of clean clothes and Christmas, and rooms of secrecy. Childhood two-worlds map — not the later Abraxas sermon. Priday 1923 EN only.",
  "the-getting-of-wisdom":
    "Four children on the grass: a prince, a golden crown, and a silk dress already dirty at the hem. School-status novel, not a children's book — Melbourne Ladies' College is the sit.",
  "copper-sun":
    "Cullen on beauty, grief, and the dark tower. Harlem Renaissance verse that holds shine and mourning in the same hand.",
  "the-black-christ-and-other-poems":
    "Cullen’s faith and mourning in Harlem Renaissance verse. Sacred story rewritten for a city that knows both hymn and grief.",
  "helen-of-troy-and-other-poems":
    "Teasdale on love that already left — Helen, flights, and the rooms that keep the echo. Early lyrics of longing without theatrics.",
  "flame-and-shadow":
    "Teasdale’s grief poems that still catch the light. Flame, shadow, and the after-image of someone who won’t walk back through the door.",
  passing:
    `Irene Redfield sorts her morning mail in Harlem and finds a thin envelope in purple ink—no return address, a hand she knows at once. Clare Kendry, the childhood friend who slipped into another world, is writing again. Nella Larsen’s 1929 New York novel opens on that letter, still unopened, and the careful life it threatens to unsettle.`,
  "enchanted-april":
    `February rain on Shaftesbury Avenue. An uncomfortable club. Mrs. Wilkins, down from Hampstead to shop, picks up The Times and lets her eye drift the Agony Column—until one notice catches: wistaria and sunshine, a small mediaeval Italian castle to let for April, servants included.`,
  "mr-fortunes-maggot":
    `One convert in three years on Fanua—and the Reverend Timothy Fortune is not flustered. Humility has made him easy-going.`,
  "the-bridge-of-san-luis-rey":
    `Five travellers fall from a Peruvian bridge — Wilder asks whether those lives were accident or intention.`,
  quicksand:
    `Eight in the evening, soft gloom, one shaded lamp—Helga Crane sits alone in her Naxos room and will not open the door. Quicksand begins in intentional isolation after a taxing day among an unkind faculty. Nella Larsen’s 1928 novel is the full book — Chapter I through XXV — with Copenhagen ahead.`,
  "attendants-confession":
    `A marked man offers a human document—and asks you not to publish it until he’s dead. Machado’s attendant begins in confidence and already smells of the grave.`,
  rashomon:
    `Evening under Rashōmon—one lackey waiting out the rain, and no one else in the gate. Akutagawa’s Kyoto opens on desolation before the crime story blooms.`,
  "high-wind-jamaica":
    `This sit opens on Jamaica after Emancipation: plantation ruins, bush up to the door, Derby Hill held open by a rank plant, then Ferndale. Hughes’s 1929 voice uses period racial language in this stretch — flag, do not sanitize. Stop after the Ferndale frame so the timed sit stays bounded; if you Host further into the chapter, warn the room first.`,
  "noli-me-tangere":
    `Capitan Tiago announces a dinner at the last minute in Binondo and the Walled City. The closed sit is Chapter I only — colonial friar power; Host may name it, and don’t sanitize.`,
  vera:
    `Cornwall, noon heat, a garden gate, and a daughter who has lost everything—and feels nothing yet. Same author as Enchanted April, colder register. Wemyss intensifies later; this open stays clean emptiness.`,
  "on-a-chinese-screen":
    `She takes a holy temple and papers it into Cheltenham—blue curtains for her eyes, pink stripes, an American stove where the Buddha sat.`,
  futility:
    `When the Simbirsk of the Russian Volunteer Fleet vanishes, carrying three sisters toward Shanghai, the hotel room still has a dirty table-cloth. The preface stays out. This is not a Kristiania attic.`,
  "the-comedienne":
    `Bukowiec station on the Dombrowa railroad, a winding line among beech and pine hills. Skip the Publishers’ Note. Obecny’s English of Reymont. The novel continues.`,
  "the-moon-and-sixpence":
    `I confess that when first I made acquaintance with Charles Strickland I never for a moment discerned that there was in him anything out of the ordinary. Yet now few will be found to deny his greatness. The sit stops when the Rev. Robert Strickland’s biography is named as an attempt to remove misconceptions. Maugham’s 1919 novel. Tahiti later is not Hong Kong and not a London medical apprenticeship. If you Host further, the Tahiti stretch uses period racial language — flag, do not sanitize.`,
  "my-brilliant-career":
    `“Boo, hoo!” — the first recollection, then gum-trees and the salt-shed at Possum Gully. Skip the special notice and the England preface. Franklin’s 1901 novel. Australia, the preferred bush window. Later chapters use period words for Aboriginal people and Chinese workers — flag, do not sanitize.`,
  "the-plumed-serpent":
    `Sunday after Easter, the last bull-fight of the season in Mexico City, and Kate’s heart sank. Skip the contents and the reprint notes. Lawrence’s 1926 novel. Mystic-expat Mexico, not a revolution in the sierra and not Pamplona. If you Host further into the bullfight, “half-savage” and later “aboriginal” are period racial language — flag, do not sanitize.`,
  "the-red-room":
    `An evening in the beginning of May. The little garden on Moses Height, on the south side of Stockholm, and the wind over the town. Skip the same-author list and the contents. Schleussner’s English (Swedish 1879, Latimer 1913). Stockholm bohemia, not a Kristiania attic, and not Inferno.`,
  "african-farm":
    `The full African moon poured down its light from the blue sky into the wide, lonely plain. Stunted karoo bushes and milk-bushes follow in the white light, then a solitary kopje of ironstones. Stop before the farm household densifies.`,
  "a-passage-to-india":
    `Skip the dedication. Chandrapore presents nothing extraordinary except the Marabar Caves, twenty miles off. Stop after the civil station and those extraordinary caves. The novel continues through Mosque, Caves, and Temple.`,
  mhudi:
    `Two centuries ago the Bechuana tribes inhabited the land between Central Transvaal and the Kalahari Desert. Stop before the Matebele invasion densifies. Lovedale, 1930. The novel continues.`,
  maria:
    `A boy is sent from home to a college in Bogotá, and his sister’s lock of hair is already a farewell. Stop before the six-year return. Ogden’s English, 1890, distinct from Marianela.`,
  "bel-ami":
    `After changing his five-franc piece Georges Duroy left the restaurant. Stop after the pocket-money on Rue Notre Dame de Lorette, before Forestier densifies. French 1885.`,
  magnhild:
    `Skip the Preface. High mountains, the remnants of a storm, then the fjord. Stop after the name Magnhild is shouted. Magnhild only.`,
  marianela:
    `The sun had set. After the brief interval of twilight the night fell calm and dark, and in its gloomy bosom the last sounds of a sleepy world died gently away. The traveller went forward on his way, hastening his step as night came on; the path he followed was narrow and worn by the constant tread of men and beasts, and led gently up a hill on whose verdant slopes grew picturesque clumps of wild cherry trees, beeches and oaks.--The reader perceives that we are in the north of Spain.`,
  "on-the-seaboard":
    `A fishing boat lay one May evening to beam-wind, out on Goosestone bay. "Rokarna," known to all on the coast by their three pyramids, were changing to blue, while upon the clear sky clouds were forming just as the sun began to sink. The first sit stops after the Surveyor at the tiller.`,
  "poison-tree":
    `His wife makes him promise: if a storm rises, leave the boat. On the Ganges in Joisto, the weather keeps that promise.`,
  "trooper-peter-halket":
    `A lone Chartered Company trooper on a Mashonaland kopje, fire quivering, inventing gold companies in the dark after losing his column. Written in 1897, the open already frames colonial scouting; missionary and racial language harden after the night-watch open-at—before the stranger arrives. If you Host further, name that colonial frame up front.`,
  "the-home-and-the-world":
    `Mother’s vermilion mark, a red-bordered *sari*, and a daughter furious with her mirror who wanted to be an ideal wife. The sit is Bimala’s story in the Rajah’s house. This is not Anandamath.`,
  "where-angels-fear-to-tread":
    `Charing Cross chaos — Lilia laughing like royalty while Philip floods her with little towns to see: Gubbio, Pienza, Monteriano. The sit stops on the foot-warmer. The short novel continues.`,
  "the-gadfly":
    `Pisa seminary heat — a lost sermon page, a caressing *Padre*, and a fruitseller calling *Fragola!* down the street. Later violence comes after this sit. It stays soft against Enchanted April: Risorgimento Italy, not the manners comedy.`,
  "the-immoralist":
    `Faithful friends summoned to a distant house — Michel can free himself; he cannot yet say what freedom is for. The sit opens on the frame letter and stops on the freedom line.`,
  "the-hidden-force":
    `The full moon wore the hue of tragedy that evening — a blood-red ball behind the tamarind-trees in the Lange Laan, then the Residency far back in its grounds. Skip the translator’s note. The sit stops at the town-clock. Teixeira’s English of the Java novel. This is not The Hague.`,
  hunger:
    `It was during the time I wandered about and starved in Christiania. The attic clock strikes six. Skip the introduction. Egerton’s English of the city hunger. This is not Growth of the Soil.`,
  "jude-the-obscure":
    `The schoolmaster was leaving the village, and everybody seemed sorry. A tilted cart out of Marygreen. Hardy’s Wessex novel continues. This is not Tess.`,
  "casanovas-homecoming":
    `Casanova was in his fifty-third year. Though no longer driven by the lust of adventure that had spurred him in his youth, he was still hunted athwart the world. The opening — the fifty-third year, a wounded bird, and the Supreme Council. Skip the front matter. Arthur Schnitzler, in Eden and Cedar Paul’s English, 1918. The German year is 1918; the English is 1922. Soft Vienna, carefully. This is not The Road to the Open or Bertha Garlan. Inventory 84 is medium. No score is invented for this sit.`,
  "letters-of-a-javanese-princess":
    `Kartini writes from colonial Java in 1899, hungry for the modern girl while age-long traditions hold her cloistered. Period phrases like “Indian world” and “pale sisters” mean the Indies and Western women — historical voice, not today’s usage. The Rituals sit is Letter I, the cloistered-arms beat; if you Host further, name that colonial frame for the room first.`,
  "blood-and-sand":
    `Gallardo’s bullfight-day breakfast: meat, black coffee, a huge cigar, and a dining room that treats the matador like family glory. Bullring gore and animal death are in the book; name them if you Host further, and don’t sanitize.`,
  ecstasy:
    `After dinner on the Scheveningen Road — rosewood, vieux-rose silk, an onyx lamp like a six-petalled flower — and a promise not to wake the boy.`,
  "an-outcast-of-the-islands":
    `A little excursion off the straight path — neatly done, quickly forgotten. Conrad’s Malay Archipelago world — colonial hierarchy and racialized language intensify after the open-at. If you Host further, name that frame for the room first.`,
  "the-underdogs":
    `Dog barking in the sierra — tortillas, a *cántaro*, a rifle under the mat — and hoofbeats in the quarry.`,
  "diary-of-a-chambermaid":
    `Twelfth place in two years — rainy September, *Figaro* ad, dirty souls, and no interview with Madame.`,
  "the-painted-veil":
    `Shuttered Hong Kong room after tiffin; someone tries the door; Kitty whispers “Walter.” Colonial household language (*amah*, “boys”) stays, and the sit opens on “How shall I get out?” The closed sit is Chapter I only — adultery and colonial heat; Host may name them, and don’t sanitize.`,
  "the-good-soldier":
    `This is the saddest story I have ever heard. Part I, Chapter I — the Ashburnhams and nine seasons at Nauheim. Skip the Contents. Ford Madox Ford’s 1915 novel. Soft England, carefully. This is not Kipps, and not Antic Hay. Soft Germany, carefully. This is not Smoke. Nauheim is primary. Inventory 72 is medium. No score is invented for this sit.`,
  "growth-of-the-soil":
    `The long moor road north; red-beard Isak with the first sack. The settler open uses the period word “Lapp” for Sámi herders on the common — Worster’s English only. Loneliness and land hunger — Host OK; if you Host further, keep that named for the room.`,
  "of-human-bondage":
    `A club foot, a medical student, and a love that humiliates on purpose. Skip the title matter and open Chapter I on the gray morning — Wake up, Philip — and keep the first sit to that chapter only. Sit with that weather before the first breath.`,
  "green-mansions":
    `Skip the Foreword. Now that we are cool, he said, and regret that we hurt each other, I am not sorry that it happened. Stop after the flight from the country into Guayana, then the forest.`,
  "jamaica-anansi-stories":
    `One great hungry time — the fish pot, and one tale only. Stop at the end of Tying Tiger. The collection stays on the shelf; the sit does not cross into the next tale.`,
  "hadji-murad":
    `I was returning home by the fields. It was midsummer; the hay harvest was over, and they were just beginning to reap the rye. Skip the editor’s notes and stop after the crushed thistle turns into the Caucasian episode.`,
  "nada-the-lily":
    `You ask for the youth of Umslopogaas and his love for Nada — and the old man who answers is not the name you think. Haggard’s Zulu epic is told through an invented oral narrator (Mopo) inside late-Victorian imperial romance — the White Man / Great Queen frame — and is not ethnographic authority or a substitute for Zulu-authored history. Name that frame for the room before you Host further, and do not sanitize mid-bind.`,
  "all-quiet-on-the-western-front":
    `Five miles behind the front — bellies full of beef and haricot beans, double sausage, and a cook who won’t stop ladling. This sit is the rest billet; later chapters bring trench violence and period enemy language, and you should not sanitize them. Warn the room if you Host further.`,
  we:
    `Cheeks burning — D-503 will straighten the wild curve into the wisest of lines, and call the record *We*.`,
  "the-story-of-gosta-berling":
    `The long lake, the mist, and the Värmland plains come before Gösta enters — Flach’s English, soft against Growth of the Soil. At last the priest is in the pulpit, and the parish remembers him reeling out of the inn.`,
  thais:
    `Part First — The Lotus. Nile banks dense with hermits’ huts — clay, crosses, bread and hyssop after sunset — and stranger caves beyond. Desire and conversion irony intensify after this atlas-like open; warn the room if you Host into Paphnutius / Thaïs.`,
  "bunner-sisters":
    `Stuyvesant Square side-street; a basement shop; blotchy gold on a black sign; horse-car pace. Poverty and manners without ballroom gloss — Host OK. The sit stays on Part I.`,
  "bread-givers":
    `Potato peel; Bessie home without work; rent hollering. Soft against Bunner Sisters. Poverty and an Old World father — Host OK.`,
  "bertha-garlan":
    `She takes the vine-path hillside with the boy, straw hat, near six o’clock. Widow desire — Host OK. No translator is named on this sit.`,
  "after-the-divorce":
    `Nineteen Hundred and Seven. In the strangers’ room of the Porru house a woman sat crying. Chapter I — the courtyard cricket. Skip the St Luke epigraph. Deledda, in Maria Hornor Lansdale’s English, Italian 1902 / 1905. Sardinia is not Sicily. No score is invented for this sit.`,
  "white-nights":
    `It was a wonderful night — the dreamer’s starry Petersburg. First Night only, and not Notes from Underground.`,
  "west-african-folk-tales":
    `In the olden days all the stories which men told were stories of Nyankupon, the chief of the gods. This sit is How We Got the Name ‘Spider Tales’ only — Nyankupon, Anansi, and a jar of bees. Skip the contents, the introduction, and the other tales. W. H. Barker and Cecilia Sinclair’s 1917 book. One tale this sit; the cycle continues. Soft Gold Coast, carefully. This is not Caribbean Anansi. Notion is easy. Launch shelf is no.`,
  candide:
    `In a castle of Westphalia, belonging to the Baron of Thunder-ten-Tronckh, lived a youth. Chapter I — the castle, Thunder-ten-Tronckh, and Candide expelled. Skip the Modern Library introduction and the Beerbohm cartoon note. Voltaire’s 1759 novel. Soft Westphalia is not the Mann court. The lead is this book, not Aphrodite and not Iola Leroy. Inventory is easy. No translator is invented for this sit. No score is invented for this sit.`,
  "iola-leroy":
    `"Good mornin', Bob; how's butter dis mornin'?" Chapter I — market speech, butter fresh, and the prayer-meeting. Skip the dedication. Frances E. W. Harper’s novel, 1892; the title page says 1893. Soft US South toward the North, carefully, after Bernice and the earlier American sits. This is not Dunbar and not Chesnutt. Inventory is medium. No score is invented for this sit.`,
  "esther-waters":
    `She stood on the platform watching the receding train. Chapter I — the platform, the receding train, and a faded yellow dress. Skip the produced-by credit. George Moore’s novel, 1894; the imprint says 1899. Soft England servant life, carefully. This is not The Heavenly Twins. Inventory is medium. No score is invented for this sit.`,
  aphrodite:
    `On the quay at Alexandria a singing-girl was standing singing. Book I, Chapter II — the quay, the flute-girls, and the white parapet. Skip the author’s preface and the denser first chapter. Pierre Louÿs’s 1896 novel. Soft Alexandria. No translator is invented for this sit. Inventory is medium. Later is all right if the sit is sensual — do not inflate it. No score is invented for this sit.`,
  erewhon:
    `If the reader will excuse me, I will say nothing of my antecedents. Chapter I, Waste Lands — a sheep-farm, waste crown-land, and leaving his native country. Skip the 1901 preface. Samuel Butler’s 1872 novel. Soft New Zealand, a nowhere-colony, after Westphalia. This is not Candide’s world-tour. The lead is this book, not Ann Veronica, not The Great Hunger, and not The Mysterious Stranger. Inventory is medium. No score is invented for this sit.`,
  "ann-veronica":
    `One Wednesday afternoon in late September, Ann Veronica Stanley came down from London. Chapter I — the Wednesday train, Morningside Park, and a father confrontation. Skip the produced-by credit. H. G. Wells’s 1909 novel. Soft England New Woman, carefully. This is not Esther Waters. Notion is easy. Launch shelf is no — do not inflate it.`,
  "the-great-hunger":
    `For sheer havoc, there is no gale like a good northwester. Chapter I — the gale, spindrift, a rocky fjord, and fisher huts. Skip the produced-by credit. Johan Bojer’s novel, in W. J. Alexander Worster and C. Archer’s English, Norway 1916. Soft Norway, carefully. This is not Hamsun. Inventory is medium. No score is invented for this sit.`,
  "the-mysterious-stranger":
    `It was in 1590—winter. Austria was far away from the world, and asleep. Chapter 1 — Eseldorf. Skip the other tales. Mark Twain’s 1916 novella only. Soft Austria, carefully. This is not Schnitzler’s Vienna. Notion is easy. Launch shelf is no — do not inflate it.`,
  "children-of-the-frost":
    `Old Koskoosh listened greedily. This sit is The Law of Life only — Old Koskoosh, Sit-cum-to-ha, the dogs, and a camp that must be broken. Skip the contents and the other tales. Jack London’s 1902 book. One tale this sit; the cycle continues. Soft Yukon, carefully, after the earlier American sits. Inventory is easy. No score is invented for this sit.`,
  "the-poison-tree":
    `Nagendra Natha Datta is about to travel by boat. It is the month Joisto, the time of storms. Chapter I, Nagendra’s Journey by Boat — Surja Mukhi and the boat to Calcutta. Skip the Arnold preface. Bankim Chandra Chatterjee, in Miriam S. Knight’s English, Bengali 1873 / English 1884. Soft Bengal domestic, carefully. This is not Tagore’s Home and the World. The lead is this book, not Cosmopolis, not The Woman Who Did, and not Billy Budd. Inventory is medium. No score is invented for this sit.`,
  cosmopolis:
    `Although the narrow stall, flooded with heaped-up books and papers, left the visitor just room enough to stir. Chapter I, A Dilettante and a Believer — Ribalta, the Place d’Espagne, and Rome. Skip the Lemaître introduction and the author’s introduction. Paul Bourget’s 1892 novel. Soft Rome, carefully. This is not Capri. No translator is invented for this sit. Inventory is medium. No score is invented for this sit.`,
  "the-woman-who-did":
    `Mrs Dewsbury’s lawn was held by those who knew it the loveliest in Surrey. Chapter I — yellow clover and the oak-clad Weald. Skip the preface. Grant Allen’s 1895 novel. Soft England free-love, carefully. This is not Ann Veronica. Inventory is easy. No score is invented for this sit.`,
  "billy-budd":
    `In the time before steamships, a stroller along the docks would notice the Handsome Sailor. This sit is Billy Budd, Foretopman only — Chapter I. Skip the other pieces. Herman Melville’s 1924 novella. Soft Melville, carefully. This is not White Jacket. Inventory is medium. No score is invented for this sit.`,
  "malay-sketches":
    `A quarter of a century ago there lived on the bank of a broad river, just where stream meets tide, a Malay Raja and his youthful wife. This sit is A Malay Romance only — Raja Maimûnah and the stream that meets the tide. Skip the contents and the other sketches. Frank Swettenham’s 1895 book; the printing is 1903. One tale this sit; the cycle continues. Soft Malaya, carefully. Colonial administration stays as printed. Notion is easy. Launch shelf is no — do not inflate it.`,
  "cousin-betty":
    `One day, about the middle of July 1838, a carriage known as Milords was driving down the Rue de l’Université. Opening — a National Guard captain. Skip the Cajetani dedication. Honoré de Balzac, in James Waring’s English, 1846. Soft Paris, carefully. This is not Eugénie Grandet’s Saumur. The lead is this book, not The Sorrows of Satan, not The King of Schnorrers, and not Hania. Inventory is medium. No score is invented for this sit.`,
  "the-sorrows-of-satan":
    `Do you know what it is to be poor? Section I — a threadbare suit and an upper-class carriage. Skip the Methuen edition list. Marie Corelli’s 1895 novel. Soft England, a Faustian story, carefully. This is not The Woman Who Did. Inventory is easy. No score is invented for this sit.`,
  "the-king-of-schnorrers":
    `In the days when Lord George Gordon became a Jew, and was suspected of insanity. Chapter I — Grobstock, the synagogue stream, a canvas bag, and spring sunshine. Skip the Foreword. Israel Zangwill’s 1894 picaresque, the King only. Soft London Sephardi, carefully. This is not Pale Bontzye. Inventory is medium. No score is invented for this sit.`,
  hania:
    `When old Mikolai on his death-bed left Hania to my guardianship and conscience. This sit is the Hania novella only — Chapter I, a Byzantine chapel, and snow on the wind. Skip the Prologue and the other pieces. Henryk Sienkiewicz, in Jeremiah Curtin’s English, Polish 1876 / English 1897. Soft Poland, carefully. This is not The Peasants. Inventory is medium. No score is invented for this sit.`,
  "the-toys-of-peace":
    `Harvey, said Eleanor Bope, handing her brother a cutting from a London morning paper. This sit is The Toys of Peace only — the National Peace Council and the peace toys. Skip the memoir, the contents, and the other papers. Stop at the end of the sketch. Saki’s 1919 book. One sketch this sit; the cycle continues. Soft Saki, carefully. This is not Reginald. Inventory is easy. No score is invented for this sit.`,
  "tess-of-the-durbervilles":
    `On an evening in the latter part of May a middle-aged man was walking homeward from Shaston to the village of Marlott. Phase the First, Chapter I — the Vale, Sir John, and Durbeyfield. Skip the Prefaces and the Explanatory Note. Thomas Hardy’s 1891 novel. Soft Wessex, carefully. This is not Jude. The lead is this book, not Captains Courageous, not Numa Roumestan, and not Dracula. Inventory 91 is medium. No score is invented for this sit.`,
  "captains-courageous":
    `The weather door of the smoking-room had been left open to the North Atlantic fog. Chapter I — the weather door, the fog, and the Cheyne boy. Skip the produced-by credit. Rudyard Kipling’s 1897 novel. Soft Grand Banks, carefully. This is not Melville’s naval fiction, not Kim, and not Quebec. Inventory 84 is easy. No score is invented for this sit.`,
  "numa-roumestan":
    `That Sunday was a scorching hot Sunday in July, at the yearly competitions. Chapter I, To the Arena — the amphitheatre at Aps, the July festival, and Numa. Skip the frontispiece copyright notes. Alphonse Daudet, in Charles De Kay’s English, French 1881. Soft Provence, carefully. This is not Cousin Betty’s Paris. Inventory 82 is medium. No score is invented for this sit.`,
  dracula:
    `3 May, Bistritz. Left Munich at 8:35 in the evening. Chapter I, Harker’s Journal — Bistritz and paprika hendl. Skip the Contents. The Host opens in Transylvania. Bram Stoker’s 1897 novel. Soft Transylvania, carefully. This is not Eseldorf in Austria. Inventory 81 is easy. No score is invented for this sit.`,
  "the-tug-of-love":
    `When Elias Goldenberg, Belcovitch’s head cutter, betrothed himself to Fanny Fersht. This sit is The Tug of Love only — Elias, Fanny, Sugarman, and the ring. Skip the ads, the contents, and the other stories. Stop at the end of the sketch. Israel Zangwill’s 1907 book. One sketch this sit; the cycle continues. Soft Zangwill, carefully. This is not The King of Schnorrers. Inventory 88 is medium. No score is invented for this sit.`,
  "the-house-of-the-seven-gables":
    `Halfway down a by-street of one of our New England towns stands a rusty wooden house, with seven acutely peaked gables. Chapter I, The Old Pyncheon Family — the by-street, the seven gables, and the Pyncheon Elm. Skip the Introductory Note and the Author’s Preface. Nathaniel Hawthorne’s 1851 novel. Soft Salem, carefully. Soft gothic, carefully. This is not Dracula. The lead is this book, not Heart of Darkness, not Toilers of the Sea, and not Indian Summer. Inventory 86 is medium. No score is invented for this sit.`,
  "heart-of-darkness":
    `The Nellie, a cruising yawl, swung to her anchor without a flutter of the sails. The opening — the Nellie, the Thames, and Gravesend, with the Congo primary after the frame. Skip the produced-by credit. Joseph Conrad’s 1902 novel. The book year is 1902; the serial is 1899. Soft Conrad, carefully. This is not Borneo. Soft Africa, carefully. Inventory 88 is medium. No score is invented for this sit.`,
  "toilers-of-the-sea":
    `Christmas Day in the year 182- was somewhat remarkable in the island of Guernsey. Snow fell on that day. Part I, A Word Written on a White Page — Christmas snow, St. Peter’s Port, and Vale. Skip the Everyman ads and the Rhys introduction. Victor Hugo, in W. Moy Thomas’s English, 1866. Soft Guernsey, carefully. This is not the Grand Banks. Soft France, carefully. This is not Provence or Paris. Inventory 87 is hard. No score is invented for this sit.`,
  "indian-summer":
    `Midway of the Ponte Vecchio at Florence, where three arches break the lines of the little jewellers' booths. Chapter I — the Ponte Vecchio, Colville, and the yellow Arno. Skip the produced-by credit. William Dean Howells’s 1886 novel. Soft Florence, carefully. This is not Capri, Sicily, or Sardinia. Soft Howells, carefully. This is not Silas Lapham. Inventory 82 is medium. No score is invented for this sit.`,
  "a-slav-soul":
    `The farther I go back in my memory of the past, the nearer I get to childhood. This sit is A Slav Soul only — childhood, Yasha, Matsko, and Bouton. Skip the Putnam introduction, the contents, and the other stories. Stop at the end of the sketch. A. I. Kuprin, in Rosa Savary Graham’s English, 1916. One sketch this sit. Soft Russia, carefully, after The Village and Virgin Soil. Inventory 84 is easy. No score is invented for this sit.`,
  "cabbages-and-kings":
    `They will tell you in Anchuria, that President Miraflores, of that volatile republic, died by his own hand in the coast town of Coralio. The Proem by the Carpenter — Miraflores and the Coralio mangrove. Skip the Walrus epigraph and the Contents. O. Henry’s 1904 novel. Soft Anchuria, carefully. This is not Jamaica, Gaspar Ruiz, the Purple Land, or the Four Horsemen. The lead is this book, not The Picture of Dorian Gray, not The Job, and not The Reign of Greed. Inventory 84 is easy. No score is invented for this sit.`,
  "picture-of-dorian-gray":
    `The studio was filled with the rich odour of roses, and when the light summer wind stirred amidst the trees of the garden. Chapter I — studio roses, lilac, and Lord Henry’s laburnum. Skip the Preface. Oscar Wilde’s 1891 novel. The book year is 1891; the magazine is 1890. Soft London, carefully. This is not Tess. Soft gothic, carefully. This is not Dracula or the House of the Seven Gables. Inventory 83 is easy. No score is invented for this sit.`,
  "the-job":
    `Captain Lew Golden would have saved any foreign observer a great deal of trouble in studying America. Chapter I — Captain Lew Golden and Panama, Pennsylvania, with Una’s office after the Pennsylvania frame. Skip the produced-by credit. Sinclair Lewis’s 1917 novel. Soft United States, carefully. This is not Salem. Inventory 85 is medium. No score is invented for this sit.`,
  "reign-of-greed":
    `One morning in December the steamer Tabo was laboriously ascending the tortuous course of the Pasig. Chapter I, On the Upper Deck — the Tabo, the Pasig, and La Laguna. Skip the Translator’s Introduction. José Rizal, in Charles E. Derbyshire’s English, 1891. The Spanish year is 1891; the English is 1912. Soft Philippines, carefully. This is not Noli Me Tangere or Suan. Inventory 85 is medium. No score is invented for this sit.`,
  "a-cross-line":
    `The rather flat notes of a man’s voice float out into the clear air, singing the refrain of a popular music-hall ditty. This sit is A Cross Line only — a music-hall ditty, a felled tree, and spring. Skip Beardsley, the dedication, the contents, and the other stories. Stop at the end of the sketch. George Egerton’s 1894 sketch. The imprint year is 1894; the copyright is 1893. One sketch this sit. Soft England, carefully. Soft New Woman, carefully. This is not Ann Veronica, The Woman Who Did, or The Heavenly Twins. Inventory 78 is easy. No score is invented for this sit.`,
  "shadow-of-the-cathedral":
    `The dawn was just rising when Gabriel Luna arrived in front of the Cathedral, but in the narrow street of Toledo it was still night. Chapter I — Gabriel Luna, the Piazza del Ayuntamiento, and del Perdon. Skip the Howells Introduction. Vicente Blasco Ibáñez, in Mrs. W. A. Gillespie’s English, 1903. The Spanish year is 1903; the English is 1909. Soft Spain, carefully. This is not the Four Horsemen. Soft Blasco, carefully. This is not the Four Horsemen. The lead is this book, not The Way of All Flesh, not The Family at Gilje, and not Resurrection. Inventory 84 is medium. No score is invented for this sit.`,
  "way-of-all-flesh":
    `When I was a small boy at the beginning of the century I remember an old man who wore knee-breeches and worsted stockings. Chapter I — Pontifex, Paleham, and knee-breeches. Skip the Streatfeild Preface. Samuel Butler’s 1903 novel. Soft England, carefully. This is not Dorian Gray or A Cross Line. Soft Butler, carefully. This is not Erewhon. Inventory 85 is medium. No score is invented for this sit.`,
  "family-at-gilje":
    `It was a clear, cold afternoon in the mountain region. Chapter I — a cold mountain afternoon, Christmas snow, and the captain’s house. Skip the Olson Introduction and the Preface. Jonas Lie, in Samuel Coffin Eastman’s English, 1883. The Norwegian year is 1883; the English is 1920. Soft Norway, carefully. This is not Bojer or Hamsun. Inventory 78 is medium. No score is invented for this sit.`,
  resurrection:
    `Though hundreds of thousands had done their very best to disfigure the small piece of land on which they were crowded together. Chapter I — spring in the town, the prison office, and 28 April. Skip the Translator’s Preface. Leo Tolstoy, in Louise Maude’s English, 1899. Soft Russia, carefully. This is not A Slav Soul, The Village, or Virgin Soil. Soft Tolstoy, carefully. This is not Hadji Murad. Inventory 85 is medium. No score is invented for this sit.`,
  widdershins:
    `The three or four “To Let” boards had stood within the low paling as long as the inhabitants of the little triangular “Square” could remember. This sit is The Beckoning Fair One only — To Let boards and an old red brick square. Skip the Contents and the other stories. Stop at the end of the tale. Oliver Onions’s 1911 tale. One tale this sit. Soft gothic, carefully. This is not Dracula or the House of the Seven Gables. Soft England, carefully. Inventory 83 is easy. No score is invented for this sit.`,
  typee:
    `Six months at sea! Yes, reader, as I live, six months out of sight of land. Chapter One — the Marquesas and Nukuheva. Skip the Preface. Herman Melville’s 1846 novel. Soft Pacific, carefully. This is not Tahiti after The Moon and Sixpence. Soft Melville, carefully. This is not White Jacket or Billy Budd. The lead is this book, not Kangaroo, not Casanova’s Homecoming, and not The Mother. Inventory 81 is medium. No score is invented for this sit.`,
  kangaroo:
    `A bunch of workmen were lying on the grass of the park beside Macquarie Street, in the dinner hour. Chapter I — Macquarie Street, a cream taxi, and the Torestin bungalow. Skip the Contents. D. H. Lawrence’s 1923 novel. Soft Australia, carefully. This is not the bush of My Brilliant Career or the Mexico of The Plumed Serpent. Soft Lawrence, carefully. Inventory 83 is medium. No score is invented for this sit.`,
  "the-mother":
    `To-night again Paul was preparing to go out, it seemed. Chapter I — Paul preparing, the wind barricade, and the orchard’s little door. Skip the Translator’s Note and the Preface. Grazia Deledda, in Mary G. Steegmann’s English, 1920. The Italian year is 1920; the English is 1923. Soft Sardinia, carefully. This is not Florence, Capri, or Rome. Soft Deledda, carefully. This is not After the Divorce. Inventory 79 is medium. No score is invented for this sit.`,
  "lord-arthur-saviles-crime":
    `It was Lady Windermere’s last reception before Easter, and Bentinck House was even more crowded than usual. This sit is Lord Arthur Savile’s Crime only — Lady Windermere’s last reception and Bentinck House. Skip the Contents and the other stories. Stop at the end of the tale. Oscar Wilde’s 1891 tale. One tale this sit. Soft Wilde, carefully. This is not Dorian Gray. Soft England, carefully. This is not The Way of All Flesh or A Cross Line. Soft gothic, carefully. This is not The Beckoning Fair One, Dracula, or the House of the Seven Gables. Inventory 79 is easy. No score is invented for this sit.`,
  "three-soldiers":
    `The company stood at attention, each man looking straight before him at the empty parade ground. Part One, I — the company, the empty parade ground, and cinder piles in a purple evening. Skip the Contents. John Dos Passos’s 1921 novel. Soft France, carefully. This is not Provence or Paris. Soft Dos Passos, carefully. The lead is this book, not Doctor Pascal, not In the World, and not Leila. Inventory 86 is medium. No score is invented for this sit.`,
  "doctor-pascal":
    `In the heat of the glowing July afternoon, the room, with blinds carefully closed, was full of a great calm. Chapter I — July blinds and Dr. Pascal’s press papers. Skip the Contents. Émile Zola, in Mary J. Serrano’s English, 1893. Soft Zola, carefully. This is not Theresa Raquin. Soft France, carefully. Plassans is not the war, and not Provence or Paris. Inventory 83 is medium. No score is invented for this sit.`,
  "in-the-world":
    `I went out into the world as shop-boy at a fashionable boot-shop in the main street of the town. Chapter I — the shop-boy, green teeth, and watery eyes. Skip the front matter. Maksim Gorky, in Gertrude M. Foakes’s English, 1916. The Russian year is 1916; the English is 1917. Soft Russia, carefully. This is not Resurrection, A Slav Soul, The Village, or Virgin Soil. Soft Gorky, carefully. Inventory 86 is medium. No score is invented for this sit.`,
  "leila":
    `Giovanni the footman calls Signorina from the dining-room, breathless, after the garden and the house. Chapter I, A Mystic Prelude — Signorina Leila, the chestnut grove, and Priaforà. Skip the Contents. Antonio Fogazzaro, in Mary Prichard Agnetti’s English, 1910. The Italian year is 1910; the English is 1911. Soft Italy, carefully. This is not The Mother, and not Sardinia, Florence, Capri, or Rome. Soft Fogazzaro, carefully. Inventory 83 is medium. No score is invented for this sit.`,
  "charan":
    `In the days of King Sung-jong one of Korea’s noted men became governor of Pyong-an Province. This sit is CHARAN only — Pyong-an Province, the dancing girl Charan, and the Governor’s son. Skip the Contents and the other tales. Stop at the end of the tale. Im Bang and Yi Ryuk, in James S. Gale’s English, 1913. One tale this sit. Soft Korea, carefully. This is not Laos, China, or Japan. Soft gothic, carefully. This is not The Beckoning Fair One. Soft England, carefully. This is not Lord Arthur Savile’s Crime. No score is invented for this sit.`,
  "sister-carrie":
    `When Caroline Meeber boarded the afternoon train for Chicago, her total outfit consisted of a small trunk and four dollars. Chapter I — Caroline Meeber, the afternoon train, and August 1889. Skip the Contents. Theodore Dreiser’s 1900 novel. Soft United States, carefully. This is not The Pit. Chicago is primary. Soft Dreiser, carefully. The lead is this book, not Antic Hay, not A spring-time case, and not Eline Vere. Inventory 80 is easy. No score is invented for this sit.`,
  "antic-hay":
    `Gumbril, Theodore Gumbril Junior, B.A. Oxon., sat in his oaken stall on the north side of the School Chapel. Chapter I — the oaken stall, the School Chapel, and the First Lesson. Skip the Phoenix Library list. Aldous Huxley’s 1923 novel. Soft England, carefully. This is not The Way of All Flesh or Lord Arthur Savile’s Crime. Soft Huxley, carefully. Inventory 84 is medium. No score is invented for this sit.`,
  "spring-time-case":
    `It was around the tolling of the fifth hour in the early evening that a fish monger sped into the pawn-shop of Suruga-ya. Part I — the fifth hour, the fish monger, and Suruga-ya. Skip the Translator introductions. Jun’ichirō Tanizaki, in Z. Tamotsu Iwado’s English, 1927. Soft Japan, carefully. This is not Naomi, A Japanese Nightingale, Kwaidan, or CHARAN. Soft Tanizaki, carefully. No wider inventory score. No score is invented for this sit.`,
  "eline-vere":
    `They were close to each other in the dining-room, which had been turned into a dressing-room. Chapter I — Frédérique van Erlevoort, the mirror, and the azalea guests. Skip the Gosse introduction. Louis Couperus, in J. T. Grein’s English, 1889. The Dutch year is 1889; the English is 1892. Soft Couperus, carefully. This is not Small Souls or The Hidden Force. Inventory 67 is medium, carefully thinner. No score is invented for this sit.`,
  "hungry-stones":
    `My kinsman and myself were returning to Calcutta from our Puja trip when we met the man in a train. This sit is The Hungry Stones only — a Calcutta Puja train and an up-country Mahomedan. Skip the Contents and the other tales. Stop at the end of the tale. Rabindranath Tagore’s 1916 tale. One tale this sit. Soft Bengal, carefully. This is not CHARAN or The Poison Tree. The preface is several hands. No translator is invented. Inventory 71 is medium. No score is invented for this sit. The first breath is 277 words — phone-hard, left as printed.`,
  smoke:
    `On the 10th of August 1862, at four o'clock in the afternoon, a great number of people were thronging before the well-known Konversation in Baden-Baden. Chapter I — the Konversation, Baden-Baden, and holiday sunshine. Skip the Introduction and the Illustrations list. Ivan Turgenev, in Constance Garnett’s English, 1867. The Russian year is 1867; the English is 1906. Soft Russia, carefully. This is not In the World, Resurrection, or Virgin Soil. Baden is primary. Soft Turgenev, carefully. The lead is this book, not Niels Lyhne, not The Emancipated, and not Germinal. Inventory 76 is medium. No score is invented for this sit.`,
  "niels-lyhne":
    `She had the black, luminous eyes of the Blid family. Chapter I — Bartholine, poetry and faith, and Lönborggaard. Skip the Foundation and the translator introduction. J. P. Jacobsen, in Hanna Astrup Larsen’s English, 1880. The Danish year is 1880; the English is 1919. Soft Jacobsen, carefully. This is not Mogens. Soft Scandinavia, carefully. This is not The Family at Gilje, The Great Hunger, or Ditte. Inventory 67 is medium, carefully thinner. No score is invented for this sit.`,
  "the-emancipated":
    `By a window looking from Posillipo upon the Bay of Naples sat an English lady, engaged in letter-writing. Part I, Chapter I — Posillipo, a widow’s letter, and November sunlight. Skip the Contents. George Gissing’s 1890 novel. Soft Gissing, carefully. This is not Born in Exile. Soft Italy, carefully. This is not Leila. Naples is secular. Inventory 81 is medium. No score is invented for this sit. The first breath is 251 words — phone-hard, left as printed.`,
  germinal:
    `Over the open plain, beneath a starless sky as dark and thick as ink, a man walked alone along the highway from Marchiennes to Montsou. Part One, Chapter I — the Marchiennes–Montsou highway, a starless sky, and beetroot fields. Skip the Ellis introduction. Émile Zola, in Havelock Ellis’s English, 1885. Soft Zola, carefully. This is not Doctor Pascal, Theresa Raquin, or L’Assommoir. Soft France, carefully. Montsou is not the war of Three Soldiers. Inventory 71 is medium. No score is invented for this sit.`,
  "our-lady-of-the-pillar":
    `In 1474, a year abounding in divine favours for all Christendom, when King Henry IV. reigned in Castile, there came to live in the city of Segovia a youthful knight named Don Ruy de Cardenas. This sit is Our Lady of the Pillar only — 1474 Segovia and Don Ruy de Cardenas. Skip To the Reader and the translator preface. Stop at the end of the tale. Eça de Queirós, in Edgar Prestage’s English, 1906. One tale this sit. Soft Eça, carefully. This is not Dragon’s Teeth. Soft Spain, carefully. This is not Toledo. No wider inventory score. No score is invented for this sit.`,
  kipps:
    `Until he was nearly arrived at adolescence it did not become clear to Kipps how it was that he was under the care of an aunt and uncle instead of having a father and mother like other boys. Book I, Chapter I — the New Romney little shop, an aunt and uncle, and a white-dress mother. Skip the Contents. H. G. Wells’s 1905 novel. The Scribner imprint is 1906. Soft Wells, carefully. This is not Ann Veronica. Soft England, carefully. This is not Antic Hay. New Romney is primary. The lead is this book, not The Professor, not A Room with a View, and not Martin Eden. Inventory 79 is easy. No score is invented for this sit.`,
  "the-professor":
    `The other day, in looking over my papers, I found in my desk the following copy of a letter, sent by me a year since to an old school acquaintance. Chapter I, Introductory — an Eton letter and Crimsworth the outsider. Skip the Preface and the Contents. Charlotte Brontë’s 1857 novel. Soft Brontë, carefully. This is not Wildfell. Inventory 77 is medium. No score is invented for this sit.`,
  "a-room-with-a-view":
    `"The Signora had no business to do it," said Miss Bartlett, "no business at all." Part One, Chapter I — the Bertolini, south rooms with a view, and a Cockney accent. Skip the Contents. E. M. Forster’s 1908 novel. Soft Forster, carefully. This is not Where Angels Fear. Soft Italy, carefully. This is not Naples, and not Leila. Florence is primary. Inventory 75 is medium. No score is invented for this sit.`,
  "martin-eden":
    `The one opened the door with a latch-key and went in, followed by a young fellow who awkwardly removed his cap. Chapter I — a latch-key hall, sea-smacked rough clothes, and a rolling gait. Skip the Contents. Jack London’s 1909 novel. Soft London, carefully. This is not The Law of Life. Soft United States, carefully. This is not Sister Carrie. Oakland is primary. Inventory 75 is easy. No score is invented for this sit.`,
  "madame-heurtebise":
    `She was certainly not intended for an artist's wife, above all for such an artist as this outrageous fellow. This sit is Madame Heurtebise only — a jeweller’s-shop wife and the poet Heurtebise. Skip the translator preface and the other sketches. Stop at the end of the sketch. Alphonse Daudet, in Laura Ensor’s English, 1874. One sketch this sit. Soft Daudet, carefully. This is not Numa Roumestan or The Nabob. Soft France, carefully. This is not Germinal, Doctor Pascal, or Three Soldiers. Inventory 80 is easy. No score is invented for this sit.`,
  "une-vie":
    `The weather was most distressing. It had rained all night. Chapter I, The Home by the Sea — Jeanne free of the convent, rain gutters, and an 1819 calendar. Skip the Introduction, the Contents, and the other stories. Guy de Maupassant, in Albert M. C. McMaster and A. E. Henderson’s English, 1883. The imprint names them; no separate Translator is listed. Soft Maupassant, carefully. This is not Bel-Ami. Soft France, carefully. This is not Artists’ Wives in Paris, Germinal, Doctor Pascal, or Three Soldiers. Normandy is primary. The lead is this book, not My Ántonia, not Look Back on Happiness, and not The Good Soldier. Inventory 81 is medium. No score is invented for this sit. The first breath is 582 words — phone-hard, left as printed.`,
  "my-antonia":
    `I first heard of Ántonia on what seemed to me an interminable journey across the great midland plain of North America. Book I, Chapter I — the midland plain, Jake Marpole, and Nebraska grandparents. Skip the Introduction and the Contents. Willa Cather’s 1918 novel. Soft Cather, carefully. This is not Death Comes for the Archbishop. Soft United States, carefully. This is not Martin Eden, and not Sister Carrie. Inventory 79 is easy. No score is invented for this sit.`,
  "look-back-on-happiness":
    `I have gone to the forest. Chapter I — the forest, overfed success, and a hair-shirt. Skip the Contents. Knut Hamsun, in Paula Wiking’s English, 1912. Soft Hamsun, carefully. This is not The Family at Gilje, Hunger, or Wanderers. Soft Scandinavia, carefully. This is not Niels Lyhne. Inventory 84 is medium. No score is invented for this sit.`,
  "father-of-yoto":
    `Sweet human hearts—a tale of carnival, moon-haunted nights. This sit is The Father of Yoto only — Marigold Vassiloff, Tai Ling, and West India Dock Road. Skip the Contents and the other sketches. Stop at the end of the sketch. Thomas Burke’s 1916 sketch. One sketch this sit. Soft Burke, carefully. Soft England, carefully. This is not Kipps, and not Antic Hay. This is not Madame Heurtebise in Paris. Inventory 76 is medium. No score is invented for this sit.`,
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
  "death-in-venice":
    `On a spring afternoon of the year 19--, when our continent lay under such threatening weather for whole months, Gustav Aschenbach, or von Aschenbach as his name read officially after his fiftieth birthday, had left his apartment on the Prinzregentenstrasse in Munich and had gone for a long walk. Chapter I — a spring afternoon, the Prinzregentenstrasse, and Aschenbach. Skip the Contents if the phone is tight. Thomas Mann, in Kenneth Burke’s English, 1912. Burke is named in the About only. Soft Mann, carefully. This is not Royal Highness. Soft Italy, carefully. This is not A Room with a View in Florence, not The Emancipated in Naples, and not Leila. Venice is primary after the Munich open. Soft densify, carefully, against Petersburg, Ireland, the Lower East Side, Australia, and Hawaii, and against Normandy, Nebraska, Norway, Nauheim, and Limehouse, and against Folkestone, Brussels, Florence, Oakland, and Paris. The lead is this book, not Elmer Gantry, not The Colonel’s Dream, and not Hard Times. Inventory 76 is medium. No score is invented for this sit.`,
  "elmer-gantry":
    `Elmer Gantry was drunk. He was eloquently drunk, lovingly and pugnaciously drunk. He leaned against the bar of the Old Home Sample Room, the most gilded and urbane saloon in Cato, Missouri. Chapter I — Cato, Missouri, the Old Home Sample Room, and a man eloquently drunk. Skip the Contents if the phone is tight. Sinclair Lewis’s 1927 novel. Soft Lewis, carefully. This is not The Job. Soft United States, carefully. This is not The Rise of David Levinsky on the Lower East Side, not My Ántonia in Nebraska, not Sister Carrie in Chicago, and not Martin Eden in Oakland. Inventory 81 is medium. No score is invented for this sit.`,
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
  "the-time-machine":
    `The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us. This sit is The Time Machine only — the Time Traveller, a fire, and silver lilies. Skip the Contents. Stop at the end of the novel. H. G. Wells’s 1895 novel. One short novel this sit. Soft Wells, carefully. This is not Kipps. Soft England, carefully. This is not Coketown, not Limehouse, not Folkestone, and not London occult. PG reading-ease is easy. No score is invented for this sit.`,
  "prisoner-of-zenda":
    `"I wonder when in the world you're going to do anything, Rudolf?" said my brother's wife. Chapter 1 — a Rassendyll breakfast, Elphberg hair, and doing nothing. Skip the Contents if the phone is tight. Anthony Hope’s 1894 novel. Soft Hope, carefully. Soft Ruritania, carefully. This is not Captain Blood in the Caribbean, and not Australia. The England breakfast is the open. Strelsau and Zenda are primary. Soft densify, carefully, against Beacon House, the Caribbean, a railway, Provence and Algeria, and Richmond, and against Venice, a Midwest pulpit, Clarendon, Coketown, and London occult, and against Petersburg, Ireland, the Lower East Side, Australia, and Hawaii, and against Normandy, Nebraska, Norway, Nauheim, and Limehouse, and against Folkestone, Brussels, Florence, Oakland, and Paris. The lead is this book, not Kidnapped, not The Revolt of the Angels, and not Children of the Soil. PG reading-ease 90.1 is very easy. No score is invented for this sit.`,
  "kidnapped":
    `I will begin the story of my adventures with a certain morning early in the month of June, the year of grace 1751, when I took the key for the last time out of the door of my father's house. Chapter I — Essendean, a June morning, a key, and the House of Shaws. Skip the Biographical Preface and the Contents if the phone is tight. Robert Louis Stevenson’s 1886 novel. Soft Stevenson, carefully. This is not The Bottle Imp, and not The Master of Ballantrae. Soft Scotland, carefully. This is not Ireland, and not the Caribbean. The Highlands are primary. PG reading-ease 83.1 is easy. No score is invented for this sit.`,
  "revolt-of-the-angels":
    `Beneath the shadow of St. Sulpice the ancient mansion of the d'Esparvieu family rears its austere three stories between a moss-grown fore-court and a garden hemmed in, as the years have elapsed, by ever loftier and more intrusive buildings, wherein, nevertheless, two tall chestnut trees still lift their withered heads. Chapter I — the d’Esparvieu mansion and chestnut trees. Skip the Contents if the phone is tight. Anatole France, in Emilie Jackson’s English, 1914. Jackson is named in the About only. Soft Anatole France, carefully. This is not Thaïs. Soft Paris, carefully. This is not the Jacques Lantier railway, not Madame Heurtebise, and not Tartarin. The angel revolt is primary. PG reading-ease 68.1 is medium. No score is invented for this sit.`,
  "children-of-the-soil":
    `It was the first hour after midnight when Pan Stanislav Polanyetski was approaching the residence in Kremen. Chapter I — Kremen, a July midnight mist, and Pan Stanislav. Skip the Curtin dedication and the Introductory Statement if the phone is tight. Henryk Sienkiewicz, in Jeremiah Curtin’s English, 1895. Curtin is named in the About only. The English year is the Curtin copyright, 1895. Soft Sienkiewicz, carefully. This is not Hania, and not Quo Vadis. Soft Poland, carefully. This is not The Comedienne. The estate is primary. PG reading-ease 77.3 is fairly easy. No score is invented for this sit.`,
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
  "the-bitter-tea-of-general-yen":
    `Megan, drawing her chair over to the window, saw that the rain had given an air of transience to the solid Chinese earth. Chapter I — a rainy road by the French Concession, Shanghai. Skip the title page, the dedication ‘To Eleanor’, and the illustration tags. Grace Zaring Stone’s 1930 novel. The printed word “transcience” in the first sentence is corrected to “transience”. A heads-up before you start: this is a 1930 novel and it sounds like one. The word “coolie” turns up often, and one American character uses a racial slur in dialogue. The book also looks at China and at General Yen through a Western, Orientalist lens, which is partly what the story is about and partly its own blind spot. Soft Stone, carefully. Soft Shanghai, carefully. Shanghai is primary. The lead is this book, not The Woman of Andros, not Bella Donna, and not Nina Balatka. No reading-ease score is on the page, so none is cited. No score is invented for this sit.`,
  "the-woman-of-andros":
    `The earth sighed as it turned in its course; the shadow of night crept gradually along the Mediterranean, and Asia was left in darkness. Section I — nightfall over the Mediterranean, Brynos. The Terence and Menander note is the Epigraph and stays in the book; this open starts at Section I. Skip the Transcriber’s Note and the illustration tags. Thornton Wilder’s 1930 novel. The eight sections are unnumbered in print and labelled Section I–VIII here. Soft Wilder, carefully. Soft Greece, carefully. Brynos is primary. No reading-ease score is on the page, so none is cited. No score is invented for this sit.`,
  "bella-donna":
    `Doctor Meyer Isaacson had got on as only a modern Jew whose home is London can get on, with a rapidity that was alarming. Chapter I — Doctor Meyer Isaacson, London, with Egypt to come from Chapter XI. Skip the fifth-edition front matter if the phone is tight. Robert Hichens’s 1908 novel. Two things to know going in. The very first sentence sums Dr. Isaacson up as “a modern Jew” who has got on in London, the kind of sweeping generalization about Jewish people that was common in 1908, even about a character the book admires. Once the story reaches Egypt, Baroudi and the Egyptians around him are painted in a heavily Orientalist way: exotic, sensual, and menacing. Both are the book’s attitudes. Soft Hichens, carefully. Soft Egypt, carefully, after the London open. Egypt is primary. Long, carefully. PG reading-ease 83.2 is easy. No score is invented for this sit.`,
  "nina-balatka":
    `Nina Balatka was a maiden of Prague, born of Christian parents, and herself a Christian—but she loved a Jew; and this is her story. Volume I, Chapter I — the Kleinseite, Prague. The copyrighted 2003 introduction is out of this bind and out of this open. Anthony Trollope’s 1866 novel. A note on what you are about to read: prejudice against Jews is the subject, not the backdrop. Nina’s family and neighbours say ugly things about Anton and his people, openly and often. Those are the characters’ voices; the narrator is on the lovers’ side. Some of the long paragraphs have been broken into shorter screens; every word is as Trollope wrote it. Soft Trollope, carefully. Soft Prague, carefully. Prague is primary. PG reading-ease 88.4 is easy. No score is invented for this sit.`,
  "la-lupa":
    `She was tall and lean; but she had a firm, full bust, and yet she was no longer young. This sit is La Lupa only — harvest fields under Etna, and the village that calls her the she-wolf. Stop when Nanni stammers. Giovanni Verga, in Nathan Haskell Dole’s English. Dole is named in the About only. The English year is 1896. One story this sit. It ends on an axe, so save it for unwinding or a walk rather than the last thing before sleep. Soft Verga, carefully. This is not I Malavoglia. Soft Sicily, carefully. PG reading-ease 80.0, for the whole volume, is easy. No score is invented for this sit.`,
  "a-farewell-to-arms":
    `In the late summer of that year we lived in a house in a village that looked across the river and the plain to the mountains. Book I, Chapters I and II — a village across the river from the mountains, on the Italian front. Skip the book list, the half-titles, and the illustration tags; the dedication is out. Ernest Hemingway’s 1929 novel. “BOOK 1” is set as Book I, to match Books II–V. The 25 blanks (——) are the 1929 edition’s own and stay as printed. A heads-up before you start: the soldiers’ banter includes ethnic slurs for Italians, and Frederic uses a racial slur once, late in the book. Those are the book’s 1929 voices. Some of the long paragraphs have been broken into shorter screens; every word is as Hemingway wrote it. Soft Hemingway, carefully. Soft Italy, carefully. Italy is primary. The lead is this book, not Alice Adams, not Quartet, and not The Song of Songs. PG reading-ease 95.8 is very easy. No score is invented for this sit.`,
  "alice-adams":
    `The patient, an old-fashioned man, thought the nurse made a mistake in keeping both of the windows open, and her sprightly disregard of his protests added something to his hatred of her. Chapter I — Virgil Adams’s sleepless night in a smoky Midwestern city; Alice comes in with Chapter II. Skip the producer line. Booth Tarkington’s 1921 novel. The year is from the Wikipedia page the PG page links to; neither the PG page nor the PG text prints one. Words printed in capitals for emphasis are set in italics. A heads-up before you start: this is a 1921 novel and it uses the period’s racial language, including an old slur for Black people a few times, and a scene at the dance leans on a stereotype of the Black cloakroom staff. Those are the book’s attitudes. Soft Tarkington, carefully. Soft Midwest, carefully. The US Midwest is primary. PG reading-ease 82.0 is easy. No score is invented for this sit.`,
  "quartet":
    `It was about half-past five on an October afternoon when Marya Zelli came out of the Café Lavenue, which is a dignified and comparatively expensive establishment on the Boulevard du Montparnasse. Chapter One — the Café Lavenue and the Boulevard du Montparnasse, Paris. The R. C. Dunning epigraph is the Epigraph and stays in the book; this open starts at Chapter One. Jean Rhys’s 1928 novel, first published as Postures. The dialogue is set in double quotes; “She begun” stays as printed. Before you start: this is a bleak book about a stranded woman kept inside a cruel triangle. It carries the period’s antisemitic phrasing, in the narration and in dialogue, and one racial slur. Those are the book’s 1928 voices. Soft Rhys, carefully. Soft Paris, carefully. Paris is primary. No reading-ease score is on the page, so none is cited. No score is invented for this sit.`,
  "song-of-songs-sudermann":
    `Lilly was fourteen years old when her father, Kilian Czepanek, the music-master, suddenly disappeared. Part I, Chapter I — the music-master’s flight, in a garrison town in eastern Germany. Skip the producer line, the 1926 Viking title page, and the printing history. Hermann Sudermann, in Thomas Seltzer’s English. Seltzer is named in the About only. The English year is 1909. The chapters are labelled Part I and Part II, because the numbering starts again. A few things to know going in: it is frank, for its day, about seduction, adultery, and a woman kept by one man after another, and it carries the period’s antisemitic phrasing and one racial slur in a story someone tells. Those are the book’s attitudes. Soft Sudermann, carefully. This is not the Song of Songs from the Bible. Soft Germany, carefully, from the garrison town to Berlin. Germany is primary. Long, carefully. PG reading-ease 81.4 is easy. No score is invented for this sit.`,
  "its-wavering-image":
    `Pan was a half white, half Chinese girl. This sit is “Its Wavering Image” only — Chinatown, San Francisco, from her father’s bazaar on Dupont Street to a high room open to the stars. Stop when Pan is comforted. Sui Sin Far’s 1912 story, from Mrs. Spring Fragrance. One story this sit. The four numbered sections, the song, and the break before the last scene stay as printed. A light note: the story uses the words of its time, “half white, half Chinese”, and frames Chinatown as picturesque and quaint the way the white reporter sees it; the story is on Pan’s side. Soft Sui Sin Far, carefully. This is not the title story, Mrs. Spring Fragrance. Soft San Francisco, carefully. San Francisco is primary. PG reading-ease 80.9, for the whole volume, is easy. No score is invented for this sit.`,
  "java-head":
    `Very late indeed in May, but early in the morning, Laurel Ammidon lay in bed considering two widely different aspects of chairs. Section I — Laurel Ammidon and the chairs, on a May morning in Salem. The Chwang-Tze epigraph is the Epigraph and stays in the book; this open starts at Section I and stops at her piano scales. Skip the producer line; the dedication is out. Joseph Hergesheimer’s 1918 novel. The sections are numbered I to X, as printed; no chapter titles are added. Two print errors are fixed: “rerepeated” is set as “repeated”, and a missing period is restored. A heads-up before you start: it carries the period’s slurs and labels for Chinese people, one racial slur in a character’s speech, and Orientalist framing of Taou Yuen, and the ending turns on opium. Those are the book’s 1918 voices. Soft Hergesheimer, carefully. This is not The Happy End. Soft Salem, carefully. Salem is primary. The lead is this book, not Sunshine Sketches, not Guest the One-Eyed, and not The Blind Musician. PG reading-ease 69.6 is plain. No score is invented for this sit.`,
  "sunshine-sketches-of-a-little-town":
    `I don't know whether you know Mariposa. Ch ONE: The Hostelry of Mr. Smith — the town, the lake and the Mariposa Belle, until the summer visitors go. Leacock’s own Preface comes first in the book and stays; this open starts at Ch ONE. Skip the producer line. Stephen Leacock’s 1912 book. The year is from the Wikipedia page the PG page links to; the Preface is signed June 1912. Each chapter carries its sketch title, and each sketch stands on its own. The signs, placards and headlines printed in capitals are set in italics. A light heads-up: a few period phrases date it, a passing line about Black performers and some “Indian” relics and jokes. Those are the book’s 1912 voices. Soft Leacock, carefully. Soft Mariposa, carefully. Canada is primary. PG reading-ease 75.4 is fairly easy. No score is invented for this sit.`,
  "guest-the-one-eyed":
    `Snow, snow, snow! Book I, Chapter I — Christmas snow on the heights above Borg, and a poor man coming home with an empty sack. Skip the “By the same author” page, the imprint page, and the illustration. Gunnar Gunnarsson, in W. W. Worster’s English, as the 1922 title page credits him. Worster is named in the About only. The English year is 1922. The chapters are labelled by Book, because each Book starts again at Chapter I. A few things to know going in: it is a long saga, about nine hours, over two generations of one farm, with a Copenhagen strand; the thee and thou are only in prayers and scripture. Some of the long paragraphs have been broken into shorter screens; no words are changed. Soft Gunnarsson, carefully. Soft Iceland, carefully. Iceland is primary. Long, carefully. PG reading-ease 81.9 is easy. No score is invented for this sit.`,
  "the-blind-musician":
    `At the hour of midnight, in a wealthy family living in the southwestern part of Russia, a child was born. Chapter I, sections I to III — a birth at midnight on a country estate, and a mother who notices first. Skip the translator’s preface, the Anagnos letter, the contents, George Kennan’s introduction, and the illustration tags; they are out. Vladimir Korolenko, in Aline Delano’s English. Delano is named in the About only. The English year is 1891. Chapters and their sections were both numbered I, II, III in print, so they are labelled chapter and section. The book’s own notes stay, each after its paragraph. The text says “the southwestern part of Russia”; the country is the Ukraine, and a note names Volynia. A quiet book, with its century’s tender, sometimes sentimental view of blindness. Soft Korolenko, carefully. Soft Volhynia, carefully. Ukraine is primary. PG reading-ease 67.1 is plain. No score is invented for this sit.`,
  "magnolia-flower":
    `The brook laughed and sang. This sit is “Magnolia Flower” only — a brook, the St. Johns River by moonlight, and the story the river tells. Stop when the river welcomes the old couple back. Zora Neale Hurston’s 1925 story, from The Spokesman. One story this sit. The river’s story, the break before the last scene, and the voices stay as printed. A heads-up: the men speak in dialect and use a colorism slur, and there is violence at home and a threatened hanging. It ends gently, so it suits unwinding. Soft Hurston, carefully. Soft St. Johns River, carefully. Florida is primary. No reading-ease score is on the page, so none is cited. No score is invented for this sit.`,
  "in-the-mountains":
    `I want to be quiet now. July 22nd to July 29th — a woman climbs back alone to her chalet in the Swiss mountains after the war years, to be quiet. The e-text credits, the title page and the imprint are out; the book starts at the first entry. Elizabeth von Arnim’s 1920 book, a diary of 71 dated entries, each headed by its date. The title page names her only as the author of “Elizabeth and Her German Garden”; she is credited by name. One print error is fixed: “blacks bird” is set as “blackbird”. The talk keeps its British single quotes. Grief with wit, and easy going. Soft von Arnim, carefully. Soft Alps, carefully. Switzerland is primary. The lead is this book, not The Two Countesses, not El Ombú, and not Halil the Pedlar. PG reading-ease 80.0 is easy. No score is invented for this sit.`,
  "the-two-countesses":
    `The shooting season is over; all our guests have left the castle; we are as dull as ditch water, and I at length have time to write to you, dear Nesti. Countess Muschi’s first two letters, from Sebenberg Castle in November 1882 — a Swabian count is coming, and she is expected to marry him. Skip the series list, the title pages and the decorative images; they are out. Marie von Ebner-Eschenbach, in Ellen Waugh’s English; the title page says Mrs. Waugh. The English year is 1893. Muschi’s six letters come first, then Countess Paula’s memoirs, which turn into a diary, then an epilogue. Each letter’s place and date, and its sign-off, is a Note line; two letters are dated 1883, as printed. “Milias res” is Muschi’s own Latin and stays. A light, quick comedy of the marriage market. Soft Ebner-Eschenbach, carefully. Soft Vienna, carefully. Austria is primary. No reading-ease score is on the page, so none is cited. No score is invented for this sit.`,
  "el-ombu":
    `This history of a house that had been was told in the shade, one summer's day, by Nicandro, that old man to whom we all loved to listen, since he could remember and properly narrate the life of every person he had known in his native place, near to the lake of Chascomus, on the southern pampas of Buenos Ayres. El Ombú, part I — an old gaucho begins the history of one house on the pampas and the people under its great ombú tree. Skip the series advert, the title page and its verse, the dedication, the author’s note and the contents; they are out. W. H. Hudson’s 1902 book; the year is the “First Published” line in the text. Four tales and an appendix: El Ombú, Story of a Piebald Horse, Niño Diablo and Marta Riquelme, then Hudson’s appendix to El Ombú. The parts of El Ombú are numbered as printed; the text has no part V. Some long paragraphs have been broken into shorter screens; no words are changed. A heads-up before you start: El Ombú includes a frontier massacre of an Indigenous camp, told plainly by a soldier who took part, and the tales use the period’s words for Indigenous people. Those are the book’s 1902 voices. Soft Hudson, carefully. Soft Chascomús, carefully. Argentina is primary. PG reading-ease 71.1 is fairly easy. No score is invented for this sit.`,
  "halil-the-pedlar":
    `Time out of mind, for hundreds and hundreds of years, the struggle between the Shiites and the Sunnites has divided the Moslem World. Chapter I, The Pedlar — the old quarrel of Shiites and Sunnites, and a stranger led through the lanes of Stambul after dark. Skip the title page, the motto, the contents, the translator’s introduction and the publisher’s list; they are out. Mór Jókai, in R. Nisbet Bain’s English. This is the 1901 third edition, as the PG text prints it; no first-edition year is claimed. Thirteen chapters, each with its printed title. The book’s own notes stay, each after its paragraph. Some long paragraphs have been broken into shorter screens; no words are changed. A heads-up before you start: harem and eunuch scenes, the Orientalist framing of its day, a character’s scornful line about Jews, and executions in Chapter VII, “Tulip-Bulbs and Human Heads”. Those are the book’s voices. Soft Jókai, carefully. Soft Stambul, carefully. Istanbul is primary. PG reading-ease 77.2 is fairly easy. No score is invented for this sit.`,
  "the-white-sand-path":
    `I was a devil of a scapegrace in my time. This sit is “The White Sand-Path” only — a boy shut in the loft for his mischief watches the sand road from the window until the path looks like a life. Stop when he is never shut up again. Stijn Streuvels, in Alexander Teixeira de Mattos’s English, from The Path of Life; the English year is 1915. One story this sit. The heading’s “I.” is dropped. “’Twas” and the italic murder stay as printed. A light heads-up: his father beats him with birch rods and a poker, and the boy tells it as bravado. It ends quietly, so it suits bedtime. Soft Streuvels, carefully. Soft Flanders, carefully. Belgium is primary. PG reading-ease 85.5 is for the whole volume. No score is invented for this sit.`,
  "liliecronas-home":
    "On Christmas Day, 1880, a pitiless storm raged over Lövsjö (Green Lake) District in Värmland. Chapter I, The Storm-Wind — on Christmas Day a stubborn girl from a Värmland croft drags her mother and brother through a gale toward the parsonage feast. The title page, the frontispiece and the contents are out; the book starts at Chapter I. Selma Lagerlöf, in Anna Barwell’s English; the English year is 1914. Eighteen chapters, each with its printed title. The year 1880 in the first line is as printed. The book’s two small notes stay, each after its paragraph. Some long paragraphs have been broken into shorter screens; no words are changed. A household saga of a pastor, his daughter, a stepmother and the fiddler Liliecrona’s home, told by a storyteller who talks straight to you. Soft Lagerlöf, carefully. Soft Värmland, carefully. Sweden is primary. The lead is this book, not Doctor Luke, not Morriña, and not A Happy Boy. PG reading-ease 85.6 is easy. No score is invented for this sit.",
  "doctor-luke-of-the-labrador":
    "A cluster of islands, lying off the cape, made the shelter of our harbour. Chapter I, Our Harbour — three islands and a cape shelter a Labrador outport that its folk love because they know no kinder land. Skip the frontispiece, the sketch map, the dedication, the note to the reader and the publisher’s ads; they are out. Norman Duncan’s 1904 novel; the year is the copyright line in the text. Twenty-eight chapters, each with its printed title: a boy’s memory of his mother, old Skipper Tommy’s fairy tales, and the doctor who comes off the mail boat and stays. The outport talk stays as printed. Very easy, with sea weather all through. Soft Duncan, carefully. Soft Labrador, carefully. Canada is primary. PG reading-ease 89.8 is easy. No score is invented for this sit.",
  "morrina":
    "A heads-up before you start: the son seduces the maid, and the book ends with her implied suicide. A Madrid flat in the 1880s: a doting mother, her student son, and the homesick Galician maid who comes to serve them. Pardo Bazán tells it with worldly irony.",
  "a-happy-boy":
    "His name was Oyvind, and he cried when he was born. Chapter I — Oyvind is born in a cotter’s house under a cliff, with a goat on the roof, and meets Marit on the hill. Skip the publisher’s note and the translator’s preface; they are out. Bjørnstjerne Bjørnson wrote it in 1859–60; this is Rasmus B. Anderson’s English of 1881. Twelve chapters. The songs keep their lines, the credits for their English are dropped, and the book’s two notes stay, each after its paragraph. Some long paragraphs have been broken into shorter screens; no words are changed. A cotter’s son earns his way toward a proud farmer’s granddaughter. Soft Bjørnson, carefully. Soft valley, carefully. Norway is primary. PG reading-ease 86.8 is easy. No score is invented for this sit.",
  "the-desjardins":
    "Just at the foot of the hill, where the bridge crossed the Blanche, stood one of the oldest houses in Viger. This sit is “The Desjardins” only — in the oldest house in Viger, a brother stands up at supper and says he is the Great Napoleon, and his brother and sister decide to be the last of their race. Stop at his winter preparations for the invasion of Russia. Duncan Campbell Scott, from In the Village of Viger; the year is 1896. One story this sit. The small-caps “JUST” is set as “Just”. His madness is treated with tenderness, and it ends quietly, so it suits bedtime. Soft Scott, carefully. Soft Viger, carefully. Canada is primary. PG reading-ease 79.7 is for the whole volume. No score is invented for this sit.",
  "gone-to-earth":
    `Small feckless clouds were hurried across the vast untroubled sky—shepherdless, futile, imponderable—and were torn to fragments on the fangs of the mountains, so ending their ephemeral adventures with nothing of their fugitive existence left but a few tears. Chapter 1 — clouds blow over the Welsh border hills, and a half-wild girl, Hazel Woodus, runs through the woods with her tame fox. A heads-up before you start: the squire Reddin pursues Hazel sexually, there is blood sport all through, and the book ends in a fox-hunt tragedy. The dedication stays, as its own short page before Chapter 1. Mary Webb’s novel; the year is 1917, from the title page. Thirty-six chapters. The single quotes and the hill-country talk stay exactly as printed. Some long paragraphs have been broken into shorter screens; no words are changed. Hazel is pulled between a gentle minister and the hard squire, and the countryside is lush and strange. Soft Webb, carefully. Soft border hills, carefully. England is primary. The lead is this book, not The Real Charlotte, not Pembroke, and not The Argonauts. PG reading-ease 83.7 is easy. No score is invented for this sit.`,
  "the-real-charlotte":
    `An August Sunday afternoon in the north side of Dublin. Chapter I — an August Sunday in the hot, empty streets of north Dublin, where a young girl, Francie Fitzpatrick, is about to be noticed. Skip the publisher’s list, the title page and the colophon; they are out. A short publication note stays, as its own page before Chapter I. E. Œ. Somerville and Martin Ross; the year is 1894, the first printing named in that note. Fifty-one chapters. The Irish talk stays as printed. Some long paragraphs have been broken into shorter screens; no words are changed. Francie comes to the lake town of Lismoyle, and her cousin Charlotte Mullen, plain and clever, has plans of her own. Sharp comedy that darkens slowly. Soft Somerville and Ross, carefully. Soft Lismoyle, carefully. Ireland is primary. PG reading-ease 72.7 is plain going. No score is invented for this sit.`,
  "pembroke":
    `At half-past six o'clock on Sunday night Barnabas came out of his bedroom. Chapter I — on a Sunday night Barnabas Thayer sets out to court Charlotte Barnard, and her father is waiting with politics. A heads-up before you start: later in the book a sick boy, Ephraim, dies after his mother beats him. Skip the author’s Introductory Sketch, the title page and the illustrations; they are out, and the book starts at Chapter I. Mary E. Wilkins Freeman; the year is 1894, the edition the transcriber worked from. Fourteen chapters. The Yankee village talk stays exactly as printed. Some long paragraphs have been broken into shorter screens; no words are changed. A whole New England village of stubborn, proud people, told with a dry, patient eye. Soft Freeman, carefully. Soft Pembroke, carefully. The United States is primary. PG reading-ease 81.5 is easy. No score is invented for this sit.`,
  "the-argonauts":
    `It was the mansion of a millionaire. Chapter I — a millionaire’s mansion glimmers like a pearl shell, and its owner, Aloysius Darvid, has come home after three years away. Skip the translator’s introduction; it is out, and the book starts at Chapter I. Eliza Orzeszko, in Jeremiah Curtin’s English; the year is 1901, from his introduction. Eleven chapters. Period language stays as printed. Some very long paragraphs have been broken into shorter screens; no words are changed. The first sit is under ten minutes and stops before a young sculptor comes up to Darvid’s table. A man who has built a fortune by iron toil has no time left for his wife and children. Soft Orzeszko, carefully. Soft city, carefully. Poland is primary. PG reading-ease 78.6 is plain going. No score is invented for this sit.`,
  "at-the-roadside-station":
    `It was early spring when I went to the bungalow. This sit is “At the Roadside Station” only — a man spends early spring at a bungalow by a small railway station, and watches the trains come and go and a bored gendarme on the platform. Stop at “He was so terribly bored....” Leonid Andreyev, in W. H. Lowe’s English, from The Little Angel, and Other Stories; the year is 1916. One story this sit. Quiet, odd and a little uneasy, so it suits bedtime. Soft Andreyev, carefully. Soft station, carefully. Russia is primary. PG reading-ease 76.9 is for the whole volume. No score is invented for this sit.`,
  "the-will-to-live":
    `From the summit of the hill the voice of Mr. Francis Roquevillard came down to the grape-gatherers, who, ranged along the vines on the hillside, were lightening the stalks of their dark fruit. Part I, Chapter I — the grape harvest at La Vigie, the Roquevillard vineyard above Chambéry, and the head of the family calling down to the pickers. A heads-up before you start: the son elopes with a married woman, and he is charged with theft. The dedication to Ferdinand Brunetière stays, as its own page before Chapter I; a fresh sit starts on the vintage. Henry Bordeaux, in Pitts Duffield’s English; the year is 1915, from the copyright line. Three parts, eighteen chapters. Some long paragraphs have been broken into shorter screens; no words are changed. An old Savoy family stakes its name, its land and its savings on one son. Warm and clear, and very French. Soft Bordeaux, carefully. Soft Savoy, carefully. France is primary. The lead is this book, not Doom Castle, not Mayflower, and not Susan Proudleigh. PG reading-ease 82.3 is easy. No score is invented for this sit.`,
  "doom-castle":
    `It was an afternoon in autumn, with a sound of wintry breakers on the shore, the tall woods copper-colour, the thickets dishevelled, and the nuts, in the corries of Ardkinglas, the braes of Ardno, dropping upon bracken burned to gold. Chapter I — an autumn afternoon on the Argyll shore, and Count Victor, a Frenchman from Paris, rides alone into the silent Highland glens. The first sit runs on into Chapter II and stops in the wood, as he hears the thicket break again behind him. Neil Munro; the year is 1901, from the copyright line. Forty-one chapters. The Scots talk and the Gaelic and French words stay as printed. Some long paragraphs have been broken into shorter screens; no words are changed. A crumbling castle full of secrets, and a spy plot round the Duke of Argyll. A chase with wry comedy in the middle of it. Soft Munro, carefully. Soft Highlands, carefully. Scotland is primary. PG reading-ease 76.0 is plain going. No score is invented for this sit.`,
  "mayflower":
    `The morning of that day—it was a Tuesday of the Lenten season—could not have dawned more promisingly. Chapter I — a Lenten Tuesday morning on the beach of the Cabanal, the fishermen’s quarter of Valencia. A heads-up before you start: the first chapter shows a drowned body, a man beats his wife, and there are deaths at sea. Vicente Blasco Ibáñez, in Arthur Livingston’s English; the year is 1921, the first printing of that English. Ten chapters. The Spanish and Valencian words stay in italics, and the period spelling stays as printed. Some long paragraphs have been broken into shorter screens; no words are changed. A widow turns the boat that drowned her husband into a tavern, and her two sons go two different ways. Loud, sunny and salty. Soft Blasco Ibáñez, carefully. Soft Cabanal, carefully. Spain is primary. PG reading-ease 79.3 is plain going. No score is invented for this sit.`,
  "susan-proudleigh":
    `“I know I ’ave enemies,” said Susan bitterly; “I know I am hated in this low neighbourhood. Book I, Chapter I — in a Kingston lane, proud Susan Proudleigh knows her neighbours are against her. A note on period language: the book is full of the colour and class hierarchy of its day, and it uses the word ‘Chinaman’. The text stays as printed. Skip the Colonial Library pages, the colophon and the publisher’s advertisements; they are out. A short publication note stays, as its own page before Chapter I. Herbert G. de Lisser; the year is 1915, from the ‘First Published’ line. Three books, twenty-six chapters. The Jamaican Creole talk and its apostrophes stay exactly as printed. Some long paragraphs have been broken into shorter screens; no words are changed. Susan loses her young man and sails for Colón and the Panama Canal works. Ironic and fond. Soft de Lisser, carefully. Soft Kingston, carefully. Jamaica is primary. PG reading-ease 79.6 is plain going. No score is invented for this sit.`,
  "the-peat-moor":
    `High over the heathery wastes flew a wise old raven. This sit is “The Peat Moor” only — a wise old raven flies west to the last wild peat moor on the Norwegian coast, to dig up a sow’s ear he buried long ago. Stop at “…to unearth a sow’s ear which it had buried.” Alexander Kielland, in William Archer’s English, from Tales of Two Countries; the year is 1891, from the introduction. One story this sit. Wry and a little sad, and it ends gently, so it suits bedtime. Soft Kielland, carefully. Soft moor, carefully. Norway is primary. PG reading-ease 77.1 is for the whole volume. No score is invented for this sit.`,
  "life-and-death-of-harriett-frean":
    `“Pussycat, Pussycat, where have you been?” Chapter I — a nursery rhyme, a small girl on her father’s knee, and a mother who teaches her that behaving beautifully is everything. The first sit runs on into Chapter II and stops after Harriett’s little talk about God and Jesus, before the walk down Black’s Lane. May Sinclair; the year is 1922, from the title page. Fifteen short chapters, a whole life in about an hour and three quarters. The nursery rhyme keeps its line breaks, and the trailing dashes stay as printed. Some long paragraphs have been broken into shorter screens; no words are changed. Harriett gives up the man she loves to her best friend, and lives on the credit of it. Sharp and sad, and the easiest read here. Soft Sinclair, carefully. Soft London suburb, carefully. England is primary. The lead is this book, not Farewell Love!, not The Son of His Mother, and not My Lady Nobody. PG reading-ease 85.1 is easy. No score is invented for this sit.`,
  "farewell-love":
    `Motionless under the white coverlet of her bed, Anna appeared to have been sleeping soundly for the past two hours. Part I, Chapter I — a winter night in Naples, and Anna creeps past her sleeping sister to meet Giustino on the terrace. A heads-up before you start: the passion is obsessive, and at the end Anna shoots herself, shown directly. The first chapter is one long night talk, so the first sit stops just before it, as Giustino leaps the terrace wall. Matilde Serao, in Aline Harland’s English; the year is 1906, from the London title page. Serao’s short dedication stays, as its own page before Chapter I. Two parts, twelve chapters. Two of the translator’s notes, on ‘voi’ and ‘tu’, stay as Note lines; the other footnotes are out. Some long paragraphs have been broken into shorter screens; no words are changed. Anna loves without measure: first a man who answers with duty, then the cool, older husband she marries. Fast and hot. Soft Serao, carefully. Soft Naples, carefully. Italy is primary. PG reading-ease 83.6 is easy. No score is invented for this sit.`,
  "the-son-of-his-mother":
    `The husband and wife were of a literary turn of mind, and as they had the money to cultivate their artistic tastes he wrote a little and she painted. Book I, Chapter I — a comfortable, childless Berlin couple, and a summer of travel that ends high in the Swiss Alps. A heads-up before you start: the son dies of an illness in the last chapter. Clara Viebig, in H. Raahauge’s English; the year is 1913, from the London title page. Three books, eighteen chapters. Some long paragraphs have been broken into shorter screens; no words are changed. They adopt a poor moor-woman’s baby, and the book asks whether love can outweigh blood as the boy grows up wilful. Clear and warm. Soft Viebig, carefully. Soft Berlin, carefully. Germany is primary. PG reading-ease 81.1 is easy. No score is invented for this sit.`,
  "my-lady-nobody":
    `It was a white-hot July morning. Part I, Chapter I — a white-hot July morning in Horstwyk, a Dutch village, and the pastor and his daughter Ursula. A heads-up before you start: once, the aristocrats talk about Jews in a period stereotype; Part III follows the colonial war in Aceh; and a suicide attempt over debt is reported. The text stays as printed. The dedication stays, as its own page before Chapter I; a fresh sit starts on the July morning and runs into Chapter II, the Dominé’s own story, stopping as his old soldiers fall asleep again. Maarten Maartens; the year is 1895, from the title page. Three parts, forty-nine chapters; long. The chapter titles are in sentence case. Some long paragraphs have been broken into shorter screens; no words are changed. Ursula is drawn into the manor family next door, and a dutiful marriage turns into a long misunderstanding. Ironic and fond. Soft Maartens, carefully. Soft Horstwyk, carefully. The Netherlands is primary. PG reading-ease 76.3 is plain going. No score is invented for this sit.`,
  "new-years-night":
    `It was dark enough for anything in Dead Man's Gap—a round, warm, close darkness, in which retreating sounds seemed to be cut off suddenly at a distance of a hundred yards or so, instead of growing faint and fainter, and dying away, to strike the ear once or twice again—and after minutes, it might seem—with startling distinctness, before being finally lost in the distance, as it is on clear, frosty nights. This sit is “New Year’s Night” only — a stifling New Year’s Eve on a lonely selection at Dead Man’s Gap, a husband fiddling alone, and a wife who breaks down. The sit stops as the storm rolls off and the stars come out; the story ends at “…the bright New Year’s Night twenty years ago.” Henry Lawson, from Over the Sliprails; the year is 1900, from the volume. One story this sit. The bush talk stays as printed. Warm, and it ends gently, so it suits bedtime. Soft Lawson, carefully. Soft New South Wales, carefully. Australia is primary. PG reading-ease 78.5 is for the whole volume. No score is invented for this sit.`,
  "the-old-house":
    `It was evening. Chapter I — a winter evening, a coach through the snow at the excise barrier, and old Christopher Ulwing, the master builder, coming home from Vienna to sleeping Pest. A heads-up before you start: there is a brief episode in the 1849 siege, when Pest is shelled and a minor character is shot. The first sit stops in his house, as the housekeeper sails off into the dark corridor, before the talk of his rival Münster’s ruin. Cécile Tormay, in Emil Torday’s English; the year is 1922, from the copyright line. Nineteen chapters. The two small footnotes stay as Note lines, and the painted signs keep their capitals. Some long paragraphs have been broken into shorter screens; no words are changed. A carpenter builds himself, and the house that outlives him, into a town that grows into Budapest. Three generations, money and class, in short, clear scenes. Soft Tormay, carefully. Soft Pest and Buda, carefully. Hungary is primary. The lead is this book, not The Sworn Brothers, not Dusty Answer, and not Christine of the Hills. PG reading-ease 85.7 is easy. No score is invented for this sit.`,
  "the-sworn-brothers":
    `In the red light of the fire in the midst of the hall, the age-browned pillars of the high-seat stood forth strongly lit in the middle of the main wall, against the background of smoky darkness which spread behind. Book I, Chapter I — a winter night by the hall fire on the Dalsfjord, young Ingolf among the carved gods, and his father in the high seat. A heads-up before you start: there is Viking feud violence, outlawry, and pagan sacrifice. The first sit stops in the quiet hall, just before his kinsman Rodmar and Leif come stamping in. Gunnar Gunnarsson, in William Emmé and Claud Field’s English; the year is 1921, from the copyright line. Three books, thirty-six chapters. Straight quotes stay as printed. Some long paragraphs have been broken into shorter screens; no words are changed. Two foster-brothers, grave Ingolf and mocking Leif, are driven out of Norway to settle an empty Iceland. A saga told as a modern novel, plain and quick. Soft Gunnarsson, carefully. Soft Dalsfjord, carefully. Iceland is primary. PG reading-ease 81.5 is easy. No score is invented for this sit.`,
  "dusty-answer":
    `When Judith was eighteen, she saw that the house next door, empty for years, was getting ready again. Part one, Chapter 1 — the house next door by the river coming back to life, and Judith remembering the cousins who dropped over the peach-tree wall. A heads-up before you start: one cousin’s death in the war is told offstage; a same-sex attachment is handled delicately; and the period term ‘half-caste’ appears once. The first sit stops at the first section break, after an autumn game of hide-and-seek. Rosamond Lehmann; the year is 1927, from the copyright line. The Meredith epigraph and the dedication stay, as their own page before Part one. Five parts. The single quotes stay as printed. Some long paragraphs have been broken into shorter screens; no words are changed. Judith loves the family next door one by one, and then, at Cambridge, bold, careless Jennifer. Lyrical and close-up. Soft Lehmann, carefully. Soft Thames-side and Cambridge, carefully. England is primary. PG reading-ease 84.5 is easy. No score is invented for this sit.`,
  "christine-of-the-hills":
    `We had been sailing for some hours with no word between us, but Barbarossa woke up as the yacht went about under the lee of the promontory, and with a lordly sweep of his brown-burnt arms he indicated the place. The Prologue — an English yacht among the Dalmatian islands, a white pavilion on the shore, and old Barbarossa promising the story of Christine. A heads-up before you start: there is a shooting, there are whippings, and a predatory guardian, not shown explicitly. The first sit is the whole Prologue. Max Pemberton; the year is 1897, from the title page. A prologue and twenty-five chapters. Barbarossa’s thee and thou, and the quote marks that open each paragraph of his telling, stay as printed. Some long paragraphs have been broken into shorter screens; no words are changed. A vagrant hill-girl becomes a great lady, told over a week of dinners by a garrulous boatman. Fast and sunlit. Soft Pemberton, carefully. Soft Dalmatia, carefully. Croatia is primary. PG reading-ease 85.9 is easy. No score is invented for this sit.`,
  "the-story-of-a-woman":
    `Now Dokhio, the Father of Durga, was wroth because Shiva, to whom he had given his daughter in marriage, though he had the reputation of a God, was as poor as any beggar. This sit is “The Story of a Woman” only — on a zenana rooftop in Bengal at the cow-dust hour, the women retell how Durga defied Shiva, and quarrel over how the story ends. The sit is the whole story, from the myth through the asterisk break to the rooftop at dusk, ending “…was what she said.” Cornelia Sorabji, from Between the Twilights; the year is 1908, from the volume. One story this sit. Warm and sly, and it ends quietly, so it suits bedtime. Soft Sorabji, carefully. Soft Bengal, carefully. India is primary. PG reading-ease 77.3 is for the whole volume. No score is invented for this sit.`,
  "daughters-of-men":
    `The Austrian embassy at Athens was more largely and more brilliantly attended than usual. Chapter I — a winter ball at the Austrian embassy in Athens, ministers, princes, archaeologists and a poet, and among them a fair, pale young stranger from an old Austrian castle, shy and utterly alone. The first sit ends on the portrait of that young man, “ready to sink with shame the instant a strange woman looked at him,” before anyone asks who he is. A heads-up before you start: the characters voice national prejudices, including one line calling the Greeks “worse than the Jews”, and there is a comic duel. Hannah Lynch; the year is 1892, from the copyright line. Her letter to Demetrios Bikelas stays, as its own page before Chapter I. Thirty-two chapters. Some long paragraphs have been broken into shorter screens; no words are changed. Athenian society seen by an Irishwoman with a sharp, fond eye: dowries, a pianist, a ridiculous duel, and a Turk in disguise who loves a Greek girl on Tenos. Worldly and ironic. Soft Lynch, carefully. Soft Athens and Tenos, carefully. Greece is primary. The lead is this book, not The Bright Shawl, not Irresolute Catherine, and not The Old Room. PG reading-ease 70.7 is plain going. No score is invented for this sit.`,
  "the-bright-shawl":
    `When Howard Gage had gone, his mother's brother sat with his head bowed in frowning thought. The opening — an old man alone after his nephew’s visit, music from next door, and Havana in the 1860s coming back to him: his friend Andrés, the dancer La Clavel, her shawl. The first sit is the first printed section, ending “…like Andalusia incarnate.” A heads-up before you start: there are executions and firing squads, and period race language in the characters’ and the narrator’s voices. Joseph Hergesheimer; the year is 1922, from the copyright line. The dedication stays, as its own page. No chapters: the book’s own section breaks divide it, untitled. Straight quotes stay as printed. Some long paragraphs have been broken into shorter screens; no words are changed. A young American in the Cuban independence underground, a dancer, and the Spanish garrison. Short and painterly. Soft Hergesheimer, carefully. Soft Havana, carefully. Cuba is primary. PG reading-ease 67.9 is plain going. No score is invented for this sit.`,
  "irresolute-catherine":
    `A dull patter of sheep's hurrying feet came from behind a small knoll that jutted into the track along the mountain. Chapter I, Bethesda — a flock coming down the mountain track, a shepherd on horseback, and below, by the river, a chapel congregation gathering for an open-air baptism. The first sit stops on Charles Saunders, Catherine’s new suitor, and his jealousy of the shepherd, before the hymn begins. Violet Jacob; the year is 1908, from the copyright line. Six chapters, each head printed once. Straight quotes and the hill speech stay as printed. Some long paragraphs have been broken into shorter screens; no words are changed. A maidservant jilted at her own baptism turns toward the shepherd she was afraid of. Clean, quick and visual, a little over two hours. Soft Jacob, carefully. Soft the Wye near Brecon, carefully. Wales is primary. PG reading-ease 76.9 is easy. No score is invented for this sit.`,
  "the-old-room":
    `The room looks out upon the square, which is so big and so fashionable that there is no business done in it. Chapter I — a great house set back from a fashionable square, an old room in it that no one enters, and the man who keeps it: Cordt, whose wife is Fru Adelheid. The first sit is Chapter I whole. A heads-up before you start: there is frank talk of infidelity, a thought of murder-suicide, and the son’s suicide at the end. Carl Ewald, in Alexander Teixeira de Mattos’s English; the year is 1908, from the copyright line. The translator’s note, with the first edition’s preface, stays as its own page. Two parts, Cordt and Cordt’s son, twenty-four chapters. Some long paragraphs have been broken into shorter screens; no words are changed. A marriage talked through in a secret room, then the son’s life in the same room. Very easy to read, adult and frank. Soft Ewald, carefully. Denmark is primary. PG reading-ease 91.7 is very easy. No score is invented for this sit.`,
  "the-fur-coat":
    `It was a cold winter that year. This sit is “The Fur Coat” only — Christmas Eve, a poor, ailing doctor borrows his rich friend’s fur coat, and in the dark hall at home his wife kisses him, thinking he is the friend. The sit is the whole story, through its three printed breaks, ending “…the last seconds of happiness I have known in my life.” Hjalmar Söderberg, in Charles Wharton Stork’s English, from Modern Swedish Masterpieces; the year is 1923, from the volume. One story this sit. Rueful and quiet, and it ends by the fire, so it suits bedtime. Soft Söderberg, carefully. Sweden is primary. PG reading-ease 78.0 is for the whole volume. No score is invented for this sit.`,
  "the-corsican-brothers":
    `In the beginning of March, 1841, I was travelling in Corsica. Chapter I — a French traveller rides from Sartène into Sullacaro, a hill village whose walls are marked with bullets, and asks hospitality at the house of Madame Savilia de Franchi. The first sit is Chapter I whole, ending on an invitation to idleness: “…one of the most agreeable which can be extended to a traveller.” A heads-up before you start: there is vendetta talk, two pistol duels (not graphic), and a ghost. Alexandre Dumas, in Henry Frith’s English; the year is 1880, from the title page of the translation. The translator’s dedication to Henry Irving stays, as its own page. Twenty chapters. Straight quotes stay as printed. A widowed mother and her twin sons, bound by a sympathy that crosses the sea; the second half moves to Paris. Brisk and charming, and only gently uncanny. Soft Dumas, carefully. Soft Sullacaro, carefully. France is primary. The lead is this book, not Jocelyn and not The Woman of Knockaloe. PG reading-ease 80.9 is easy. No score is invented for this sit.`,
  "jocelyn":
    `A light laugh came floating into the sunshine through the green shutters of a room in the Hôtel Milano. Part I, Chapter I — a laugh through the shutters of a hotel room at Mentone, and Giles Legard, ten years married to an invalid, facing a naked fact on the terrace; then the drift of his life so far. The first sit ends on that history: “…but of work, nothing; of love—nothing!” A heads-up before you start: the love story is an adultery, and the wife dies of a morphia overdose, with suicide suspected. John Galsworthy, published as John Sinjohn; his first novel, and the year is 1898, from the title page. The dedication to Joseph Conrad and the epigraph stay, as their own page. Three parts, twenty-eight chapters, and three printed breaks kept. Some long paragraphs have been broken into shorter screens; no words are changed. Hotel terraces, the casino at Monte Carlo and the yachts: a reserved Englishman, his ailing wife and her young friend. Worldly and quietly intense. Soft Galsworthy, carefully. Soft Mentone and Monte Carlo, carefully. France is primary. PG reading-ease 79.1 is easy. No score is invented for this sit.`,
  "the-woman-of-knockaloe":
    `Knockaloe is a large farm on the west of the Isle of Man, a little to the south of the fishing town of Peel. The First Chapter — the farm above Peel, old Robert Craine and his daughter Mona, the war coming to the island, and Mona’s fury at the news from Belgium. The first sit is the First Chapter whole, ending on the old man’s “You’re hard, woman, you’re hard.” A heads-up before you start: it ends in a double suicide; the characters voice wartime hatred (“Boche”, “Huns”); and she is called “Harlot” and “Strumpet”. Hall Caine; the year is 1923, from the copyright line. The epigraphs stay as their own page, and Caine’s short Introductory as its own section before the First Chapter. Sixteen chapters and a Conclusion, told in the present tense. The one footnote is kept as a note. A Manx farm girl and a German internee from the real Knockaloe camp, and the island turning on them both. Stark and fast, a parable against war. Soft Caine, carefully. Soft Peel, carefully. The Isle of Man is primary. PG reading-ease 80.7 is easy. No score is invented for this sit.`,
  "the-taking-of-the-redoubt":
    `A military friend of mine, who died of a fever in Greece a few years ago, told me one day about the first action in which he took part. This sit is “The Taking of the Redoubt” only — a young officer’s first battle, from the red moon rising behind the redoubt to the charge. The sit is the whole story, ending “Finished, my boy, but the redoubt is taken!” and the date the story carries, 1829. A heads-up before you start: there is battle violence, and one graphic sentence about a death. Prosper Mérimée, in George Burnham Ives’s English, from Prosper Mérimée’s Short Stories; the year is 1903, for the volume. One story this sit. Sober and unsentimental, for the evening rather than for sleep. Soft Mérimée, carefully. Soft Cheverino, carefully. Russia is primary. PG reading-ease 79.5 is for the whole volume. No score is invented for this sit.`,
  "the-man-in-the-brown-suit":
    `Nadina, the Russian dancer who had taken Paris by storm, swayed to the sound of the applause, bowed and bowed again. The Prologue — Paris, a Russian dancer at the height of her fame, and a low-voiced talk in her dressing-room about the man who has organized crime as another man might organize a business. The first sit is the Prologue whole, ending on “As a matter of fact, he happens to be my husband.” A heads-up before you start: there is a strangling, inquest talk of suicide, and a violent strike on the Rand. Agatha Christie; the year is 1924. The dedication to E. A. B. stays, as its own page. A Prologue and thirty-six chapters, mostly in Anne Beddingfeld’s own voice. Curly quotes stay as printed. An orphan with no money and a taste for adventure sees a man fall to his death in the Tube and follows one clue to a liner bound for Cape Town. Quick, funny and lively; an early thriller rather than a puzzle. Soft Christie, carefully. Soft Paris, then Cape Town and Rhodesia, carefully. South Africa is primary. The lead is this book, not Wang the Ninth and not Garram the Hunter. PG reading-ease 85.4 is easy. No score is invented for this sit.`,
  "wang-the-ninth":
    `Wang the Ninth was born a few years before the end of the nineteenth century in a village called prosaically in the vernacular Ten Li Hamlet because it lay ten li or Chinese miles from the great imperial highway. Chapter I — Ten Li Hamlet in a famine year, a family with too many children, and a wheelbarrow pushed towards the city. The first sit is Chapter I whole, ending “…the father seizing the handles of the wheelbarrow pushed clumsily on.” A heads-up before you start: there is famine, children are sold, and the narrator makes period generalizations about “all Chinese”. B. L. Putnam Weale; the year is 1920. The author’s two-sentence preface, signed Peking, July, 1919, stays, as its own page. Twenty-eight chapters and one printed break kept. Straight quotes stay as printed. An eighth child (the Ninth is a nickname), left at three at the gate of the capital, grows up quick-witted and stubborn in the streets and ends up running messages for a red-bearded foreigner when war comes. Sharp, unsentimental and often funny. Soft Putnam Weale, carefully. Soft Ten Li Hamlet, carefully. China is primary. PG reading-ease 79.6 is easy. No score is invented for this sit.`,
  "garram-the-hunter":
    `Garram stopped silently in midstride and listened. Chapter I — a hill boy and his dog on the trail of a leopard in the dry grass, and a hunt that ends with one stroke of a knife. The first sit is Chapter I whole, ending “…half sorry for his fine opponent, then turned to the work on hand.” A heads-up before you start: there are slave raids, and one line about a living slave built into a pillar. Herbert Best; the year is 1930. The dedication stays, as its own page. Twenty-three chapters with their printed titles, and three printed breaks kept; the illustrations are not included. Curly quotes stay as printed. Garram and Kon, his clever dog, go from leopard hunts to Yelwa, the walled Fulani city of the plains, where an Emir’s court, a royal hunt and a traitor are waiting, before the slave raiders come for the Hills. A fast adventure, full of tracking, tricks and village talk. Soft Best, carefully. Soft hills and plains, carefully. Nigeria is primary. No PG reading-ease is given for this text, so none is cited. No score is invented for this sit.`,
  "his-dead-wifes-photograph":
    `This story created a sensation when it was first told. This sit is “His Dead Wife’s Photograph” only — a clerk who dabbles in photography takes a picture of a colleague’s family, and there is one more figure on the plate than there should be. The sit is the whole story, with the narrator’s own opening and one printed break, ending “…nevertheless an art worth learning.” A heads-up before you start: a wife and baby die in childbirth. S. Mukerji, from Indian Ghost Stories; the year is 1917, the second edition. One story this sit. Plain, wistful and only gently uncanny, for the evening rather than for sleep. Soft Mukerji, carefully. India is primary. PG reading-ease 79.4 is for the whole volume. No score is invented for this sit.`,
  "the-face-in-the-abyss":
    `It has been just three years since I met Nicholas Graydon in the little Andean village of Chupan, high on the eastern slopes of the Peruvian uplands. Chapter I — an inn in the Andean village of Chupan, a fevered American raving of dreadful things, a gold bracelet of a snake-woman held up by four dinosaurs, and the traveller who stays to nurse him and hear his story. The first sit is Chapter I whole, ending “…since only so may a full measure of judgment of that story be gained.” A heads-up before you start: three of the narrator's companions die, one man is strangled, and a child is threatened with a whip. The book also uses the period terms 'half-breeds' and 'Indian hell-brew', left as printed. A. Merritt; the year is 1923, from the magazine printing. The magazine editors' introduction is not included. Nine chapters and one printed break kept. Straight quotes stay as printed. Treasure-hunters follow an Inca trail into a hidden valley of the Cordillera, where a vast stone face waits in the abyss. A fast, colourful lost-world romance. Soft Merritt, carefully. Soft Chupan, carefully. Peru is primary. The lead is this book, not Mary Magdalen. No PG reading-ease is given for this text, so none is cited. No score is invented for this sit.`,
  "mary-magdalen":
    `“Three to one on Scarlet!” Chapter I — the chariot races in the new circus at Tiberias, Herod Antipas and Herodias in the tribune, Mary of Magdala admired from every tier, and Judas watching her. The first sit is Chapter I whole, ending on Judas's aside: “…it would be the birthday of my life.” A heads-up before you start: chariot drivers are killed in the opening race, John the Baptist is later beheaded, and the crucifixion is told. One early line calls a city crowd a 'mongrel rabble', left as printed. Edgar Saltus; the year is 1891, from the copyright line. Ten chapters. Curly quotes stay as printed. The Gospel story told from the court of Antipas and the house at Magdala, jewelled, sardonic and adult; it follows Mary to the cross and the empty tomb. Soft Saltus, carefully. Soft Tiberias, carefully. Galilee is primary. PG reading-ease 81.5 is easy. No score is invented for this sit.`,
  "the-hoop":
    `A woman was taking her morning stroll in a lonely suburban street; a boy of four was with her. This sit is “The Hoop” only — an old factory hand, a small boy's bright new hoop, and an old barrel hoop played with in secret in the woods. The sit is the whole story, in seven short sections, ending “…his beloved mother had followed him with her eyes.” A heads-up before you start: the old man at the heart of this story dies at the end, quietly. Fyodor Sologub, in John Cournos's English, from The Old House and Other Tales; the year is 1916. One story this sit. Tender and quiet, for the evening rather than for sleep. Soft Sologub, carefully. Russia is primary. PG reading-ease 83.5 is for the whole volume. No score is invented for this sit.`,
  "love-s-shadow":
    `'There's only one thing I must really implore you, Edith,' said Bruce anxiously. 'Don't make me late at the office!' Chapter I — breakfast in a very new, very small, very white flat in Knightsbridge, Bruce Ottley fussing over a letter and his spelling while Edith humours him, then Hyacinth Verney, an orphaned heiress, talking over Cecil Reeve with her companion Anne. The first sit is Chapter I whole, ending “…with disapproving, admiring eyes.” A heads-up before you start: much later in the book, a fancy-dress scene uses a period slur for a costume, left as printed. Ada Leverson; the year is 1908, from the title page. The Shakespeare epigraph stays at the front of the book. Thirty-nine short chapters. Straight quotes stay as printed. A quick, dry Edwardian comedy of marriage and manners, told almost entirely in talk. Soft Leverson, carefully. Soft Knightsbridge, carefully. London is primary. The lead is this book, not Lewis and Irene. PG reading-ease 85.0 is easy. No score is invented for this sit.`,
  "lewis-and-irene":
    `"Fifteen," said Lewis. Part One, Chapter I — the funeral of Monsieur Vandémanque at Père Lachaise, a young financier counting beards in the pews for a game, and the boardroom coup that killed the old banker. The first sit is Part One, Chapter I whole, ending “…phosphates, oxygen).” A heads-up before you start: an old banker dies of shock in the opening pages, a suicide is reported later, and there is gossip about 'Jewish blood'. Part Two makes sweeping racial claims about Greek bankers, describes 'big black satyrs' grunting like pigs, and prints the word 'negro' twice, all left as printed. Paul Morand, in Vyvyan Holland's English (the title page signs it H. B. V.); the year is 1925, from the London edition. Three parts, 44 short chapters, one printed break kept. Straight quotes stay as printed. Lewis meets Irene, of a Greek banking house, over a deal for Sicilian mines, and love turns into a contest between two fortunes. Glittering, cynical and epigrammatic. Soft Morand, carefully. Soft Paris, carefully. France is primary. PG reading-ease 70.2 is denser than the lead. No score is invented for this sit.`,
  "a-monkey":
    `Yes, it was really a monkey that had nearly procured me 'Laudabilis' in my final law examination. This sit is “A Monkey” only — a law student the night before his final examination, a coffee-stain drawn into a monkey on page 496 of Schweigaard's Process, creaking inspectors' boots and a paper that bears on exactly that page. The sit is the whole story, with one printed break, ending “'A monkey!' I replied.” A heads-up before you start: this is one long comic monologue of exam-night nerves, with four short translator notes on the grading set in as you go. Alexander Kielland, in R. L. Cassie's English, from Norse Tales and Sketches; the year is 1896. The translator's four short notes are kept. One story this sit. Light and comic, for the evening rather than for sleep. Soft Kielland, carefully. Norway is primary. PG reading-ease 74.7 is for the whole volume. No score is invented for this sit.`,
  "wedding-day":
    `Wedding-day. It was curiously unreal. This sit is “Wedding-Day” only — on the morning of his wedding Bert looks in the glass, sees forty years of breakfasts and the eight-thirteen to town ahead, and cuts off his moustache while the cab waits. The sit is the whole story, ending ‘The forty years began.’ A heads-up before you start: no hazards; an uncle's death is mentioned only for the legacy that made the wedding possible. Gerald Bullett, from The Street of the Eye and nine other tales; the year is 1923. One story this sit. Dry and comic, for the evening rather than for sleep. Soft Bullett, carefully. The story names no place. PG reading-ease 75.0 is for the whole volume. No score is invented for this sit.`,
  "elysium":
    `The Triad came into my life as I walked underneath the arch by which the sentinels sit in Olympian state upon their rather long-legged chargers, receiving, as is their due, the silent homage of the passing nurserymaids. This sit is “Elysium” only — a soldier just back from the Flanders front walks home through St. James's with his sweetheart on one arm and his sister on the other, past the clubs and two old colonels on the steps, wrapped apart from the whole world. The sit is the whole sketch, ending “for five long days.” A heads-up before you start: the First World War sits just behind this story. The soldier is home from the front in Flanders on five days' leave. R. B. Cunninghame Graham, from Brought Forward; the year is 1916. One story this sit. Quiet and tender, for the last minutes before sleep. Soft Cunninghame Graham, carefully. Pall Mall, London. No reading-ease score is invented for this sit.`,
  "the-green-carnation":
    `He slipped a green carnation into his evening coat and looked at himself in the Piccadilly glass — a Burne-Jones angel a little weary of its own life. Skip the credit block. Hichens’s 1894 novel. Soft London after Reuben Sachs and the Forsytes; coded desire stays as printed.`,
  "hajji-baba":
    `Kerbelai Hassan, barber of Ispahan, and the razor that starts the road. Skip the Curzon introduction and the Macmillan apparatus. First 1824; this printing is 1895. Period Orientalism stays as printed — flag, do not sanitize.`,
  "the-purple-land":
    `“Three chapters in the story of my life…” opens the frame into the Banda Oriental. Skip the 1904 preface. Hudson’s 1885 novel. Uruguay, not Guyana. Guerrilla and gaucho country — Host OK.`,
  "the-master-of-ballantrae":
    `The full truth of this odd matter — Durrisdeer in 1745, and the heir who should ride by his King’s bridle. Skip the dedication and the contents rhymes. Stevenson’s 1889 novel.`,
  "a-set-of-six":
    `One tale only: Gaspar Ruiz. A revolutionary war raises strange characters, and this sit stops while the detachment is still running. It does not open The Informer. Conrad’s 1908 set. Chile’s register is not the Banda Oriental.`,
  "the-hill-of-dreams":
    `There was a glow in the sky as if great furnace doors were opened. Lucian Taylor goes out to lose himself on the Gwent hill lane. Skip the credit block and the contents. Machen’s 1907 novel. The open stays in Gwent; later London is soft after The Green Carnation.`,
  "the-story-of-an-african-farm":
    `The full African moon poured down its light from the blue sky into the wide, lonely plain. Skip the preface, the glossary, and the epigraph. Schreiner’s 1883 novel, first issued as Ralph Iron. The Karoo is not Mashonaland, not Mhudi, and not Gaspar Ruiz.`,
  "the-imperialist":
    `It would have been idle to inquire into the antecedents of old Mother Beggarlegs. Skip the produced-by credit. Duncan’s 1904 novel, Elgin, Ontario. No score is invented for this sit. The first breath is 585 words — phone-hard, left as printed.`,
  kim:
    `He sat, in defiance of municipal orders, astride the gun Zam Zammah opposite the Wonder House, as the natives call the Lahore Museum. Skip the verse epigraph. Kipling’s 1901 novel. “Half-caste” and “burned black as any native” stay as printed — flag, do not sanitize. Calvary stays held.`,
  "mogens-and-other-stories":
    `Summer it was, in the middle of the day, in a corner of the enclosure. This sit is Mogens only, a timed cut; the whole novella is too long for one sitting. Skip the introduction. Jacobsen, in Grabow’s 1921 English of the 1882 Danish. Denmark is not Stockholm after The Red Room. The other three tales stay in the book.`,
  "the-road-to-the-open":
    `George von Wergenthin sat at table quite alone to-day. The empty chair at the top of the table, and the September sun through the open window. Skip the title page. Schnitzler’s novel, Horace Samuel’s English, German 1908 / Latimer 1913. Soft against Bertha Garlan — a different title. The lead stays this road.`,
  calvary:
    `I was born one evening in October at Saint-Michel-les-Hêtres, a small town in the department of Orne. The sit stays in the Orne and the Tourouvre forest. Mirbeau, Louis Rich’s English, French 1886 / 1922. The novel continues.`,
  "anna-of-the-five-towns":
    `The yard was all silent and empty under the burning afternoon heat. Chapter I, The Kindling of Love — the Sunday-school yard and the prize-books. Skip the edition table, the dedication, and the epigraph. Bennett’s 1902 novel. The Five Towns, not London. No score is invented for this sit. The first breath is 371 words — phone-hard, left as printed.`,
  "small-souls":
    `It was pouring with rain, and Dorine van Lowe dropped in on Karel and Cateau with a wet umbrella. Skip the translator’s note. Couperus, Teixeira’s English, Dutch 1901 / 1914. The Hague is not the Java Residency.`,
  "stories-and-pictures":
    `Down here, in this world, Bontzye Shweig’s death made no impression at all. This sit is Bontzye Shweig only. Skip the preface and the other tales. Peretz, Helena Frank’s English, Yiddish 1894 / 1906. This is not the Poland theater.`,
  "white-jacket":
    `It was not a very white jacket, but white enough. Chapter I, The Jacket — Callao, and a US frigate bound for Cape Horn. Skip the note and the contents. Melville’s 1850 novel. A man-of-war, not Tahiti after The Moon and Sixpence. No score is invented for this sit. The lead stays this jacket.`,
  "a-japanese-nightingale":
    `The last rays of sunset were tingeing the land above the bay. Chapter I, The Storm Dance — a tea-house island. Skip the illustration list and the contents. Eaton’s 1901 novel, published as Onoto Watanna. Japan after Botchan and Kwaidan; the Unhuman Tour stays held. No score is invented for this sit.`,
  "maria-chapdelaine":
    `The door opened, and the men of the congregation began to come out of the church at Peribonka. Chapter I — April snow on the church steps. Skip the reprint table. Hémon, in Blake’s English, French 1913 / 1921. Peribonka is not Elgin, Ontario.`,
  "the-house-by-the-medlar-tree":
    `Once the Malavoglia were as numerous as the stones on the old road to Trezza. Chapter I — Padron ’Ntoni and the Provvidenza. Skip Howells’s introduction. Verga, in Mary A. Craig’s English, Italian 1881 / 1890. Sicily is not Rome.`,
  "filipino-popular-tales":
    `There was once an old woman who had an only son named Suan. This sit is Suan’s Good Luck only. Skip the preface, the other tales, and the notes. Fansler’s 1921 collection. One tale this sit; the book continues. No score is invented for this sit.`,
  "the-marrow-of-tradition":
    `Stay here beside her, major. Chapter I, At Break of Day — a Wilmington sickroom, the heat, a cicada, magnolias. Skip the contents and the Lamb epigraph. Chesnutt’s 1901 novel. The printed line “not he needed” stays. Wilmington is not Georgia after Cane. No score is invented for this sit. The lead stays this book.`,
  "zuleika-dobson":
    `That old bell, presage of a train, had just sounded through Oxford station. Chapter I — undergraduates on the platform, and the Warden of Judas. Skip the 1922 note. Beerbohm’s 1911 novel. Oxford is not London, and not the Potteries.`,
  "eugenie-grandet":
    `There are houses in certain provincial towns whose aspect inspires melancholy. Section I — Saumur’s steep street and the Grandet house. Skip the dedication to Maria. Balzac, in Katharine Prescott Wormeley’s English, French 1833. Saumur is not the Orne, and not Paris.`,
  "seven-brothers":
    `Jukola Farm, in the south of the province of Häme, stands on the northern slope of a hill, near the village of Toukola. Chapter I. Skip the Faber apparatus and the preface. Kivi, in Alex Matson’s English, Finnish 1870 / 1929. Thin — do not inflate it. The For you seat stays.`,
  "laos-folk-lore":
    `Deep in the forest of the North there is a large village of jungle people. This sit is A Child of The Woods only. Skip the introduction, the other tales, and the footnotes. Fleeson’s 1899 collection. One tale this sit; the book continues. Laos is not Pampanga after Suan.`,
  "born-in-exile":
    `The summer day in 1874 which closed the annual session of Whitelaw College. Part I, Chapter I — the Kingsmill statue and the smoke-canopy. Skip the Part-label apparatus. Gissing’s 1892 novel. Kingsmill is not Oxford, not London, and not the Potteries. No score is invented for this sit. The lead stays this book.`,
  "the-four-horsemen-of-the-apocalypse":
    `In 1870 Marcelo Desnoyers was nineteen years old. Chapter II, Madariaga, the Centaur — Buenos Aires and the ranch. Skip Chapter I, The Tryst. Blasco Ibáñez, in Charlotte Brewster Jordan’s English, Spanish 1916 / 1918. Argentina is not Uruguay, and not Gaspar Ruiz. Medium — do not inflate it.`,
  "virgin-soil":
    `At one o’clock in the afternoon of a spring day in the year 1868, a young man climbs the back staircase on Officers Street. Section I. Skip the epigraph and the introduction. Turgenev, in R. S. Townsend’s English, Russian 1877. No Townsend year is invented. St Petersburg after Futility — do not inflate it.`,
  "lolly-willowes":
    `When her father died, Laura Willowes went to live in London. Caroline’s spare-room negotiation — eiderdown, bureau — lands on “Of course, you will come to us.” The closed sit is Chapter I only, and it stays soft against Mr. Fortune’s Maggot.`,
  "brazilian-tales":
    `One tale only: The Fortune-Teller. Rita explains Camillo with Hamlet’s line, then the cards on Guarda-Velha Street. Stop at the tale boundary — this sit does not open The Attendant's Confession, and it is not the Tropic rail. Later tales in the volume use period racial language — flag, do not sanitize.`,
  "the-house-of-mirth":
    `Grand Central, a Monday in early September—the afternoon rush, the heat, the crowd. Lawrence Selden notices Lily Bart standing apart from it all, vivid against the dull tints of the station. Edith Wharton’s 1905 New York novel begins with a chance meeting that doesn’t feel accidental.`,
  carmilla:
    `A lonely schloss in Styria. A teenage narrator with too few neighbors. And a childhood night she still can’t forget—a pretty face at the bedside, then a pain like needles. Sheridan Le Fanu’s gothic novella (serialized 1871–72; collected 1872) opens on solitude and that first fright, before any carriage has rolled in.`,
  "hungry-hearts":
    `My heart chokes in me like in a prison. This sit is Wings only — a janitor’s basement on a May Sunday. Skip the contents, the other tales, and the dedication. Yezierska’s 1920 collection. One tale this sit; the book continues. The Lower East Side is not Laos.`,
  "the-sport-of-the-gods":
    `Fiction has said so much in regret of the old days when there were plantations and overseers and masters and slaves. Chapter I, The Hamiltons — the Berry cottage, the Oakley mansion, and a butler’s dignity. Skip the contents. This timed sit stops before the New York chapters. Dunbar’s 1902 novel. The book continues north. Soft Southern Oakley is not Wilmington after Marrow. The Host stays in the South, after Wings on the Lower East Side. Inventory is medium. No score is invented for this sit. The lead stays this book.`,
  ramuntcho:
    `The sad curlews, annunciators of the autumn, had just appeared in a mass in a gray squall. Part I, Chapter I — the Bidassoa, the moss path, and rope soles. Skip the produced-by credit. Loti, in Henri Pene du Bois’s English, French 1897. No English year is invented. Soft Basque is not Saumur, not the Orne, and not Paris. Inventory is easy — do not inflate it. There is no For you seat to keep.`,
  "the-pit":
    `At eight o’clock in the inner vestibule of the Auditorium Theatre, Laura Dearborn waits. Chapter I — a Chicago February draught. Skip the list of principal characters, the trilogy note, and the dedication. Norris’s 1903 novel. Soft Chicago is new. Inventory is medium. No score is invented for this sit.`,
  reginald:
    `I did it—I who should have known better. This sit is the title sketch only — the McKillop garden-party. Skip the contents and the other sketches. Saki’s 1904 book. One sketch this sit; the cycle continues. Soft London, carefully. Inventory is easy. No score is invented for this sit.`,
  "royal-highness":
    `The scene is the Albrechtstrasse, the main artery of the capital, at noon. A general and a lieutenant in grey great-coats. Prelude — skip the contents and the imprint. Thomas Mann, in A. Cecil Curtis’s English. German 1909, Curtis English 1916. Soft Germany is new after a run of American sits. The lead is this book, not Ramona. Inventory is medium. No score is invented for this sit.`,
  ramona:
    `It was sheep-shearing time in Southern California, but sheep-shearing was late at the Senora Moreno’s. Chapter I — the Senora, Felipe, and the Mission ranch. Skip the produced-by credit. Helen Hunt Jackson’s 1884 novel. Soft Mission country is not Oakley, not the Midwest, and not Chicago. Inventory is medium. No score is invented for this sit.`,
  "almayers-folly":
    `Kaspar! Makan! Chapter I — the verandah, Pantai at sunset, and a decaying house. Skip the Amiel epigraph and the edition block. Joseph Conrad’s 1895 novel. Soft Conrad is not Gaspar Ruiz. Notion is medium. Launch shelf is no. For you only if the shelf is already dense — do not inflate it. There is no For you seat to keep.`,
  "the-crux":
    `The Foote Girls were bustling along Margate Street. Chapter I, The Back Way — Do come on, Rebecca, and the Lane white house. Skip the verse epigraph. The Host opens in New England before Colorado. Charlotte Perkins Gilman’s 1911 novel. Soft New England moving toward Colorado, carefully. Inventory is easy. No score is invented for this sit.`,
  "the-black-dog":
    `Having pocketed his fare, the freckled rustic takes the old cab back to the village. This sit is the title tale only — the one-eyed porter, July noon, Loughlin. Skip the contents and the other tales. A. E. Coppard’s 1923 book. One tale this sit; the cycle continues. Soft England village, carefully, after Reginald. Inventory is medium. No score is invented for this sit.`,
  "daisy-miller":
    `At the little town of Vevey, in Switzerland, there is a particularly comfortable hotel. Opening — lake hotels, Winterbourne, and the American tourist climate. Skip the produced-by credit. The Host opens in Vevey; Rome comes later in the book. Henry James’s 1878 novella. Soft Switzerland clears a harder place after Sicily and Sardinia. The lead is this book, not South Wind. Inventory is easy. No score is invented for this sit.`,
  "south-wind":
    `The bishop was feeling rather sea-sick. Chapter I — Bampopo in Africa, then the approach to Nepenthe. Skip the imprint. Norman Douglas’s 1917 novel. Soft Capri is not Sicily and not Sardinia. Notion is medium. Launch shelf is no — do not inflate it.`,
  "the-village":
    `The great-grandfather of the Krasoffs, called the Gipsy, was hunted with wolf-hounds. Chapter I — Captain Durnovo and Durnovka. Skip the preface and the imprint. Ivan Bunin, in Isabel Florence Hapgood’s English. Russian 1910, Secker English 1923. Soft village Russia is not Petersburg. Inventory is medium. Later is all right if the sit is grim — do not inflate it. No score is invented for this sit.`,
  "ditte-girl-alive":
    `It has always been considered a sign of good birth to count one’s ancestors for centuries back. Chapter I, Ditte’s Family Tree — Ditte Child o’ Man stood at the top of the tree. Skip the contents. Martin Andersen Nexø, in Asta and Rowland Kenney’s English. Danish 1917, Holt English 1920. Soft Denmark is not Mogens. Inventory is medium. No score is invented for this sit.`,
  "flappers-and-philosophers":
    `After dark on Saturday night one could stand on the first tee of the golf-course. This sit is Bernice Bobs Her Hair only — yellow club windows and the wicker balcony. Skip the contents and the other tales. F. Scott Fitzgerald’s 1920 book. One tale this sit; the cycle continues. Soft Jazz Age America, carefully, after The Black Dog and Reginald. Notion is easy. Launch shelf is no.`,
  "in-our-time":
    `A drunk battery on a dark road—then a Michigan lake at dawn, and Nick Adams in a rowboat with his father. Ernest Hemingway’s 1925 American collection opens with a war vignette snapped against “Indian Camp”: spare sentences, long silences, the method already underway.`,
  botchan:
    `A Tokyo kid who cannot fake manners jumps from a school window on a dare, then takes a knife to his own thumb to prove the blade is sharp. Natsume Sōseki’s 1906 novel opens on that hereditary recklessness — and the scar that will be there until his death.`,
  "nacha-regules":
    "An August night — Buenos Aires ablaze for the Centennial. Gálvez in Ongley’s English includes cabaret sex-work and violence; do not sanitize or pitch it as light romance.",
  krakatit:
    "With the evening the fog of the cold, damp day grew thicker on the Old Town embankment — then suddenly a pair of penetrating eyes fixed on him. Stop before the Krakatit-box densifies. The novel continues.",
  "the-peasants":
    "Agatha and the priest on the autumn road — “Praised be Jesus Christ!” Dziewicki’s English of the Autumn volume, PG 75846. Village poverty, Catholic period speech, and a Jewish ragpicker on the road; Host may name the ethnic and period register, and don’t sanitize.",
  "a-hungarian-nabob":
    "Rain on the puszta, 1822 — Peter Bús’s “Break-’em-tear-’em” csárda. Bain’s English, PG 20978. Hungarian class satire and period ethnic vocabulary stay in the sit; Host OK.",
  "an-iceland-fisherman":
    "Five Breton seamen drink in a bilge-water cabin. Cambon’s English, PG 2196, year 1886 only. Rough marriage talk and sea-labor desire; soft against Growth of the Soil and Gösta Berling — a different country. Host may name the soft.",
  "the-song-of-the-blood-red-flower":
    "A strawberry song and the girls’ ring — the Gazelle chase. Logger eros under the village dance; Host may name the sensual chase, and don’t sanitize.",
  "irish-fairy-tales":
    "Finnian of Moville goes after the disapproved gods, and meets Tuan mac Cairill. Chapter I only — the sit ends when Time laughs at Tuan. Christian and pagan clash, and the “magician” framing; Host OK.",
  blacker:
    "Emma Lou on her “luscious black complexion,” and the family that trained her to mourn it — a Harlem colorism sit. Period intra-community color hierarchy language is the book; Host may name it, and don’t sanitize.",
  "a-lost-lady":
    "Sweet Water along the Burlington — Niel’s memory of Marian Forrester when the frontier ethos dies into money. Soft against Death Comes for the Archbishop.",
  "lady-macbeth":
    "Katerina Lvovna is bored in her rich father-in-law’s empty house in Mtsensk. Chamot’s 1923 English. An adultery and murder novella; Host OK.",
  summer:
    "Charity Royall stands on the doorstep of North Dormer’s one street, in the Berkshires. Soft against Bunner Sisters.",
  "jacob-s-room":
    "Betty Flanders writing in the sand — Cornwall, then the room that will be Jacob’s. The experimental voice is the sit.",
  "the-tenant-of-wildfell-hall":
    "“You must go back with me to the autumn of 1827” — Gilbert Markham’s Yorkshire frame. A long novel; Host OK.",
  herland:
    "The narrator writes from memory the journey into a country of women. An idea-led utopia; Host OK.",
  "the-last-man":
    "Sea-surrounded England, and the narrator’s ruined lineage — a plague and exile epic. Heavy; a later sit.",
  "the-wanderer":
    "He arrived at our home on a Sunday of November, 189… — Sainte-Agathe, and the schoolhouse that is no longer theirs. Delisle’s 1928 English. The year ellipsis stays; Host may leave it.",
  "the-cabala":
    "The train that first carried me into Rome was late, across the Campagna in a Virgilian sigh, and this sit stops when the air of Naples generates legend. Wilder’s 1926 novel. The compartment comedy comes after. This is not The Bridge of San Luis Rey.",
  "reuben-sachs":
    "Reuben Sachs was the pride of his family. His mother, safe in her investments, says he must marry money. Skip the chapter motto. Levy’s 1888 London.",
  "the-sun-also-rises":
    "Robert Cohn was once middleweight boxing champion of Princeton. Spider Kelly flattens his nose, and this sit stops there. Skip the Stein and Ecclesiastes lines. Hemingway’s 1926 novel reopens into the Paris café. This is not Blood and Sand.",
  "the-man-of-property":
    "Those privileged to be present at a family festival of the Forsytes have seen an upper middle-class family in full plumage. The sit runs through Aunt Ann’s grey hat. Galsworthy’s 1906 novel, Volume 1 only.",
  "theresa-raquin":
    "The Arcade of the Pont Neuf is a damp corridor of dumpy shops. Skip the translator’s preface. Vizetelly’s English of Zola’s 1867 novel continues. This is not Bel-Ami.",
  "trooper-peter-halket-of-mashonaland":
    "A dark night on a Mashonaland kopje, Trooper Peter Halket’s fire quivering, a burnt kraal already in the dark. Skip the glossary. Schreiner’s 1897 novella keeps the Chartered Company frame — name it, and don’t sanitize. Not the Africa novel pile.",
  "the-late-mattia-pascal":
    "One of the few things he was sure of was his name: Mattia Pascal — the library at Miragno. Livingston’s 1923 English. Comic self-narration; Host OK.",
  basilio:
    "Lisbon breakfast, the cuckoo-clock strikes eleven, and Luiza reads that Cousin Bazilio is coming home. Serrano’s 1889 English, PG 74442, is abridged and bowdlerized. Adultery and household power; Host OK. Sit with it as Dragon’s Teeth.",
  oblomov:
    "Oblomov in bed on Gorokhovaya Street with a dreaded letter from his estate. Hogarth’s English, PG 54700, abridged. Serf-era master and servant (Zakhar, *barin*) and period class language; Host note, don’t sanitize.",
  "the-lady-with-the-dog-and-other-stories":
    "Gurov at Yalta sees the lady in the *béret*. Title story only, Chapter I per sit — Garnett’s English, PG 13415. Gurov’s contempt for women (“the lower race”) is period misogyny; Host may name it. Not the same day as the Adapted late-season remake.",
  zeno:
    "Zeno’s first cigarettes and the last-cigarette habit, in Trieste. De Zoete’s English; PG 79453 gives the original publication as 1930. Comic self-deception; Host OK.",
  "the-book-of-khalid":
    "Baalbek’s ruins, the bazaar, and the donkey-boy Khalid. Rihani wrote it in English, PG 29257. Opens at Chapter II. Ottoman and imperial politics (“Time and the Turks,” the Kaiser pilfering temples) and self-Orientalizing irony; Host note, don’t sanitize.",
  cane:
    "Karintha: her skin is like dusk on the eastern horizon. Skip the foreword. This sit is Karintha only — later Georgia sketches are later sits.",
  generosity:
    "An apology begins with a box of unused baby clothes and a basement mural of identical smiles. The story keeps going until the face is only itself again.",

};

/** Default Rituals chip — first-session / stranger lead, never Serialize. */
export const FOR_YOU_LANE_ID = "for-you";

/**
 * Mira A24 first-session lead (Sun Sep 20, 2026 ET).
 * Cold open first three: Mirth → Quicksand → Botchan.
 * Maggot / Bridge stay strong but are not this trio.
 */
export const FIRST_SESSION_RITUAL_IDS = [
  "the-house-of-mirth",
  "quicksand",
  "botchan",
] as const;

export const RITUAL_LANES: RitualLane[] = [
  {
    id: FOR_YOU_LANE_ID,
    label: "For you",
    hint: "First sitting",
    workIds: [
      ...FIRST_SESSION_RITUAL_IDS,
      "there-is-confusion",
      "miss-lulu-bett",
      "seven-brothers",
      "on-the-seaboard",
      "bel-ami",
      "hadji-murad",
      "anandamath",
      "thais",
      "bunner-sisters",
      "bertha-garlan",
      "zeno",
      "the-book-of-khalid",
      "summer",
      "jacob-s-room",
      "the-tenant-of-wildfell-hall",
      "herland",
      "the-last-man",
      "the-late-mattia-pascal",
      "generosity",
      "where-angels-fear-to-tread",
    ],
  },
  {
    id: SERIALIZE_LANE_ID,
    label: "Serialize",
    hint: "Night by night",
    workIds: [],
  },
  {
    id: "bite-sized",
    label: "Bite-sized",
    hint: "One sitting",
    workIds: [
      "passing",
      "bunner-sisters",
      "the-weary-blues",
      "kwaidan-stories-and-studies-of-strange-things",
      "the-house-of-mirth",
      "carmilla",
      "hungry-hearts",
      "in-our-time",
      "casanovas-homecoming",
      "jamaica-anansi-stories",
      "african-tragedy",
      "brazilian-tales",
      "tropic",
      "letters-of-a-javanese-princess",
      "white-nights",
      "west-african-folk-tales",
      "irish-fairy-tales",
      "the-lady-with-the-dog-and-other-stories",
      "lady-macbeth",
    ],
  },
  {
    id: "before-sleep",
    label: "Before sleep",
    hint: "Dreams / night",
    workIds: [
      "quicksand",
      "attendants-confession",
      "rashomon",
      "high-wind-jamaica",
      "vera",
      "trooper-peter-halket",
      "the-home-and-the-world",
      "the-immoralist",
      "a-hero-of-our-time",
      "strange-tales",
      "short-stories-from-the-balkans",
      "the-awakening",
      "a-few-figs-from-thistles",
      "tropic",
      "there-is-confusion",
      "buddenbrooks",
      "miss-lulu-bett",
      "color",
      "the-three-impostors",
      "reginald",
      "last-poems-housman",
      "the-dynamiter",
      "candide",
      "trooper-peter-halket-of-mashonaland",
      "the-toys-of-peace",
      "the-black-dog",
      "children-of-the-frost",
      "south-sea-tales",
      "fairies-and-fusiliers",
      "young-adventure",
      "the-tempers",
      "the-crescent-moon",
      "poems-by-emily-dickinson-series-one",
      "the-gadfly",
      "ecstasy",
      "the-painted-veil",
      "nada-the-lily",
      "all-quiet-on-the-western-front",
      "the-story-of-gosta-berling",
      "thais",
      "demian",
      "bliss",
      "a-hundred-and-seventy-chinese-poems",
      "dubliners",
      "gitanjali",
      "martin-bircks-youth",
      "harmonium",
      "krakatit",
      "cane",
      "the-pattern",
      "between-the-drop-and-the-water",
      "story-of-an-hour-buenos-aires",
      "masque-rio",
      "usher-prague",
      "araby-seville",
      "the-wild-swans-at-coole",
      "kwaidan-stories-and-studies-of-strange-things",
      "the-listeners-and-other-poems",
      "the-empty-house-and-other-ghost-stories",
      "dark-of-the-moon",
      "love-songs",
      "the-house-of-souls",
      "wallpaper",
      "silhouettes",
      "a-diversity-of-creatures",
      "an-american-tragedy",
      "bertha-garlan",
      "born-in-exile",
      "charmides-and-other-poems",
      "dauber",
      "eugenie-grandet",
      "in-a-glass-darkly",
      "indiana",
      "lady-windermeres-fan",
      "pans-garden",
      "peacock-pie",
      "prosas-profanas",
      "rosmersholm",
      "salome",
      "salt-water-ballads",
      "songs-and-satires",
      "the-ballad-of-the-white-horse",
      "the-book-of-wonder",
      "the-colonel-s-dream",
      "the-comedienne",
      "the-crux",
      "the-dream",
      "the-gods-of-pegana",
      "the-grand-babylon-hotel",
      "the-hidden-force",
      "the-jacket",
      "the-magic-skin",
      "the-man-of-property",
      "the-napoleon-of-notting-hill",
      "the-party-and-other-stories",
      "the-pit",
      "the-reign-of-greed",
      "the-rise-of-david-levinsky",
      "the-rise-of-silas-lapham",
      "the-romance-of-the-milky-way",
      "the-three-taverns",
      "the-titan",
      "the-town-down-the-river",
      "the-veil-and-other-poems",
      "the-village",
      "the-wolves-of-god",
      "the-wonderful-adventures-of-nils",
      "theresa-raquin",
      "twilight-sleep",
      "virgin-soil",
      "wanderers",
      "yekl",
      "zuleika-dobson",
      "a-group-of-noble-dames",
      "captain-craig",
      "daniel-deronda",
      "day-and-night-stories",
      "fifty-one-tales",
      "jude-the-obscure",
      "les-villes-tentaculaires",
      "neue-gedichte",
      "over-the-brazier",
      "rolling-stones",
      "salammbo",
      "smoke-bellew",
      "songs-from-vagabondia",
      "songs-of-childhood",
      "ten-minute-stories",
      "the-everlasting-mercy",
      "the-golden-bowl",
      "the-rainbow",
      "the-sword-of-welleran",
      "time-and-the-gods",
      "a-changed-man",
      "ballads-of-a-bohemian",
      "ballads-of-a-cheechako",
      "crucial-instances",
      "filipino-popular-tales",
      "lost-illusions",
      "mogens",
      "more-songs-from-vagabondia",
      "rhymes-of-a-red-cross-man",
      "rhymes-of-a-rolling-stone",
      "songs-of-travel",
      "the-faith-of-men",
      "the-golden-whales-of-california",
      "the-hermit-and-the-wild-woman",
      "the-princess-casamassima",
      "the-son-of-the-wolf",
      "the-stolen-bacillus",
      "the-tragic-muse",
      "toward-the-gulf",
      "a-house-of-gentlefolk",
      "artists-wives",
      "blix",
      "emaux-et-camees",
      "eves-ransom",
      "fraternity",
      "les-heures-claires",
      "les-trophees",
      "royal-highness",
      "the-great-hunger",
      "the-patrician",
      "the-price-of-love",
      "the-private-papers-of-henry-ryecroft",
      "unhuman-tour-kusamakura",
      "ubirajara",
      "cecilia",
      "la-regenta",
      "los-pazos-de-ulloa",
      "nazarin",
      "the-octopus",
      "the-red-and-the-black",
      "alcools",
      "petersburg",
      "st-peter-s-umbrella",
      "caesar-or-nothing",
      "calligrammes",
      "martin-fierro",
      "the-complete-original-short-stories",
      "the-cabin",
      "les-chants-de-maldoror",
      "pan-tadeusz",
      "the-red-laugh",
      "before-adam",
      "bruges-la-morte",
      "casmurro",
      "les-civilises",
      "ein-landarzt",
      "hien-le-maboul",
      "knulp",
      "iracema",
      "tristana",
      "niels",
      "amor-de-perdicao",
      "das-stunden-buch",
      "misericordia",
      "the-mandarin",
      "policarpo",
      "quincas",
      "marianela",
      "pepita-jimenez",
      "a-illustre-casa-de-ramires",
      "an-iceland-fisherman",
      "aphrodite",
      "azul",
      "contes-cruels",
      "les-amours-jaunes",
      "libro-de-poemas",
      "on-the-eve",
      "papeis-avulsos",
      "piping-hot",
      "ramuntcho",
      "the-fortune-of-the-rougons",
      "the-paying-guest",
      "the-triumph-of-death",
      "the-witch-and-other-stories",
      "therese-raquin",
      "tradiciones-peruanas",
      "watch-and-ward",
      "bay-a-book-of-poems",
      "black-spirits-and-white-a-book-of-ghost-stories",
      "fir-flower-tablets",
      "hugh-selwyn-mauberley",
      "os-lusiadas",
      "the-black-monk-and-other-stories",
      "the-heart-of-happy-hollow",
      "the-hesperides-and-noble-numbers",
      "the-horse-stealers-and-other-stories",
      "the-mystery-of-choice",
      "the-poems-of-emma-lazarus-volume-1",
      "weird-tales",
      "siddhartha",
      "faust-part-i",
      "the-divine-comedy",
      "eugene-onegin",
      "gilgamesh",
      "bontshe-the-silent",
      "shahnameh",
      "song-of-songs",
      "baudelaire-prose-and-poetry",
      "tales-grotesque-and-curious",
      "a-book-barnes",
      "a-spring-time-case",
      "jewish-children",
      "essays-and-soliloquies",
      "tragic-sense-of-life",
      "white-buildings",
      "three-plays",
      "the-sweet-miracle",
      "red-oleanders",
      "stories-from-tagore",
      "the-fugitive",
      "nationalism",
      "the-cycle-of-spring",
      "creative-unity",
      "the-lonely-way",
      "rootabaga-stories",
      "rootabaga-pigeons",
      "auguste-rodin",
      "on-the-seaboard",
      "lucky-pehr",
      "the-dream-play",
      "the-father",
      "easter",
      "the-inferno",
      "trafalgar",
      "saragossa",
      "leon-roch",
      "yiddish-short-stories",
      "tales-of-old-japan",
      "chinese-literature",
      "the-prose-tales",
      "self-determining-haiti",
      "leon-roch-vol-2",
      "miss-julia",
      "in-midsummer-days",
      "the-chinese-fairy-book",
      "japanese-fairy-world",
      "japanese-literature",
      "romances-of-old-japan",
      "warriors-of-old-japan",
      "a-history-of-chinese-literature",
      "the-civilization-of-china",
      "kimiko",
      "glimpses-of-unfamiliar-japan",
      "hebrew-literature",
      "the-history-of-yiddish-literature",
      "korean-folk-tales",
      "smoke-and-steel",
      "gods-trombones",
      "lady-macbeth",
      "layla",
      "conference",
      "gentlemen-prefer-blondes",
      "of-one-blood",
      "lady-into-fox",
      "african-farm",
      "a-passage-to-india",
      "mhudi",
      "maria",
      "bel-ami",
      "magnhild",
      "of-human-bondage",
      "green-mansions",
      "jamaica-anansi-stories",
      "hadji-murad",
      "death-comes-for-the-archbishop",
      "banjo",
      "nacha-regules",
      "african-tragedy",
      "anandamath",
      "enchanted-april",
      "quicksand",
      "underdogs",
      "kwaidan-stories-and-studies-of-strange-things",
      "thais",
      "lolly-willowes",
      "cheri",
      "all-quiet-on-the-western-front",
      "the-gadfly",
      "brazilian-tales",
      "the-painted-veil",
      "growth-of-the-soil",
      "tropic",
      "bunner-sisters",
      "bread-givers",
      "the-story-of-gosta-berling",
      "bertha-garlan",
      "letters-of-a-javanese-princess",
      "a-hero-of-our-time",
      "after-the-divorce",
      "blood-and-sand",
      "white-nights",
      "west-african-folk-tales",
      "the-peasants",
      "a-hungarian-nabob",
      "an-iceland-fisherman",
      "the-song-of-the-blood-red-flower",
      "irish-fairy-tales",
      "basilio",
      "oblomov",
      "the-lady-with-the-dog-and-other-stories",
      "zeno",
      "the-book-of-khalid",
      "blacker",
      "a-lost-lady",
      "lady-macbeth",
      "summer",
      "jacob-s-room",
      "the-tenant-of-wildfell-hall",
      "herland",
      "the-wanderer",
      "the-late-mattia-pascal",
      "the-cabala",
      "reuben-sachs",
      "the-sun-also-rises",
      "the-man-of-property",
      "the-awakening",
      "theresa-raquin",
      "there-is-confusion",
      "pointed-roofs",
      "the-rise-of-silas-lapham",
      "indiana",
      "the-hidden-force",
      "the-home-and-the-world",
      "hunger",
      "jude-the-obscure",
      // Mira Fri 25 Sep 2026 ~6PM CLEAR — High Wind leads. Never Featured.
      "high-wind-jamaica",
      "vera",
      "futility",
      "the-comedienne",
      // Mira Sat 26 Sep 2026 AM CLEAR — Moon leads. Never Featured.
      "the-moon-and-sixpence",
      "my-brilliant-career",
      "the-plumed-serpent",
      "the-red-room",
      // Mira Sat 26 Sep 2026 MIDDAY CLEAR — Green Carnation leads. Never Featured.
      // Purple Land leaves its earlier seat so this cycle reads in order.
      "the-green-carnation",
      "hajji-baba",
      "the-purple-land",
      "the-master-of-ballantrae",
      // Mira Sat 26 Sep 2026 AFTERNOON CLEAR — Hill of Dreams leads. Never Featured.
      "the-hill-of-dreams",
      "the-story-of-an-african-farm",
      "the-imperialist",
      "kim",
      // Mira Sat 26 Sep 2026 EVENING CLEAR — Road to the Open leads. Never Featured.
      // Earlier seats left this lane so the cycle reads in order.
      "the-road-to-the-open",
      "calvary",
      "anna-of-the-five-towns",
      "small-souls",
      // Mira Sat 26 Sep 2026 ~6PM CLEAR — White Jacket leads. Never Featured.
      // Earlier seats left this lane so the cycle reads in order.
      "white-jacket",
      "a-japanese-nightingale",
      "maria-chapdelaine",
      "the-house-by-the-medlar-tree",
      // Mira Sun 27 Sep 2026 AM CLEAR — Marrow of Tradition leads. Never Featured.
      // Earlier Zuleika and Eugenie seats stay. Seven Brothers joins this tail.
      "the-marrow-of-tradition",
      "zuleika-dobson",
      "eugenie-grandet",
      "seven-brothers",
      // Mira Sun 27 Sep 2026 POST-#169 CLEAR — Born in Exile leads. Never Featured.
      // Earlier Born in Exile, After the Divorce, and Virgin Soil seats stay.
      "born-in-exile",
      "the-four-horsemen-of-the-apocalypse",
      "after-the-divorce",
      "virgin-soil",
      // Mira Sun 27 Sep 2026 POST-#170 CLEAR — The Sport of the Gods leads. Never Featured.
      // Earlier Miss Lulu Bett, The Pit, and Ramuntcho seats stay. Reginald is Waking up.
      "the-sport-of-the-gods",
      "ramuntcho",
      "miss-lulu-bett",
      "the-pit",
      // Mira Sun 27 Sep 2026 POST-#171 CLEAR — Royal Highness leads. Never Featured.
      // LEAD SWAP — not Ramona. Earlier Royal Highness and The Crux seats stay.
      // The Black Dog is Waking up.
      "royal-highness",
      "ramona",
      "almayers-folly",
      "the-crux",
      // Mira Sun 27 Sep 2026 POST-#172 CLEAR — Daisy Miller leads. Never Featured.
      // LEAD SWAP — not South Wind. Earlier Village seat stays.
      // Flappers and Philosophers is Waking up (Bernice only).
      "daisy-miller",
      "south-wind",
      "the-village",
      "ditte-girl-alive",
      // Mira Sun 27 Sep 2026 MIDDAY CLEAR — Candide leads. Never Featured.
      // LEAD kept — not Aphrodite, not Iola Leroy. Earlier Candide and Aphrodite seats stay.
      // Spider Tales is Waking up.
      "candide",
      "iola-leroy",
      "esther-waters",
      "aphrodite",
      // Mira Sun 27 Sep 2026 POST-#174 CLEAR — Erewhon leads. Never Featured.
      // LEAD kept — not Ann Veronica, not The Great Hunger, not The Mysterious Stranger.
      // Earlier Great Hunger seat stays where it already sits. Law of Life is Waking up.
      "erewhon",
      "ann-veronica",
      "the-great-hunger",
      "the-mysterious-stranger",
      // Mira Sun 27 Sep 2026 POST-#175 CLEAR — The Poison Tree leads. Never Featured.
      // LEAD kept — not Cosmopolis, not The Woman Who Did, not Billy Budd.
      // Earlier before-sleep inventory listing of The Poison Tree moves here so the cycle reads in order.
      // Malay Sketches is Waking up (A Malay Romance only).
      "the-poison-tree",
      "cosmopolis",
      "the-woman-who-did",
      "billy-budd",
      // Mira Sun 27 Sep 2026 POST-#176 CLEAR — Cousin Betty leads. Never Featured.
      // LEAD kept — not The Sorrows of Satan, not The King of Schnorrers, not Hania.
      // Earlier before-sleep inventory listings of Cousin Betty and Hania move here so the cycle reads in order.
      // The Toys of Peace is Waking up (the title sketch only).
      "cousin-betty",
      "the-sorrows-of-satan",
      "the-king-of-schnorrers",
      "hania",
      // Mira Sun 27 Sep 2026 POST-#177 CLEAR — Tess of the d’Urbervilles leads. Never Featured.
      // LEAD kept — not Captains Courageous, not Numa Roumestan, not Dracula.
      // Earlier before-sleep inventory listings of Tess and Numa move here so the cycle reads in order.
      // The Tug of Love is Waking up (the title sketch only).
      "tess-of-the-durbervilles",
      "captains-courageous",
      "numa-roumestan",
      "dracula",
      // Mira Sun 27 Sep 2026 POST-#178 CLEAR — The House of the Seven Gables leads. Never Featured.
      // LEAD kept — not Heart of Darkness, not Toilers of the Sea, not Indian Summer.
      // Earlier before-sleep inventory listings move here so the cycle reads in order.
      // A Slav Soul is Waking up (the title sketch only).
      "the-house-of-the-seven-gables",
      "heart-of-darkness",
      "toilers-of-the-sea",
      "indian-summer",
      // Mira Sun 27 Sep 2026 POST-#179 CLEAR — Cabbages and Kings leads. Never Featured.
      // LEAD kept — not Dorian Gray, not The Job, not The Reign of Greed.
      // Earlier before-sleep inventory listing of The Job moves here so the cycle reads in order.
      // A Cross Line is Waking up (the title sketch only).
      "cabbages-and-kings",
      "picture-of-dorian-gray",
      "the-job",
      "reign-of-greed",
      // Mira Sun 27 Sep 2026 POST-#180 CLEAR — The Shadow of the Cathedral leads. Never Featured.
      // LEAD kept — not The Way of All Flesh, not The Family at Gilje, not Resurrection.
      // Earlier before-sleep inventory listing of Resurrection moves here so the cycle reads in order.
      // The Beckoning Fair One is Waking up (the title tale only).
      "shadow-of-the-cathedral",
      "way-of-all-flesh",
      "family-at-gilje",
      "resurrection",
      // Mira Sun 27 Sep 2026 POST-#181 CLEAR — Typee leads. Never Featured.
      // LEAD kept — not Kangaroo, not Casanova’s Homecoming, not The Mother.
      // Earlier shelf rows for Typee, Kangaroo, and Casanova’s Homecoming keep these slugs.
      // Casanova’s Homecoming also stays on Bite-sized. Lord Arthur Savile’s Crime is Waking up (the title tale only).
      "typee",
      "kangaroo",
      "casanovas-homecoming",
      "the-mother",
      // Mira Sun 27 Sep 2026 POST-#182 CLEAR — Three Soldiers leads. Never Featured.
      // LEAD kept — not Doctor Pascal, not In the World, not Leila.
      // Earlier before-sleep inventory listings of Three Soldiers and In the World move here so the cycle reads in order.
      // CHARAN is Waking up (the title tale only).
      "three-soldiers",
      "doctor-pascal",
      "in-the-world",
      "leila",
      // Mira Mon 28 Sep 2026 POST-#183 CLEAR — Sister Carrie leads. Never Featured.
      // LEAD kept — not Antic Hay, not A spring-time case, not Eline Vere.
      // Earlier catalog rows for Sister Carrie, Antic Hay, and Eline Vere keep these slugs.
      // Earlier a-spring-time-case stays on its own slug. The Hungry Stones is Waking up (the title tale only).
      "sister-carrie",
      "antic-hay",
      "spring-time-case",
      "eline-vere",
      // Mira Mon 28 Sep 2026 POST-#184 CLEAR — Smoke leads. Never Featured.
      // LEAD kept — not Niels Lyhne, not The Emancipated, not Germinal.
      // Earlier before-sleep inventory listings of Smoke and The Emancipated move here so the cycle reads in order.
      // Our Lady of the Pillar is Waking up (the title tale only).
      "smoke",
      "niels-lyhne",
      "the-emancipated",
      "germinal",
      // Mira Mon 28 Sep 2026 POST-#185 CLEAR — Kipps leads. Never Featured.
      // LEAD kept — not The Professor, not A Room with a View, not Martin Eden.
      // Earlier shelf rows for Kipps, The Professor, A Room with a View, and Martin Eden keep these slugs.
      // Madame Heurtebise is Waking up (the title sketch only).
      "kipps",
      "the-professor",
      "a-room-with-a-view",
      "martin-eden",
      // Mira Mon 28 Sep 2026 POST-#186 CLEAR — Une Vie leads. Never Featured.
      // LEAD kept — not My Ántonia, not Look Back on Happiness, not The Good Soldier.
      // Earlier shelf rows for My Ántonia, Look Back on Happiness, and The Good Soldier keep these slugs.
      // The earlier before-sleep listing of The Good Soldier moves here so the cycle reads in order.
      // The Father of Yoto is Waking up (the title sketch only).
      "une-vie",
      "my-antonia",
      "look-back-on-happiness",
      "the-good-soldier",
      // Mira Mon 28 Sep 2026 POST-#187 CLEAR — Crime and Punishment leads. Never Featured.
      // LEAD kept — not Uncle Silas, not The Rise of David Levinsky, not For the Term of His Natural Life.
      // Earlier shelf rows for Uncle Silas and For the Term of His Natural Life keep these slugs.
      // The earlier inventory seat the-rise-of-david-levinsky stays on its own slug.
      // The Bottle Imp is Waking up (the title tale only).
      "crime-and-punishment",
      "uncle-silas",
      "rise-of-david-levinsky",
      "for-the-term-of-his-natural-life",
      // Mira Mon 28 Sep 2026 POST-#188 CLEAR — Death in Venice leads. Never Featured.
      // LEAD kept — not Elmer Gantry, not The Colonel’s Dream, not Hard Times.
      // Earlier shelf rows for Elmer Gantry and Hard Times keep these slugs and move onto this tail.
      // The earlier inventory seats the-colonels-dream and the-great-god-pan stay on their own slugs.
      // The Great God Pan is Waking up (the title novella only).
      "death-in-venice",
      "elmer-gantry",
      "colonels-dream",
      "hard-times",
      // Mira Mon 28 Sep 2026 POST-#189 CLEAR — Manalive leads. Never Featured.
      // LEAD kept — not Captain Blood, not The Monomaniac, not Tartarin de Tarascon.
      // The Time Machine is Waking up (the whole short novel only).
      "manalive",
      "captain-blood",
      "the-monomaniac",
      "tartarin-de-tarascon",
      // Mira Mon 28 Sep 2026 POST-#190 CLEAR — The Prisoner of Zenda leads. Never Featured.
      // LEAD kept — not Kidnapped, not The Revolt of the Angels, not Children of the Soil.
      // The Invisible Man is Waking up (the whole short novel only).
      "prisoner-of-zenda",
      "kidnapped",
      "revolt-of-the-angels",
      "children-of-the-soil",
      // Mira Tue 29 Sep 2026 POST-#191 CLEAR — The Village in the Jungle leads Next, and is not on this lane.
      // Violent, grim ending. The Joy of Captain Ribot, Saracinesca, and The Torrents of Spring sit here.
      // The Bet is Rituals only (the one story), after them.
      "the-joy-of-captain-ribot",
      "saracinesca",
      "the-torrents-of-spring",
      "the-bet",
      // Mira Tue 29 Sep 2026 POST-#192 CLEAR — The Bitter Tea of General Yen leads Next, and is not on this lane.
      // The Woman of Andros and Bella Donna sit here. Nina Balatka is Waking up only.
      // La Lupa is Unwind and On a walk, not before-sleep.
      "the-woman-of-andros",
      "bella-donna",
      // Mira Tue 29 Sep 2026 POST-#197 CLEAR — A Farewell to Arms leads Next, and is not on this lane.
      // Quartet is unwind only. Alice Adams, The Song of Songs, and Its Wavering Image sit here.
      "alice-adams",
      "song-of-songs-sudermann",
      "its-wavering-image",
      // Mira Wed 30 Sep 2026 POST-#204 CLEAR — Java Head leads Next, and is not on this lane.
      // Guest the One-Eyed is unwind only. Magnolia Flower is unwind only.
      // Sunshine Sketches and The Blind Musician sit here.
      "sunshine-sketches-of-a-little-town",
      "the-blind-musician",
      // Mira Wed 30 Sep 2026 POST-#206 CLEAR — In the Mountains leads Next, and sits here.
      // The Two Countesses, El Ombú, and Halil the Pedlar are not before-sleep.
      // The White Sand-Path is the Host-only story and sits here only.
      "in-the-mountains",
      "the-white-sand-path",
      // Mira Wed 30 Sep 2026 POST-#210 CLEAR — Liliecrona's Home leads Next, and sits here.
      // Doctor Luke and Morriña are not before-sleep. Morriña's ending stays off this lane.
      // A Happy Boy sits here. The Desjardins is the Host-only story and sits here only.
      "liliecronas-home",
      "a-happy-boy",
      "the-desjardins",
      // Mira Thu 1 Oct 2026 POST-#212 CLEAR — Gone to Earth leads Next, and is not on this lane.
      // The Real Charlotte, Pembroke, and The Argonauts are unwind only.
      // Gone to Earth and Pembroke stay off this lane (the endings / the content notes).
      // At the Roadside Station is the Host-only story and sits here only.
      "at-the-roadside-station",
      // Mira Thu 1 Oct 2026 POST-#213 CLEAR — The Will to Live leads Next, and is not on this lane.
      // Doom Castle, Mayflower, and Susan Proudleigh stay off before-sleep
      // (Doom Castle is a commute sit; Mayflower and Susan Proudleigh carry content and period-language notes).
      // The Peat Moor is the Host-only story and sits here only.
      "the-peat-moor",
      // Mira Thu 1 Oct 2026 POST-#217 CLEAR — Life and Death of Harriett Frean leads Next, and is not on this lane.
      // Farewell Love!, The Son of His Mother, and My Lady Nobody stay off before-sleep (the content notes).
      // New Year's Night is the Host-only story and sits here only.
      "new-years-night",
      // Mira Fri 2 Oct 2026 POST-#218 CLEAR — The Old House leads Next, and is not on this lane.
      // The Old House, The Sworn Brothers, Dusty Answer, and Christine of the Hills stay off before-sleep (the content notes).
      // The Story of a Woman is the Host-only story and sits here only.
      "the-story-of-a-woman",
      // Mira Fri 2 Oct 2026 POST-#221 CLEAR — Daughters of Men leads Next, and is not on this lane.
      // Daughters of Men, The Bright Shawl, Irresolute Catherine, and The Old Room stay off before-sleep
      // (The Old Room ends in a suicide; the others carry content notes).
      // The Fur Coat is the Host-only story and sits here only.
      "the-fur-coat",
      // Mira Fri 2 Oct 2026 POST-#222 CLEAR — none of the four sits here: The Taking of the Redoubt is never before-sleep
      // (battle violence), and the three novels carry content notes.
      // Mira Sat 3 Oct 2026 POST-#224 CLEAR — none of the four sits here: His Dead Wife's Photograph is never before-sleep
      // (a death in childbirth, a ghost), and the three novels carry content notes.
      // Mira Sat 3 Oct 2026 POST-#225 CLEAR — none of the three sits here: The Hoop is never before-sleep
      // (the old man dies at the end), and the two novels carry content notes.
      // Mira Sat 3 Oct 2026 POST-#227 CLEAR — none of the three sits here: A Monkey is Host-only on unwind
      // (Launch: never before-sleep), and the two novels are evening reads.
      // Mira Sun 4 Oct 2026 POST-v3 Ritual — Wedding-Day does not sit here: Host-only on unwind (never before-sleep).
      // Mira Sun 4 Oct 2026 mid Rituals — Elysium is the Host-only story and sits here only (never unwind). Never Featured, no Next.
      "elysium",
    ],
  },
  {
    id: "waking-up",
    label: "Waking up",
    workIds: [
      "enchanted-april",
      "on-a-chinese-screen",
      "where-angels-fear-to-tread",
      "letters-of-a-javanese-princess",
      "blood-and-sand",
      "an-outcast-of-the-islands",
      "the-underdogs",
      "diary-of-a-chambermaid",
      "growth-of-the-soil",
      "we",
      "death-comes-for-the-archbishop",
      "the-getting-of-wisdom",
      "the-peasants",
      "the-rubaiyat-of-omar-khayyam",
      "spring-and-all",
      "songs-of-innocence-and-of-experience",
      "second-april",
      "renascence-and-other-poems",
      "mountain-interval",
      "open-window-singapore",
      "the-nose-cape-town",
      "seven-brothers",
      "mhudi",
      "african-tragedy",
      "anandamath",
      "kwaidan-stories-and-studies-of-strange-things",
      "thais",
      "brazilian-tales",
      "tropic",
      "bunner-sisters",
      "bertha-garlan",
      "letters-of-a-javanese-princess",
      "white-nights",
      "west-african-folk-tales",
      "irish-fairy-tales",
      "the-lady-with-the-dog-and-other-stories",
      "zeno",
      "the-book-of-khalid",
      "lady-macbeth",
      "summer",
      "jacob-s-room",
      "the-tenant-of-wildfell-hall",
      "herland",
      "the-late-mattia-pascal",
      "the-garden-party-and-other-stories",
      "cane",
      "the-book-of-wonder",
      "dubliners",
      // Mira Fri 25 Sep 2026 ~6PM CLEAR — Painted Wall only. Not Kwaidan.
      "strange-tales",
      // Mira Sat 26 Sep 2026 AM CLEAR — Fortune-Teller only. Not Attendant's Confession.
      "brazilian-tales",
      // Mira Sat 26 Sep 2026 MIDDAY CLEAR — Gaspar Ruiz only. Not the other five.
      "a-set-of-six",
      // Mira Sat 26 Sep 2026 AFTERNOON CLEAR — Mogens timed cut only. Not the other three.
      "mogens-and-other-stories",
      // Mira Sat 26 Sep 2026 EVENING CLEAR — Bontzye Shweig only. Not the other tales.
      "stories-and-pictures",
      // Mira Sat 26 Sep 2026 ~6PM CLEAR — Suan’s Good Luck only. Not the other tales.
      "filipino-popular-tales",
      // Mira Sun 27 Sep 2026 AM CLEAR — A Child of The Woods only. Not the other tales.
      "laos-folk-lore",
      // Mira Sun 27 Sep 2026 POST-#169 CLEAR — Wings only. Not the other tales.
      "hungry-hearts",
      // Mira Sun 27 Sep 2026 POST-#170 CLEAR — Reginald title sketch only. Not the other sketches.
      "reginald",
      // Mira Sun 27 Sep 2026 POST-#171 CLEAR — The Black Dog title tale only. Not the other tales.
      "the-black-dog",
      // Mira Sun 27 Sep 2026 POST-#172 CLEAR — Bernice Bobs Her Hair only. Not the other tales.
      "flappers-and-philosophers",
      // Mira Sun 27 Sep 2026 MIDDAY CLEAR — How We Got the Name ‘Spider Tales’ only.
      "west-african-folk-tales",
      // Mira Sun 27 Sep 2026 POST-#174 CLEAR — The Law of Life only.
      "children-of-the-frost",
      // Mira Sun 27 Sep 2026 POST-#175 CLEAR — A Malay Romance only.
      "malay-sketches",
      // Mira Sun 27 Sep 2026 POST-#176 CLEAR — The Toys of Peace sketch only.
      "the-toys-of-peace",
      // Mira Sun 27 Sep 2026 POST-#177 CLEAR — The Tug of Love sketch only.
      "the-tug-of-love",
      // Mira Sun 27 Sep 2026 POST-#178 CLEAR — A Slav Soul sketch only.
      "a-slav-soul",
      // Mira Sun 27 Sep 2026 POST-#179 CLEAR — A Cross Line sketch only.
      "a-cross-line",
      // Mira Sun 27 Sep 2026 POST-#180 CLEAR — The Beckoning Fair One only.
      "widdershins",
      // Mira Sun 27 Sep 2026 POST-#181 CLEAR — Lord Arthur Savile’s Crime only.
      "lord-arthur-saviles-crime",
      // Mira Sun 27 Sep 2026 POST-#182 CLEAR — CHARAN only.
      "charan",
      // Mira Mon 28 Sep 2026 POST-#183 CLEAR — The Hungry Stones only.
      "hungry-stones",
      // Mira Mon 28 Sep 2026 POST-#184 CLEAR — Our Lady of the Pillar only.
      "our-lady-of-the-pillar",
      // Mira Mon 28 Sep 2026 POST-#185 CLEAR — Madame Heurtebise only.
      "madame-heurtebise",
      // Mira Mon 28 Sep 2026 POST-#186 CLEAR — The Father of Yoto only.
      "father-of-yoto",
      // Mira Mon 28 Sep 2026 POST-#187 CLEAR — The Bottle Imp only.
      "bottle-imp",
      // Mira Mon 28 Sep 2026 POST-#188 CLEAR — The Great God Pan only.
      "great-god-pan",
      // Mira Mon 28 Sep 2026 POST-#189 CLEAR — The Time Machine only.
      "the-time-machine",
      // Mira Mon 28 Sep 2026 POST-#190 CLEAR — The Invisible Man only.
      "the-invisible-man",
      // Mira Tue 29 Sep 2026 POST-#192 CLEAR — Nina Balatka. Waking up only (walk seat removed).
      "nina-balatka",
    ],
  },
  {
    id: "unwind",
    label: "Unwind",
    hint: "De-stress",
    workIds: [
      "the-house-of-mirth",
      "mr-fortunes-maggot",
      "the-bridge-of-san-luis-rey",
      // Botchan is a local bind with a short scar sit — after Mirth, Maggot,
      // and Bridge on Unwind, near the front of the rest of the lane.
      "botchan",
      // Naomi is a local bind but not a short first-session sit (full novel,
      // no ritual-ready open-at). Skip until a clean short sit exists —
      // do not invent one.
      // Enchanted April also leads the noon Next append and stays a waking sit.
      // Chapter 1 opens in the Woman’s Club; the novel continues.
      "poison-tree",
      "noli-me-tangere",
      "nacha-regules",
      "songs-of-kabir",
      "pictures-of-the-floating-world",
      "silhouettes",
      "the-garden-party-and-other-stories",
      "bliss-and-other-stories",
      "miss-brill-adapted",
      "prefer-not",
      "late-season",
      "bliss-tokyo",
      "boule-de-suif-istanbul",
      "garden-party-barcelona",
      "a-passage-to-india",
      "of-human-bondage",
      "death-comes-for-the-archbishop",
      "enchanted-april",
      "underdogs",
      "lolly-willowes",
      "cheri",
      "all-quiet-on-the-western-front",
      "the-gadfly",
      "the-painted-veil",
      "growth-of-the-soil",
      "noli-me-tangere",
      "bread-givers",
      "the-story-of-gosta-berling",
      "a-hero-of-our-time",
      "after-the-divorce",
      "blood-and-sand",
      "the-peasants",
      "a-hungarian-nabob",
      "an-iceland-fisherman",
      "the-song-of-the-blood-red-flower",
      "basilio",
      "oblomov",
      "blacker",
      "a-lost-lady",
      "the-wanderer",
      "the-cabala",
      "reuben-sachs",
      "the-sun-also-rises",
      "the-man-of-property",
      "the-awakening",
      "theresa-raquin",
      "there-is-confusion",
      "pointed-roofs",
      "the-rise-of-silas-lapham",
      "indiana",
      "the-hidden-force",
      "the-home-and-the-world",
      "hunger",
      "jude-the-obscure",
      "high-wind-jamaica",
      "vera",
      "futility",
      "the-comedienne",
      // Mira Sat 26 Sep 2026 AM CLEAR — Moon leads. Never Featured.
      "the-moon-and-sixpence",
      "my-brilliant-career",
      "the-plumed-serpent",
      "the-red-room",
      // Mira Sat 26 Sep 2026 MIDDAY CLEAR — Green Carnation leads. Never Featured.
      "the-green-carnation",
      "hajji-baba",
      "the-purple-land",
      "the-master-of-ballantrae",
      // Mira Sat 26 Sep 2026 AFTERNOON CLEAR — Hill of Dreams leads. Never Featured.
      "the-hill-of-dreams",
      "the-story-of-an-african-farm",
      "the-imperialist",
      "kim",
      // Mira Sat 26 Sep 2026 EVENING CLEAR — Road to the Open leads. Never Featured.
      "the-road-to-the-open",
      "calvary",
      "anna-of-the-five-towns",
      "small-souls",
      // Mira Sat 26 Sep 2026 ~6PM CLEAR — White Jacket leads. Never Featured.
      "white-jacket",
      "a-japanese-nightingale",
      "maria-chapdelaine",
      "the-house-by-the-medlar-tree",
      // Mira Sun 27 Sep 2026 AM CLEAR — Marrow of Tradition leads. Never Featured.
      "the-marrow-of-tradition",
      "zuleika-dobson",
      "eugenie-grandet",
      "seven-brothers",
      // Mira Sun 27 Sep 2026 POST-#169 CLEAR — Born in Exile leads. Never Featured.
      "born-in-exile",
      "the-four-horsemen-of-the-apocalypse",
      "after-the-divorce",
      "virgin-soil",
      // Mira Sun 27 Sep 2026 POST-#170 CLEAR — The Sport of the Gods leads. Never Featured.
      "the-sport-of-the-gods",
      "ramuntcho",
      "miss-lulu-bett",
      "the-pit",
      // Mira Sun 27 Sep 2026 POST-#171 CLEAR — Royal Highness leads. Never Featured.
      // LEAD SWAP — not Ramona. The Black Dog is Waking up.
      "royal-highness",
      "ramona",
      "almayers-folly",
      "the-crux",
      // Mira Sun 27 Sep 2026 POST-#172 CLEAR — Daisy Miller leads. Never Featured.
      // LEAD SWAP — not South Wind. Flappers and Philosophers is Waking up.
      "daisy-miller",
      "south-wind",
      "the-village",
      "ditte-girl-alive",
      // Mira Sun 27 Sep 2026 MIDDAY CLEAR — Candide leads. Never Featured.
      // LEAD kept — not Aphrodite, not Iola Leroy. Spider Tales is Waking up.
      "candide",
      "iola-leroy",
      "esther-waters",
      "aphrodite",
      // Mira Sun 27 Sep 2026 POST-#174 CLEAR — Erewhon leads. Never Featured.
      // LEAD kept — not Ann Veronica, not The Great Hunger, not The Mysterious Stranger.
      // Earlier Great Hunger seat stays where it already sits. Law of Life is Waking up.
      "erewhon",
      "ann-veronica",
      "the-great-hunger",
      "the-mysterious-stranger",
      // Mira Sun 27 Sep 2026 POST-#175 CLEAR — The Poison Tree leads. Never Featured.
      // LEAD kept — not Cosmopolis, not The Woman Who Did, not Billy Budd.
      // Earlier before-sleep inventory listing of The Poison Tree moves here so the cycle reads in order.
      // Malay Sketches is Waking up (A Malay Romance only).
      "the-poison-tree",
      "cosmopolis",
      "the-woman-who-did",
      "billy-budd",
      // Mira Sun 27 Sep 2026 POST-#176 CLEAR — Cousin Betty leads. Never Featured.
      // LEAD kept — not The Sorrows of Satan, not The King of Schnorrers, not Hania.
      // Earlier before-sleep inventory listings of Cousin Betty and Hania move here so the cycle reads in order.
      // The Toys of Peace is Waking up (the title sketch only).
      "cousin-betty",
      "the-sorrows-of-satan",
      "the-king-of-schnorrers",
      "hania",
      // Mira Sun 27 Sep 2026 POST-#177 CLEAR — Tess of the d’Urbervilles leads. Never Featured.
      // LEAD kept — not Captains Courageous, not Numa Roumestan, not Dracula.
      // Earlier before-sleep inventory listings of Tess and Numa move here so the cycle reads in order.
      // The Tug of Love is Waking up (the title sketch only).
      "tess-of-the-durbervilles",
      "captains-courageous",
      "numa-roumestan",
      "dracula",
      // Mira Sun 27 Sep 2026 POST-#178 CLEAR — The House of the Seven Gables leads. Never Featured.
      // LEAD kept — not Heart of Darkness, not Toilers of the Sea, not Indian Summer.
      // Earlier before-sleep inventory listings move here so the cycle reads in order.
      // A Slav Soul is Waking up (the title sketch only).
      "the-house-of-the-seven-gables",
      "heart-of-darkness",
      "toilers-of-the-sea",
      "indian-summer",
      // Mira Sun 27 Sep 2026 POST-#179 CLEAR — Cabbages and Kings leads. Never Featured.
      // LEAD kept — not Dorian Gray, not The Job, not The Reign of Greed.
      // Earlier before-sleep inventory listing of The Job moves here so the cycle reads in order.
      // A Cross Line is Waking up (the title sketch only).
      "cabbages-and-kings",
      "picture-of-dorian-gray",
      "the-job",
      "reign-of-greed",
      // Mira Sun 27 Sep 2026 POST-#180 CLEAR — The Shadow of the Cathedral leads. Never Featured.
      // LEAD kept — not The Way of All Flesh, not The Family at Gilje, not Resurrection.
      // Earlier before-sleep inventory listing of Resurrection moves here so the cycle reads in order.
      // The Beckoning Fair One is Waking up (the title tale only).
      "shadow-of-the-cathedral",
      "way-of-all-flesh",
      "family-at-gilje",
      "resurrection",
      // Mira Sun 27 Sep 2026 POST-#181 CLEAR — Typee leads. Never Featured.
      // LEAD kept — not Kangaroo, not Casanova’s Homecoming, not The Mother.
      // Earlier shelf rows for Typee, Kangaroo, and Casanova’s Homecoming keep these slugs.
      // Casanova’s Homecoming also stays on Bite-sized. Lord Arthur Savile’s Crime is Waking up (the title tale only).
      "typee",
      "kangaroo",
      "casanovas-homecoming",
      "the-mother",
      // Mira Sun 27 Sep 2026 POST-#182 CLEAR — Three Soldiers leads. Never Featured.
      // LEAD kept — not Doctor Pascal, not In the World, not Leila.
      // Earlier before-sleep inventory listings of Three Soldiers and In the World move here so the cycle reads in order.
      // CHARAN is Waking up (the title tale only).
      "three-soldiers",
      "doctor-pascal",
      "in-the-world",
      "leila",
      // Mira Mon 28 Sep 2026 POST-#183 CLEAR — Sister Carrie leads. Never Featured.
      // LEAD kept — not Antic Hay, not A spring-time case, not Eline Vere.
      // Earlier catalog rows for Sister Carrie, Antic Hay, and Eline Vere keep these slugs.
      // Earlier a-spring-time-case stays on its own slug. The Hungry Stones is Waking up (the title tale only).
      "sister-carrie",
      "antic-hay",
      "spring-time-case",
      "eline-vere",
      // Mira Mon 28 Sep 2026 POST-#184 CLEAR — Smoke leads. Never Featured.
      // LEAD kept — not Niels Lyhne, not The Emancipated, not Germinal.
      // Earlier before-sleep inventory listings of Smoke and The Emancipated move here so the cycle reads in order.
      // Our Lady of the Pillar is Waking up (the title tale only).
      "smoke",
      "niels-lyhne",
      "the-emancipated",
      "germinal",
      // Mira Mon 28 Sep 2026 POST-#185 CLEAR — Kipps leads. Never Featured.
      // LEAD kept — not The Professor, not A Room with a View, not Martin Eden.
      // Earlier shelf rows for Kipps, The Professor, A Room with a View, and Martin Eden keep these slugs.
      // Madame Heurtebise is Waking up (the title sketch only).
      "kipps",
      "the-professor",
      "a-room-with-a-view",
      "martin-eden",
      // Mira Mon 28 Sep 2026 POST-#186 CLEAR — Une Vie leads. Never Featured.
      // LEAD kept — not My Ántonia, not Look Back on Happiness, not The Good Soldier.
      // Earlier shelf rows for My Ántonia, Look Back on Happiness, and The Good Soldier keep these slugs.
      // The earlier before-sleep listing of The Good Soldier moves here so the cycle reads in order.
      // The Father of Yoto is Waking up (the title sketch only).
      "une-vie",
      "my-antonia",
      "look-back-on-happiness",
      "the-good-soldier",
      // Mira Mon 28 Sep 2026 POST-#187 CLEAR — Crime and Punishment leads. Never Featured.
      // LEAD kept — not Uncle Silas, not The Rise of David Levinsky, not For the Term of His Natural Life.
      // Earlier shelf rows for Uncle Silas and For the Term of His Natural Life keep these slugs.
      // The earlier inventory seat the-rise-of-david-levinsky stays on its own slug.
      // The Bottle Imp is Waking up (the title tale only).
      "crime-and-punishment",
      "uncle-silas",
      "rise-of-david-levinsky",
      "for-the-term-of-his-natural-life",
      // Mira Mon 28 Sep 2026 POST-#188 CLEAR — Death in Venice leads. Never Featured.
      // LEAD kept — not Elmer Gantry, not The Colonel’s Dream, not Hard Times.
      // Earlier shelf rows for Elmer Gantry and Hard Times keep these slugs and move onto this tail.
      // The earlier inventory seats the-colonels-dream and the-great-god-pan stay on their own slugs.
      // The Great God Pan is Waking up (the title novella only).
      "death-in-venice",
      "elmer-gantry",
      "colonels-dream",
      "hard-times",
      // Mira Mon 28 Sep 2026 POST-#189 CLEAR — Manalive leads. Never Featured.
      // LEAD kept — not Captain Blood, not The Monomaniac, not Tartarin de Tarascon.
      // The Time Machine is Waking up (the whole short novel only).
      "manalive",
      "captain-blood",
      "the-monomaniac",
      "tartarin-de-tarascon",
      // Mira Mon 28 Sep 2026 POST-#190 CLEAR — The Prisoner of Zenda leads. Never Featured.
      // LEAD kept — not Kidnapped, not The Revolt of the Angels, not Children of the Soil.
      // The Invisible Man is Waking up (the whole short novel only).
      "prisoner-of-zenda",
      "kidnapped",
      "revolt-of-the-angels",
      "children-of-the-soil",
      // Mira Tue 29 Sep 2026 POST-#191 CLEAR — The Village in the Jungle leads. Never Featured.
      // LEAD kept — not The Joy of Captain Ribot, not Saracinesca, not The Torrents of Spring.
      // The Bet is before-sleep Rituals only. The Village is not before-sleep.
      "the-village-in-the-jungle",
      "the-joy-of-captain-ribot",
      "saracinesca",
      "the-torrents-of-spring",
      // Mira Tue 29 Sep 2026 POST-#192 CLEAR — The Bitter Tea of General Yen leads. Never Featured.
      // LEAD kept — not The Woman of Andros, not Bella Donna, not Nina Balatka.
      // Nina Balatka is Waking up only, not this lane.
      // La Lupa is Rituals only (the one story) and sits here and on a walk, not before-sleep.
      // Tue POST-#191 Village and the earlier packs stay ahead.
      "the-bitter-tea-of-general-yen",
      "the-woman-of-andros",
      "bella-donna",
      "la-lupa",
      // Mira Tue 29 Sep 2026 POST-#197 CLEAR — A Farewell to Arms leads. Never Featured.
      // LEAD kept — not Alice Adams, not Quartet, not The Song of Songs.
      // Its Wavering Image is the Host-only story and sits here and before sleep, not on a walk.
      "a-farewell-to-arms",
      "alice-adams",
      "quartet",
      "song-of-songs-sudermann",
      "its-wavering-image",
      // Mira Wed 30 Sep 2026 POST-#204 CLEAR — Java Head leads. Never Featured.
      // LEAD kept — not Sunshine Sketches, not Guest the One-Eyed, not The Blind Musician.
      // Magnolia Flower is the Host-only story and sits here, not before sleep and not on a walk.
      "java-head",
      "sunshine-sketches-of-a-little-town",
      "guest-the-one-eyed",
      "the-blind-musician",
      "magnolia-flower",
      // Mira Wed 30 Sep 2026 POST-#206 CLEAR — In the Mountains leads. Never Featured.
      // LEAD kept — not The Two Countesses, not El Ombú, not Halil the Pedlar.
      // The White Sand-Path is before-sleep only (Host-only, the one story), not this lane.
      "in-the-mountains",
      "the-two-countesses",
      "el-ombu",
      "halil-the-pedlar",
      // Mira Wed 30 Sep 2026 POST-#210 CLEAR — Liliecrona's Home leads. Never Featured.
      // LEAD kept — not Doctor Luke, not Morriña, not A Happy Boy.
      // A Happy Boy is walk and before-sleep. The Desjardins is before-sleep only.
      "liliecronas-home",
      "doctor-luke-of-the-labrador",
      "morrina",
      // Mira Thu 1 Oct 2026 POST-#212 CLEAR — Gone to Earth leads. Never Featured.
      // LEAD kept — not The Real Charlotte, not Pembroke, not The Argonauts.
      // Gone to Earth and Pembroke are not before-sleep (the endings / the content notes).
      // At the Roadside Station is before-sleep only (Host-only, the one story).
      "gone-to-earth",
      "the-real-charlotte",
      "pembroke",
      "the-argonauts",
      // Mira Thu 1 Oct 2026 POST-#213 CLEAR — The Will to Live leads. Never Featured.
      // LEAD kept — not Doom Castle, not Mayflower, not Susan Proudleigh.
      // Mayflower and Susan Proudleigh are not before-sleep (the content and period-language notes).
      // Doom Castle is also a commute sit. The Peat Moor is before-sleep only.
      "the-will-to-live",
      "doom-castle",
      "mayflower",
      "susan-proudleigh",
      // Mira Thu 1 Oct 2026 POST-#217 CLEAR — Life and Death of Harriett Frean leads. Never Featured.
      // LEAD kept — not Farewell Love!, not The Son of His Mother, not My Lady Nobody.
      // Farewell Love!, The Son of His Mother, and My Lady Nobody are not before-sleep (the content notes).
      // New Year's Night is before-sleep only (Host-only, the one story).
      "life-and-death-of-harriett-frean",
      "farewell-love",
      "the-son-of-his-mother",
      "my-lady-nobody",
      // Mira Fri 2 Oct 2026 POST-#218 CLEAR — The Old House leads. Never Featured.
      // LEAD kept — not The Sworn Brothers, not Dusty Answer, not Christine of the Hills.
      // Christine of the Hills is the commute sit only, not this lane.
      // The four novels carry content notes, so none are before-sleep.
      // The Story of a Woman is before-sleep only (Host-only, the one story).
      "the-old-house",
      "the-sworn-brothers",
      "dusty-answer",
      // Mira Fri 2 Oct 2026 POST-#221 CLEAR — Daughters of Men leads. Never Featured.
      // LEAD kept — not The Bright Shawl, not Irresolute Catherine, not The Old Room.
      // The Bright Shawl is also the commute sit. The Old Room is unwind only, not before-sleep.
      // The Fur Coat is before-sleep only (Host-only, the one story).
      "daughters-of-men",
      "the-bright-shawl",
      "irresolute-catherine",
      "the-old-room",
      // Mira Fri 2 Oct 2026 POST-#222 CLEAR — The Corsican Brothers leads. Never Featured.
      // Jocelyn and The Woman of Knockaloe sit here, carefully (the content notes). The Corsican Brothers is also the commute sit.
      // The Taking of the Redoubt is the Host-only story: unwind only, the evening seat, never before-sleep.
      "the-corsican-brothers",
      "jocelyn",
      "the-woman-of-knockaloe",
      "the-taking-of-the-redoubt",
      // Mira Sat 3 Oct 2026 POST-#224 CLEAR — The Man in the Brown Suit leads. Never Featured.
      // Wang the Ninth and Garram the Hunter sit here, carefully (the content notes).
      // His Dead Wife's Photograph is the Host-only story: unwind only, the evening seat, never before-sleep.
      "the-man-in-the-brown-suit",
      "wang-the-ninth",
      "garram-the-hunter",
      "his-dead-wifes-photograph",
      // Mira Sat 3 Oct 2026 POST-#225 CLEAR — The Face in the Abyss leads. Never Featured.
      // Mary Magdalen sits here, carefully (the content notes).
      // The Hoop is the Host-only story: unwind only, the evening seat, never before-sleep.
      "the-face-in-the-abyss",
      "mary-magdalen",
      "the-hoop",
      // Mira Sat 3 Oct 2026 POST-#227 CLEAR — Love's Shadow leads. Never Featured.
      // Lewis and Irene is Next carefully only, not on any Ritual lane (a novel sit).
      // A Monkey is the Host-only story: unwind only, the evening seat, never before-sleep.
      "love-s-shadow",
      "a-monkey",
      // Mira Sun 4 Oct 2026 POST-v3 Ritual — Wedding-Day is the Host-only story: unwind only, the evening seat, never before-sleep.
      // Never Featured, no Next placement. The story prints no place: no chip, no country.
      "wedding-day",
      // Mira Sun 4 Oct 2026 mid Rituals — Elysium does not sit here: Host-only on before-sleep (never unwind).
    ],
  },
  {
    id: "the-body",
    label: "The body",
    workIds: [
      "body-of-this-death",
      "orlando",
      "the-weary-blues",
      "wallpaper",
      "cheri",
    ],
  },
  {
    id: "on-a-walk",
    label: "On a walk",
    workIds: [
      "dalloway",
      "north-of-boston",
      "chicago-poems",
      "harlem-shadows",
      "sour-grapes",
      "precipitations",
      "spring-and-all",
      "seven-brothers",
      "on-the-seaboard",
      "bel-ami",
      "magnhild",
      "green-mansions",
      "hadji-murad",
      "death-comes-for-the-archbishop",
      "banjo",
      "nacha-regules",
      "enchanted-april",
      "quicksand",
      "underdogs",
      "lolly-willowes",
      "cheri",
      "all-quiet-on-the-western-front",
      "the-gadfly",
      "the-painted-veil",
      "growth-of-the-soil",
      "noli-me-tangere",
      "bread-givers",
      "the-story-of-gosta-berling",
      "a-hero-of-our-time",
      "after-the-divorce",
      "blood-and-sand",
      "the-peasants",
      "a-hungarian-nabob",
      "an-iceland-fisherman",
      "the-song-of-the-blood-red-flower",
      "basilio",
      "oblomov",
      "blacker",
      "a-lost-lady",
      "the-wanderer",
      "the-cabala",
      "reuben-sachs",
      "the-sun-also-rises",
      "the-man-of-property",
      "the-awakening",
      "theresa-raquin",
      "there-is-confusion",
      "pointed-roofs",
      "the-rise-of-silas-lapham",
      "indiana",
      "the-hidden-force",
      "the-home-and-the-world",
      "hunger",
      "jude-the-obscure",
      "high-wind-jamaica",
      "vera",
      "futility",
      "the-comedienne",
      // Mira Sat 26 Sep 2026 AM CLEAR — Moon leads. Never Featured.
      "the-moon-and-sixpence",
      "my-brilliant-career",
      "the-plumed-serpent",
      "the-red-room",
      // Mira Sat 26 Sep 2026 MIDDAY CLEAR — Green Carnation leads. Never Featured.
      "the-green-carnation",
      "hajji-baba",
      "the-purple-land",
      "the-master-of-ballantrae",
      // Mira Sat 26 Sep 2026 AFTERNOON CLEAR — Hill of Dreams leads. Never Featured.
      "the-hill-of-dreams",
      "the-story-of-an-african-farm",
      "the-imperialist",
      "kim",
      // Mira Sat 26 Sep 2026 EVENING CLEAR — Road to the Open leads. Never Featured.
      "the-road-to-the-open",
      "calvary",
      "anna-of-the-five-towns",
      "small-souls",
      // Mira Sat 26 Sep 2026 ~6PM CLEAR — White Jacket leads. Never Featured.
      "white-jacket",
      "a-japanese-nightingale",
      "maria-chapdelaine",
      "the-house-by-the-medlar-tree",
      // Mira Sun 27 Sep 2026 AM CLEAR — Marrow of Tradition leads. Never Featured.
      "the-marrow-of-tradition",
      "zuleika-dobson",
      "eugenie-grandet",
      "seven-brothers",
      // Mira Sun 27 Sep 2026 POST-#169 CLEAR — Born in Exile leads. Never Featured.
      "born-in-exile",
      "the-four-horsemen-of-the-apocalypse",
      "after-the-divorce",
      "virgin-soil",
      // Mira Sun 27 Sep 2026 POST-#170 CLEAR — The Sport of the Gods leads. Never Featured.
      "the-sport-of-the-gods",
      "ramuntcho",
      "miss-lulu-bett",
      "the-pit",
      // Mira Sun 27 Sep 2026 POST-#171 CLEAR — Royal Highness leads. Never Featured.
      // LEAD SWAP — not Ramona. The Black Dog is Waking up.
      "royal-highness",
      "ramona",
      "almayers-folly",
      "the-crux",
      // Mira Sun 27 Sep 2026 POST-#172 CLEAR — Daisy Miller leads. Never Featured.
      // LEAD SWAP — not South Wind. Flappers and Philosophers is Waking up.
      "daisy-miller",
      "south-wind",
      "the-village",
      "ditte-girl-alive",
      // Mira Sun 27 Sep 2026 MIDDAY CLEAR — Candide leads. Never Featured.
      // LEAD kept — not Aphrodite, not Iola Leroy. Spider Tales is Waking up.
      "candide",
      "iola-leroy",
      "esther-waters",
      "aphrodite",
      // Mira Sun 27 Sep 2026 POST-#174 CLEAR — Erewhon leads. Never Featured.
      // LEAD kept — not Ann Veronica, not The Great Hunger, not The Mysterious Stranger.
      // Earlier Great Hunger seat stays where it already sits. Law of Life is Waking up.
      "erewhon",
      "ann-veronica",
      "the-great-hunger",
      "the-mysterious-stranger",
      // Mira Sun 27 Sep 2026 POST-#175 CLEAR — The Poison Tree leads. Never Featured.
      // LEAD kept — not Cosmopolis, not The Woman Who Did, not Billy Budd.
      // Earlier before-sleep inventory listing of The Poison Tree moves here so the cycle reads in order.
      // Malay Sketches is Waking up (A Malay Romance only).
      "the-poison-tree",
      "cosmopolis",
      "the-woman-who-did",
      "billy-budd",
      // Mira Sun 27 Sep 2026 POST-#176 CLEAR — Cousin Betty leads. Never Featured.
      // LEAD kept — not The Sorrows of Satan, not The King of Schnorrers, not Hania.
      // Earlier before-sleep inventory listings of Cousin Betty and Hania move here so the cycle reads in order.
      // The Toys of Peace is Waking up (the title sketch only).
      "cousin-betty",
      "the-sorrows-of-satan",
      "the-king-of-schnorrers",
      "hania",
      // Mira Sun 27 Sep 2026 POST-#177 CLEAR — Tess of the d’Urbervilles leads. Never Featured.
      // LEAD kept — not Captains Courageous, not Numa Roumestan, not Dracula.
      // Earlier before-sleep inventory listings of Tess and Numa move here so the cycle reads in order.
      // The Tug of Love is Waking up (the title sketch only).
      "tess-of-the-durbervilles",
      "captains-courageous",
      "numa-roumestan",
      "dracula",
      // Mira Sun 27 Sep 2026 POST-#178 CLEAR — The House of the Seven Gables leads. Never Featured.
      // LEAD kept — not Heart of Darkness, not Toilers of the Sea, not Indian Summer.
      // Earlier before-sleep inventory listings move here so the cycle reads in order.
      // A Slav Soul is Waking up (the title sketch only).
      "the-house-of-the-seven-gables",
      "heart-of-darkness",
      "toilers-of-the-sea",
      "indian-summer",
      // Mira Sun 27 Sep 2026 POST-#179 CLEAR — Cabbages and Kings leads. Never Featured.
      // LEAD kept — not Dorian Gray, not The Job, not The Reign of Greed.
      // Earlier before-sleep inventory listing of The Job moves here so the cycle reads in order.
      // A Cross Line is Waking up (the title sketch only).
      "cabbages-and-kings",
      "picture-of-dorian-gray",
      "the-job",
      "reign-of-greed",
      // Mira Sun 27 Sep 2026 POST-#180 CLEAR — The Shadow of the Cathedral leads. Never Featured.
      // LEAD kept — not The Way of All Flesh, not The Family at Gilje, not Resurrection.
      // Earlier before-sleep inventory listing of Resurrection moves here so the cycle reads in order.
      // The Beckoning Fair One is Waking up (the title tale only).
      "shadow-of-the-cathedral",
      "way-of-all-flesh",
      "family-at-gilje",
      "resurrection",
      // Mira Sun 27 Sep 2026 POST-#181 CLEAR — Typee leads. Never Featured.
      // LEAD kept — not Kangaroo, not Casanova’s Homecoming, not The Mother.
      // Earlier shelf rows for Typee, Kangaroo, and Casanova’s Homecoming keep these slugs.
      // Casanova’s Homecoming also stays on Bite-sized. Lord Arthur Savile’s Crime is Waking up (the title tale only).
      "typee",
      "kangaroo",
      "casanovas-homecoming",
      "the-mother",
      // Mira Sun 27 Sep 2026 POST-#182 CLEAR — Three Soldiers leads. Never Featured.
      // LEAD kept — not Doctor Pascal, not In the World, not Leila.
      // Earlier before-sleep inventory listings of Three Soldiers and In the World move here so the cycle reads in order.
      // CHARAN is Waking up (the title tale only).
      "three-soldiers",
      "doctor-pascal",
      "in-the-world",
      "leila",
      // Mira Mon 28 Sep 2026 POST-#183 CLEAR — Sister Carrie leads. Never Featured.
      // LEAD kept — not Antic Hay, not A spring-time case, not Eline Vere.
      // Earlier catalog rows for Sister Carrie, Antic Hay, and Eline Vere keep these slugs.
      // Earlier a-spring-time-case stays on its own slug. The Hungry Stones is Waking up (the title tale only).
      "sister-carrie",
      "antic-hay",
      "spring-time-case",
      "eline-vere",
      // Mira Mon 28 Sep 2026 POST-#184 CLEAR — Smoke leads. Never Featured.
      // LEAD kept — not Niels Lyhne, not The Emancipated, not Germinal.
      // Earlier before-sleep inventory listings of Smoke and The Emancipated move here so the cycle reads in order.
      // Our Lady of the Pillar is Waking up (the title tale only).
      "smoke",
      "niels-lyhne",
      "the-emancipated",
      "germinal",
      // Mira Mon 28 Sep 2026 POST-#185 CLEAR — Kipps leads. Never Featured.
      // LEAD kept — not The Professor, not A Room with a View, not Martin Eden.
      // Earlier shelf rows for Kipps, The Professor, A Room with a View, and Martin Eden keep these slugs.
      // Madame Heurtebise is Waking up (the title sketch only).
      "kipps",
      "the-professor",
      "a-room-with-a-view",
      "martin-eden",
      // Mira Mon 28 Sep 2026 POST-#186 CLEAR — Une Vie leads. Never Featured.
      // LEAD kept — not My Ántonia, not Look Back on Happiness, not The Good Soldier.
      // Earlier shelf rows for My Ántonia, Look Back on Happiness, and The Good Soldier keep these slugs.
      // The earlier before-sleep listing of The Good Soldier moves here so the cycle reads in order.
      // The Father of Yoto is Waking up (the title sketch only).
      "une-vie",
      "my-antonia",
      "look-back-on-happiness",
      "the-good-soldier",
      // Mira Mon 28 Sep 2026 POST-#187 CLEAR — Crime and Punishment leads. Never Featured.
      // LEAD kept — not Uncle Silas, not The Rise of David Levinsky, not For the Term of His Natural Life.
      // Earlier shelf rows for Uncle Silas and For the Term of His Natural Life keep these slugs.
      // The earlier inventory seat the-rise-of-david-levinsky stays on its own slug.
      // The Bottle Imp is Waking up (the title tale only).
      "crime-and-punishment",
      "uncle-silas",
      "rise-of-david-levinsky",
      "for-the-term-of-his-natural-life",
      // Mira Mon 28 Sep 2026 POST-#188 CLEAR — Death in Venice leads. Never Featured.
      // LEAD kept — not Elmer Gantry, not The Colonel’s Dream, not Hard Times.
      // Earlier shelf rows for Elmer Gantry and Hard Times keep these slugs and move onto this tail.
      // The earlier inventory seats the-colonels-dream and the-great-god-pan stay on their own slugs.
      // The Great God Pan is Waking up (the title novella only).
      "death-in-venice",
      "elmer-gantry",
      "colonels-dream",
      "hard-times",
      // Mira Mon 28 Sep 2026 POST-#189 CLEAR — Manalive leads. Never Featured.
      // LEAD kept — not Captain Blood, not The Monomaniac, not Tartarin de Tarascon.
      // The Time Machine is Waking up (the whole short novel only).
      "manalive",
      "captain-blood",
      "the-monomaniac",
      "tartarin-de-tarascon",
      // Mira Mon 28 Sep 2026 POST-#190 CLEAR — The Prisoner of Zenda leads. Never Featured.
      // LEAD kept — not Kidnapped, not The Revolt of the Angels, not Children of the Soil.
      // The Invisible Man is Waking up (the whole short novel only).
      "prisoner-of-zenda",
      "kidnapped",
      "revolt-of-the-angels",
      "children-of-the-soil",
      // Mira Tue 29 Sep 2026 POST-#191 CLEAR — The Village in the Jungle leads. Never Featured.
      // LEAD kept — not The Joy of Captain Ribot, not Saracinesca, not The Torrents of Spring.
      // The Bet is before-sleep Rituals only. The Village is not before-sleep.
      "the-village-in-the-jungle",
      "the-joy-of-captain-ribot",
      "saracinesca",
      "the-torrents-of-spring",
      // Mira Tue 29 Sep 2026 POST-#192 CLEAR — The Bitter Tea of General Yen leads. Never Featured.
      // The Woman of Andros and Bella Donna are not on this lane.
      // Nina Balatka is Waking up only, not this lane. La Lupa sits here and on Unwind, not before-sleep.
      "the-bitter-tea-of-general-yen",
      "la-lupa",
      // Mira Tue 29 Sep 2026 POST-#197 CLEAR — A Farewell to Arms leads. Never Featured.
      // Alice Adams, Quartet, The Song of Songs, and Its Wavering Image are not on this lane.
      "a-farewell-to-arms",
      // Mira Wed 30 Sep 2026 POST-#204 CLEAR — Java Head leads. Never Featured.
      // Java Head, Guest the One-Eyed, The Blind Musician, and Magnolia Flower are not on this lane.
      "sunshine-sketches-of-a-little-town",
      // Mira Wed 30 Sep 2026 POST-#206 CLEAR — In the Mountains leads Next, and is not on this lane.
      // El Ombú is unwind only. The White Sand-Path is before-sleep only.
      // The Two Countesses and Halil the Pedlar sit here.
      "the-two-countesses",
      "halil-the-pedlar",
      // Mira Wed 30 Sep 2026 POST-#210 CLEAR — Liliecrona's Home leads Next, and is not on this lane.
      // Morriña is unwind only. The Desjardins is before-sleep only.
      // Doctor Luke and A Happy Boy sit here.
      "doctor-luke-of-the-labrador",
      "a-happy-boy",
      // Mira Thu 1 Oct 2026 POST-#213 CLEAR — The Will to Live leads Next, and is not on this lane.
      // Mayflower and Susan Proudleigh are unwind only. The Peat Moor is before-sleep only.
      // Doom Castle also sits here: the commute sit.
      "doom-castle",
      // Mira Fri 2 Oct 2026 POST-#218 CLEAR — The Old House leads Next, and is not on this lane.
      // Dusty Answer is unwind only. The Story of a Woman is before-sleep only.
      // The Sworn Brothers and Christine of the Hills sit here: the commute sits.
      "the-sworn-brothers",
      "christine-of-the-hills",
      // Mira Fri 2 Oct 2026 POST-#221 CLEAR — Daughters of Men leads Next, and is not on this lane.
      // Irresolute Catherine and The Old Room are unwind only. The Fur Coat is before-sleep only.
      // The Bright Shawl sits here: the commute sit.
      "the-bright-shawl",
      // Mira Fri 2 Oct 2026 POST-#222 CLEAR — The Corsican Brothers sits here: the commute sit.
      // Jocelyn, The Woman of Knockaloe and The Taking of the Redoubt are unwind only.
      "the-corsican-brothers",
    ],
  },
  {
    id: "soft-mourning",
    label: "Soft mourning",
    workIds: [
      "flame-and-shadow",
      "helen-of-troy-and-other-poems",
      "the-wild-swans-at-coole",
      "spoon-river-anthology",
      "copper-sun",
      "the-black-christ-and-other-poems",
    ],
  },
];


/** Explicit short-sit minutes for bite-sized ritual openings (overrides full-text breaths). */
export const RITUAL_SIT_MINUTES: Record<string, number> = {
  "passing": 5,
  "bunner-sisters": 5,
  "bread-givers": 5,
  "after-the-divorce": 5,
  "white-nights": 5,
  "west-african-folk-tales": 2,
  "the-weary-blues": 5,
  "kwaidan-stories-and-studies-of-strange-things": 5,
  "the-house-of-mirth": 5,
  "enchanted-april": 8,
  "lolly-willowes": 8,
  cheri: 8,
  "brazilian-tales": 12,
  "the-moon-and-sixpence": 7,
  "my-brilliant-career": 6,
  "the-plumed-serpent": 6,
  "the-red-room": 6,
  "mr-fortunes-maggot": 5,
  "the-bridge-of-san-luis-rey": 8,
  "carmilla": 5,
  "hungry-hearts": 12,
  "the-four-horsemen-of-the-apocalypse": 7,
  "in-our-time": 9,
  quicksand: 5,
  "attendants-confession": 2,
  rashomon: 2,
  "high-wind-jamaica": 5,
  "noli-me-tangere": 2,
  vera: 6,
  "on-a-chinese-screen": 5,
  futility: 6,
  "poison-tree": 5,
  "trooper-peter-halket": 4,
  "the-home-and-the-world": 6,
  "where-angels-fear-to-tread": 4,
  "the-gadfly": 2,
  botchan: 5,
  "the-immoralist": 2,
  "letters-of-a-javanese-princess": 2,
  "blood-and-sand": 2,
  ecstasy: 2,
  "an-outcast-of-the-islands": 2,
  "the-underdogs": 2,
  "diary-of-a-chambermaid": 2,
  "the-painted-veil": 2,
  "the-good-soldier": 4,
  "une-vie": 5,
  "my-antonia": 5,
  "look-back-on-happiness": 3,
  "father-of-yoto": 12,
  "crime-and-punishment": 5,
  "uncle-silas": 5,
  "rise-of-david-levinsky": 4,
  "for-the-term-of-his-natural-life": 4,
  "bottle-imp": 12,
  "death-in-venice": 5,
  "elmer-gantry": 5,
  "colonels-dream": 5,
  "hard-times": 5,
  "great-god-pan": 12,
  manalive: 5,
  "captain-blood": 5,
  "the-monomaniac": 5,
  "tartarin-de-tarascon": 5,
  "the-time-machine": 12,
  "prisoner-of-zenda": 5,
  kidnapped: 5,
  "revolt-of-the-angels": 5,
  "children-of-the-soil": 6,
  "the-invisible-man": 12,
  "the-village-in-the-jungle": 7,
  "the-joy-of-captain-ribot": 7,
  saracinesca: 9,
  "the-torrents-of-spring": 8,
  "the-bet": 12,
  "the-bitter-tea-of-general-yen": 8,
  "the-woman-of-andros": 11,
  "bella-donna": 8,
  "nina-balatka": 8,
  "la-lupa": 9,
  "a-farewell-to-arms": 10,
  "alice-adams": 10,
  "quartet": 11,
  "song-of-songs-sudermann": 9,
  "its-wavering-image": 8,
  "java-head": 10,
  "sunshine-sketches-of-a-little-town": 10,
  "guest-the-one-eyed": 12,
  "the-blind-musician": 9,
  "magnolia-flower": 10,
  "in-the-mountains": 11,
  "the-two-countesses": 7,
  "el-ombu": 7,
  "halil-the-pedlar": 8,
  "the-white-sand-path": 10,
  "liliecronas-home": 10,
  "doctor-luke-of-the-labrador": 4,
  "morrina": 8,
  "a-happy-boy": 7,
  "the-desjardins": 10,
  "gone-to-earth": 10,
  "the-real-charlotte": 10,
  "pembroke": 9,
  "the-argonauts": 9,
  "at-the-roadside-station": 9,
  "the-will-to-live": 9,
  "doom-castle": 10,
  "mayflower": 10,
  "susan-proudleigh": 6,
  "the-peat-moor": 7,
  "life-and-death-of-harriett-frean": 9,
  "farewell-love": 4,
  "the-son-of-his-mother": 9,
  "my-lady-nobody": 10,
  "new-years-night": 9,
  "the-old-house": 7,
  "the-sworn-brothers": 9,
  "dusty-answer": 9,
  "christine-of-the-hills": 10,
  "the-story-of-a-woman": 7,
  "daughters-of-men": 4,
  "the-bright-shawl": 6,
  "irresolute-catherine": 8,
  "the-old-room": 8,
  "the-fur-coat": 7,
  "the-corsican-brothers": 9,
  "jocelyn": 10,
  "the-woman-of-knockaloe": 8,
  "the-taking-of-the-redoubt": 9,
  "the-man-in-the-brown-suit": 8,
  "wang-the-ninth": 7,
  "garram-the-hunter": 5,
  "his-dead-wifes-photograph": 10,
  "the-face-in-the-abyss": 8,
  "mary-magdalen": 8,
  "the-hoop": 7,
  "love-s-shadow": 8,
  "lewis-and-irene": 7,
  "a-monkey": 9,
  "wedding-day": 6,
  "elysium": 5,
  "growth-of-the-soil": 2,
  "nada-the-lily": 2,
  "all-quiet-on-the-western-front": 2,
  we: 2,
  "the-story-of-gosta-berling": 2,
  thais: 8,
  underdogs: 8,
  demian: 2,
  "death-comes-for-the-archbishop": 2,
  "the-getting-of-wisdom": 2,
  bliss: 2,
  "a-hundred-and-seventy-chinese-poems": 2,
  dubliners: 12,
  hunger: 5,
  gitanjali: 2,
  "martin-bircks-youth": 2,
  harmonium: 2,
  "nacha-regules": 2,
  krakatit: 2,
  "the-peasants": 2,
  "a-hungarian-nabob": 8,
  "the-song-of-the-blood-red-flower": 8,
  "irish-fairy-tales": 5,
  basilio: 8,
  oblomov: 8,
  "the-lady-with-the-dog-and-other-stories": 6,
  zeno: 8,
  "the-book-of-khalid": 8,
  blacker: 8,
  "a-lost-lady": 8,
  summer: 8,
  "jacob-s-room": 8,
  "the-tenant-of-wildfell-hall": 8,
  herland: 8,
  "the-wanderer": 8,
  "the-late-mattia-pascal": 8,
  "the-cabala": 5,
  "reuben-sachs": 5,
  "the-sun-also-rises": 5,
  "trooper-peter-halket-of-mashonaland": 5,
  "the-garden-party-and-other-stories": 5,
  cane: 4,
  "a-hero-of-our-time": 5,
  "strange-tales": 5,
  "short-stories-from-the-balkans": 5,
  "the-awakening": 5,
  "a-few-figs-from-thistles": 5,
  tropic: 5,
  "the-green-carnation": 6,
  "hajji-baba": 5,
  "the-purple-land": 6,
  "the-master-of-ballantrae": 6,
  "a-set-of-six": 6,
  "the-hill-of-dreams": 6,
  "the-story-of-an-african-farm": 6,
  "the-imperialist": 7,
  kim: 6,
  "mogens-and-other-stories": 6,
  "anna-of-the-five-towns": 6,
  "stories-and-pictures": 12,
  "there-is-confusion": 8,
  "pointed-roofs": 4,
  buddenbrooks: 5,
  "miss-lulu-bett": 6,
  color: 5,
  "a-diversity-of-creatures": 5,
  "an-american-tragedy": 5,
  "bertha-garlan": 5,
  "born-in-exile": 6,
  "calvary": 6,
  "charmides-and-other-poems": 5,
  "cousin-betty": 6,
  "dauber": 5,
  "eugenie-grandet": 6,
  "heart-of-darkness": 5,
  "in-a-glass-darkly": 5,
  "in-the-world": 4,
  indiana: 6,
  "lady-windermeres-fan": 5,
  "pans-garden": 5,
  "peacock-pie": 5,
  "prosas-profanas": 5,
  "resurrection": 4,
  "rosmersholm": 5,
  "salome": 5,
  "salt-water-ballads": 5,
  "small-souls": 7,
  "songs-and-satires": 5,
  "tess-of-the-durbervilles": 6,
  "the-ballad-of-the-white-horse": 5,
  "the-book-of-wonder": 9,
  "the-colonel-s-dream": 5,
  "the-comedienne": 6,
  "the-crux": 5,
  "the-black-dog": 12,
  "the-dream": 5,
  "the-gods-of-pegana": 5,
  "the-grand-babylon-hotel": 5,
  "the-hidden-force": 5,
  "the-house-by-the-medlar-tree": 6,
  "the-house-of-the-seven-gables": 6,
  "the-jacket": 5,
  "the-job": 4,
  "the-magic-skin": 5,
  "the-man-of-property": 7,
  "the-napoleon-of-notting-hill": 5,
  "the-party-and-other-stories": 5,
  "the-pit": 6,
  "the-sport-of-the-gods": 5,
  "the-reign-of-greed": 5,
  "the-rise-of-david-levinsky": 5,
  "the-rise-of-silas-lapham": 7,
  "the-road-to-the-open": 6,
  "the-romance-of-the-milky-way": 5,
  "the-three-taverns": 5,
  "the-titan": 5,
  "the-town-down-the-river": 5,
  "the-veil-and-other-poems": 5,
  "the-village": 6,
  "daisy-miller": 6,
  "south-wind": 7,
  "ditte-girl-alive": 9,
  "flappers-and-philosophers": 12,
  "the-wolves-of-god": 5,
  "the-wonderful-adventures-of-nils": 5,
  "theresa-raquin": 5,
  "three-soldiers": 4,
  "twilight-sleep": 5,
  "virgin-soil": 6,
  "wanderers": 5,
  "white-jacket": 4,
  "yekl": 5,
  "zuleika-dobson": 6,
  "a-group-of-noble-dames": 5,
  "captain-craig": 5,
  "daniel-deronda": 5,
  "day-and-night-stories": 5,
  "fifty-one-tales": 5,
  "jude-the-obscure": 6,
  "les-villes-tentaculaires": 5,
  "neue-gedichte": 5,
  "over-the-brazier": 5,
  "rolling-stones": 5,
  "salammbo": 5,
  "smoke-bellew": 5,
  "songs-from-vagabondia": 5,
  "songs-of-childhood": 5,
  "ten-minute-stories": 5,
  "the-everlasting-mercy": 5,
  "the-golden-bowl": 5,
  "the-rainbow": 5,
  "the-sword-of-welleran": 5,
  "time-and-the-gods": 5,
  "a-changed-man": 5,
  "ballads-of-a-bohemian": 5,
  "ballads-of-a-cheechako": 5,
  "crucial-instances": 5,
  "filipino-popular-tales": 3,
  "the-marrow-of-tradition": 7,
  "laos-folk-lore": 2,
  "lost-illusions": 5,
  "mogens": 5,
  "more-songs-from-vagabondia": 5,
  "rhymes-of-a-red-cross-man": 5,
  "rhymes-of-a-rolling-stone": 5,
  "songs-of-travel": 5,
  "the-faith-of-men": 5,
  "the-golden-whales-of-california": 5,
  "the-hermit-and-the-wild-woman": 5,
  "the-princess-casamassima": 5,
  "the-son-of-the-wolf": 5,
  "the-stolen-bacillus": 5,
  "the-tragic-muse": 5,
  "toilers-of-the-sea": 2,
  "toward-the-gulf": 5,
  "a-house-of-gentlefolk": 5,
  "artists-wives": 5,
  "blix": 5,
  "emaux-et-camees": 5,
  "eves-ransom": 5,
  "fraternity": 5,
  "hania": 5,
  "indian-summer": 6,
  "les-heures-claires": 5,
  "les-trophees": 5,
  "numa-roumestan": 6,
  "captains-courageous": 6,
  dracula: 6,
  "the-tug-of-love": 8,
  "a-slav-soul": 12,
  "cabbages-and-kings": 4,
  "picture-of-dorian-gray": 4,
  "reign-of-greed": 3,
  "a-cross-line": 12,
  "shadow-of-the-cathedral": 4,
  "way-of-all-flesh": 4,
  "family-at-gilje": 4,
  widdershins: 12,
  typee: 10,
  kangaroo: 9,
  "casanovas-homecoming": 5,
  "the-mother": 7,
  "lord-arthur-saviles-crime": 12,
  "doctor-pascal": 4,
  leila: 4,
  charan: 12,
  "sister-carrie": 4,
  "antic-hay": 4,
  "spring-time-case": 4,
  "eline-vere": 4,
  "hungry-stones": 12,
  "royal-highness": 4,
  ramona: 6,
  "almayers-folly": 6,
  "the-emancipated": 4,
  "the-great-hunger": 6,
  erewhon: 6,
  "ann-veronica": 6,
  "the-mysterious-stranger": 6,
  "children-of-the-frost": 12,
  "the-poison-tree": 9,
  cosmopolis: 6,
  "the-woman-who-did": 6,
  "billy-budd": 6,
  "malay-sketches": 12,
  "the-sorrows-of-satan": 7,
  "the-king-of-schnorrers": 6,
  "the-toys-of-peace": 9,
  "the-patrician": 5,
  "the-price-of-love": 5,
  "the-private-papers-of-henry-ryecroft": 5,
  "unhuman-tour-kusamakura": 5,
  "ubirajara": 5,
  "cecilia": 5,
  "la-regenta": 5,
  "los-pazos-de-ulloa": 5,
  "nazarin": 5,
  "the-octopus": 5,
  "the-red-and-the-black": 5,
  "alcools": 5,
  "petersburg": 5,
  "st-peter-s-umbrella": 5,
  "caesar-or-nothing": 5,
  "calligrammes": 5,
  "martin-fierro": 5,
  "the-complete-original-short-stories": 5,
  "the-cabin": 5,
  "les-chants-de-maldoror": 5,
  "pan-tadeusz": 5,
  "the-red-laugh": 5,
  "before-adam": 5,
  "bruges-la-morte": 5,
  "casmurro": 5,
  "les-civilises": 5,
  "ein-landarzt": 5,
  "hien-le-maboul": 5,
  "knulp": 5,
  "iracema": 5,
  "meaulnes": 5,
  "tristana": 5,
  "niels": 5,
  "amor-de-perdicao": 5,
  "das-stunden-buch": 5,
  "misericordia": 5,
  "the-mandarin": 5,
  "policarpo": 5,
  "quincas": 5,
  "marianela": 5,
  "pepita-jimenez": 5,
  "a-illustre-casa-de-ramires": 5,
  "an-iceland-fisherman": 5,
  "aphrodite": 10,
  candide: 4,
  "iola-leroy": 8,
  "esther-waters": 6,
  "azul": 5,
  "contes-cruels": 5,
  "les-amours-jaunes": 5,
  "libro-de-poemas": 5,
  "on-the-eve": 5,
  "papeis-avulsos": 5,
  "piping-hot": 5,
  "ramuntcho": 8,
  reginald: 6,
  "smoke": 6,
  "niels-lyhne": 5,
  germinal: 4,
  kipps: 4,
  "the-professor": 4,
  "a-room-with-a-view": 4,
  "martin-eden": 4,
  "madame-heurtebise": 11,
  "the-fortune-of-the-rougons": 5,
  "the-paying-guest": 5,
  "the-triumph-of-death": 5,
  "the-witch-and-other-stories": 5,
  "therese-raquin": 5,
  "tradiciones-peruanas": 5,
  "watch-and-ward": 5,
  "bay-a-book-of-poems": 5,
  "black-spirits-and-white-a-book-of-ghost-stories": 5,
  "fir-flower-tablets": 5,
  "hugh-selwyn-mauberley": 5,
  "os-lusiadas": 5,
  "the-black-monk-and-other-stories": 5,
  "the-heart-of-happy-hollow": 5,
  "the-hesperides-and-noble-numbers": 5,
  "the-horse-stealers-and-other-stories": 5,
  "the-mystery-of-choice": 5,
  "the-poems-of-emma-lazarus-volume-1": 5,
  "weird-tales": 5,
  "siddhartha": 5,
  "faust-part-i": 5,
  "the-divine-comedy": 5,
  "eugene-onegin": 5,
  "seven-brothers": 6,
  "gilgamesh": 5,
  "bontshe-the-silent": 5,
  "shahnameh": 5,
  "song-of-songs": 5,
  "baudelaire-prose-and-poetry": 5,
  "tales-grotesque-and-curious": 5,
  "a-book-barnes": 5,
  "a-spring-time-case": 5,
  "jewish-children": 5,
  "essays-and-soliloquies": 5,
  "tragic-sense-of-life": 5,
  "white-buildings": 5,
  "three-plays": 5,
  "our-lady-of-the-pillar": 12,
  "the-sweet-miracle": 5,
  "red-oleanders": 5,
  "stories-from-tagore": 5,
  "the-fugitive": 5,
  "nationalism": 5,
  "the-cycle-of-spring": 5,
  "creative-unity": 5,
  "the-lonely-way": 5,
  "rootabaga-stories": 5,
  "rootabaga-pigeons": 5,
  "auguste-rodin": 5,
  "on-the-seaboard": 5,
  "lucky-pehr": 5,
  "the-dream-play": 5,
  "the-father": 5,
  "easter": 5,
  "the-inferno": 5,
  "trafalgar": 5,
  "saragossa": 5,
  "leon-roch": 5,
  "yiddish-short-stories": 5,
  "tales-of-old-japan": 5,
  "chinese-literature": 5,
  "the-prose-tales": 5,
  "self-determining-haiti": 5,
  "leon-roch-vol-2": 5,
  "miss-julia": 5,
  "in-midsummer-days": 5,
  "the-chinese-fairy-book": 5,
  "japanese-fairy-world": 5,
  "japanese-literature": 5,
  "romances-of-old-japan": 5,
  "warriors-of-old-japan": 5,
  "a-history-of-chinese-literature": 5,
  "the-civilization-of-china": 5,
  "kimiko": 5,
  "glimpses-of-unfamiliar-japan": 5,
  "hebrew-literature": 5,
  "the-history-of-yiddish-literature": 5,
  "korean-folk-tales": 5,
  "smoke-and-steel": 5,
  "gods-trombones": 5,
  "hadji-murad": 5,
  "anandamath": 5,
  "maria": 5,
  "lady-macbeth": 5,
  "layla": 5,
  "conference": 5,
  "gentlemen-prefer-blondes": 5,
  "of-one-blood": 5,
  "maria-chapdelaine": 6,
  "a-japanese-nightingale": 6,
  "lady-into-fox": 5,
  "african-farm": 5,
  "a-passage-to-india": 5,
  mhudi: 5,
  "bel-ami": 5,
  magnhild: 5,
  "of-human-bondage": 5,
  "green-mansions": 5,
  "jamaica-anansi-stories": 5,
  banjo: 5,
  "african-tragedy": 5,
  generosity: 20,
};

export function ritualPitchFor(id: string): string | undefined {
  return RITUAL_PITCHES[id];
}

export function worksForRitualLane(lane: RitualLane): ShelfWork[] {
  const byId = new Map(SHELF.map((item) => [item.id, item]));
  const out: ShelfWork[] = [];
  const seen = new Set<string>();
  for (const id of lane.workIds) {
    if (seen.has(id) || !isLocalBound(id)) continue;
    const work = byId.get(id);
    if (!work) continue;
    seen.add(id);
    out.push(work);
  }
  return out;
}

/** Cold-open Rituals chip: For you, else Unwind — never Serialize. */
export function defaultRitualLaneId(
  lanes: readonly { id: string }[] = RITUAL_LANES,
): string {
  const ids = new Set(lanes.map((lane) => lane.id));
  if (ids.has(FOR_YOU_LANE_ID)) return FOR_YOU_LANE_ID;
  if (ids.has("unwind")) return "unwind";
  for (const lane of lanes) {
    if (lane.id !== SERIALIZE_LANE_ID) return lane.id;
  }
  return lanes[0]?.id ?? "";
}

/** Pin first-session ids in Mira order, then shuffle the remainder. */
export function ritualLaneStack(lane: RitualLane, visit: number): ShelfWork[] {
  return pinThenShuffle(
    worksForRitualLane(lane),
    mixSeed(visit, `ritual-${lane.id}`),
    FIRST_SESSION_RITUAL_IDS,
    (work) => work.id,
  );
}

/** Coarse sitting-length label for Ritual cards (honest, not precise). */
export function ritualDurationLabel(work: ShelfWork): string {
  return formatRitualMinutes(estimateRitualMinutes(work));
}

/** Estimated whole-work minutes from breaths (preferred) or form heuristic. */
export function estimateRitualMinutes(work: ShelfWork): number {
  const sitOverride = RITUAL_SIT_MINUTES[work.id];
  if (sitOverride && sitOverride > 0) return sitOverride;
  if (work.breaths && work.breaths > 0) {
    // Breaths are sentence-ish units; poems run shorter per breath than prose.
    const wordsPerBreath =
      work.form === "poem" ? 7 : work.form === "play" ? 12 : 18;
    // One calm pace for all forms — prefer coarse honesty over fake precision.
    const words = work.breaths * wordsPerBreath;
    return Math.max(4, Math.round(words / 200));
  }
  // Shelf `minutes` is often a placeholder (40/50/80/90/160) for unbound rows.
  const placeholder = new Set([40, 50, 80, 90, 160]);
  if (work.minutes > 0 && !placeholder.has(work.minutes)) {
    return work.minutes;
  }
  switch (work.form) {
    case "poem":
      return 18;
    case "play":
      return 45;
    case "stories":
      return 55;
    case "other":
      return 25;
    case "novel":
    default:
      return 100;
  }
}

function formatRitualMinutes(minutes: number): string {
  if (minutes <= 7) return "~5 min";
  if (minutes <= 14) return "~12 min";
  if (minutes <= 22) return "~20 min";
  if (minutes <= 40) return "~30 min";
  if (minutes <= 90) return "One sitting";
  return "Several sittings";
}
