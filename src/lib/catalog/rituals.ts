import { SHELF, type ShelfWork } from "./shelf.ts";
import { isLocalBound } from "./full-pdf.ts";
import { mixSeed, pinThenShuffle } from "../recommend.ts";
import { canonicalWorkId } from "../work-id-alias.ts";
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
    `One tale only: The Story of Mimi-Nashi-Hōïchi. More than seven hundred years after a drowned clan haunted the Straits of Shimonoséki, a blind minstrel named Hōïchi is about to be summoned by listeners who aren’t quite alive. Lafcadio Hearn’s 1904 ghost tale opens on Dan-no-ura—demon-fires on the water, a temple built to quiet the dead. This reading ends with that tale.`,
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
    "My candle burns at both ends. This reading is First Fig and Recuerdo — the ferry, the apples, the subway fare — about five minutes. Each poem is its own chapter; the book continues.",
  "a-hero-of-our-time":
    "Travelling post from Tiflis into the Koishaur Valley at sunset — a dukhan crowd and a caravan of camels. Bela carries imperial violence in the Caucasus, left as printed. It opens at Bela, Chapter I.",
  "strange-tales":
    "A Kiang-si gentleman and Mr. Chu step into a monastery chapel and find a painted wall: Chih Kung, and a fairy picking flowers. This reading is just The Painted Wall; the studio continues.",
  "short-stories-from-the-balkans":
    "Leiba Zibal waits under the roof at Podeni for a stage that is already an hour late. Easter Candles only — never Brother Cœlestin. A pogrom comes later in the book.",
  "the-awakening":
    "A green and yellow parrot at Grand Isle keeps repeating Allez vous-en. This reading is the Pontellier gallery, Chapter I. The novel continues.",
  tropic:
    "The whistle blew for eleven o'clock. One tale: Drought — a white hillside quarry, then Coggins Rum, then the walk home through the marl. This reading ends with that tale. Heat, labor, and racial violence are in this stretch, left as printed.",
  "there-is-confusion":
    "Joanna climbs onto her father’s knee and asks for a story about somebody great. This reading runs through Mammy’s chair and stops when she wants a man who put out a fire. Chapter I continues. Fauset’s 1924 novel.",
  "pointed-roofs":
    "Miriam leaves the gaslit hall and goes slowly upstairs, the Saratoga trunk already in the firelight, deciding what she will say to the Fraeulein. It opens at Chapter I. This reading stops on governessing and old age. Richardson’s 1915 novel, Pilgrimage volume 1 only.",
  "the-rise-of-silas-lapham":
    "When Bartley Hubbard interviews Silas Lapham for the Solid Men of Boston series, Lapham receives him in his private office. This reading stops when Bartley cuts in on the mineral paint. Howells’s 1885 novel continues.",
  indiana:
    "On a cool, rainy evening in a small château in Brie, Colonel Delmare watches the fire. It opens at Part First, Chapter I. Ives’s English of Sand’s 1832 novel. This reading stops on the dim interior.",
  "the-book-of-wonder":
    "Come with me, ladies and gentlemen who are in any wise weary of London. Preface, then The Bride of the Man-Horse only — this reading stops when the silver horn sounds the wedding bells. The other stories follow in the book.",
  buddenbrooks:
    "“And--and--what comes next?” Lübeck, the Mengstrasse house, Part One, Chapter I. This is the whole Lowe-Porter translation. The novel continues.",
  "miss-lulu-bett":
    "The Deacons were at supper. A tulip under the gas jet, and creamed salmon. Chapter I, April — a Midwest house. Gale’s novel.",
  color:
    "I doubt not God is good, well-meaning, kind. It opens with Yet Do I Marvel, then Incident — a Baltimore memory; a heads-up that Incident prints a racial slur. Each poem is its own chapter; the book continues.",
  "songs-of-innocence-and-of-experience":
    "Blake’s paired songs: nursery light on one side, harder truths on the other. Read them as morning weather — clear, then clouded.",
  "second-april":
    "April returns and Millay asks what for. Frogs, spring streets, and the work of starting over after a year that already spent you.",
  "renascence-and-other-poems":
    "A young Millay climbs a mountain of sky and comes back changed. Infinite space, then the small room of the self — still electric.",
  "mountain-interval":
    "Frost’s yellow wood, two roads, and the talk that gets you going. New England intervals — work, weather, and choices that look simple from here.",
  gitanjali:
    "Phone-clear devotion lyric. It opens on poem 1.",
  harmonium:
    "A mind of winter: frost, junipers, and the nothing that is. This reading is just The Snow Man.",
  "a-hundred-and-seventy-chinese-poems":
    "Arthur Waley’s 1918 English, one poem to a chapter. It opens on Winter Night: “My bed is so empty that I keep on waking up”.",
  bliss:
    "Desire lands hard; the opening ends on the radiant mirror. The dinner-party turn is the knife of the story. It opens on the title story, Bliss.",
  dubliners:
    "North Richmond Street, being blind, was a quiet street except when the Christian Brothers’ School set the boys free. This reading is just Araby — through the bazaar, ending when his eyes burn with anguish and anger.",
  "martin-bircks-youth":
    "Childhood dream: a green twilight garden, then the flower that turns red. It opens with The Old Street.",
  "songs-of-kabir":
    "Kabir, through Tagore’s English: mystic poems that don’t need a church. Straight talk about God, dust, and the body walking between them.",
  silhouettes:
    "At Dieppe after sunset—the sea quieted, grape-flush on the clouds, a sickle moon and one gold star. Silhouettes opens on atmosphere, not argument. Arthur Symons’s 1892 seaside lyrics — a short After Sunset reading before sleep.",
  "the-garden-party-and-other-stories":
    "Very early morning. Crescent Bay is hidden under a white sea-mist until the shepherd is out of sight. This reading is just At the Bay, part I. The title story comes later in the same book.",
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
    "Léa’s wrought-iron bed; Chéri wants the pearls. In Janet Flanner’s English. Desire and a kept boy are the story, told frankly.",
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
    "ONE afternoon in the autumn of 1851 a solitary horseman pushes through central New Mexico. It opens at Book One, The Cruciform Tree.",
  banjo:
    "Heaving along the Marseilles breakwater, Banjo carries the Ditch. McKay’s 1929 beach-boy dialect is left as written.",
  anandamath:
    "A hot day in Padachinha, 1176 B.S-. Sen-Gupta’s 1906 Abbey of Bliss.",
  "african-tragedy":
    "Two reasons made Robert Zulu leave teaching at Siam Village School. This reading ends with Chapter I. Lovedale’s Christian-mission frame moralizes town life, and that view is the book’s own.",
  demian:
    "Two worlds pass through a little-town Latin school — home of clean clothes and Christmas, and rooms of secrecy. Childhood two-worlds map; the Abraxas sermon comes later. In N. H. Priday’s 1923 English.",
  "the-getting-of-wisdom":
    "Four children on the grass: a prince, a golden crown, and a silk dress already dirty at the hem. School-status novel, not a children's book — this reading is set at Melbourne Ladies' College.",
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
    `It opens on Jamaica after Emancipation: plantation ruins, bush up to the door, Derby Hill held open by a rank plant, then Ferndale. Hughes’s 1929 voice uses period racial language in this stretch, left as printed. This opening stops after Ferndale; read on into the chapter and that period language continues.`,
  "noli-me-tangere":
    `Capitan Tiago announces a dinner at the last minute in Binondo and the Walled City. Chapter I only; the colonial power of the friars is on the page from the start.`,
  vera:
    `Cornwall, noon heat, a garden gate, and a daughter who has lost everything—and feels nothing yet. Same author as Enchanted April, colder register. Wemyss intensifies later.`,
  "on-a-chinese-screen":
    `She takes a holy temple and papers it into Cheltenham—blue curtains for her eyes, pink stripes, an American stove where the Buddha sat.`,
  futility:
    `When the Simbirsk of the Russian Volunteer Fleet vanishes, carrying three sisters toward Shanghai, the hotel room still has a dirty table-cloth.`,
  "the-comedienne":
    `Bukowiec station on the Dombrowa railroad, a winding line among beech and pine hills. It opens at Chapter I. Obecny’s English of Reymont. The novel continues.`,
  "the-moon-and-sixpence":
    `I confess that when first I made acquaintance with Charles Strickland I never for a moment discerned that there was in him anything out of the ordinary. Yet now few will be found to deny his greatness. This reading stops when the Rev. Robert Strickland’s biography is named as an attempt to remove misconceptions. Maugham’s 1919 novel. Later, the Tahiti stretch uses period racial language, left as printed.`,
  "my-brilliant-career":
    `“Boo, hoo!” — the first recollection, then gum-trees and the salt-shed at Possum Gully. It opens at Chapter One. Franklin’s 1901 novel. Australia, the preferred bush window. Later chapters use period words for Aboriginal people and Chinese workers, left as printed.`,
  "the-plumed-serpent":
    `Sunday after Easter, the last bull-fight of the season in Mexico City, and Kate’s heart sank. It opens at Chapter I. Lawrence’s 1926 novel. Mystic-expat Mexico. Further into the bullfight, “half-savage” and later “aboriginal” are period racial language, left as printed.`,
  "the-red-room":
    `An evening in the beginning of May. The little garden on Moses Height, on the south side of Stockholm, and the wind over the town. It opens at Chapter I. Schleussner’s English (Swedish 1879, English 1913). Stockholm bohemia.`,
  "african-farm":
    `The full African moon poured down its light from the blue sky into the wide, lonely plain. Stunted karoo bushes and milk-bushes follow in the white light, then a solitary kopje of ironstones. This reading stops before the farm household takes over.`,
  "a-passage-to-india":
    `Chandrapore presents nothing extraordinary except the Marabar Caves, twenty miles off. This reading stops after the civil station and those extraordinary caves. The novel continues through Mosque, Caves, and Temple.`,
  mhudi:
    `Two centuries ago the Bechuana tribes inhabited the land between Central Transvaal and the Kalahari Desert. This reading stops before the Matebele invasion takes over. Lovedale, 1930. The novel continues.`,
  maria:
    `A boy is sent from home to a college in Bogotá, and his sister’s lock of hair is already a farewell. This reading stops before the six-year return. Ogden’s English, 1890.`,
  "bel-ami":
    `After changing his five-franc piece Georges Duroy left the restaurant. This reading stops after the pocket-money on Rue Notre Dame de Lorette, before Forestier takes over. French 1885.`,
  magnhild:
    `High mountains, the remnants of a storm, then the fjord. This reading stops after the name Magnhild is shouted. Magnhild only.`,
  marianela:
    `The sun had set. After the brief interval of twilight the night fell calm and dark, and in its gloomy bosom the last sounds of a sleepy world died gently away. The traveller went forward on his way, hastening his step as night came on; the path he followed was narrow and worn by the constant tread of men and beasts, and led gently up a hill on whose verdant slopes grew picturesque clumps of wild cherry trees, beeches and oaks.--The reader perceives that we are in the north of Spain.`,
  "on-the-seaboard":
    `A fishing boat lay one May evening to beam-wind, out on Goosestone bay. "Rokarna," known to all on the coast by their three pyramids, were changing to blue, while upon the clear sky clouds were forming just as the sun began to sink. The first reading stops after the Surveyor at the tiller.`,
  "poison-tree":
    `His wife makes him promise: if a storm rises, leave the boat. On the Ganges in Joisto, the weather keeps that promise.`,
  "trooper-peter-halket":
    `A lone Chartered Company trooper on a Mashonaland kopje, fire quivering, inventing gold companies in the dark after losing his column. Written in 1897, the opening already frames colonial scouting; missionary and racial language harden after the night watch, before the stranger arrives.`,
  "the-home-and-the-world":
    `Mother’s vermilion mark, a red-bordered *sari*, and a daughter furious with her mirror who wanted to be an ideal wife. This reading is Bimala’s story in the Rajah’s house.`,
  "where-angels-fear-to-tread":
    `Charing Cross chaos — Lilia laughing like royalty while Philip floods her with little towns to see: Gubbio, Pienza, Monteriano. This reading stops on the foot-warmer. The short novel continues.`,
  "the-gadfly":
    `Pisa seminary heat — a lost sermon page, a caressing *Padre*, and a fruitseller calling *Fragola!* down the street. Later violence comes after this reading. This is Risorgimento Italy, not a comedy of manners.`,
  "the-immoralist":
    `Faithful friends summoned to a distant house — Michel can free himself; he cannot yet say what freedom is for. The first reading is Michel’s opening letter to his friends, ending “…more simply than if I were talking to myself. Listen:”`,
  "the-hidden-force":
    `The full moon wore the hue of tragedy that evening — a blood-red ball behind the tamarind-trees in the Lange Laan, then the Residency far back in its grounds. It opens at Chapter I. This reading stops at the town-clock. Teixeira’s English of the Java novel.`,
  hunger:
    `It was during the time I wandered about and starved in Christiania. The attic clock strikes six. Egerton’s English of the city hunger.`,
  "jude-the-obscure":
    `The schoolmaster was leaving the village, and everybody seemed sorry. A tilted cart out of Marygreen. Hardy’s Wessex novel continues.`,
  "casanovas-homecoming":
    `Casanova was in his fifty-third year. Though no longer driven by the lust of adventure that had spurred him in his youth, he was still hunted athwart the world. The opening — the fifty-third year, a wounded bird, and the Supreme Council. Arthur Schnitzler, in Eden and Cedar Paul’s English, 1918. First published in German in 1918; this translation is from 1922.`,
  "letters-of-a-javanese-princess":
    `Kartini writes from colonial Java in 1899, hungry for the modern girl while age-long traditions hold her cloistered. Period phrases like “Indian world” and “pale sisters” mean the Indies and Western women — historical voice, not today’s usage. Letter I comes first, the cloistered-arms beat; the letters that follow keep the same colonial frame.`,
  "blood-and-sand":
    `Gallardo’s bullfight-day breakfast: meat, black coffee, a huge cigar, and a dining room that treats the matador like family glory. Further on, the book has bullring gore and animal death.`,
  ecstasy:
    `After dinner on the Scheveningen Road — rosewood, vieux-rose silk, an onyx lamp like a six-petalled flower — and a promise not to wake the boy.`,
  "an-outcast-of-the-islands":
    `A little excursion off the straight path — neatly done, quickly forgotten. Conrad’s Malay Archipelago world — colonial hierarchy and racialized language intensify after the opening.`,
  "the-underdogs":
    `Dog barking in the sierra — tortillas, a *cántaro*, a rifle under the mat — and hoofbeats in the quarry.`,
  "diary-of-a-chambermaid":
    `Twelfth place in two years — rainy September, *Figaro* ad, dirty souls, and no interview with Madame.`,
  "the-painted-veil":
    `Shuttered Hong Kong room after tiffin; someone tries the door; Kitty whispers “Walter.” Colonial household language (*amah*, “boys”) is left as printed, and it opens on “How shall I get out?” Chapter I only: adultery, in the colonial heat.`,
  "the-good-soldier":
    `This is the saddest story I have ever heard. Part I, Chapter I — the Ashburnhams and nine seasons at Nauheim. Ford Madox Ford’s 1915 novel.`,
  "growth-of-the-soil":
    `The long moor road north; red-beard Isak with the first sack. The opening uses the period word “Lapp” for Sámi herders on the common. Loneliness and land hunger; read on and that period word stays in Worster’s English.`,
  "of-human-bondage":
    `A club foot, a medical student, and a love that humiliates on purpose. It opens at Chapter I on the gray morning — Wake up, Philip — and this reading keeps to that chapter. Sit with that weather before the first breath.`,
  "green-mansions":
    `Now that we are cool, he said, and regret that we hurt each other, I am not sorry that it happened. This reading stops after the flight from the country into Guayana, then the forest.`,
  "jamaica-anansi-stories":
    `One great hungry time — the fish pot, and one tale only. This reading ends with Tying Tiger.`,
  "hadji-murad":
    `I was returning home by the fields. It was midsummer; the hay harvest was over, and they were just beginning to reap the rye. This reading ends where the crushed thistle turns into the Caucasian episode.`,
  "nada-the-lily":
    `You ask for the youth of Umslopogaas and his love for Nada — and the old man who answers is not the name you think. Haggard’s Zulu epic is told through an invented oral narrator (Mopo) inside late-Victorian imperial romance — the White Man / Great Queen frame — and is not ethnographic authority or a substitute for Zulu-authored history.`,
  "all-quiet-on-the-western-front":
    `Five miles behind the front — bellies full of beef and haricot beans, double sausage, and a cook who won’t stop ladling. This opening is the rest billet; later chapters bring trench violence and period language about the enemy, left as printed.`,
  we:
    `Cheeks burning — D-503 will straighten the wild curve into the wisest of lines, and call the record *We*.`,
  "the-story-of-gosta-berling":
    `The long lake, the mist, and the Värmland plains come before Gösta enters — in Flach’s English. At last the priest is in the pulpit, and the parish remembers him reeling out of the inn.`,
  thais:
    `Part First — The Lotus. Nile banks dense with hermits’ huts — clay, crosses, bread and hyssop after sunset — and stranger caves beyond. Further in, the novel turns to the monk Paphnutius and the courtesan Thaïs, and its desire and its irony about conversion grow stronger.`,
  "bunner-sisters":
    `Stuyvesant Square side-street; a basement shop; blotchy gold on a black sign; horse-car pace. Poverty and manners without ballroom gloss.`,
  "bread-givers":
    `Anzia Yezierska’s 1925 novel opens with potatoes to peel, Bessie home without work, and the landlord hollering for the rent. Poverty, and an Old World father.`,
  "bertha-garlan":
    `She takes the vine-path hillside with the boy, straw hat, near six o’clock. A widow’s desire.`,
  "after-the-divorce":
    `Nineteen Hundred and Seven. In the strangers’ room of the Porru house a woman sat crying. Chapter I — the courtyard cricket. Deledda, in Maria Hornor Lansdale’s English, Italian 1902 / 1905.`,
  "white-nights":
    `It was a wonderful night — the dreamer’s starry Petersburg. First Night only.`,
  "west-african-folk-tales":
    `In the olden days all the stories which men told were stories of Nyankupon, the chief of the gods. This reading is just How We Got the Name ‘Spider Tales’ — Nyankupon, Anansi, and a jar of bees. W. H. Barker and Cecilia Sinclair’s 1917 book. The other tales follow in the book.`,
  candide:
    `In a castle of Westphalia, belonging to the Baron of Thunder-ten-Tronckh, lived a youth. Chapter I — the castle, Thunder-ten-Tronckh, and Candide expelled. Voltaire’s 1759 novel.`,
  "iola-leroy":
    `"Good mornin', Bob; how's butter dis mornin'?" Chapter I — market speech, butter fresh, and the prayer-meeting. Frances E. W. Harper’s novel, 1892.`,
  "esther-waters":
    `She stood on the platform watching the receding train. Chapter I — the platform, the receding train, and a faded yellow dress. George Moore’s novel, 1894.`,
  aphrodite:
    `On the quay at Alexandria a singing-girl was standing singing. Book I, Chapter II — the quay, the flute-girls, and the white parapet. This reading begins there, after the author’s preface and the denser first chapter. Pierre Louÿs’s 1896 novel.`,
  erewhon:
    `If the reader will excuse me, I will say nothing of my antecedents. Chapter I, Waste Lands — a sheep-farm, waste crown-land, and leaving his native country. Samuel Butler’s 1872 novel.`,
  "ann-veronica":
    `One Wednesday afternoon in late September, Ann Veronica Stanley came down from London. Chapter I — the Wednesday train, Morningside Park, and a father confrontation. H. G. Wells’s 1909 novel.`,
  "the-great-hunger":
    `For sheer havoc, there is no gale like a good northwester. Chapter I — the gale, spindrift, a rocky fjord, and fisher huts. Johan Bojer’s novel, in W. J. Alexander Worster and C. Archer’s English, Norway 1916.`,
  "the-mysterious-stranger":
    `It was in 1590—winter. Austria was far away from the world, and asleep. Chapter 1 — Eseldorf. Mark Twain’s 1916 novella only.`,
  "children-of-the-frost":
    `Old Koskoosh listened greedily. This reading is just The Law of Life — Old Koskoosh, Sit-cum-to-ha, the dogs, and a camp that must be broken. Jack London’s 1902 book. The other tales follow in the book.`,
  "the-poison-tree":
    `Nagendra Natha Datta is about to travel by boat. It is the month Joisto, the time of storms. Chapter I, Nagendra’s Journey by Boat — Surja Mukhi and the boat to Calcutta. Bankim Chandra Chatterjee, in Miriam S. Knight’s English, Bengali 1873 / English 1884.`,
  cosmopolis:
    `Although the narrow stall, flooded with heaped-up books and papers, left the visitor just room enough to stir. Chapter I, A Dilettante and a Believer — Ribalta, the Place d’Espagne, and Rome. Paul Bourget’s 1892 novel.`,
  "the-woman-who-did":
    `Mrs Dewsbury’s lawn was held by those who knew it the loveliest in Surrey. Chapter I — yellow clover and the oak-clad Weald. Grant Allen’s 1895 novel.`,
  "billy-budd":
    `In the time before steamships, a stroller along the docks would notice the Handsome Sailor. This reading is just Billy Budd, Foretopman — Chapter I. Herman Melville’s 1924 novella.`,
  "malay-sketches":
    `A quarter of a century ago there lived on the bank of a broad river, just where stream meets tide, a Malay Raja and his youthful wife. This reading is just A Malay Romance — Raja Maimûnah and the stream that meets the tide. Frank Swettenham’s 1895 book. The other tales follow in the book. The colonial administration is left as printed.`,
  "cousin-betty":
    `One day, about the middle of July 1838, a carriage known as Milords was driving down the Rue de l’Université. Opening — a National Guard captain. Honoré de Balzac, in James Waring’s English, 1846.`,
  "the-sorrows-of-satan":
    `Do you know what it is to be poor? Section I — a threadbare suit and an upper-class carriage. Marie Corelli’s 1895 novel.`,
  "the-king-of-schnorrers":
    `In the days when Lord George Gordon became a Jew, and was suspected of insanity. Chapter I — Grobstock, the synagogue stream, a canvas bag, and spring sunshine. Israel Zangwill’s 1894 picaresque, the King only.`,
  hania:
    `When old Mikolai on his death-bed left Hania to my guardianship and conscience. This reading is just the Hania novella — Chapter I, a Byzantine chapel, and snow on the wind. Henryk Sienkiewicz, in Jeremiah Curtin’s English, Polish 1876 / English 1897.`,
  "the-toys-of-peace":
    `Harvey, said Eleanor Bope, handing her brother a cutting from a London morning paper. This reading is just The Toys of Peace — the National Peace Council and the peace toys. Saki’s 1919 book.`,
  "tess-of-the-durbervilles":
    `On an evening in the latter part of May a middle-aged man was walking homeward from Shaston to the village of Marlott. Phase the First, Chapter I — the Vale, Sir John, and Durbeyfield. Thomas Hardy’s 1891 novel.`,
  "captains-courageous":
    `The weather door of the smoking-room had been left open to the North Atlantic fog. Chapter I — the weather door, the fog, and the Cheyne boy. Rudyard Kipling’s 1897 novel.`,
  "numa-roumestan":
    `That Sunday was a scorching hot Sunday in July, at the yearly competitions. Chapter I, To the Arena — the amphitheatre at Aps, the July festival, and Numa. Alphonse Daudet, in Charles De Kay’s English, French 1881.`,
  dracula:
    `3 May, Bistritz. Left Munich at 8:35 in the evening. Chapter I, Harker’s Journal — Bistritz and paprika hendl. It opens in Transylvania. Bram Stoker’s 1897 novel.`,
  "the-tug-of-love":
    `When Elias Goldenberg, Belcovitch’s head cutter, betrothed himself to Fanny Fersht. This reading is just The Tug of Love — Elias, Fanny, Sugarman, and the ring. Israel Zangwill’s 1907 book.`,
  "the-house-of-the-seven-gables":
    `Halfway down a by-street of one of our New England towns stands a rusty wooden house, with seven acutely peaked gables. Chapter I, The Old Pyncheon Family — the by-street, the seven gables, and the Pyncheon Elm. Nathaniel Hawthorne’s 1851 novel.`,
  "heart-of-darkness":
    `The Nellie, a cruising yawl, swung to her anchor without a flutter of the sails. The opening — the Nellie, the Thames, and Gravesend, with the Congo after the frame. Joseph Conrad’s 1902 novel. Serialized in 1899; published as a book in 1902.`,
  "toilers-of-the-sea":
    `Christmas Day in the year 182- was somewhat remarkable in the island of Guernsey. Snow fell on that day. Part I, A Word Written on a White Page — Christmas snow, St. Peter’s Port, and Vale. Victor Hugo, in W. Moy Thomas’s English, 1866.`,
  "indian-summer":
    `Midway of the Ponte Vecchio at Florence, where three arches break the lines of the little jewellers' booths. Chapter I — the Ponte Vecchio, Colville, and the yellow Arno. William Dean Howells’s 1886 novel.`,
  "a-slav-soul":
    `The farther I go back in my memory of the past, the nearer I get to childhood. This reading is just A Slav Soul — childhood, Yasha, Matsko, and Bouton. A. I. Kuprin, in Rosa Savary Graham’s English, 1916.`,
  "cabbages-and-kings":
    `They will tell you in Anchuria, that President Miraflores, of that volatile republic, died by his own hand in the coast town of Coralio. The Proem by the Carpenter — Miraflores and the Coralio mangrove. O. Henry’s 1904 novel.`,
  "picture-of-dorian-gray":
    `The studio was filled with the rich odour of roses, and when the light summer wind stirred amidst the trees of the garden. Chapter I — studio roses, lilac, and Lord Henry’s laburnum. Oscar Wilde’s 1891 novel. First printed in a magazine in 1890; published as a book in 1891.`,
  "the-job":
    `Captain Lew Golden would have saved any foreign observer a great deal of trouble in studying America. Chapter I — Captain Lew Golden and Panama, Pennsylvania, with Una’s office after the Pennsylvania frame. Sinclair Lewis’s 1917 novel.`,
  "reign-of-greed":
    `One morning in December the steamer Tabo was laboriously ascending the tortuous course of the Pasig. Chapter I, On the Upper Deck — the Tabo, the Pasig, and La Laguna. José Rizal, in Charles E. Derbyshire’s English, 1891. First published in Spanish in 1891; this translation is from 1912.`,
  "a-cross-line":
    `The rather flat notes of a man’s voice float out into the clear air, singing the refrain of a popular music-hall ditty. This reading is just A Cross Line — a music-hall ditty, a felled tree, and spring. This reading ends with the sketch. George Egerton’s 1894 sketch.`,
  "shadow-of-the-cathedral":
    `The dawn was just rising when Gabriel Luna arrived in front of the Cathedral, but in the narrow street of Toledo it was still night. Chapter I — Gabriel Luna, the Piazza del Ayuntamiento, and del Perdon. Vicente Blasco Ibáñez, in Mrs. W. A. Gillespie’s English, 1903. First published in Spanish in 1903; this translation is from 1909.`,
  "way-of-all-flesh":
    `When I was a small boy at the beginning of the century I remember an old man who wore knee-breeches and worsted stockings. Chapter I — Pontifex, Paleham, and knee-breeches. Samuel Butler’s 1903 novel.`,
  "family-at-gilje":
    `It was a clear, cold afternoon in the mountain region. Chapter I — a cold mountain afternoon, Christmas snow, and the captain’s house. Jonas Lie, in Samuel Coffin Eastman’s English, 1883. First published in Norwegian in 1883; this translation is from 1920.`,
  resurrection:
    `Though hundreds of thousands had done their very best to disfigure the small piece of land on which they were crowded together. Chapter I — spring in the town, the prison office, and 28 April. Leo Tolstoy, in Louise Maude’s English, 1899.`,
  widdershins:
    `The three or four “To Let” boards had stood within the low paling as long as the inhabitants of the little triangular “Square” could remember. This reading is just The Beckoning Fair One — To Let boards and an old red brick square. Oliver Onions’s 1911 tale.`,
  typee:
    `Six months at sea! Yes, reader, as I live, six months out of sight of land. Chapter One — the Marquesas and Nukuheva. Herman Melville’s 1846 novel.`,
  kangaroo:
    `A bunch of workmen were lying on the grass of the park beside Macquarie Street, in the dinner hour. Chapter I — Macquarie Street, a cream taxi, and the Torestin bungalow. D. H. Lawrence’s 1923 novel.`,
  "the-mother":
    `To-night again Paul was preparing to go out, it seemed. Chapter I — Paul preparing, the wind barricade, and the orchard’s little door. Grazia Deledda, in Mary G. Steegmann’s English, 1920. First published in Italian in 1920; this translation is from 1923.`,
  "lord-arthur-saviles-crime":
    `It was Lady Windermere’s last reception before Easter, and Bentinck House was even more crowded than usual. This reading is just Lord Arthur Savile’s Crime — Lady Windermere’s last reception and Bentinck House. Oscar Wilde’s 1891 tale.`,
  "three-soldiers":
    `The company stood at attention, each man looking straight before him at the empty parade ground. Part One, I — the company, the empty parade ground, and cinder piles in a purple evening. John Dos Passos’s 1921 novel.`,
  "doctor-pascal":
    `In the heat of the glowing July afternoon, the room, with blinds carefully closed, was full of a great calm. Chapter I — July blinds and Dr. Pascal’s press papers. Émile Zola, in Mary J. Serrano’s English, 1893.`,
  "in-the-world":
    `I went out into the world as shop-boy at a fashionable boot-shop in the main street of the town. Chapter I — the shop-boy, green teeth, and watery eyes. Maksim Gorky, in Gertrude M. Foakes’s English, 1916. First published in Russian in 1916; this translation is from 1917.`,
  "leila":
    `Giovanni the footman calls Signorina from the dining-room, breathless, after the garden and the house. Chapter I, A Mystic Prelude — Signorina Leila, the chestnut grove, and Priaforà. Antonio Fogazzaro, in Mary Prichard Agnetti’s English, 1910. First published in Italian in 1910; this translation is from 1911.`,
  "charan":
    `In the days of King Sung-jong one of Korea’s noted men became governor of Pyong-an Province. This reading is just CHARAN — Pyong-an Province, the dancing girl Charan, and the Governor’s son. Im Bang and Yi Ryuk, in James S. Gale’s English, 1913.`,
  "sister-carrie":
    `When Caroline Meeber boarded the afternoon train for Chicago, her total outfit consisted of a small trunk and four dollars. Chapter I — Caroline Meeber, the afternoon train, and August 1889. Theodore Dreiser’s 1900 novel.`,
  "antic-hay":
    `Gumbril, Theodore Gumbril Junior, B.A. Oxon., sat in his oaken stall on the north side of the School Chapel. Chapter I — the oaken stall, the School Chapel, and the First Lesson. Aldous Huxley’s 1923 novel.`,
  "spring-time-case":
    `It was around the tolling of the fifth hour in the early evening that a fish monger sped into the pawn-shop of Suruga-ya. Part I — the fifth hour, the fish monger, and Suruga-ya. Jun’ichirō Tanizaki, in Z. Tamotsu Iwado’s English, 1927.`,
  "eline-vere":
    `They were close to each other in the dining-room, which had been turned into a dressing-room. Chapter I — Frédérique van Erlevoort, the mirror, and the azalea guests. Louis Couperus, in J. T. Grein’s English, 1889. First published in Dutch in 1889; this translation is from 1892.`,
  "hungry-stones":
    `My kinsman and myself were returning to Calcutta from our Puja trip when we met the man in a train. This reading is just The Hungry Stones — a Calcutta Puja train and an up-country Mahomedan. Rabindranath Tagore’s 1916 tale. The preface is several hands.`,
  smoke:
    `On the 10th of August 1862, at four o'clock in the afternoon, a great number of people were thronging before the well-known Konversation in Baden-Baden. Chapter I — the Konversation, Baden-Baden, and holiday sunshine. Ivan Turgenev, in Constance Garnett’s English, 1867. First published in Russian in 1867; this translation is from 1906.`,
  "niels-lyhne":
    `She had the black, luminous eyes of the Blid family. Chapter I — Bartholine, poetry and faith, and Lönborggaard. J. P. Jacobsen, in Hanna Astrup Larsen’s English, 1880. First published in Danish in 1880; this translation is from 1919.`,
  "the-emancipated":
    `By a window looking from Posillipo upon the Bay of Naples sat an English lady, engaged in letter-writing. Part I, Chapter I — Posillipo, a widow’s letter, and November sunlight. George Gissing’s 1890 novel. Naples is secular.`,
  germinal:
    `Over the open plain, beneath a starless sky as dark and thick as ink, a man walked alone along the highway from Marchiennes to Montsou. Part One, Chapter I — the Marchiennes–Montsou highway, a starless sky, and beetroot fields. Émile Zola, in Havelock Ellis’s English, 1885.`,
  "our-lady-of-the-pillar":
    `In 1474, a year abounding in divine favours for all Christendom, when King Henry IV. reigned in Castile, there came to live in the city of Segovia a youthful knight named Don Ruy de Cardenas. This reading is just Our Lady of the Pillar — 1474 Segovia and Don Ruy de Cardenas. This reading ends with the tale. Eça de Queirós, in Edgar Prestage’s English, 1906.`,
  kipps:
    `Until he was nearly arrived at adolescence it did not become clear to Kipps how it was that he was under the care of an aunt and uncle instead of having a father and mother like other boys. Book I, Chapter I — the New Romney little shop, an aunt and uncle, and a white-dress mother. H. G. Wells’s 1905 novel.`,
  "the-professor":
    `The other day, in looking over my papers, I found in my desk the following copy of a letter, sent by me a year since to an old school acquaintance. Chapter I, Introductory — an Eton letter and Crimsworth the outsider. Charlotte Brontë’s 1857 novel.`,
  "a-room-with-a-view":
    `"The Signora had no business to do it," said Miss Bartlett, "no business at all." Part One, Chapter I — the Bertolini, south rooms with a view, and a Cockney accent. E. M. Forster’s 1908 novel.`,
  "martin-eden":
    `The one opened the door with a latch-key and went in, followed by a young fellow who awkwardly removed his cap. Chapter I — a latch-key hall, sea-smacked rough clothes, and a rolling gait. Jack London’s 1909 novel.`,
  "madame-heurtebise":
    `She was certainly not intended for an artist's wife, above all for such an artist as this outrageous fellow. This reading is just Madame Heurtebise — a jeweller’s-shop wife and the poet Heurtebise. Alphonse Daudet, in Laura Ensor’s English, 1874.`,
  "une-vie":
    `The weather was most distressing. It had rained all night. Chapter I, The Home by the Sea — Jeanne free of the convent, rain gutters, and an 1819 calendar. Guy de Maupassant, in Albert M. C. McMaster and A. E. Henderson’s English, 1883.`,
  "my-antonia":
    `I first heard of Ántonia on what seemed to me an interminable journey across the great midland plain of North America. Book I, Chapter I — the midland plain, Jake Marpole, and Nebraska grandparents. Willa Cather’s 1918 novel.`,
  "look-back-on-happiness":
    `I have gone to the forest. Chapter I — the forest, overfed success, and a hair-shirt. Knut Hamsun, in Paula Wiking’s English, 1912.`,
  "father-of-yoto":
    `Sweet human hearts—a tale of carnival, moon-haunted nights. This reading is just The Father of Yoto — Marigold Vassiloff, Tai Ling, and West India Dock Road. Thomas Burke’s 1916 sketch.`,
  "crime-and-punishment":
    `On an exceptionally hot evening early in July a young man came out of the garret in which he lodged in S. Place and walked slowly, as though in hesitation, towards K. bridge. Part One, Chapter I — a hot July garret, the landlady’s kitchen, and K. bridge. Fyodor Dostoevsky, in Constance Garnett’s English, 1866.`,
  "uncle-silas":
    `It was winter--that is, about the second week in November--and great gusts were rattling at the windows, and wailing and thundering among our tall trees and ivied chimneys. Chapter I — Austin Ruthyn of Knowl, a winter fire, and ivied chimneys. Joseph Sheridan Le Fanu’s 1864 novel.`,
  "rise-of-david-levinsky":
    `Sometimes, when I think of my past in a superficial, casual way, the metamorphosis I have gone through strikes me as nothing short of a miracle. Book I, Chapter I — four cents, the cloak-and-suit trade, and a metamorphosis. Abraham Cahan’s 1917 novel.`,
  "for-the-term-of-his-natural-life":
    `In the breathless stillness of a tropical afternoon, when the air was hot and heavy, and the sky brazen and cloudless, the shadow of the Malabar lay solitary on the surface of the glittering sea. Book I, Chapter I, The Prison Ship — the Malabar in the tropics, and a poop-deck awning. Marcus Clarke’s 1874 novel.`,
  "bottle-imp":
    `There was a man of the Island of Hawaii, whom I shall call Keawe; for the truth is, he still lives, and his name must be kept secret. This reading is just The Bottle Imp — Keawe in Hawaii, Honaunau, and the Hamakua coast. Robert Louis Stevenson’s 1893 tale.`,
  "death-in-venice":
    `On a spring afternoon of the year 19--, when our continent lay under such threatening weather for whole months, Gustav Aschenbach, or von Aschenbach as his name read officially after his fiftieth birthday, had left his apartment on the Prinzregentenstrasse in Munich and had gone for a long walk. Chapter I — a spring afternoon, the Prinzregentenstrasse, and Aschenbach. Thomas Mann, in Kenneth Burke’s English, 1912.`,
  "elmer-gantry":
    `Elmer Gantry was drunk. He was eloquently drunk, lovingly and pugnaciously drunk. He leaned against the bar of the Old Home Sample Room, the most gilded and urbane saloon in Cato, Missouri. Chapter I — Cato, Missouri, the Old Home Sample Room, and a man eloquently drunk. Sinclair Lewis’s 1927 novel.`,
  "colonels-dream":
    `Two gentlemen were seated, one March morning in 189--, in the private office of French and Company, Limited, on lower Broadway. Chapter One — Broadway, French and Company, and an electric clock, then Clarendon in the South. Charles W. Chesnutt’s 1905 novel.`,
  "hard-times":
    `'NOW, what I want is, Facts. Teach these boys and girls nothing but Facts. Facts alone are wanted in life. Book the First, Chapter I, The One Thing Needful — a Facts school-room and Gradgrind. Charles Dickens’s 1854 novel.`,
  "great-god-pan":
    `"I am glad you came, Clarke; very glad indeed. I was not sure you could spare the time." This reading is just The Great God Pan — Clarke and the Experiment. This reading ends with the novella. Arthur Machen’s 1894 novella.`,
  "manalive":
    `A wind sprang high in the west, like a wave of unreasonable happiness, and tore eastward across England, trailing with it the frosty scent of forests and the cold intoxication of the sea. Part I, Chapter I — a great wind, unreasonable happiness, and Beacon House. G. K. Chesterton’s 1912 novel.`,
  "captain-blood":
    `Peter Blood, bachelor of medicine and several other things besides, smoked a pipe and tended the geraniums boxed on the sill of his window above Water Lane in the town of Bridgewater. Chapter I, The Messenger — Bridgewater, Water Lane, and geraniums. Rafael Sabatini’s 1922 novel.`,
  "the-monomaniac":
    `Roubaud, on entering the room, placed the loaf, the pâté, and the bottle of white wine on the table. Chapter I — Roubaud, the Impasse d’Amsterdam, and a station window. Émile Zola, in Edward Vizetelly’s English, 1890.`,
  "tartarin-de-tarascon":
    `Although it is now some twelve or fifteen years since my first meeting with Tartarin de Tarascon, the memory of the encounter remains as fresh as if it had been yesterday. Chapter 1 — a Tarascon villa on the Avignon road, and an exotic garden. Alphonse Daudet, in Oliver C. Colt’s English, 1872.`,
  "the-time-machine":
    `The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us. This reading is just The Time Machine — the Time Traveller, a fire, and silver lilies. It opens at the Introduction. This reading ends with the novel. H. G. Wells’s 1895 novel.`,
  "prisoner-of-zenda":
    `"I wonder when in the world you're going to do anything, Rudolf?" said my brother's wife. Chapter 1 — a Rassendyll breakfast, Elphberg hair, and doing nothing. Anthony Hope’s 1894 novel.`,
  "kidnapped":
    `I will begin the story of my adventures with a certain morning early in the month of June, the year of grace 1751, when I took the key for the last time out of the door of my father's house. Chapter I — Essendean, a June morning, a key, and the House of Shaws. Robert Louis Stevenson’s 1886 novel.`,
  "revolt-of-the-angels":
    `Beneath the shadow of St. Sulpice the ancient mansion of the d'Esparvieu family rears its austere three stories between a moss-grown fore-court and a garden hemmed in, as the years have elapsed, by ever loftier and more intrusive buildings, wherein, nevertheless, two tall chestnut trees still lift their withered heads. Chapter I — the d’Esparvieu mansion and chestnut trees. Anatole France, in Emilie Jackson’s English, 1914.`,
  "children-of-the-soil":
    `It was the first hour after midnight when Pan Stanislav Polanyetski was approaching the residence in Kremen. Chapter I — Kremen, a July midnight mist, and Pan Stanislav. Henryk Sienkiewicz, in Jeremiah Curtin’s English, 1895.`,
  "the-invisible-man":
    `The stranger came early in February, one wintry day, through a biting wind and a driving snow, the last snowfall of the year, over the down, walking from Bramblehurst railway station, and carrying a little black portmanteau in his thickly gloved hand. This reading is just The Invisible Man — the Coach and Horses, and Bramblehurst snow. It opens at Chapter I. H. G. Wells’s 1897 novel.`,
  "the-village-in-the-jungle":
    `The village was called Beddagama, which means the village in the jungle. Chapter I — Beddagama, Ceylon. A katty is a chopping knife, a kind of billhook, used to cut back the undergrowth, and a chena is a patch of jungle cleared, burned and sown for a season’s crop. Be warned that this is a violent book with a grim ending. W.’ if the phone is tight. Leonard Woolf’s 1913 novel. Fortune’s Maggot.`,
  "the-joy-of-captain-ribot":
    `In Malaga they cook it not at all badly; in Vigo better yet; in Bilbao I have eaten it deliciously seasoned on more than one occasion. Chapter I — the Gijón wharf, with Valencia to come. Armando Palacio Valdés, in Minna Caroline Smith’s English, 1900.`,
  "saracinesca":
    `The hour was six o'clock, and the rooms of the Embassy were as full as they were likely to be that day. Chapter II — the Embassy rooms, Rome. F. Marion Crawford’s 1887 novel. Reputation, marriage, and gossip in Roman high society.`,
  "the-torrents-of-spring":
    `… At two o'clock in the night he had gone back to his study. The frame, then Chapter I — the summer of 1840, in Frankfort. Ivan Turgenev, in Constance Garnett’s English, 1897. This is The Torrents of Spring only. It ends at preparing to go to America. First Love is not in this book, and Mumu is not in this book.`,
  "the-bet":
    `It was a dark autumn night. This reading is just The Bet — a banker’s house and garden lodge. No city is named. This reading stops at the fireproof safe. Anton Chekhov, in Constance Garnett’s English.`,
  "the-bitter-tea-of-general-yen":
    `Megan, drawing her chair over to the window, saw that the rain had given an air of transience to the solid Chinese earth. Chapter I — a rainy road by the French Concession, Shanghai. Grace Zaring Stone’s 1930 novel. A heads-up before you start: this is a 1930 novel and it sounds like one. The word “coolie” turns up often, and one American character uses a racial slur in dialogue. The book also looks at China and at General Yen through a Western, Orientalist lens, which is partly what the story is about and partly its own blind spot.`,
  "the-woman-of-andros":
    `The earth sighed as it turned in its course; the shadow of night crept gradually along the Mediterranean, and Asia was left in darkness. Section I — nightfall over the Mediterranean, Brynos. It opens at Section I. Thornton Wilder’s 1930 novel. The eight sections are unnumbered in print and labelled Section I–VIII here.`,
  "bella-donna":
    `Doctor Meyer Isaacson had got on as only a modern Jew whose home is London can get on, with a rapidity that was alarming. Chapter I — Doctor Meyer Isaacson, London, with Egypt to come from Chapter XI. Robert Hichens’s 1908 novel. Two things to know going in. The very first sentence sums Dr. Isaacson up as “a modern Jew” who has got on in London, the kind of sweeping generalization about Jewish people that was common in 1908, even about a character the book admires. Once the story reaches Egypt, Baroudi and the Egyptians around him are painted in a heavily Orientalist way: exotic, sensual, and menacing. Both are the book’s attitudes.`,
  "nina-balatka":
    `Nina Balatka was a maiden of Prague, born of Christian parents, and herself a Christian—but she loved a Jew; and this is her story. Volume I, Chapter I — the Kleinseite, Prague. Anthony Trollope’s 1866 novel. A note on what you are about to read: prejudice against Jews is the subject, not the backdrop. Nina’s family and neighbours say ugly things about Anton and his people, openly and often. Those are the characters’ voices; the narrator is on the lovers’ side.`,
  "la-lupa":
    `She was tall and lean; but she had a firm, full bust, and yet she was no longer young. This reading is just La Lupa — harvest fields under Etna, and the village that calls her the she-wolf. This reading stops when Nanni stammers. Giovanni Verga, in Nathan Haskell Dole’s English. It ends on an axe, so save it for unwinding or a walk rather than the last thing before sleep.`,
  "a-farewell-to-arms":
    `In the late summer of that year we lived in a house in a village that looked across the river and the plain to the mountains. Book I, Chapters I and II — a village across the river from the mountains, on the Italian front. Ernest Hemingway’s 1929 novel. A heads-up before you start: the soldiers’ banter includes ethnic slurs for Italians, and Frederic uses a racial slur once, late in the book. Those are the book’s 1929 voices.`,
  "alice-adams":
    `The patient, an old-fashioned man, thought the nurse made a mistake in keeping both of the windows open, and her sprightly disregard of his protests added something to his hatred of her. Chapter I — Virgil Adams’s sleepless night in a smoky Midwestern city; Alice comes in with Chapter II. Booth Tarkington’s 1921 novel. A heads-up before you start: this is a 1921 novel and it uses the period’s racial language, including an old slur for Black people a few times, and a scene at the dance leans on a stereotype of the Black cloakroom staff. Those are the book’s attitudes.`,
  "quartet":
    `It was about half-past five on an October afternoon when Marya Zelli came out of the Café Lavenue, which is a dignified and comparatively expensive establishment on the Boulevard du Montparnasse. Chapter One — the Café Lavenue and the Boulevard du Montparnasse, Paris. The R. C. It opens at Chapter One. Jean Rhys’s 1928 novel, first published as Postures. Before you start: this is a bleak book about a stranded woman kept inside a cruel triangle. It carries the period’s antisemitic phrasing, in the narration and in dialogue, and one racial slur. Those are the book’s 1928 voices.`,
  "song-of-songs-sudermann":
    `Lilly was fourteen years old when her father, Kilian Czepanek, the music-master, suddenly disappeared. Part I, Chapter I — the music-master’s flight, in a garrison town in eastern Germany. Hermann Sudermann, in Thomas Seltzer’s English. The chapters are labelled Part I and Part II, because the numbering starts again. A few things to know going in: it is frank, for its day, about seduction, adultery, and a woman kept by one man after another, and it carries the period’s antisemitic phrasing and one racial slur in a story someone tells. Those are the book’s attitudes.`,
  "its-wavering-image":
    `Pan was a half white, half Chinese girl. This reading is just “Its Wavering Image” — Chinatown, San Francisco, from her father’s bazaar on Dupont Street to a high room open to the stars. This reading stops when Pan is comforted. Sui Sin Far’s 1912 story, from Mrs. Spring Fragrance. A light note: the story uses the words of its time, “half white, half Chinese”, and frames Chinatown as picturesque and quaint the way the white reporter sees it; the story is on Pan’s side. This is not the title story, Mrs. Spring Fragrance.`,
  "java-head":
    `Very late indeed in May, but early in the morning, Laurel Ammidon lay in bed considering two widely different aspects of chairs. Section I — Laurel Ammidon and the chairs, on a May morning in Salem. It opens at Section I and stops at her piano scales. Joseph Hergesheimer’s 1918 novel. A heads-up before you start: it carries the period’s slurs and labels for Chinese people, one racial slur in a character’s speech, and Orientalist framing of Taou Yuen, and the ending turns on opium. Those are the book’s 1918 voices.`,
  "sunshine-sketches-of-a-little-town":
    `I don't know whether you know Mariposa. Ch ONE: The Hostelry of Mr. Smith — the town, the lake and the Mariposa Belle, until the summer visitors go. Leacock’s own Preface comes first in the book; this reading opens at Chapter One. Stephen Leacock’s 1912 book. Each chapter carries its sketch title, and each sketch stands on its own. A light heads-up: a few period phrases date it, a passing line about Black performers and some “Indian” relics and jokes. Those are the book’s 1912 voices.`,
  "guest-the-one-eyed":
    `Snow, snow, snow! Book I, Chapter I — Christmas snow on the heights above Borg, and a poor man coming home with an empty sack. Gunnar Gunnarsson, in W. W. Worster’s English. The chapters are labelled by Book, because each Book starts again at Chapter I. A few things to know going in: it is a long saga, about nine hours, over two generations of one farm, with a Copenhagen strand; the thee and thou are only in prayers and scripture.`,
  "the-blind-musician":
    `At the hour of midnight, in a wealthy family living in the southwestern part of Russia, a child was born. Chapter I, sections I to III — a birth at midnight on a country estate, and a mother who notices first. Vladimir Korolenko, in Aline Delano’s English. Chapters and their sections were both numbered I, II, III in print, so they are labelled chapter and section. The text says “the southwestern part of Russia”; the country is the Ukraine, and a note names Volynia. A quiet book, with its century’s tender, sometimes sentimental view of blindness.`,
  "magnolia-flower":
    `The brook laughed and sang. This reading is just “Magnolia Flower” — a brook, the St. Johns River by moonlight, and the story the river tells. This reading stops when the river welcomes the old couple back. Zora Neale Hurston’s 1925 story, from The Spokesman. A heads-up: the men speak in dialect and use a colorism slur, and there is violence at home and a threatened hanging. It ends gently, so it suits unwinding.`,
  "in-the-mountains":
    `I want to be quiet now. July 22nd to July 29th — a woman climbs back alone to her chalet in the Swiss mountains after the war years, to be quiet. It opens at the first entry. Elizabeth von Arnim’s 1920 book, a diary of 71 dated entries, each headed by its date. Grief with wit, and easy going.`,
  "the-two-countesses":
    `The shooting season is over; all our guests have left the castle; we are as dull as ditch water, and I at length have time to write to you, dear Nesti. Countess Muschi’s first two letters, from Sebenberg Castle in November 1882 — a Swabian count is coming, and she is expected to marry him. Muschi’s six letters come first, then Countess Paula’s memoirs, which turn into a diary, then an epilogue. “Milias res” is Muschi’s own Latin. A light, quick comedy of the marriage market.`,
  "el-ombu":
    `This history of a house that had been was told in the shade, one summer's day, by Nicandro, that old man to whom we all loved to listen, since he could remember and properly narrate the life of every person he had known in his native place, near to the lake of Chascomus, on the southern pampas of Buenos Ayres. El Ombú, part I — an old gaucho begins the history of one house on the pampas and the people under its great ombú tree. Four tales and an appendix: El Ombú, Story of a Piebald Horse, Niño Diablo and Marta Riquelme, then Hudson’s appendix to El Ombú. The book’s own numbering of the parts skips V. A heads-up before you start: El Ombú includes a frontier massacre of an Indigenous camp, told plainly by a soldier who took part, and the tales use the period’s words for Indigenous people. Those are the book’s 1902 voices.`,
  "halil-the-pedlar":
    `Time out of mind, for hundreds and hundreds of years, the struggle between the Shiites and the Sunnites has divided the Moslem World. Chapter I, The Pedlar — the old quarrel of Shiites and Sunnites, and a stranger led through the lanes of Stambul after dark. Mór Jókai, in R. Nisbet Bain’s English. Thirteen chapters, each with its own title. A heads-up before you start: harem and eunuch scenes, the Orientalist framing of its day, a character’s scornful line about Jews, and executions in Chapter VII, “Tulip-Bulbs and Human Heads”. Those are the book’s voices.`,
  "the-white-sand-path":
    `I was a devil of a scapegrace in my time. This reading is just “The White Sand-Path” — a boy shut in the loft for his mischief watches the sand road from the window until the path looks like a life. This reading stops when he is never shut up again. From The Path of Life. A light heads-up: his father beats him with birch rods and a poker, and the boy tells it as bravado. It ends quietly, so it suits bedtime.`,
  "liliecronas-home":
    "On Christmas Day, 1880, a pitiless storm raged over Lövsjö (Green Lake) District in Värmland. Chapter I, The Storm-Wind — on Christmas Day a stubborn girl from a Värmland croft drags her mother and brother through a gale toward the parsonage feast. The book starts at Chapter I. Eighteen chapters, each with its own title. A household saga of a pastor, his daughter, a stepmother and the fiddler Liliecrona’s home, told by a storyteller who talks straight to you.",
  "doctor-luke-of-the-labrador":
    "A cluster of islands, lying off the cape, made the shelter of our harbour. Chapter I, Our Harbour — three islands and a cape shelter a Labrador outport that its folk love because they know no kinder land. Twenty-eight chapters, each with its own title: a boy’s memory of his mother, old Skipper Tommy’s fairy tales, and the doctor who comes off the mail boat and stays. The outport talk is left as printed. Very easy, with sea weather all through.",
  "morrina":
    "A heads-up before you start: the son seduces the maid, and the book ends with her implied suicide. A Madrid flat in the 1880s: a doting mother, her student son, and the homesick Galician maid who comes to serve them. Pardo Bazán tells it with worldly irony.",
  "a-happy-boy":
    "His name was Oyvind, and he cried when he was born. Chapter I — Oyvind is born in a cotter’s house under a cliff, with a goat on the roof, and meets Marit on the hill. Bjørnstjerne Bjørnson wrote it in 1859–60; this is Rasmus B. Anderson’s English of 1881. Twelve chapters. A cotter’s son earns his way toward a proud farmer’s granddaughter.",
  "the-desjardins":
    "Just at the foot of the hill, where the bridge crossed the Blanche, stood one of the oldest houses in Viger. This reading is just “The Desjardins” — in the oldest house in Viger, a brother stands up at supper and says he is the Great Napoleon, and his brother and sister decide to be the last of their race. This reading stops at his winter preparations for the invasion of Russia. From In the Village of Viger. His madness is treated with tenderness, and it ends quietly, so it suits bedtime.",
  "gone-to-earth":
    `Small feckless clouds were hurried across the vast untroubled sky—shepherdless, futile, imponderable—and were torn to fragments on the fangs of the mountains, so ending their ephemeral adventures with nothing of their fugitive existence left but a few tears. Chapter 1 — clouds blow over the Welsh border hills, and a half-wild girl, Hazel Woodus, runs through the woods with her tame fox. A heads-up before you start: the squire Reddin pursues Hazel sexually, there is blood sport all through, and the book ends in a fox-hunt tragedy. Thirty-six chapters. The hill-country talk is left as printed. Hazel is pulled between a gentle minister and the hard squire, and the countryside is lush and strange.`,
  "the-real-charlotte":
    `An August Sunday afternoon in the north side of Dublin. Chapter I — an August Sunday in the hot, empty streets of north Dublin, where a young girl, Francie Fitzpatrick, is about to be noticed. Fifty-one chapters. The Irish talk is left as printed. Francie comes to the lake town of Lismoyle, and her cousin Charlotte Mullen, plain and clever, has plans of her own. Sharp comedy that darkens slowly.`,
  "pembroke":
    `At half-past six o'clock on Sunday night Barnabas came out of his bedroom. Chapter I — on a Sunday night Barnabas Thayer sets out to court Charlotte Barnard, and her father is waiting with politics. A heads-up before you start: later in the book a sick boy, Ephraim, dies after his mother beats him. Fourteen chapters. The Yankee village talk is left as printed. A whole New England village of stubborn, proud people, told with a dry, patient eye.`,
  "the-argonauts":
    `It was the mansion of a millionaire. Chapter I — a millionaire’s mansion glimmers like a pearl shell, and its owner, Aloysius Darvid, has come home after three years away. Eleven chapters. Period language is left as printed. The first reading is under ten minutes and stops before a young sculptor comes up to Darvid’s table. A man who has built a fortune by iron toil has no time left for his wife and children.`,
  "at-the-roadside-station":
    `It was early spring when I went to the bungalow. This reading is just “At the Roadside Station” — a man spends early spring at a bungalow by a small railway station, and watches the trains come and go and a bored gendarme on the platform. This reading stops at “He was so terribly bored....” From The Little Angel, and Other Stories. Quiet, odd and a little uneasy, so it suits bedtime.`,
  "the-will-to-live":
    `From the summit of the hill the voice of Mr. Francis Roquevillard came down to the grape-gatherers, who, ranged along the vines on the hillside, were lightening the stalks of their dark fruit. Part I, Chapter I — the grape harvest at La Vigie, the Roquevillard vineyard above Chambéry, and the head of the family calling down to the pickers. A heads-up before you start: the son elopes with a married woman, and he is charged with theft. The first reading starts on the vintage. Three parts, eighteen chapters. An old Savoy family stakes its name, its land and its savings on one son. Warm and clear, and very French.`,
  "doom-castle":
    `It was an afternoon in autumn, with a sound of wintry breakers on the shore, the tall woods copper-colour, the thickets dishevelled, and the nuts, in the corries of Ardkinglas, the braes of Ardno, dropping upon bracken burned to gold. Chapter I — an autumn afternoon on the Argyll shore, and Count Victor, a Frenchman from Paris, rides alone into the silent Highland glens. The first reading runs on into Chapter II and stops in the wood, as he hears the thicket break again behind him. Forty-one chapters. The Scots talk and the Gaelic and French words are left as printed. A crumbling castle full of secrets, and a spy plot round the Duke of Argyll. A chase with wry comedy in the middle of it.`,
  "mayflower":
    `The morning of that day—it was a Tuesday of the Lenten season—could not have dawned more promisingly. Chapter I — a Lenten Tuesday morning on the beach of the Cabanal, the fishermen’s quarter of Valencia. A heads-up before you start: the first chapter shows a drowned body, a man beats his wife, and there are deaths at sea. Ten chapters. A widow turns the boat that drowned her husband into a tavern, and her two sons go two different ways. Loud, sunny and salty.`,
  "susan-proudleigh":
    `“I know I ’ave enemies,” said Susan bitterly; “I know I am hated in this low neighbourhood. Book I, Chapter I — in a Kingston lane, proud Susan Proudleigh knows her neighbours are against her. A note on period language: the book is full of the colour and class hierarchy of its day, and it uses the word ‘Chinaman’. It is left as printed. Three books, twenty-six chapters. The Jamaican Creole talk is left as printed. Susan loses her young man and sails for Colón and the Panama Canal works. Ironic and fond.`,
  "the-peat-moor":
    `High over the heathery wastes flew a wise old raven. This reading is just “The Peat Moor” — a wise old raven flies west to the last wild peat moor on the Norwegian coast, to dig up a sow’s ear he buried long ago. This reading stops at “…to unearth a sow’s ear which it had buried.” From Tales of Two Countries, translated by William Archer. Wry and a little sad, and it ends gently, so it suits bedtime.`,
  "life-and-death-of-harriett-frean":
    `“Pussycat, Pussycat, where have you been?” Chapter I — a nursery rhyme, a small girl on her father’s knee, and a mother who teaches her that behaving beautifully is everything. The first reading runs on into Chapter II and stops after Harriett’s little talk about God and Jesus, before the walk down Black’s Lane. Fifteen short chapters, a whole life in about an hour and three quarters. Harriett gives up the man she loves to her best friend, and lives on the credit of it. Sharp and sad, and the easiest read here.`,
  "farewell-love":
    `Motionless under the white coverlet of her bed, Anna appeared to have been sleeping soundly for the past two hours. Part I, Chapter I — a winter night in Naples, and Anna creeps past her sleeping sister to meet Giustino on the terrace. A heads-up before you start: the passion is obsessive, and at the end Anna shoots herself, shown directly. The first chapter is one long night talk, so the first reading stops just before it, as Giustino leaps the terrace wall. Two parts, twelve chapters. Anna loves without measure: first a man who answers with duty, then the cool, older husband she marries. Fast and hot.`,
  "the-son-of-his-mother":
    `The husband and wife were of a literary turn of mind, and as they had the money to cultivate their artistic tastes he wrote a little and she painted. Book I, Chapter I — a comfortable, childless Berlin couple, and a summer of travel that ends high in the Swiss Alps. A heads-up before you start: the son dies of an illness in the last chapter. Three books, eighteen chapters. They adopt a poor moor-woman’s baby, and the book asks whether love can outweigh blood as the boy grows up wilful. Clear and warm.`,
  "my-lady-nobody":
    `It was a white-hot July morning. Part I, Chapter I — a white-hot July morning in Horstwyk, a Dutch village, and the pastor and his daughter Ursula. A heads-up before you start: once, the aristocrats talk about Jews in a period stereotype; Part III follows the colonial war in Aceh; and a suicide attempt over debt is reported. It is left as printed. The first reading starts on the July morning and runs into Chapter II, the Dominé’s own story, stopping as his old soldiers fall asleep again. Three parts, forty-nine chapters; long. The chapter titles are in sentence case. Ursula is drawn into the manor family next door, and a dutiful marriage turns into a long misunderstanding. Ironic and fond.`,
  "new-years-night":
    `It was dark enough for anything in Dead Man's Gap—a round, warm, close darkness, in which retreating sounds seemed to be cut off suddenly at a distance of a hundred yards or so, instead of growing faint and fainter, and dying away, to strike the ear once or twice again—and after minutes, it might seem—with startling distinctness, before being finally lost in the distance, as it is on clear, frosty nights. This reading is just “New Year’s Night” — a stifling New Year’s Eve on a lonely selection at Dead Man’s Gap, a husband fiddling alone, and a wife who breaks down. This reading stops as the storm rolls off and the stars come out; the story ends at “…the bright New Year’s Night twenty years ago.” From Over the Sliprails. The bush talk is left as printed. Warm, and it ends gently, so it suits bedtime.`,
  "the-old-house":
    `It was evening. Chapter I — a winter evening, a coach through the snow at the excise barrier, and old Christopher Ulwing, the master builder, coming home from Vienna to sleeping Pest. A heads-up before you start: there is a brief episode in the 1849 siege, when Pest is shelled and a minor character is shot. The first reading stops in his house, as the housekeeper sails off into the dark corridor, before the talk of his rival Münster’s ruin. Nineteen chapters. A carpenter builds himself, and the house that outlives him, into a town that grows into Budapest. Three generations, money and class, in short, clear scenes.`,
  "the-sworn-brothers":
    `In the red light of the fire in the midst of the hall, the age-browned pillars of the high-seat stood forth strongly lit in the middle of the main wall, against the background of smoky darkness which spread behind. Book I, Chapter I — a winter night by the hall fire on the Dalsfjord, young Ingolf among the carved gods, and his father in the high seat. A heads-up before you start: there is Viking feud violence, outlawry, and pagan sacrifice. The first reading stops in the quiet hall, just before his kinsman Rodmar and Leif come stamping in. Three books, thirty-six chapters. Two foster-brothers, grave Ingolf and mocking Leif, are driven out of Norway to settle an empty Iceland. A saga told as a modern novel, plain and quick.`,
  "dusty-answer":
    `When Judith was eighteen, she saw that the house next door, empty for years, was getting ready again. Part one, Chapter 1 — the house next door by the river coming back to life, and Judith remembering the cousins who dropped over the peach-tree wall. A heads-up before you start: one cousin’s death in the war is told offstage; a same-sex attachment is handled delicately; and the period term ‘half-caste’ appears once. The first reading stops at the first section break, after an autumn game of hide-and-seek. Five parts. Judith loves the family next door one by one, and then, at Cambridge, bold, careless Jennifer. Lyrical and close-up.`,
  "christine-of-the-hills":
    `We had been sailing for some hours with no word between us, but Barbarossa woke up as the yacht went about under the lee of the promontory, and with a lordly sweep of his brown-burnt arms he indicated the place. The Prologue — an English yacht among the Dalmatian islands, a white pavilion on the shore, and old Barbarossa promising the story of Christine. A heads-up before you start: there is a shooting, there are whippings, and a predatory guardian, not shown explicitly. The first reading is the whole Prologue. A prologue and twenty-five chapters. Barbarossa’s thee and thou are left as printed. A vagrant hill-girl becomes a great lady, told over a week of dinners by a garrulous boatman. Fast and sunlit.`,
  "the-story-of-a-woman":
    `Now Dokhio, the Father of Durga, was wroth because Shiva, to whom he had given his daughter in marriage, though he had the reputation of a God, was as poor as any beggar. This reading is just “The Story of a Woman” — on a zenana rooftop in Bengal at the cow-dust hour, the women retell how Durga defied Shiva, and quarrel over how the story ends. This reading is the whole story, from the myth through the asterisk break to the rooftop at dusk, ending “…was what she said.” From Between the Twilights. Warm and sly, and it ends quietly, so it suits bedtime.`,
  "daughters-of-men":
    `The Austrian embassy at Athens was more largely and more brilliantly attended than usual. Chapter I — a winter ball at the Austrian embassy in Athens, ministers, princes, archaeologists and a poet, and among them a fair, pale young stranger from an old Austrian castle, shy and utterly alone. The first reading ends on the portrait of that young man, “ready to sink with shame the instant a strange woman looked at him,” before anyone asks who he is. A heads-up before you start: the characters voice national prejudices, including one line calling the Greeks “worse than the Jews”, and there is a comic duel. Thirty-two chapters. Athenian society seen by an Irishwoman with a sharp, fond eye: dowries, a pianist, a ridiculous duel, and a Turk in disguise who loves a Greek girl on Tenos. Worldly and ironic.`,
  "the-bright-shawl":
    `When Howard Gage had gone, his mother's brother sat with his head bowed in frowning thought. The opening — an old man alone after his nephew’s visit, music from next door, and Havana in the 1860s coming back to him: his friend Andrés, the dancer La Clavel, her shawl. The first reading is the first printed section, ending “…like Andalusia incarnate.” A heads-up before you start: there are executions and firing squads, and period race language in the characters’ and the narrator’s voices. No chapters: the book’s own section breaks divide it, untitled. A young American in the Cuban independence underground, a dancer, and the Spanish garrison. Short and painterly.`,
  "irresolute-catherine":
    `A dull patter of sheep's hurrying feet came from behind a small knoll that jutted into the track along the mountain. Chapter I, Bethesda — a flock coming down the mountain track, a shepherd on horseback, and below, by the river, a chapel congregation gathering for an open-air baptism. The first reading stops on Charles Saunders, Catherine’s new suitor, and his jealousy of the shepherd, before the hymn begins. Six chapters, each head printed once. The hill speech is left as printed. A maidservant jilted at her own baptism turns toward the shepherd she was afraid of. Clean, quick and visual, a little over two hours.`,
  "the-old-room":
    `The room looks out upon the square, which is so big and so fashionable that there is no business done in it. Chapter I — a great house set back from a fashionable square, an old room in it that no one enters, and the man who keeps it: Cordt, whose wife is Fru Adelheid. The first reading is Chapter I whole. A heads-up before you start: there is frank talk of infidelity, a thought of murder-suicide, and the son’s suicide at the end. Two parts, Cordt and Cordt’s son, twenty-four chapters. A marriage talked through in a secret room, then the son’s life in the same room. Very easy to read, adult and frank.`,
  "the-fur-coat":
    `It was a cold winter that year. This reading is just “The Fur Coat” — Christmas Eve, a poor, ailing doctor borrows his rich friend’s fur coat, and in the dark hall at home his wife kisses him, thinking he is the friend. This reading is the whole story, through its three printed breaks, ending “…the last seconds of happiness I have known in my life.” From Modern Swedish Masterpieces. Rueful and quiet, and it ends by the fire, so it suits bedtime.`,
  "the-corsican-brothers":
    `In the beginning of March, 1841, I was travelling in Corsica. Chapter I — a French traveller rides from Sartène into Sullacaro, a hill village whose walls are marked with bullets, and asks hospitality at the house of Madame Savilia de Franchi. The first reading is Chapter I whole, ending on an invitation to idleness: “…one of the most agreeable which can be extended to a traveller.” A heads-up before you start: there is vendetta talk, two pistol duels (not graphic), and a ghost. Twenty chapters. A widowed mother and her twin sons, bound by a sympathy that crosses the sea; the second half moves to Paris. Brisk and charming, and only gently uncanny.`,
  "jocelyn":
    `A light laugh came floating into the sunshine through the green shutters of a room in the Hôtel Milano. Part I, Chapter I — a laugh through the shutters of a hotel room at Mentone, and Giles Legard, ten years married to an invalid, facing a naked fact on the terrace; then the drift of his life so far. The first reading ends on that history: “…but of work, nothing; of love—nothing!” A heads-up before you start: the love story is an adultery, and the wife dies of a morphia overdose, with suicide suspected. Galsworthy’s first novel, published under the name John Sinjohn. Three parts and twenty-eight chapters. Hotel terraces, the casino at Monte Carlo and the yachts: a reserved Englishman, his ailing wife and her young friend. Worldly and quietly intense.`,
  "the-woman-of-knockaloe":
    `Knockaloe is a large farm on the west of the Isle of Man, a little to the south of the fishing town of Peel. The First Chapter — the farm above Peel, old Robert Craine and his daughter Mona, the war coming to the island, and Mona’s fury at the news from Belgium. The first reading is the First Chapter whole, ending on the old man’s “You’re hard, woman, you’re hard.” A heads-up before you start: it ends in a double suicide; the characters voice wartime hatred (“Boche”, “Huns”); and she is called “Harlot” and “Strumpet”. Sixteen chapters and a Conclusion, told in the present tense. A Manx farm girl and a German internee from the real Knockaloe camp, and the island turning on them both. Stark and fast, a parable against war.`,
  "the-taking-of-the-redoubt":
    `A military friend of mine, who died of a fever in Greece a few years ago, told me one day about the first action in which he took part. This reading is just “The Taking of the Redoubt” — a young officer’s first battle, from the red moon rising behind the redoubt to the charge. This reading is the whole story, ending “Finished, my boy, but the redoubt is taken!” and the date the story carries, 1829. A heads-up before you start: there is battle violence, and one graphic sentence about a death. From Prosper Mérimée’s Short Stories. Sober and unsentimental, for the evening rather than for sleep.`,
  "the-man-in-the-brown-suit":
    `Nadina, the Russian dancer who had taken Paris by storm, swayed to the sound of the applause, bowed and bowed again. The Prologue — Paris, a Russian dancer at the height of her fame, and a low-voiced talk in her dressing-room about the man who has organized crime as another man might organize a business. The first reading is the Prologue whole, ending on “As a matter of fact, he happens to be my husband.” A heads-up before you start: there is a strangling, inquest talk of suicide, and a violent strike on the Rand. A Prologue and thirty-six chapters, mostly in Anne Beddingfeld’s own voice. An orphan with no money and a taste for adventure sees a man fall to his death in the Tube and follows one clue to a liner bound for Cape Town. Quick, funny and lively; an early thriller rather than a puzzle.`,
  "wang-the-ninth":
    `Wang the Ninth was born a few years before the end of the nineteenth century in a village called prosaically in the vernacular Ten Li Hamlet because it lay ten li or Chinese miles from the great imperial highway. Chapter I — Ten Li Hamlet in a famine year, a family with too many children, and a wheelbarrow pushed towards the city. The first reading is Chapter I whole, ending “…the father seizing the handles of the wheelbarrow pushed clumsily on.” A heads-up before you start: there is famine, children are sold, and the narrator makes period generalizations about “all Chinese”. Twenty-eight chapters. An eighth child (the Ninth is a nickname), left at three at the gate of the capital, grows up quick-witted and stubborn in the streets and ends up running messages for a red-bearded foreigner when war comes. Sharp, unsentimental and often funny.`,
  "garram-the-hunter":
    `Garram stopped silently in midstride and listened. Chapter I — a hill boy and his dog on the trail of a leopard in the dry grass, and a hunt that ends with one stroke of a knife. The first reading is Chapter I whole, ending “…half sorry for his fine opponent, then turned to the work on hand.” A heads-up before you start: there are slave raids, and one line about a living slave built into a pillar. Twenty-three titled chapters. Garram and Kon, his clever dog, go from leopard hunts to Yelwa, the walled Fulani city of the plains, where an Emir’s court, a royal hunt and a traitor are waiting, before the slave raiders come for the Hills. A fast adventure, full of tracking, tricks and village talk.`,
  "his-dead-wifes-photograph":
    `This story created a sensation when it was first told. This reading is just “His Dead Wife’s Photograph” — a clerk who dabbles in photography takes a picture of a colleague’s family, and there is one more figure on the plate than there should be. This reading is the whole story, with the narrator’s own opening and one printed break, ending “…nevertheless an art worth learning.” A heads-up before you start: a wife and baby die in childbirth. From Indian Ghost Stories. Plain, wistful and only gently uncanny, for the evening rather than for sleep.`,
  "the-face-in-the-abyss":
    `It has been just three years since I met Nicholas Graydon in the little Andean village of Chupan, high on the eastern slopes of the Peruvian uplands. Chapter I — an inn in the Andean village of Chupan, a fevered American raving of dreadful things, a gold bracelet of a snake-woman held up by four dinosaurs, and the traveller who stays to nurse him and hear his story. The first reading is Chapter I whole, ending “…since only so may a full measure of judgment of that story be gained.” A heads-up before you start: three of the narrator's companions die, one man is strangled, and a child is threatened with a whip. The book also uses the period terms 'half-breeds' and 'Indian hell-brew', left as printed. Nine chapters. Treasure-hunters follow an Inca trail into a hidden valley of the Cordillera, where a vast stone face waits in the abyss. A fast, colourful lost-world romance.`,
  "mary-magdalen":
    `“Three to one on Scarlet!” Chapter I — the chariot races in the new circus at Tiberias, Herod Antipas and Herodias in the tribune, Mary of Magdala admired from every tier, and Judas watching her. The first reading is Chapter I whole, ending on Judas's aside: “…it would be the birthday of my life.” A heads-up before you start: chariot drivers are killed in the opening race, John the Baptist is later beheaded, and the crucifixion is told. One early line calls a city crowd a 'mongrel rabble', left as printed. Ten chapters. The Gospel story told from the court of Antipas and the house at Magdala, jewelled, sardonic and adult; it follows Mary to the cross and the empty tomb.`,
  "the-hoop":
    `A woman was taking her morning stroll in a lonely suburban street; a boy of four was with her. This reading is just “The Hoop” — an old factory hand, a small boy's bright new hoop, and an old barrel hoop played with in secret in the woods. This reading is the whole story, in seven short sections, ending “…his beloved mother had followed him with her eyes.” A heads-up before you start: the old man at the heart of this story dies at the end, quietly. From The Old House and Other Tales. Tender and quiet, for the evening rather than for sleep.`,
  "love-s-shadow":
    `'There's only one thing I must really implore you, Edith,' said Bruce anxiously. 'Don't make me late at the office!' Chapter I — breakfast in a very new, very small, very white flat in Knightsbridge, Bruce Ottley fussing over a letter and his spelling while Edith humours him, then Hyacinth Verney, an orphaned heiress, talking over Cecil Reeve with her companion Anne. The first reading is Chapter I whole, ending “…with disapproving, admiring eyes.” A heads-up before you start: much later in the book, a fancy-dress scene uses a period slur for a costume, left as printed. Thirty-nine short chapters. A quick, dry Edwardian comedy of marriage and manners, told almost entirely in talk.`,
  "lewis-and-irene":
    `"Fifteen," said Lewis. Part One, Chapter I — the funeral of Monsieur Vandémanque at Père Lachaise, a young financier counting beards in the pews for a game, and the boardroom coup that killed the old banker. The first reading is Part One, Chapter I whole, ending “…phosphates, oxygen).” A heads-up before you start: an old banker dies of shock in the opening pages, a suicide is reported later, and there is gossip about 'Jewish blood'. Part Two makes sweeping racial claims about Greek bankers, describes 'big black satyrs' grunting like pigs, and prints the word 'negro' twice, all left as printed. Three parts, 44 short chapters. Lewis meets Irene, of a Greek banking house, over a deal for Sicilian mines, and love turns into a contest between two fortunes. Glittering, cynical and epigrammatic.`,
  "a-monkey":
    `Yes, it was really a monkey that had nearly procured me 'Laudabilis' in my final law examination. This reading is just “A Monkey” — a law student the night before his final examination, a coffee-stain drawn into a monkey on page 496 of Schweigaard's Process, creaking inspectors' boots and a paper that bears on exactly that page. This reading is the whole story, with one printed break, ending “'A monkey!' I replied.” A heads-up before you start: this is one long comic monologue of exam-night nerves, with four short translator notes on the grading set in as you go. From Norse Tales and Sketches. Light and comic, for the evening rather than for sleep.`,
  "wedding-day":
    `Wedding-day. It was curiously unreal. This reading is just “Wedding-Day” — on the morning of his wedding Bert looks in the glass, sees forty years of breakfasts and the eight-thirteen to town ahead, and cuts off his moustache while the cab waits. This reading is the whole story, ending ‘The forty years began.’ A heads-up before you start: no hazards; an uncle's death is mentioned only for the legacy that made the wedding possible. From The Street of the Eye and nine other tales. Dry and comic, for the evening rather than for sleep. The story names no place.`,
  "the-taoist-priest-of-lao-shan":
    `There lived in our village a Mr. Wang, the seventh son in an old family. This reading is just “The Taoist Priest of Lao-shan” — Wang goes to Lao-shan to learn immortality, chops wood for months, learns only how to walk through walls, brags at home, and runs into the bricks. This reading is the whole story, ending “cursed the old priest for his base ingratitude.” From Strange Stories from a Chinese Studio. Tart and comic, for the evening rather than for sleep.`,
  "elysium":
    `The Triad came into my life as I walked underneath the arch by which the sentinels sit in Olympian state upon their rather long-legged chargers, receiving, as is their due, the silent homage of the passing nurserymaids. This reading is just “Elysium” — a soldier just back from the Flanders front walks home through St. James's with his sweetheart on one arm and his sister on the other, past the clubs and two old colonels on the steps, wrapped apart from the whole world. This reading is the whole sketch, ending “for five long days.” A heads-up before you start: the First World War sits just behind this story. The soldier is home from the front in Flanders on five days' leave. From Brought Forward. Quiet and tender, for the last minutes before sleep. Pall Mall, London.`,
  "the-golden-age":
    `“Alarums and Excursions” is one complete story from The Golden Age — on a hot June day three children are playing at knights in the orchard when a troop of soldiers jingles past the hedge, and the narrator and his little brother Harold chase it across country, sure a battle lies ahead. It ends “…to the fact that the battle had been postponed.” A heads-up before you start: on the way the narrator tells Harold that Indians scalp and burn their prisoners, a schoolboy notion of the period, left as printed; and the boys get lost in the rain before the old doctor drives them home. Bright and comic, made for walking. An English village and the fields beyond it.`,
  "zanzibar-tales":
    `Once upon a time Kee'ma, the monkey, and Pa'pa, the shark, became great friends. This reading is just The Monkey, the Shark, and the Washerman’s Donkey — a great tree by the sea, a shark, and a ride through the water. George W. Bateman’s 1901 book. The other tales follow in the book.`,
  "the-dancing-master":
    `“The Dancing-Master” is one complete story from Parisian Points of View — asked by a hostess to engage old Morin, a dancing-master, for her little girls, a guest goes behind the scenes at the opera one February night in 1881, finds him on stage as a bishop in “The Prophet,” and in the wings gets an earnest lecture on why France needs more dancing. It ends “…withstood the shock of this avalanche of dancers.” A heads-up before you start: the old teacher talks frankly, in the manner of his day, about sizing up a partner's figure while waltzing. Amused and brisk, for a walk. Paris.`,
  "winnie-the-pooh":
    `Edward Bear, known to his friends as Winnie-the-Pooh, or Pooh for short, was walking through the forest one day, humming proudly to himself. “In Which Pooh Goes Visiting and Gets into a Tight Place” is one complete chapter from Winnie-the-Pooh — after morning Stoutness Exercises and a brand-new hum, Pooh calls on Rabbit, stays for honey, and finds the front door a little tight on the way out. It ends “…Silly old Bear!” Bright and comic, made for waking. The forest.`,
  "the-mist":
    `The sun had just set. This reading is just “The Mist” — after sunset, mist rises over a quiet village meadow and tells a night-flower how he is dew, cloud, and spring-water in turn, until morning blows him into a dew-drop and the sun laughs. This reading is the whole story, ending “You’re right enough there!” said the sun. And he laughed. From The Spider and Other Tales. Quiet and gently comic, for the last minutes before sleep. The glade.`,
  "the-fresco":
    `In the Great Highway of Eternal Fixity, Mong Flowing-spring and his friend Choo Little-lotus were slowly walking, clothed in the long light green dress of the students. This reading is just “The Fresco” — two successful students lose themselves in the lanes of Pekin, enter a temple of the Mysterious-way, and Mong Flowing-spring follows a goddess who steps out of a fresco. This reading is the whole story, ending “Love has touched her. She has become a woman and is waiting for you in your village.” From Strange Stories from the Lodge of Leisures. Soft and magical, for the last minutes before sleep.`,
  "the-green-carnation":
    `He slipped a green carnation into his evening coat and looked at himself in the Piccadilly glass — a Burne-Jones angel a little weary of its own life. It opens at Chapter I. Hichens’s 1894 novel. The coded desire is left as printed.`,
  "hajji-baba":
    `Kerbelai Hassan, barber of Ispahan, and the razor that starts the road. It opens at Chapter I. First published in 1824. Period Orientalism is left as printed.`,
  "the-purple-land":
    `“Three chapters in the story of my life…” opens the frame into the Banda Oriental. Hudson’s 1885 novel. Guerrilla and gaucho country.`,
  "the-master-of-ballantrae":
    `The full truth of this odd matter — Durrisdeer in 1745, and the heir who should ride by his King’s bridle. It opens at Chapter I. Stevenson’s 1889 novel.`,
  "a-set-of-six":
    `One tale only: Gaspar Ruiz. A revolutionary war raises strange characters, and this reading stops while the detachment is still running. It does not open The Informer. Conrad’s 1908 set.`,
  "the-hill-of-dreams":
    `There was a glow in the sky as if great furnace doors were opened. Lucian Taylor goes out to lose himself on the Gwent hill lane. Machen’s 1907 novel. The opening stays in Gwent; London comes later.`,
  "the-story-of-an-african-farm":
    `The full African moon poured down its light from the blue sky into the wide, lonely plain. It opens at Part I, Chapter I. Schreiner’s 1883 novel, first issued as Ralph Iron.`,
  "the-imperialist":
    `It would have been idle to inquire into the antecedents of old Mother Beggarlegs. It opens at Chapter I. Duncan’s 1904 novel, Elgin, Ontario.`,
  kim:
    `He sat, in defiance of municipal orders, astride the gun Zam Zammah opposite the Wonder House, as the natives call the Lahore Museum. It opens at Chapter I. Kipling’s 1901 novel. “Half-caste” and “burned black as any native” are period racial language, left as printed.`,
  "mogens-and-other-stories":
    `Summer it was, in the middle of the day, in a corner of the enclosure. This reading is just part of Mogens; the whole novella is too long for one sitting. Jacobsen, in Grabow’s 1921 English of the 1882 Danish.`,
  "the-road-to-the-open":
    `George von Wergenthin sat at table quite alone to-day. The empty chair at the top of the table, and the September sun through the open window. It opens at Chapter I. Schnitzler’s novel, Horace Samuel’s English, German 1908 / English 1913.`,
  calvary:
    `I was born one evening in October at Saint-Michel-les-Hêtres, a small town in the department of Orne. This reading stays in the Orne and the Tourouvre forest. Mirbeau, Louis Rich’s English, French 1886 / 1922. The novel continues.`,
  "anna-of-the-five-towns":
    `The yard was all silent and empty under the burning afternoon heat. Chapter I, The Kindling of Love — the Sunday-school yard and the prize-books. Bennett’s 1902 novel.`,
  "small-souls":
    `It was pouring with rain, and Dorine van Lowe dropped in on Karel and Cateau with a wet umbrella. It opens at Chapter I. Couperus, Teixeira’s English, Dutch 1901 / 1914.`,
  "stories-and-pictures":
    `Down here, in this world, Bontzye Shweig’s death made no impression at all. This reading is just Bontzye Shweig. Peretz, Helena Frank’s English, Yiddish 1894 / 1906.`,
  "white-jacket":
    `It was not a very white jacket, but white enough. Chapter I, The Jacket — Callao, and a US frigate bound for Cape Horn. Melville’s 1850 novel.`,
  "a-japanese-nightingale":
    `The last rays of sunset were tingeing the land above the bay. Chapter I, The Storm Dance — a tea-house island. Eaton’s 1901 novel, published as Onoto Watanna.`,
  "maria-chapdelaine":
    `The door opened, and the men of the congregation began to come out of the church at Peribonka. Chapter I — April snow on the church steps. Hémon, in Blake’s English, French 1913 / 1921.`,
  "the-house-by-the-medlar-tree":
    `Once the Malavoglia were as numerous as the stones on the old road to Trezza. Chapter I — Padron ’Ntoni and the Provvidenza. Verga, in Mary A. Craig’s English, Italian 1881 / 1890.`,
  "filipino-popular-tales":
    `There was once an old woman who had an only son named Suan. This reading is just Suan’s Good Luck. Fansler’s 1921 collection. The other tales follow in the book.`,
  "the-marrow-of-tradition":
    `Stay here beside her, major. Chapter I, At Break of Day — a Wilmington sickroom, the heat, a cicada, magnolias. Chesnutt’s 1901 novel.`,
  "zuleika-dobson":
    `That old bell, presage of a train, had just sounded through Oxford station. Chapter I — undergraduates on the platform, and the Warden of Judas. Beerbohm’s 1911 novel.`,
  "eugenie-grandet":
    `There are houses in certain provincial towns whose aspect inspires melancholy. Section I — Saumur’s steep street and the Grandet house. Balzac, in Katharine Prescott Wormeley’s English, French 1833.`,
  "seven-brothers":
    `Jukola Farm, in the south of the province of Häme, stands on the northern slope of a hill, near the village of Toukola. Chapter I. Kivi, in Alex Matson’s English, Finnish 1870 / 1929.`,
  "laos-folk-lore":
    `Deep in the forest of the North there is a large village of jungle people. This reading is just A Child of The Woods. Fleeson’s 1899 collection. The other tales follow in the book.`,
  "born-in-exile":
    `The summer day in 1874 which closed the annual session of Whitelaw College. Part I, Chapter I — the Kingsmill statue and the smoke-canopy. Gissing’s 1892 novel.`,
  "the-four-horsemen-of-the-apocalypse":
    `In 1870 Marcelo Desnoyers was nineteen years old. Chapter II, Madariaga, the Centaur — Buenos Aires and the ranch. Blasco Ibáñez, in Charlotte Brewster Jordan’s English, Spanish 1916 / 1918.`,
  "virgin-soil":
    `At one o’clock in the afternoon of a spring day in the year 1868, a young man climbs the back staircase on Officers Street. Section I. Turgenev, in R. S. Townsend’s English, Russian 1877.`,
  "lolly-willowes":
    `When her father died, Laura Willowes went to live in London. Caroline’s spare-room negotiation — eiderdown, bureau — lands on “Of course, you will come to us.” Chapter I only.`,
  "brazilian-tales":
    `One tale only: The Fortune-Teller. Rita explains Camillo with Hamlet’s line, then the cards on Guarda-Velha Street. This reading ends with that tale; it does not open The Attendant's Confession. Later tales in the volume use period racial language, left as printed.`,
  "the-house-of-mirth":
    `Grand Central, a Monday in early September—the afternoon rush, the heat, the crowd. Lawrence Selden notices Lily Bart standing apart from it all, vivid against the dull tints of the station. Edith Wharton’s 1905 New York novel begins with a chance meeting that doesn’t feel accidental.`,
  carmilla:
    `A lonely schloss in Styria. A teenage narrator with too few neighbors. And a childhood night she still can’t forget—a pretty face at the bedside, then a pain like needles. Sheridan Le Fanu’s gothic novella (serialized 1871–72; collected 1872) opens on solitude and that first fright, before any carriage has rolled in.`,
  "hungry-hearts":
    `My heart chokes in me like in a prison. This reading is just Wings — a janitor’s basement on a May Sunday. Yezierska’s 1920 collection. The other tales follow in the book.`,
  "the-sport-of-the-gods":
    `Fiction has said so much in regret of the old days when there were plantations and overseers and masters and slaves. Chapter I, The Hamiltons — the Berry cottage, the Oakley mansion, and a butler’s dignity. This reading stops before the New York chapters. Dunbar’s 1902 novel. The book continues north.`,
  ramuntcho:
    `The sad curlews, annunciators of the autumn, had just appeared in a mass in a gray squall. Part I, Chapter I — the Bidassoa, the moss path, and rope soles. Loti, in Henri Pene du Bois’s English, French 1897.`,
  "the-pit":
    `At eight o’clock in the inner vestibule of the Auditorium Theatre, Laura Dearborn waits. Chapter I — a Chicago February draught. Norris’s 1903 novel.`,
  reginald:
    `I did it—I who should have known better. This reading is just the title sketch — the McKillop garden-party. Saki’s 1904 book. The other sketches follow in the book.`,
  "royal-highness":
    `The scene is the Albrechtstrasse, the main artery of the capital, at noon. A general and a lieutenant in grey great-coats. It opens at the Prelude. Thomas Mann, in A. Cecil Curtis’s English. German 1909, Curtis English 1916.`,
  ramona:
    `It was sheep-shearing time in Southern California, but sheep-shearing was late at the Senora Moreno’s. Chapter I — the Senora, Felipe, and the Mission ranch. Helen Hunt Jackson’s 1884 novel.`,
  "almayers-folly":
    `Kaspar! Makan! Chapter I — the verandah, Pantai at sunset, and a decaying house. Joseph Conrad’s 1895 novel.`,
  "the-crux":
    `The Foote Girls were bustling along Margate Street. Chapter I, The Back Way — Do come on, Rebecca, and the Lane white house. It opens in New England before Colorado. Charlotte Perkins Gilman’s 1911 novel.`,
  "the-black-dog":
    `Having pocketed his fare, the freckled rustic takes the old cab back to the village. This reading is just the title tale — the one-eyed porter, July noon, Loughlin. A. E. Coppard’s 1923 book. The other tales follow in the book.`,
  "daisy-miller":
    `At the little town of Vevey, in Switzerland, there is a particularly comfortable hotel. Opening — lake hotels, Winterbourne, and the American tourist climate. It opens in Vevey; Rome comes later in the book. Henry James’s 1878 novella.`,
  "south-wind":
    `The bishop was feeling rather sea-sick. Chapter I — Bampopo in Africa, then the approach to Nepenthe. Norman Douglas’s 1917 novel.`,
  "the-village":
    `The great-grandfather of the Krasoffs, called the Gipsy, was hunted with wolf-hounds. Chapter I — Captain Durnovo and Durnovka. Ivan Bunin, in Isabel Florence Hapgood’s English. Russian 1910, Secker English 1923.`,
  "ditte-girl-alive":
    `It has always been considered a sign of good birth to count one’s ancestors for centuries back. Chapter I, Ditte’s Family Tree — Ditte Child o’ Man stood at the top of the tree. Martin Andersen Nexø, in Asta and Rowland Kenney’s English. Danish 1917, Holt English 1920.`,
  "flappers-and-philosophers":
    `After dark on Saturday night one could stand on the first tee of the golf-course. This reading is just Bernice Bobs Her Hair — yellow club windows and the wicker balcony. F. Scott Fitzgerald’s 1920 book. The other tales follow in the book.`,
  "in-our-time":
    `A drunk battery on a dark road—then a Michigan lake at dawn, and Nick Adams in a rowboat with his father. Ernest Hemingway’s 1925 American collection opens with a war vignette snapped against “Indian Camp”: spare sentences, long silences, the method already underway.`,
  botchan:
    `A Tokyo kid who cannot fake manners jumps from a school window on a dare, then takes a knife to his own thumb to prove the blade is sharp. Natsume Sōseki’s 1906 novel opens on that hereditary recklessness — and the scar that will be there until his death.`,
  "nacha-regules":
    "An August night — Buenos Aires ablaze for the Centennial. Gálvez, in Ongley’s English, includes cabaret sex-work and violence; this is not a light romance.",
  krakatit:
    "With the evening the fog of the cold, damp day grew thicker on the Old Town embankment — then suddenly a pair of penetrating eyes fixed on him. This reading stops before the Krakatit-box takes over. The novel continues.",
  "the-peasants":
    "Agatha and the priest on the autumn road — “Praised be Jesus Christ!” Dziewicki’s English of the Autumn volume. Expect village poverty, Catholic period speech, and a Jewish ragpicker on the road, with the period’s ethnic language left as printed.",
  "a-hungarian-nabob":
    "Rain on the puszta, 1822 — Peter Bús’s “Break-’em-tear-’em” csárda. Bain’s English. Hungarian class satire, with period ethnic vocabulary left as printed.",
  "an-iceland-fisherman":
    "Five Breton seamen drink in a bilge-water cabin. Cambon’s English. Rough marriage talk and sea-labor desire.",
  "the-song-of-the-blood-red-flower":
    "A strawberry song and the girls’ ring — the Gazelle chase. Logger eros runs under the village dance, and the chase is frankly sensual.",
  "irish-fairy-tales":
    "Finnian of Moville goes after the disapproved gods, and meets Tuan mac Cairill. Chapter I only — it ends when Time laughs at Tuan. Christian and pagan clash, with the “magician” framing.",
  blacker:
    "Emma Lou on her “luscious black complexion,” and the family that trained her to mourn it — a Harlem novel of colorism. The period language of color hierarchy within the community is the book itself, left as printed.",
  "a-lost-lady":
    "Sweet Water, one of the grey towns along the Burlington railroad, and a house known from Omaha to Denver for its hospitality. Willa Cather’s 1923 novel is Niel’s memory of Marian Forrester when the frontier ethos dies into money.",
  "lady-macbeth":
    "Katerina Lvovna is bored in her rich father-in-law’s empty house in Mtsensk. Chamot’s 1923 English. An adultery and murder novella.",
  summer:
    "Charity Royall stands on the doorstep of North Dormer’s one street, in the Berkshires, at the beginning of a June afternoon. Edith Wharton’s 1917 novel opens on a village that lies high and in the open, without the lavish shade of more sheltered towns.",
  "jacob-s-room":
    "Betty Flanders writing in the sand — Cornwall, then the room that will be Jacob’s. The experimental voice is the point of this reading.",
  "the-tenant-of-wildfell-hall":
    "“You must go back with me to the autumn of 1827” — Gilbert Markham’s Yorkshire frame. A long novel.",
  herland:
    "The narrator writes from memory the journey into a country of women. An idea-led utopia.",
  "the-last-man":
    "Sea-surrounded England, and the narrator’s ruined lineage — a plague and exile epic. Heavy; better for a later reading.",
  "the-wanderer":
    "He arrived at our home on a Sunday of November, 189… — Sainte-Agathe, and the schoolhouse that is no longer theirs. Delisle’s 1928 English. The year’s ellipsis is the book’s own.",
  "the-cabala":
    "The train that first carried me into Rome was late, across the Campagna in a Virgilian sigh, and this reading stops when the air of Naples generates legend. Wilder’s 1926 novel. The compartment comedy comes after.",
  "reuben-sachs":
    "Reuben Sachs was the pride of his family. His mother, safe in her investments, says he must marry money. It opens at Chapter I. Levy’s 1888 London.",
  "the-sun-also-rises":
    "Robert Cohn was once middleweight boxing champion of Princeton. Spider Kelly flattens his nose, and this reading stops there. Hemingway’s 1926 novel reopens into the Paris café.",
  "the-man-of-property":
    "Those privileged to be present at a family festival of the Forsytes have seen an upper middle-class family in full plumage. This reading runs through Aunt Ann’s grey hat. Galsworthy’s 1906 novel, Volume 1 only.",
  "theresa-raquin":
    "The Arcade of the Pont Neuf is a damp corridor of dumpy shops. It opens at Chapter I. Vizetelly’s English of Zola’s 1867 novel continues.",
  "trooper-peter-halket-of-mashonaland":
    "A dark night on a Mashonaland kopje, Trooper Peter Halket’s fire quivering, a burnt kraal already in the dark. It opens at Chapter I. Schreiner’s 1897 novella keeps the Chartered Company frame, left as printed.",
  "the-late-mattia-pascal":
    "One of the few things he was sure of was his name: Mattia Pascal — the library at Miragno. Livingston’s 1923 English. Comic self-narration.",
  basilio:
    "Lisbon breakfast, the cuckoo-clock strikes eleven, and Luiza reads that Cousin Bazilio is coming home. Serrano’s 1889 English is abridged and bowdlerized. Adultery and household power. Sit with it as Dragon’s Teeth.",
  oblomov:
    "Oblomov in bed on Gorokhovaya Street with a dreaded letter from his estate. Hogarth’s English, abridged. Expect serf-era master and servant (Zakhar, *barin*) and period class language, left as printed.",
  "the-lady-with-the-dog-and-other-stories":
    "Gurov at Yalta sees the lady in the *béret*. This reading is just the title story, Chapter I — Garnett’s English. Gurov’s contempt for women (“the lower race”) is period misogyny, left as printed.",
  zeno:
    "Zeno’s first cigarettes and the last-cigarette habit, in Trieste. De Zoete’s English. Comic self-deception.",
  "the-book-of-khalid":
    "Baalbek’s ruins, the bazaar, and the donkey-boy Khalid. Rihani wrote it in English. Opens at Chapter II. Expect Ottoman and imperial politics (“Time and the Turks,” the Kaiser pilfering temples) and self-Orientalizing irony, left as printed.",
  cane:
    "Karintha: her skin is like dusk on the eastern horizon. This reading is just Karintha — the later Georgia sketches come in later readings.",
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
      "eves-ransom",
      "fraternity",
      "royal-highness",
      "the-great-hunger",
      "the-patrician",
      "the-price-of-love",
      "the-private-papers-of-henry-ryecroft",
      "unhuman-tour-kusamakura",
      "the-octopus",
      "the-red-and-the-black",
      "st-peter-s-umbrella",
      "caesar-or-nothing",
      "the-complete-original-short-stories",
      "the-cabin",
      "pan-tadeusz",
      "the-red-laugh",
      "before-adam",
      "niels",
      "marianela",
      "an-iceland-fisherman",
      "aphrodite",
      "on-the-eve",
      "piping-hot",
      "ramuntcho",
      "the-fortune-of-the-rougons",
      "the-paying-guest",
      "the-triumph-of-death",
      "the-witch-and-other-stories",
      "watch-and-ward",
      "bay-a-book-of-poems",
      "black-spirits-and-white-a-book-of-ghost-stories",
      "fir-flower-tablets",
      "hugh-selwyn-mauberley",
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
      // Mira Mon 5 Oct 2026 mid Ritual — The Fresco is the Host-only story and sits here only (never unwind / on-a-walk). Never Featured, no Next.
      "the-fresco",
      // Mira Tue 6 Oct 2026 PM — The Mist: one story from The Spider and Other Tales; before-sleep only.
      "the-mist",
      // Mira Thu 8 Oct 2026 MID — Zanzibar Tales also sits here: the same tale, the whole of it. Before-sleep and unwind.
      "zanzibar-tales",
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
      // Mira Tue 6 Oct 2026 MID — Winnie-the-Pooh: Chapter II is the waking reading (whole chapter). Waking-up only.
      "winnie-the-pooh",
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
      // Mira Mon 5 Oct 2026 PM Ritual — The Taoist Priest of Lao-shan is the Host-only story and sits here only (never before-sleep / on-a-walk). Never Featured, no Next.
      "the-taoist-priest-of-lao-shan",
      // Mira Thu 8 Oct 2026 MID — Zanzibar Tales: The Monkey, the Shark, and the Washerman's Donkey is the reading (whole tale). Unwind and before-sleep; never Next or Featured.
      "zanzibar-tales",
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
      // Mira Tue 6 Oct 2026 — The Golden Age: Alarums and Excursions is the walk reading (whole story). On-a-walk only.
      "the-golden-age",
      // Mira Wed 7 Oct 2026 MID — The Dancing-Master: one story from Parisian Points of View (Halévy). On-a-walk only; never Next or Featured.
      "the-dancing-master",
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
  "the-taoist-priest-of-lao-shan": 6,
  "elysium": 5,
  "the-fresco": 5,
  "the-mist": 9,
  "winnie-the-pooh": 7,
  "the-golden-age": 9,
  "zanzibar-tales": 7,
  "the-dancing-master": 10,
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
  "eves-ransom": 5,
  "fraternity": 5,
  "hania": 5,
  "indian-summer": 6,
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
  "the-octopus": 5,
  "the-red-and-the-black": 5,
  "st-peter-s-umbrella": 5,
  "caesar-or-nothing": 5,
  "the-complete-original-short-stories": 5,
  "the-cabin": 5,
  "pan-tadeusz": 5,
  "the-red-laugh": 5,
  "before-adam": 5,
  "niels": 5,
  "marianela": 5,
  "an-iceland-fisherman": 5,
  "aphrodite": 10,
  candide: 4,
  "iola-leroy": 8,
  "esther-waters": 6,
  "on-the-eve": 5,
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
  "watch-and-ward": 5,
  "bay-a-book-of-poems": 5,
  "black-spirits-and-white-a-book-of-ghost-stories": 5,
  "fir-flower-tablets": 5,
  "hugh-selwyn-mauberley": 5,
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
  return RITUAL_PITCHES[canonicalWorkId(id)];
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
