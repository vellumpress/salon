import { splitSentences } from "../sentences.ts";
import { PITCHES } from "./pitches.ts";
import { RITUAL_PITCHES, ritualPitchFor } from "./rituals.ts";
import { shelfWork, type ShelfForm, type ShelfWork } from "./shelf.ts";

const MIN_BLURB = 24;

/** Homepage one-sentence synopses. Overrides pitch/ritual/intro when present. */
const BLURBS: Record<string, string> = {
  basilio:
    "Lisbon breakfast: the cuckoo-clock strikes eleven, and Luiza reads that Cousin Bazilio is coming home.",
  vengeance:
    "Asch’s Yiddish theater of desire and shame: a house of pleasure that wants respectability while the room keeps score.",
  naomi:
    "In Tokyo, a husband remakes a young woman into the Western ideal he cannot stop wanting.",
  odessa:
    "Babel’s Black Sea city: gangsters, sun, and sudden violence between jokes.",
  we: "D-503 will straighten the wild curve into the wisest of lines, and call the record We.",
  "all-quiet-on-the-western-front":
    "A rest billet five miles behind the front opens on beef and haricot beans, and the war is not softened.",
  demian:
    "Two worlds pass through a little-town Latin school — clean clothes and Christmas on one pole, secrecy on the other.",
  "the-story-of-gosta-berling":
    "The long lake and the Värmland mist come before Gösta; the priest is later in the pulpit.",
  thais:
    "Part First — The Lotus opens on Nile hermits in clay huts, before the turn toward Paphnutius and Alexandria.",
  manhattan: "Dos Passos cuts New York as montage: arrivals, ads, and lives slicing across each other.",
  tropic:
    "Drought only: the eleven o’clock whistle, a white hillside quarry, and Coggins Rum.",
  berlin:
    "Berlin talks through Franz Biberkopf after prison — noise, politics, and fate in Döblin’s street choir.",
  passing:
    "Larsen’s two women, one secret, and the color line drawn through friendship.",
  quicksand:
    "Eight in the evening in Naxos: Helga Crane sits alone and will not open the door.",
  "enchanted-april":
    "February rain on Shaftesbury Avenue: Mrs. Wilkins finds a Times notice for an Italian castle to let for April.",
  "mr-fortunes-maggot":
    "One convert in three years on Fanua—and the Reverend Timothy Fortune is not flustered.",
  "attendants-confession":
    "A marked man offers a human document—and asks you not to publish it until he’s dead.",
  rashomon:
    "Evening under Rashōmon—one lackey waiting out the rain, and no one else in the gate.",
  "high-wind-jamaica":
    "After Emancipation, Derby Hill is swallowed by bush until a rank plant holds the front door open, and the reading runs on to Ferndale.",
  "noli-me-tangere":
    "Capitan Tiago announces a dinner in Binondo — Chapter I only, with the friars’ colonial power on the page.",
  vera:
    "Cornwall noon heat at a garden gate: a daughter who has lost everything—and feels nothing yet.",
  "on-a-chinese-screen":
    "She takes a holy temple and papers it into Cheltenham—blue curtains for her eyes, pink stripes, an American stove where the Buddha sat.",
  futility:
    "The Simbirsk vanishes toward Shanghai, and the hotel room still has a dirty table-cloth.",
  "trooper-peter-halket":
    "Alone on a kopje with a fire that only quivers—Trooper Peter Halket has lost his column, and the dark starts inventing fortunes for him.",
  "the-home-and-the-world":
    "A daughter furious with her mirror, and a mother’s vermilion mark that still shames vanity.",
  "the-hidden-force":
    "A blood-red moon over the Lange Laan, and the Residency waiting at the end of it.",
  hunger: "A man starves in a Christiania attic while the clock below strikes six.",
  "where-angels-fear-to-tread":
    "Charing Cross chaos — Lilia laughing like royalty while Philip names Monteriano, and the reading stops on the foot-warmer.",
  "the-gadfly":
    "Pisa seminary heat, a lost sermon page, and Fragola called down the street — Risorgimento Italy.",
  "the-immoralist":
    "Faithful friends summoned to a distant house — Michel can free himself; he cannot yet say what freedom is for.",
  "letters-of-a-javanese-princess":
    "Letter I only: the modern girl, and the cloistered arms that still hold her.",
  "blood-and-sand":
    "Gallardo’s bullfight-day breakfast, and the bullring gore is not softened.",
  ecstasy:
    "After dinner on the Scheveningen Road: rosewood, an onyx lamp, and a promise not to wake the boy.",
  "an-outcast-of-the-islands":
    "A short excursion off the straight path — neatly done, quickly forgotten — before the islands close in.",
  "the-underdogs":
    "A dog barking in the sierra, tortillas, a rifle under the mat, and hoofbeats in the quarry.",
  "diary-of-a-chambermaid":
    "Twelfth place in two years: a rainy September, a Figaro ad, and no interview with Madame.",
  "the-painted-veil":
    "A shuttered Hong Kong room after tiffin; Kitty whispers Walter, and the reading stays in Chapter I.",
  "the-good-soldier":
    "This is the saddest story: nine seasons with the Ashburnhams at Nauheim.",
  "growth-of-the-soil":
    "Red-beard Isak carries the first sack up the long moor road. Worster’s English; the period word Lapp stays named for Sámi herders.",
  "nada-the-lily":
    "You ask for the youth of Umslopogaas — Haggard’s late-Victorian imperial romance, not a substitute for Zulu-authored history.",
  gold:
    "Michael Gold’s Lower East Side childhood: tenements, hunger, and a street that never lets a boy stay innocent.",
  bovary:
    "Provincial longing, debt, and the romance novels that ruin a life.",
  anna: "Passion against the grain of society — and the train that waits at the end.",
  underground:
    "A spiteful man talks himself into a corner and will not leave.",
  "a-room-with-a-view":
    "Miss Bartlett says the Signora had no business to give them anything but south rooms with a view.",
  "liza-of-lambeth":
    "A factory girl in Lambeth learns how little the street forgives.",
  banjo:
    "Lincoln Agrippa Daily patrols the Marseilles breakwater with a banjo — McKay’s 1929 beach-boy dialect and the Ditch stay as written.",
  "in-our-time":
    "Nick Adams stories with war vignettes snapped in like news photos — Hemingway’s early cuts.",
  cheri:
    "Léa’s wrought-iron bed and the pearls Chéri wants, in Flanner’s English.",
  liliom:
    "A carousel barker, a cheap room, and a day-pass from the dead — Molnár’s rough tenderness.",
  "the-cherry-orchard":
    "A Russian estate in blossom — Chekhov’s family cannot keep the orchard they still call home.",
  "on-the-seaboard":
    "A fishing boat lay one May evening to beam-wind, out on Goosestone bay, while Rokarna were changing to blue.",
  marianela:
    "The sun had set, and after the brief interval of twilight the night fell calm and dark as the traveller went on into the north of Spain.",
  maria:
    "I was still a mere boy when sent away from home to study in ⸻ College, founded a few years before in Bogotá, and then well known all through Colombia.",
  "bel-ami":
    "After changing his five-franc piece Georges Duroy left the restaurant.",
  "miss-julie":
    "Midsummer night in the kitchen: a count’s daughter and a valet bet the house on desire.",
  wallpaper:
    "A rented room, a yellow pattern, and a mind under careful watch.",
  "miss-brill-adapted":
    "A camel coat, a river-park bench, and a couple who tell the afternoon what she is.",
  "prefer-not":
    "A midtown clerk prefers not to — and a gentle office learns the shape of its limits.",
  "late-season":
    "Off-season Yalta, a small white dog, and an affair that will not stay temporary.",
  "between-the-drop-and-the-water":
    "A rope fails—or seems to—until the Hudson remembers what it meant.",
  "he-woke-changed":
    "A Newark breadwinner wakes wrong, and the family ledger of duty does the rest.",
  "the-pattern":
    "A rest-cure wallpaper that crawls until the only way out is through it.",
  "a-coat-worthy-of-respect":
    "A meek clerk earns a coat meal by meal, and the city notices too late.",
  "what-she-borrowed":
    "One borrowed night of glitter, and a decade to learn it was paste.",
  "it-was-not-nervousness":
    "A calm confession, and a pulse under the Queens floorboards that will not stay calm.",
  "during-carnival":
    "Carnival noise above, and the last brick set with intimate care below.",
  "what-we-sold":
    "Two broke lovers ruin their treasures and invent a quieter wealth in the wreckage.",
  "bliss-tokyo":
    "Omotesando gold, a flowering pear, and a perfect evening that turns on a single glance.",
  "open-window-singapore":
    "A rest-cure visit to Bukit Timah, an open veranda, and a girl's exquisite lie.",
  "story-of-an-hour-buenos-aires":
    "A Recoleta apartment, a careful message, and one hour that tastes like a future.",
  "masque-rio":
    "A sealed hillside compound above Rio, and a guest who does not RSVP to plague.",
  "boule-de-suif-istanbul":
    "A delayed van out of Kadıköy, and one woman whose generosity is spent then despised.",
  "happy-prince-hong-kong":
    "A gold-leaf statue above the harbour gives itself away; the city calls the bare pedestal an improvement.",
  "hunger-artist-milan":
    "A glass box in Brera, and a city that prefers a panther's appetite to refusal as art.",
  "the-nose-cape-town":
    "A Sea Point assessor wakes without his nose; on Long Street it has better meetings.",
  "queen-of-spades-paris":
    "Three cards in the Huitième, a countess's secret, and a queen who will not stay buried.",
  "decapitated-chicken-lisbon":
    "A white villa above the Tagus, and a kitchen lesson that does not stay in the kitchen.",
  "garden-party-barcelona":
    "A Sarrià lawn, a marquee, and leftovers carried down to a death the party refused to see.",
  "usher-prague":
    "A villa above the Vltava, a twin sealed too soon, and a house that shares one death.",
  "araby-seville":
    "A Triana crush, a promise at the night bazaar, and the ordinary failure of wanting.",
  botchan:
    "A hot-headed Tokyo teacher is posted to the provinces and refuses to learn the local game.",
  "post-office":
    "A sick boy keeps the village post office of the mind — Tagore’s small play of waiting.",
  rur: "A factory makes artificial workers; the workers decide they are the future.",
  "bread-givers":
    "Anzia Yezierska’s 1925 novel opens with potatoes to peel, Bessie home without work, and the landlord hollering for the rent.",
  dalloway:
    "One London day: Clarissa buys the flowers herself and walks the city awake.",
  orlando:
    "Woolf’s Orlando outlives a century and changes sex along the way.",
  gatsby:
    "West Egg money, a green light, and a man who throws parties for a ghost.",
  "the-age-of-innocence":
    "Old New York marries correctly and then spends a lifetime paying for it.",
  "the-house-of-mirth":
    "Lily Bart has beauty, no fortune, and one season too many on the marriage market.",
  "ethan-frome":
    "A Starkfield winter, a sick wife, and a sled that does not forgive a wish.",
  "sister-carrie":
    "Caroline Meeber boards the afternoon train for Chicago with a small trunk and four dollars.",
  "antic-hay":
    "Gumbril sits in an oaken stall in the School Chapel and waits through the First Lesson.",
  "spring-time-case":
    "A fish monger, flushed with drink, speeds into the Suruga-ya pawn-shop at the fifth hour.",
  "eline-vere":
    "Frédérique van Erlevoort stands at a mirror while the azalea guests gather.",
  "hungry-stones":
    "On the Puja train back to Calcutta, a kinsman meets an up-country Mahomedan.",
  smoke:
    "A throng gathers before the Konversation in Baden-Baden on an August afternoon in 1862.",
  "niels-lyhne":
    "Bartholine Blid’s black eyes, and a faith in poetry at Lönborggaard.",
  "the-emancipated":
    "An English widow writes at a window in Posillipo, looking over the Bay of Naples.",
  germinal:
    "A man walks the Marchiennes road to Montsou under a sky as dark as ink.",
  "our-lady-of-the-pillar":
    "In 1474 a young knight comes to Segovia and the church of Our Lady of the Pillar.",
  "madame-heurtebise":
    "A jeweller’s-shop wife marries the poet Heurtebise, and the shop glitter is the life she keeps.",
  falcon:
    "Spade keeps the falcon, the lies, and the one rule he will not break for a woman.",
  "winesburg-ohio":
    "A Midwest town speaks in grotesques — people who almost said the true thing.",
  "my-antonia":
    "Jim Burden first hears of Ántonia on the long journey across the midland plain to his Nebraska grandparents.",
  "une-vie":
    "Rain gutters roar through the deserted streets, and Jeanne is free of the convent in Normandy.",
  "look-back-on-happiness":
    "The narrator has gone to the forest, away from overfed success and into a hair-shirt.",
  "father-of-yoto":
    "Marigold Vassiloff and Tai Ling meet on West India Dock Road under a carnival moon.",
  "o-pioneers":
    "Alexandra Bergson stays with the land when everyone else wants to leave it.",
  "death-comes-for-the-archbishop":
    "ONE afternoon in the autumn of 1851 a solitary horseman crosses central New Mexico — it opens on the Cruciform Tree, not the Rome prologue.",
  "the-bridge-of-san-luis-rey":
    "Five travellers fall from a Peruvian bridge — Wilder asks whether those lives were accident or intention.",
  "the-sun-also-rises":
    "Robert Cohn was once Princeton’s middleweight, and the reading stops at his flattened nose.",
  "the-cabala":
    "The train into Rome is late across the Campagna, and the air of Naples generates legend.",
  "lolly-willowes":
    "Caroline’s spare room lands on “Of course, you will come to us,” and the reading stays in Chapter I.",
  "plum-bun":
    "Opal Street, a Philadelphia parlor, and the cost of passing told from inside the family.",
  "the-secret-agent":
    "Conrad’s London anarchists, a shop in Soho, and a bomb that lands on the wrong person.",
  "heart-of-darkness":
    "The Nellie lies at Gravesend, and the frame turns toward the Congo.",
  "the-island-of-doctor-moreau":
    "A Pacific island where a doctor teaches beasts to walk like men.",
  "the-time-machine":
    "The Time Traveller talks by the fire among silver lilies, and this reading is the whole short novel.",
  "the-war-of-the-worlds":
    "Martians land in the Home Counties and London learns it is not the center.",
  "the-invisible-man":
    "A stranger reaches the Coach and Horses through Bramblehurst snow, and this reading is the whole short novel.",
  "sons-and-lovers":
    "A Nottingham miner’s son cannot leave his mother’s claim on him.",
  "women-in-love":
    "Two sisters, two men, and Lawrence’s argument about what a life together costs.",
  "howards-end":
    "Who will inherit the house — and the England attached to it.",
  "a-portrait-of-the-artist-as-a-young-man":
    "Stephen Dedalus talks his way out of church, family, and Ireland.",
  dubliners:
    "North Richmond Street is blind, and Araby is the bazaar that does not keep its promise.",
  bliss:
    "Bertha Young swallows the late-afternoon sun, then the dinner-party turn waits in the full story.",
  steppenwolf:
    "A wolf of the Steppes in a bourgeois attic — then the Magic Theater for madmen only.",
  shadowings:
    "Hearn’s Kyoto ghosts, screen-maidens, and a dream-book told softly.",
  "brazilian-tales":
    "One tale only: The Fortune-Teller. Rita, Camillo, and the cards on Guarda-Velha Street.",
  "a-hundred-and-seventy-chinese-poems":
    "Winter Night: an empty bed, a sea-sound in the curtains, and lyrics that never open on Battle.",
  "martin-bircks-youth":
    "A childhood garden of blue flowers — then the blossom turns red, and the mother is gone.",
  ulysses: "One Dublin day, walked until language itself starts to sweat.",
  "the-voyage-out": "A young woman sails toward a first love and does not sail home unchanged.",
  "jacob-s-room": "Betty Flanders writing in the sand — Cornwall, then the room that will be Jacob’s.",
  "night-and-day": "London talk, two couples, and the long negotiation of who gets to want what.",
  "monday-or-tuesday": "Short Woolf pieces that catch a mind in the act of looking.",
  "of-human-bondage":
    "The day broke gray and dull — Wake up, Philip, and the first reading keeps to Chapter I.",
  "the-moon-and-sixpence":
    "Strickland’s greatness, and the biographer who wants to remove the misconceptions. Tahiti later, not Hong Kong.",
  "the-magician": "Paris occult, a charlatan who might not be, and a marriage that becomes a dare.",
  "the-old-wives-tale": "Two sisters from the Five Towns, told across a whole ordinary century.",
  "the-man-who-was-thursday": "A poet-detective joins a council of anarchists who keep turning into jokes.",
  "the-innocence-of-father-brown": "A small priest sees the crime because he knows the sinner from the inside.",
  "pointed-roofs": "Miriam upstairs with a Saratoga trunk, leaving to speak to the Fraeulein.",
  "the-autobiography-of-an-ex-colored-man":
    "A musician chooses passing, then has to live inside the choice.",
  blacker: "Emma Lou on her luscious black complexion, and the family that trained her to mourn it.",
  "hungry-hearts":
    "“My heart chokes in me like in a prison” — Wings only, a Lower East Side basement on a May Sunday.",
  "children-of-loneliness":
    "More Yezierska stories of the jump from tenement to the lonely side of American education.",
  herland: "The narrator writes from memory the journey into a country of women.",
  "the-jungle": "Chicago stockyards, an immigrant family, and the machine that eats them.",
  arrowsmith: "A doctor tries to stay honest inside American medicine’s hustle.",
  "the-custom-of-the-country":
    "Undine Spragg wants the next room, the next husband, the next New York.",
  summer: "Charity Royall stands on the doorstep of North Dormer’s one street, in the Berkshires, at the beginning of a June afternoon. Edith Wharton’s 1917 novel opens on a village that lies high and in the open, without the lavish shade of more sheltered towns.",
  "the-reef": "Wharton in France: desire among people who thought they had already chosen.",
  "bunner-sisters":
    "A Stuyvesant Square basement shop, blotchy gold on a black sign, and horse-car pace.",
  xingu: "A ladies’ lunch where culture is a weapon and nobody has read the book.",
  "the-touchstone": "A man sells a dead woman’s letters and then has to live with the cash.",
  "madame-de-treymes": "An American in Paris learns the French family’s rules are not a romance.",
  "the-glimpses-of-the-moon": "A couple marries on other people’s houses and finds the bill.",
  "here-and-beyond": "Wharton ghost stories: the social world with the lights turned down.",
  "tales-of-men-and-ghosts": "More Wharton hauntings among people who dress for dinner.",
  "the-descent-of-man-and-other-stories":
    "Wharton stories of science, marriage, and the small cruelties of being seen.",
  "the-fruit-of-the-tree": "A mill, a marriage, and the question of who may end a suffering life.",
  "this-side-of-paradise": "Amory Blaine comes of age as the Jazz Age is still learning its name.",
  "the-beautiful-and-damned": "Gloria and Anthony drink through a fortune and a war they barely touch.",
  "flappers-and-philosophers": "After dark on Saturday night the country-club windows glow yellow from the first tee, and this reading is Bernice only.",
  "tales-of-the-jazz-age": "More Fitzgerald stories from the years when the hangover was the point.",
  "all-the-sad-young-men": "Later Fitzgerald stories of money thinning and charm not quite covering it.",
  "the-vegetable": "Fitzgerald’s play: a man dreams of the White House and wakes to the joke.",
  "men-without-women": "Hemingway stories of men after the women, the war, or both.",
  "the-weary-blues": "Hughes at the piano: jazz in the bones and a drowsy syncopated tune.",
  "harlem-shadows": "McKay walking Harlem — desire, exile, and the street that looks back.",
  "constab-ballads": "McKay’s Jamaican constable poems: dialect, heat, and the job of keeping order.",
  "home-harlem": "A veteran comes back to Harlem looking for a night that still belongs to him.",
  "the-prophet": "Gibran’s Almustafa speaks on love, work, and leaving — counsel in a departing voice.",
  "the-madman-his-parables-and-poems": "Gibran’s parables of a man who stepped outside the town’s mind.",
  mhudi:
    "Two centuries ago the Bechuana tribes inhabited the extensive areas between Central Transvaal and the Kalahari Desert.",
  "african-tragedy":
    "Two reasons made Robert Zulu leave teaching at Siam Village School — Dhlomo’s Lovedale frame moralizes town life, and the first reading stops at the end of that chapter.",
  anandamath:
    "A hot day in Padachinha opens Sen-Gupta’s 1906 Abbey of Bliss.",
  "kwaidan-stories-and-studies-of-strange-things":
    "One tale: Mimi-Nashi-Hōïchi at Dan-no-ura, where demon-fires burn and a blind minstrel is about to be summoned.",
  "chita-a-memory-of-last-island":
    "A Gulf storm erases a Louisiana island; a child is left in the wreckage.",
  "the-rubaiyat-of-omar-khayyam":
    "FitzGerald’s Omar wakes in the bowl of night and pours the morning wine.",
  "songs-of-innocence-and-of-experience":
    "Blake’s paired songs: nursery light on one side, harder truths on the other.",
  "spring-and-all":
    "Williams on the road to the contagious hospital, watching the first green push through.",
  "a-few-figs-from-thistles":
    "Millay’s candle burns at both ends — First Fig, then the ferry in Recuerdo.",
  "the-wild-swans-at-coole":
    "Yeats returns to Coole’s autumn lake and counts the swans that will not stay.",
  "the-listeners-and-other-poems":
    "A traveler knocks at a moonlit house that never answers.",
  "the-empty-house-and-other-ghost-stories":
    "Blackwood’s empty rooms still know you’ve crossed the threshold.",
  "dark-of-the-moon":
    "Teasdale’s night lyrics for the hour when the mind won’t quiet.",
  "love-songs": "Brief Teasdale lyrics you could tuck under a pillow — loveliness, then the bill.",
  "the-house-of-souls":
    "Machen’s occult stories blur at the edges of ordinary London evenings.",
  "michael-robartes-and-the-dancer":
    "Yeats at midnight: dance, opinion, and the occult arguing in the same room.",
  "second-april": "April returns and Millay asks what for.",
  "renascence-and-other-poems":
    "A young Millay climbs a mountain of sky and comes back changed.",
  "mountain-interval":
    "Frost’s yellow wood, two roads, and the talk that gets you going.",
  gitanjali: "Tagore’s first song offering — it opens on Poem 1.",
  "songs-of-kabir":
    "Kabir, through Tagore’s English: mystic poems that don’t need a church.",
  "pictures-of-the-floating-world":
    "Lowell’s lacquer prints and quiet looking — Japan as color, surface, and pause.",
  silhouettes: "Symons at Dieppe and other soft-focus shores.",
  "the-garden-party-and-other-stories":
    "Very early morning, Crescent Bay lies under a white sea-mist until the shepherd is out of sight.",
  "bliss-and-other-stories":
    "Mansfield rooms where the furniture shimmers and then stings.",
  "body-of-this-death":
    "Bogan on flesh, desire, and what it costs to keep living in a body.",
  "north-of-boston":
    "Frost north of Boston — pasture springs, stone walls, and talk that turns.",
  "chicago-poems":
    "Sandburg’s big-shouldered city: hog butcher, tool maker, stacker of wheat.",
  "sour-grapes": "Williams on the street: spring returns, sour and exact.",
  precipitations:
    "Evelyn Scott’s midnight worship at Brooklyn Bridge and other sudden weathers.",
  "spoon-river-anthology":
    "Masters’ village speaks from under the hill — epitaphs that refuse to flatter the living.",
  "copper-sun": "Cullen on beauty, grief, and the dark tower.",
  "the-black-christ-and-other-poems":
    "Cullen’s faith and mourning, sacred story rewritten for a city that knows both hymn and grief.",
  "helen-of-troy-and-other-poems":
    "Teasdale on love that already left — Helen, flights, and the rooms that keep the echo.",
  "flame-and-shadow": "Teasdale’s grief poems that still catch the light.",
  "the-black-tulip":
    "Haarlem, a tulip, and a prisoner who grows a fortune through a prison window.",
  "colonel-chabert":
    "A Napoleonic colonel comes back from the dead and finds his wife has spent him.",
  magnhild:
    "The landscape has high, bold mountains, above which are just passing the remnants of a storm.",
  "after-the-divorce":
    "Nineteen Hundred and Seven: a woman sits crying in the Porru house’s strangers’ room.",
  "the-lodger":
    "A London couple take a quiet lodger and begin to wonder about the murders outside.",
  "the-king-in-yellow":
    "A play that ruins its readers, and stories that catch the yellow stain.",
  mcteague: "A Polk Street dentist, gold, and a marriage that turns to greed and heat.",
  "the-sea-wolf": "A ferry wreck, a sealing schooner, and a captain who philosophizes with his fists.",
  "martin-eden": "A latch-key opens the hall, and a young fellow in sea-smacked clothes comes in behind.",
  "the-iron-heel": "London’s oligarchy of the future, told as a warning already coming true.",
  "the-open-boat-and-other-stories":
    "Crane’s men in a dinghy, and other stories that refuse a consoling shore.",
  maggie: "A girl of the New York streets, written without the usual apology.",
  "the-red-badge-of-courage": "A boy goes to war to feel a wound that would prove he was there.",
  "the-scarlet-letter": "A Massachusetts scaffold, a child, and a letter that will not come off.",
  "moby-dick": "A restless young man with a drizzly November in his soul signs on to a Nantucket whaler, under a captain he has yet to meet.",
  "marie-claire":
    "A heads-up before you start: the book opens on a mother’s death, seen by her five-year-old daughter, and a drunk father who stands the child on a wine-shop table, where men kiss her and try to make her drink. Later there are a nun’s threats and a blow at the orphanage, a chicken and a pig slaughtered on the page, wolves killing sheep, a little girl badly burned, and more deaths, told quietly.",
  "easter":
    "On the Thursday before Easter the sun is back in the Heyst flat, and Elis, a schoolmaster whose father’s trial has shamed the family, hopes hard luck is tired of them.",
  "trafalgar":
    "An old man looks back on his boyhood along the Cadiz waterfront, and on the October day in 1805 when his master, an old sea captain, asks him if he is a brave man.",
  "the-ballad-of-the-white-horse":
    "With the Northmen over all of Wessex, King Alfred hides on the island of Athelney, and Mary comes to him by the river with nothing for his comfort.",
  cranford: "In a small English town run almost entirely by genteel ladies, a young visitor keeps a fond and sharp eye on their economies, rivalries and kindnesses.",
  "annals-of-the-parish":
    "A heads-up before you start: there are some old Scots words, and brief period language about Irish, Black and Jewish characters.",
  deephaven: "Two Boston friends spend a summer keeping house in an old seaport, among retired sea captains, widows and fisher-people, and come to love them all.",
  "precious-bane":
    "A heads-up before you start: the narrator is mocked as a witch for her harelip, and the book tells plainly of a bull-baiting with dogs. Later there is a sham conjuring in which a young woman is made to stand naked for a squire to look at, a father who talks of selling his daughter, a son who poisons his mother, drownings, and a mob that tries to duck the narrator as a witch.",
  "friendship-village":
    "One long Middle West street takes in telephones, a new doctor and modern china in its own unhurried way, while Calliope Marsh, mender of lace and music teacher, keeps an eye on it all.",
  "anne-of-green-gables":
    "A heads-up before you start: some characters voice the prejudices of their time, about orphans from the city, French-Canadian farm boys, Italians and a Jewish peddler, and the story once describes a French girl the same way. Near the end, a much-loved character dies.",
  "the-adventures-of-huckleberry-finn":
    "A boy and a man on a raft, heading south through a country that will not let them be.",
  "pride-and-prejudice": "A country dance, a proud man, and the long work of being wrong about someone.",
  frankenstein: "A student makes a creature and then refuses to be its father.",
  "jane-eyre": "A governess with no fortune and a house that answers back.",
  "wuthering-heights": "Two houses on the moor, and a love that does not stay in its grave.",
  "great-expectations": "A boy is told he has prospects, and the source of them is the point.",
  "crime-and-punishment":
    "On an exceptionally hot July evening a young man leaves a Petersburg garret and walks toward the bridge.",
  "rise-of-david-levinsky":
    "A cloak-and-suit man looks back at four cents in his pocket and the metamorphosis that followed.",
  "bottle-imp":
    "Keawe of Hawaii buys a bottle between Honaunau and the Hamakua coast, and this reading stops when that story ends.",
  "the-brothers-karamazov": "A father, three sons, and a murder the family has been rehearsing.",
  "war-and-peace": "Napoleon enters Russia; a dozen lives refuse to be a single plot.",
  "the-metamorphosis": "Gregor Samsa wakes as an insect and the family starts adjusting the furniture.",
  "the-trial": "K. is arrested for a crime nobody will name.",
  "swann-s-way": "A madeleine, a walk, and jealousy that outlasts the afternoon.",
  "les-liaisons-dangereuses": "Two aristocrats treat seduction as a sport and lose the match.",
  nana: "Zola’s courtesan eats Paris and is eaten by it.",
  "the-picture-of-dorian-gray":
    "Wilde’s beautiful face stays young while the portrait keeps the score.",
  "the-importance-of-being-earnest": "Two bunburyists, one handbag, and a name that has to be earnest.",
  kim: "A boy sits astride Zam Zammah opposite Lahore’s Wonder House.",
  "plain-tales-from-the-hills":
    "Kipling’s Simla and cantonment stories — gossip with the empire still in the room.",
  she: "Ayesha waits in a lost city for a man who has already died once.",
  "the-monk": "A Madrid abbey, a holy man, and the devil’s long patience.",
  carmilla: "A lonely schloss, a guest who arrives by carriage wreck, and a thirst.",
  "uncle-silas": "Winter gusts rattle the windows at Knowl, where Austin Ruthyn sits by a fire under ivied chimneys.",
  "the-turn-of-the-screw": "A governess, two children, and figures on the far side of the glass.",
  "washington-square": "A plain heiress, a handsome fortune-hunter, and a father who will not blink.",
  "the-bostonians": "Boston reformers, a Southern cousin, and a fight over a woman’s voice.",
  "the-aspern-papers": "A biographer in Venice hunting letters a woman will not surrender.",
  "the-spoils-of-poynton": "A house full of beautiful things, and the people who would rather win than live.",
  "the-europeans": "European cousins arrive in New England and test how far the ice will thaw.",
  "in-the-cage": "A telegraph girl reads other people’s love and tries on a life that isn’t hers.",
  "the-real-thing-and-other-tales":
    "James stories of artists, sitters, and the difference between looking and being.",
  "the-finer-grain": "Late James: desire ground to a finish so fine it almost vanishes.",
  "a-london-life-and-other-tales": "James in London rooms where a scandal is already furnished.",
  embarrassments: "James stories of people who cannot quite say the thing that would save them.",
  "the-ambassadors": "A Massachusetts man sent to fetch a son from Paris, and stays too long.",
  "the-wings-of-the-dove": "A dying American fortune, two lovers, and a kindness that is also a scheme.",
  "the-golden-bowl": "A marriage, a father, and the crack in a gift you are not supposed to notice.",
  "daisy-miller": "At Vevey a particularly comfortable hotel faces a blue lake, and Winterbourne is already in the garden.",
  "the-portrait-of-a-lady": "An heiress is free to choose, and the choice is the trap.",
  "lord-jim": "A jump from a sinking ship that a man spends the rest of his life explaining.",
  nostromo: "A silver mine, a republic, and the men who cannot put the metal down.",
  typhoon: "A steamer into a storm, and a captain too stubborn to have an imagination.",
  "under-western-eyes": "A student in Geneva, a betrayal in Russia, and the west watching.",
  "the-shadow-line": "A first command, a becalmed ship, and the line between youth and the job.",
  "the-arrow-of-gold": "Conrad’s Carlist Marseille: a woman, a cause, and streets with a reputation.",
  "the-rover": "An aging seaman comes into Toulon when the Revolution is already a weather.",
  "the-rescue": "Conrad returns to the islands: a yacht, a lagoon, and a rescue that costs.",
  "within-the-tides": "Shorter Conrad: coasts, debts, and men who arrive too late.",
  "twixt-land-and-sea": "Conrad stories of captains between a berth and a shore they cannot trust.",
  "a-set-of-six": "Gaspar Ruiz: a revolutionary war raises a strong man out of obscurity. One tale.",
  "tales-of-unrest": "Early Conrad: outposts where the climate is already an argument.",
  "new-arabian-nights": "Stevenson’s London and Paris as a game of disguises and clubs.",
  "the-master-of-ballantrae": "The full truth of this odd matter — Durrisdeer, 1745, and the heir by the King’s bridle.",
  catriona: "David Balfour again, now in love and in Dutch and Scottish trouble.",
  "the-black-arrow": "Wars of the Roses, a young man, and a company that shoots from the woods.",
  "the-merry-men-and-other-tales-and-fables":
    "Stevenson tales of wreckers, islands, and weather that wants a share.",
  "island-nights-entertainments": "South Sea stories: a bottle, a beach, and a bargain.",
  "treasure-island": "A map, a mutiny, and a boy who keeps the ship’s accounts in his head.",
  "kidnapped": "David Balfour leaves Essendean on a June morning with a key, and the Highlands are where the reading turns.",
  "prisoner-of-zenda": "Rudolf’s sister-in-law asks when he will do anything, and the red Elphberg hair is already the trouble.",
  "revolt-of-the-angels": "Under St. Sulpice the d’Esparvieu mansion stands among chestnut trees, and the angel revolt is where the reading turns.",
  "children-of-the-soil": "Pan Stanislav comes toward Kremen in the midnight mist, and the Poland estate is where the reading turns.",
  "the-village-in-the-jungle":
    "Beddagama means the village in the jungle, and the reading opens on that name. A violent book, with a grim ending.",
  "the-joy-of-captain-ribot":
    "In Malaga they cook it not at all badly, and the captain’s story opens there, with Valencia still to come.",
  saracinesca:
    "Six o’clock at the Embassy in Rome, and the rooms are as full as they are likely to be.",
  "the-torrents-of-spring":
    "At two o’clock in the night he goes back to his study, and Frankfort is where the reading turns.",
  "the-bet":
    "A dark autumn night, an old banker in his study, and one story through the fireproof safe.",
  "the-bitter-tea-of-general-yen":
    "Megan draws her chair to the rainy window, and the solid Chinese earth looks transient.",
  "the-woman-of-andros":
    "Night creeps along the Mediterranean toward Brynos, and Chrysis keeps a house the island will not quite keep.",
  "bella-donna":
    "Doctor Isaacson has got on in London with alarming speed, and the Nile is where the reading turns.",
  "nina-balatka":
    "Nina Balatka of Prague loves a Jew, and the city’s prejudice is the story.",
  "la-lupa":
    "The village calls her the she-wolf, and this one Sicilian story ends on an axe.",
  "a-farewell-to-arms":
    "In the late summer of that year they lived in a village across the river from the mountains.",
  "alice-adams":
    "An old-fashioned patient hates the open windows, and the Midwestern night is already turning toward Alice.",
  "quartet":
    "Marya Zelli leaves the Café Lavenue at half-past five, and Montparnasse is where the reading turns.",
  "song-of-songs-sudermann":
    "Lilly was fourteen when the music-master disappeared, and the road runs from a garrison town to Berlin.",
  "its-wavering-image":
    "Pan, half white and half Chinese, keeps her father’s bazaar on Dupont Street until the story comforts her.",
  "java-head":
    "Very late in May, Laurel Ammidon lies considering the chairs, and Salem is already the morning.",
  "sunshine-sketches-of-a-little-town":
    "If you know Canada at all you know Mariposa, and the lake town is where the sketches turn.",
  "guest-the-one-eyed":
    "Snow, snow, snow, and a poor man comes home to the farm at Borg with an empty sack.",
  "the-blind-musician":
    "At the hour of midnight a child is born, and his mother is the first to notice.",
  "magnolia-flower":
    "The brook laughed and sang, and the river tells one story until the old couple come back.",
  "in-the-mountains":
    "I want to be quiet now, and a Swiss mountainside chalet is where the diary turns.",
  "the-two-countesses":
    "The shooting season is over at Sebenberg Castle, and Countess Muschi writes more than she means.",
  "el-ombu":
    "An old gaucho tells the history of one house under the ombú, on the pampas near Chascomús.",
  "halil-the-pedlar":
    "Time out of mind the Shiites and the Sunnites have quarrelled, and a pedlar walks the lanes of Stambul.",
  "the-white-sand-path":
    "A boy shut in the loft watches the white sand road until the path looks like a life.",
  "liliecronas-home":
    "On Christmas Day a stubborn girl from a Värmland croft fights a gale toward the parsonage feast.",
  "doctor-luke-of-the-labrador":
    "A cluster of islands shelters a Labrador outport, and a doctor comes off the mail boat.",
  "morrina":
    "A heads-up before you start: the son seduces the maid, and the book ends with her implied suicide.",
  "a-happy-boy":
    "Oyvind, a cotter's son, loves a proud farmer's granddaughter and earns his way across the line.",
  "the-desjardins":
    "In the oldest house in Viger, a brother stands up at supper and says he is the Great Napoleon.",
  "gone-to-earth":
    "A heads-up before you start: the squire Reddin pursues Hazel sexually, there is blood sport all through, and the book ends in a fox-hunt tragedy.",
  "the-real-charlotte":
    "Francie Fitzpatrick comes to Lismoyle to stay with her cousin Charlotte Mullen, and the comedy darkens slowly.",
  "pembroke":
    "A heads-up before you start: later in the book a sick boy, Ephraim, dies after his mother beats him.",
  "the-argonauts":
    "Aloysius Darvid built a fortune by iron toil, in Jeremiah Curtin's English.",
  "at-the-roadside-station":
    "Early spring at a bungalow by a small Russian station, and a gendarme who is terribly bored.",
  "the-will-to-live":
    "A heads-up before you start: the son elopes with a married woman, and he is charged with theft.",
  "doom-castle":
    "Count Victor rides alone into the Argyll glens and lands in a crumbling castle full of secrets.",
  "mayflower":
    "A heads-up before you start: the first chapter shows a drowned body, a man beats his wife, and there are deaths at sea.",
  "susan-proudleigh":
    "A note on period language: the book is full of the colour and class hierarchy of its day, and it uses the word ‘Chinaman’.",
  "the-peat-moor":
    "A wise old raven flies west to the last wild peat moor to dig up a sow’s ear he buried long ago.",
  "life-and-death-of-harriett-frean":
    "Harriett Frean gives up the man she loves and lives on the credit of behaving beautifully.",
  "farewell-love":
    "A heads-up before you start: the passion is obsessive, and at the end Anna shoots herself, shown directly.",
  "the-son-of-his-mother":
    "A heads-up before you start: the son dies of an illness in the last chapter.",
  "my-lady-nobody":
    "A heads-up before you start: once, the aristocrats talk about Jews in a period stereotype; Part III follows the colonial war in Aceh; and a suicide attempt over debt is reported.",
  "new-years-night":
    "A stifling New Year's Eve on a lonely selection at Dead Man's Gap, and the neighbours ride up through the storm.",
  "the-old-house":
    "A heads-up before you start: there is a brief episode in the 1849 siege, when Pest is shelled and a minor character is shot.",
  "the-sworn-brothers":
    "A heads-up before you start: there is Viking feud violence, outlawry, and pagan sacrifice.",
  "dusty-answer":
    "A heads-up before you start: one cousin’s death in the war is told offstage; a same-sex attachment is handled delicately; and the period term ‘half-caste’ appears once.",
  "christine-of-the-hills":
    "A heads-up before you start: there is a shooting, there are whippings, and a predatory guardian, not shown explicitly.",
  "the-story-of-a-woman":
    "On a zenana rooftop in Bengal at the cow-dust hour, the women retell how Durga defied Shiva and quarrel over how the story ends.",
  "daughters-of-men":
    "A heads-up before you start: the characters voice national prejudices, including one line calling the Greeks “worse than the Jews”, and there is a comic duel.",
  "the-bright-shawl":
    "A heads-up before you start: there are executions and firing squads, and period race language in the characters’ and the narrator’s voices.",
  "irresolute-catherine":
    "A maidservant jilted at her own baptism turns toward the shepherd she was afraid of.",
  "the-old-room":
    "A heads-up before you start: there is frank talk of infidelity, a thought of murder-suicide, and the son’s suicide at the end.",
  "the-fur-coat":
    "Christmas Eve, a poor doctor borrows his friend’s fur coat, and in the dark hall his wife kisses him, thinking he is the friend.",
  "the-corsican-brothers":
    "A heads-up before you start: there is vendetta talk, two pistol duels (not graphic), and a ghost.",
  "jocelyn":
    "A heads-up before you start: the love story is an adultery, and the wife dies of a morphia overdose, with suicide suspected.",
  "the-woman-of-knockaloe":
    "A heads-up before you start: it ends in a double suicide, and the characters voice wartime hatred.",
  "the-taking-of-the-redoubt":
    "A heads-up before you start: there is battle violence, and one graphic sentence about a death.",
  "the-man-in-the-brown-suit":
    "A heads-up before you start: there is a strangling, inquest talk of suicide, and a violent strike on the Rand.",
  "wang-the-ninth":
    "A heads-up before you start: there is famine, children are sold, and the narrator makes period generalizations about “all Chinese”.",
  "garram-the-hunter":
    "A heads-up before you start: there are slave raids, and one line about a living slave built into a pillar.",
  "his-dead-wifes-photograph":
    "A heads-up before you start: a wife and baby die in childbirth.",
  "the-face-in-the-abyss":
    "A heads-up before you start: three of the narrator's companions die, one man is strangled, and a child is threatened with a whip. The book also uses the period terms 'half-breeds' and 'Indian hell-brew', left as printed.",
  "mary-magdalen":
    "A heads-up before you start: chariot drivers are killed in the opening race, John the Baptist is later beheaded, and the crucifixion is told. One early line calls a city crowd a 'mongrel rabble', left as printed.",
  "the-hoop":
    "A heads-up before you start: the old man at the heart of this story dies at the end, quietly.",
  "love-s-shadow":
    "A heads-up before you start: much later in the book, a fancy-dress scene uses a period slur for a costume, left as printed.",
  "lewis-and-irene":
    "A heads-up before you start: an old banker dies of shock in the opening pages, a suicide is reported later, and there is gossip about 'Jewish blood'. Part Two makes sweeping racial claims about Greek bankers, describes 'big black satyrs' grunting like pigs, and prints the word 'negro' twice, all left as printed.",
  "a-monkey":
    "A heads-up before you start: this is one long comic monologue of exam-night nerves, with four short translator notes on the grading set in as you go.",
  "the-little-clay-cart":
    "A hungry stage-director comes home to find the house full of food for his wife’s fast, and goes out to invite a Brahman to dinner.",
  "zanzibar-tales":
    "Kee'ma the monkey and Pa'pa the shark are great friends, and this reading is their tale only.",
  "the-steel-flea":
    "A homesick Cossack, an amiable Tsar and the gunsmiths of Tula take on the marvels of England.",
  "comedies-incl-jeppe-of-the-hill":
    "A henpecked peasant is sent to town for soap, and Jacob Shoemaker’s inn is on the way.",
  "tales-from-the-fjeld":
    "Storm-bound in a Norwegian mountain shieling, a guide and the two girls who keep it trade folk tales by the fire.",
  "a-russian-gentleman":
    "A heads-up before you start: this memoir shows the Bashkirs in the light of its time and a husband who beats his wife, and its second Fragment tells plainly of a landowner’s floggings, torture and killings of his serfs.",
  "walter-pieterse":
    "In old Amsterdam, a dreamy shopkeeper’s boy falls in love with a sawmill, and with everything else the grown-ups think is nonsense.",
  "froth":
    "A heads-up before you start: this novel turns on adultery, and it tells plainly of a child tortured by her mother, held over a sink until she faints and beaten nearly to death. Later chapters show miners and boys poisoned by mercury, a man who once sold an enslaved woman and their children, and a slow death and a slide into madness.",
  "tales-by-polish-authors":
    "A Polish peasant marches off to war with the French, and three more Polish writers follow, from a country estate to Siberian exile.",
  "the-dancing-master":
    "A heads-up before you start: frank period talk of sizing up a partner's figure. Backstage at the opera, a dancing-master dressed as a bishop explains why France needs more waltzing.",
  "the-golden-age":
    "A heads-up before you start: one boy's war talk repeats a period stereotype about Indians, and later stories play at Indians; it's left as printed. Two boys trail a troop of soldiers through the village, sure a battle is coming, and get lost in the rain until the old doctor drives them home.",
  "the-mist":
    "After sunset, mist rises over a quiet village meadow and tells a night-flower how he is dew, cloud, and spring-water in turn — until morning blows him away.",
  "strait-is-the-gate":
    "A heads-up before you start: an aunt makes a sexual advance on the boy; her Martinique roots are told in period terms; family members die. He loves Alissa, who prefers holiness.",
  "fraulein-schmidt-and-mr-anstruther":
    "An hour after the English student lodging with her family suddenly proposes, Rose-Marie sits in the unlit room in Jena and writes him the first of her letters before he has even reached London.",
  "the-goose-man":
    "A heads-up before you start: this 1915 novel carries the antisemitism of its time, in tavern talk and once in the narrator's own voice, and later scenes include an asylum and a suicide.",
  "a-japanese-blossom":
    "A heads-up before you start: in the opening chapter the eldest son calls the new American stepmother a \"barbarian\" and dreams she is a fox-woman; a pail of water is thrown in a crying child's face. Later chapters include a teasing \"Jappy Jap\" nursery rhyme, Russo-Japanese War material, and deaths on the page. All of it is left as printed.",
  "the-spoilt-child":
    "A heads-up before you start: the opening chapter shows a spoilt boy scratching and biting his tutors, throwing live charcoal, and setting a Persian teacher's beard alight while calling him \"Mussulman\"; characters mock a Brahman tutor, and the father repeats the slight just after this chapter. Later chapters carry more period slights against Muslims, Kulin marriage customs, a second marriage, and the father's death on the page. All of it is left as printed.",
  "winnie-the-pooh":
    "Fresh from his morning exercises and a brand-new hum, Pooh drops in on Rabbit for a little something, and eats just a little too much to leave.",
  "the-counterfeiters":
    "A heads-up before you start: later in the novel, a schoolboy shoots himself in class with a pistol his classmates loaded as a dare. Two other characters attempt suicide, one woman is presumed drowned, a girl dies of illness, and a shipwreck story describes people drowning. Adult men pursue adolescent boys, there is adultery, and the book has period slurs and a journal passage that generalizes about Catholics, Jews and Protestants. All of it is left as printed. The first sitting contains none of the deaths or slurs.",
  "therese":
    "A heads-up before you start: Thérèse has been tried for trying to poison her husband with arsenic, and the novel goes back over how she did it. Her family talks with open antisemitism and makes generalizations about race, she thinks about suicide, an aunt dies, a mother dies in childbirth, and Thérèse is shut away in the house until she wastes away. All of it is left as printed. The first sitting covers only her acquittal.",
  "elysium":
    "A heads-up before you start: the First World War sits just behind this story. The soldier is home from the front in Flanders on five days' leave.",
  "maximina":
    "A heads-up before you start: later in the novel, a man forces his attentions on Maximina and she holds a razor to her own throat to make him leave. A young man shoots himself in the head and dies, blind, twelve days later. Maximina gives birth, and near the end she dies of a fever. A child's death from measles is recalled, revolvers are drawn, and the word gypsy appears twice as a period slur. All of it is left as printed. The first sitting covers only the homecoming and the engagement party in Pasajes.",
  "muslin":
    "Prize day at a hilltop convent: clever, plain Alice and her lovely sister Olive are about to leave school for the ballrooms of Galway.",
  "love-among-the-chickens":
    "Ukridge drops in on Garnet's London lodgings with that powerful voice, and Garnet knows his quiet morning is over.",
  "the-fresco":
    "Two students lose themselves in Pekin's lanes, enter a temple, and one follows a goddess who steps out of a fresco.",
  "the-taoist-priest-of-lao-shan":
    "Wang learns to walk through walls at Lao-shan, brags at home, and finishes in a heap on the floor.",
  "wedding-day":
    "On his wedding morning Bert cuts off his moustache while the cab waits, just to feel free.",
  "the-strange-case-of-dr-jekyll-and-mr-hyde":
    "A respectable doctor finds a door in himself and walks through it.",
  "hard-times": "Gradgrind wants Facts, and nothing but Facts, in the Coketown school-room.",
  "death-in-venice": "On a spring afternoon Gustav Aschenbach leaves the Prinzregentenstrasse in Munich, and the reading is already turning toward Venice.",
  "elmer-gantry": "Elmer Gantry leans, eloquently drunk, against the bar of the Old Home Sample Room in Cato, Missouri.",
  "colonels-dream": "Two gentlemen sit in French and Company’s private office on lower Broadway, and Clarendon in the South is where the dream turns.",
  manalive: "A wind of unreasonable happiness tears into Beacon House, and the boarding-house garden is already a pantomime.",
  "captain-blood": "Peter Blood tends the geraniums on Water Lane in Bridgewater, and the Caribbean is where the reading turns.",
  "the-monomaniac": "Roubaud sets the loaf and the white wine on the table, and the Paris–Le Havre railway is already in the window.",
  "tartarin-de-tarascon": "Tartarin’s villa on the Avignon road keeps an exotic garden, and Algeria is where the boast turns.",
  "little-dorrit": "A child of the Marshalsea, a family of prisoners who are not all inside.",
  "our-mutual-friend": "A drowned man, a dust heap, and London’s money in the river.",
  "the-mystery-of-edwin-drood": "A cathedral town, an opium habit, and a nephew who disappears.",
  "barnaby-rudge": "Gordon riots, a raven, and a simple man in a complicated mob.",
  "northanger-abbey": "A girl trained on gothic novels visits a house that is only a house — maybe.",
  "lady-susan": "A widow writes her way through other people’s marriages.",
  "agnes-grey": "A governess with no plot armor, only the work.",
  "the-tenant-of-wildfell-hall":
    "Gilbert Markham’s Yorkshire frame opens on the autumn of 1827.",
  "lady-macbeth":
    "Katerina Lvovna is bored in her rich father-in-law’s empty house in Mtsensk.",
  "the-last-man":
    "Sea-surrounded England, and a narrator whose lineage is already a ruin.",
  "the-professor": "An old school letter from Eton opens on Crimsworth, the outsider, before Brussels.",
  romola: "Eliot’s Florence: a scholar’s daughter and a marriage that is a political error.",
  "the-nether-world": "Gissing’s Clerkenwell poor, without the usual uplifting exit.",
  "the-odd-women": "Women who will not marry on the available terms, and the men who mind.",
  "the-whirlpool": "Gissing’s London of speculation, marriage, and nerves.",
  "the-unclassed": "People living between classes, and the rooms that say so.",
  "the-house-of-cobwebs": "Late Gissing stories of furnished rooms and thinning luck.",
  "desperate-remedies": "Hardy’s first novel: secrets, a lady, and a plot that will not sit still.",
  "the-woodlanders": "A woodland parish, a marriage, and the trees that outlast the people.",
  "the-well-beloved": "A sculptor who keeps falling in love with the same face in three generations.",
  "two-on-a-tower": "An astronomer, a lady, and a marriage that will not survive the parish.",
  "a-laodicean": "A castle, a telegraph, and Hardy’s modern hesitation.",
  "the-trumpet-major": "A Napoleonic scare on the Wessex coast, and a woman with two soldiers.",
  tess: "A Wessex girl, a letter under a door, and a world that calls it her fault.",
  "jude-the-obscure": "A stonemason wants Oxford; the road does not.",
  "far-from-the-madding-crowd": "A farm, three men, and a woman who will not be a prize quietly.",
  "the-mayor-of-casterbridge": "A man sells his wife at a fair and spends a life trying to unbuy it.",
  "the-return-of-the-native": "Egdon Heath, a reddleman, and a woman who wanted a larger stage.",
  "kipps": "A New Romney aunt and uncle raise Kipps, and a white dress is what he remembers of his mother.",
  "tono-bungay": "A patent medicine fortune, and Wells taking England apart from the inside.",
  "ann-veronica": "One Wednesday afternoon in late September, Ann Veronica Stanley comes down from London to face her father.",
  "the-history-of-mr-polly": "A shopkeeper who was not built for shopkeeping, and the day he leaves.",
  "love-and-mr-lewisham": "A science student, a girl, and the career that does not survive the kiss.",
  "when-the-sleeper-wakes": "A man sleeps into a future London of owners and owned.",
  "the-country-of-the-blind-and-other-stories":
    "Wells stories including the valley where sight is the disability.",
  "the-door-in-the-wall-and-other-stories":
    "A childhood door in a wall, and the man who cannot find it again.",
  "twelve-stories-and-a-dream": "More Wells: inventions, hauntings, and the scientific romance in short.",
  "tales-of-space-and-time": "Wells jumping centuries in a few pages.",
  "the-plattner-story-and-others": "A schoolmaster flipped into a fourth dimension, and other experiments.",
  "ghost-stories-of-an-antiquary":
    "M. R. James: a scholar, an object, and something that should have stayed in the catalog.",
  "more-ghost-stories-of-an-antiquary": "Further James: more libraries, more things that follow you home.",
  "a-thin-ghost-and-others": "Later James hauntings, thinner and closer.",
  "the-great-god-pan": "A London experiment that lets something older into a girl’s nerves.",
  "the-hill-of-dreams": "A furnace-glow sky, and Lucian Taylor loses himself on a Gwent hill lane.",
  "the-story-of-an-african-farm": "The full African moon pours onto a Karoo plain and a solitary kopje.",
  "the-imperialist": "Old Mother Beggarlegs sells gingerbread in the Elgin market.",
  "the-willows": "Two men camp on a Danube island that does not want visitors.",
  "three-john-silence-stories": "Blackwood’s psychic doctor, called in when the house is the patient.",
  "incredible-adventures": "Blackwood’s longer strange journeys — less jump than a slow wrongness.",
  "carnacki-the-ghost-finder": "Hodgson’s occult detective with cameras, pentacles, and bad nights.",
  "the-house-on-the-borderland":
    "An Irish house at the edge of a pit, and a manuscript that goes too far.",
  "the-beetle": "A London horror that arrives from the Nile and will not stay in its shape.",
  "the-lair-of-the-white-worm": "Stoker’s later English countryside, with something older under the well.",
  melmoth: "A wanderer who sold his soul and spends centuries offering the bargain on.",
  "goblin-market-and-other-poems":
    "Rossetti’s market of fruit, sisters, and a hunger that is not only hunger.",
  "sonnets-from-the-portuguese": "Barrett Browning’s love sonnets, numbered like a private ledger.",
  "poems-and-ballads-first-series": "Swinburne’s first shock: pagan heat in Victorian type.",
  "the-city-of-dreadful-night": "Thomson’s city as a philosophy of not being consoled.",
  "a-boy-s-will": "Frost’s first book: New England youth trying on a voice.",
  "new-hampshire": "Frost’s later intervals — work, weather, and the joke that isn’t.",
  "al-que-quiere": "Williams learning to write the American street in American words.",
  "kora-in-hell-improvisations": "Williams’ improvisations: a mind talking to itself in public.",
  lustra: "Pound cutting the ornament and leaving the image.",
  personae: "Pound trying on masks until one of them speaks.",
  exultations: "Early Pound: Provençal heat in London rooms.",
  "canzoni-ripostes": "Pound still in love with the old songs, already impatient with them.",
  "sea-garden": "H.D.’s sea-flowers, sharp as shells.",
  hymen: "H.D. on marriage, myth, and the body’s public ceremony.",
  harmonium:
    "Stevens’ first book opens on The Snow Man — a mind of winter, never Earthy Anecdote.",
  color: "It opens with Yet Do I Marvel, then Incident; each poem is its own chapter.",
  "the-harp-weaver-and-other-poems": "Millay’s later lyrics, still spending the candle.",
  "sword-blades-and-poppy-seed": "Lowell’s imagist cut and the smoke afterward.",
  "can-grande-s-castle": "Lowell’s polyphonic prose — history as a set of rooms.",
  "men-women-and-ghosts": "Lowell narratives of the living and the ones who stay.",
  "the-congo-and-other-poems": "Lindsay’s performance poems — a dangerous music of the American mouth.",
  "general-william-booth-enters-into-heaven-and-other-poems":
    "Lindsay marching the Salvation Army into a heaven that can hear the drum.",
  merlin: "Robinson’s Arthurian, told as a New England problem of knowledge.",
  "the-man-against-the-sky": "Robinson’s portraits of people who almost made it.",
  "irradiations-sand-and-spray": "Fletcher’s color-wash poems of sea and city.",
  "goblins-and-pagodas": "More Fletcher: oriental rooms built in Arkansas light.",
  "the-house-of-dust-a-symphony": "Aiken’s long poem of a city as a mind.",
  "nets-to-catch-the-wind": "Wylie’s cool lyrics, jeweled and a little cruel.",
  aquarium: "Harold Acton’s early poems — a young aesthete trying the water.",
  "the-farmer-s-bride": "A farmer tells how his young wife turned shy as a hare after the wedding, and how in the fall she ran away into the fields.",
  "look-we-have-come-through": "Lawrence’s poems of a marriage that is also a war.",
  "the-white-peacock": "Lawrence’s first novel: Midlands fields and a love that will not sit.",
  "the-lost-girl": "A Midlands woman leaves for Italy and a life the town cannot name.",
  "the-plumed-serpent":
    "Sunday after Easter in Mexico City, and Kate’s heart sank at the bull-fight.",
  "my-brilliant-career":
    "A first recollection at Possum Gully — gum-trees, a salt-shed, and a bush life that will not marry on the usual terms.",
  "the-red-room":
    "A May evening on Moses Height, and the wind over Stockholm.",
  "the-prussian-officer-and-other-stories":
    "Lawrence stories of soldiers, mines, and the body as an argument.",
  "the-longest-journey": "Forster’s Cambridge, a brother, and a life that keeps choosing the wrong loyalty.",
  "the-celestial-omnibus-and-other-stories": "Forster fantasies where a bus might actually go to heaven.",
  "the-eternal-moment-and-other-stories": "Later Forster stories of Italy, time, and the thing you didn’t say.",
  "a-passage-to-india":
    "Except for the Marabar Caves—and they are twenty miles off—the city of Chandrapore presents nothing extraordinary.",
  "the-country-house": "Galsworthy’s estate, a scandal, and the class that calls it taste.",
  "the-forsyte-saga": "A family that owns things, including people.",
  potterism: "Macaulay on the newspaper mind — slogans that eat a family.",
  "what-not": "A postwar ministry of minds, and the joke of being classified.",
  "dangerous-ages": "Macaulay on women at every age the culture has a lecture for.",
  "mortal-coils": "Huxley’s early stories: satire with the paint still wet.",
  limbo: "Huxley pieces from before the big dystopia — already impatient.",
  "little-mexican-other-stories": "Huxley stories of travel, talk, and the cleverness that doesn’t save you.",
  "adam-eve-pinch-me": "Coppard’s English country stories, strange without raising their voice.",
  "clorinda-walks-in-heaven": "More Coppard: village lives with a door left open at the back.",
  "reginald-in-russia-and-other-sketches": "Saki’s cruel little jokes in perfect clothes.",
  "the-chronicles-of-clovis": "Clovis Sangrail being terrible, and funny, on purpose.",
  "beasts-and-super-beasts": "Saki’s later sketches — animals and people, not always distinct.",
  "the-club-of-queer-trades": "Chesterton’s club of men who invented impossible jobs.",
  "the-wisdom-of-father-brown": "More Father Brown: the criminal as a soul the priest can still see.",
  clayhanger: "Bennett’s Five Towns again: a printer’s son and a long provincial life.",
  "anna-of-the-five-towns": "A Sunday-school yard in the Five Towns.",
  "the-road-to-the-open": "George sits alone, and the September sun falls on his father’s empty chair.",
  calvary: "An October birth in Saint-Michel-les-Hêtres, and the reading stays in the Orne.",
  "small-souls": "Hague rain, and Dorine van Lowe comes in with a wet umbrella.",
  "stories-and-pictures": "Bontzye Shweig dies down here, and only heaven asks his name.",
  "riceyman-steps": "A Clerkenwell bookseller, a miser, and a marriage in a shop of dust.",
  "the-four-million": "O. Henry’s New York of clerks, cops, and the gift that arrives on time.",
  "the-trimmed-lamp-and-other-stories-of-the-four-million":
    "More of the four million: shopgirls, rooms, and a twist you can see coming and still feel.",
  "the-voice-of-the-city": "O. Henry listening to New York as if it were a single talker.",
  "sixes-and-sevens": "Later O. Henry: the same city, a little more tired.",
  "cabbages-and-kings": "They will tell you in Anchuria that President Miraflores died by his own hand in Coralio.",
  "picture-of-dorian-gray": "The studio is filled with the odour of roses, and the laburnum burns in the London garden.",
  "the-job": "Captain Lew Golden of Panama, Pennsylvania, is the town in one man, before Una’s office.",
  "reign-of-greed": "The steamer Tabo labors up the Pasig toward La Laguna.",
  "a-cross-line": "A music-hall ditty floats over a felled tree in the spring.",
  "shadow-of-the-cathedral": "Dawn finds Gabriel Luna before the Cathedral, in a narrow street of Toledo that is still night.",
  "way-of-all-flesh": "A small boy remembers an old man in knee-breeches and worsted stockings at the beginning of the century.",
  "family-at-gilje": "A clear, cold afternoon lies over the mountain region, with Christmas snow at the captain’s house.",
  resurrection: "Spring reaches the town, and the prison office is already at work on 28 April.",
  typee: "Six months at sea, and Nukuheva rises in the Marquesas.",
  kangaroo: "Workmen lie on the grass beside Macquarie Street in the dinner hour.",
  "casanovas-homecoming": "Casanova, in his fifty-third year, is still hunted athwart the world.",
  "the-mother": "To-night again Paul was preparing to go out.",
  "lord-arthur-saviles-crime": "Lady Windermere’s last reception crowds Bentinck House before Easter.",
  "three-soldiers": "The company stands at attention on an empty parade ground, where the cinder piles show purple in the evening.",
  "doctor-pascal": "In the heat of a July afternoon, the closed room is full of a great calm.",
  "in-the-world": "A shop-boy starts at a fashionable boot-shop, under a master with green teeth and watery eyes.",
  "leila": "Giovanni calls for Signorina Leila from the dining-room, and the chestnut grove is already waiting.",
  "heart-of-the-west": "O. Henry goes west and still hears New York in the punchline.",
  "the-gentle-grafter": "A con man with manners, working the American joke.",
  "roads-of-destiny": "O. Henry on the roads that fork, then fork again.",
  whirligigs: "More O. Henry machinery: spin, snap, done.",
  "the-conjure-woman": "Chesnutt’s Uncle Julius, a plantation, and a conjure that is also a negotiation.",
  "the-wife-of-his-youth-and-other-stories-of-the-color-line":
    "Chesnutt on the color line as a social science with a knife in it.",
  "the-house-behind-the-cedars": "Passing in the Carolinas, and a family that cannot both be seen.",
  "the-marrow-of-tradition": "Stay here beside her, major — a Wilmington sickroom at break of day.",
  "folks-from-dixie": "Dunbar’s stories of Black life after slavery, without the plantation smile.",
  "the-complete-poems-of-paul-laurence-dunbar":
    "Dunbar’s lyrics in dialect and in the English he was told not to waste.",
  "the-sport-of-the-gods":
    "Berry Hamilton’s cottage sits back from the Oakley mansion, and the butler’s dignity opens the reading.",
  "iola-leroy": "\"Good mornin', Bob\" — the butter is fresh, and a prayer-meeting is already being planned.",
  "of-one-blood": "Hopkins’ Boston and Meroe: a mystery of race that goes underground.",
  "gentlemen-prefer-blondes":
    "March 16th at the Ritz — Lorelei’s diary opens on diamonds, brains, and the joke that starts the reading.",
  "lady-into-fox":
    "Wonderful events are irregular — then Mrs. Tebrick’s change into a vixen is an established fact.",
  "maria-chapdelaine":
    "The church door at Peribonka opens, and the men come out into April snow.",
  "seven-brothers":
    "Jukola Farm stands on the Häme slope, near the village of Toukola.",
  "imperium-in-imperio": "Griggs’ secret Black nation inside the United States — a political thought-experiment.",
  cane: "Karintha at Georgia dusk: her skin is like dusk on the eastern horizon. This reading is just Karintha.",
  "nacha-regules":
    "An August night finds Buenos Aires ablaze for the Centennial — Gálvez’s cabaret includes sex-work and violence in Ongley’s English, not a soft romance.",
  krakatit:
    "Evening fog thickens on the Old Town embankment until a pair of penetrating eyes fix on him.",
  "the-peasants":
    "Agatha and the priest on the autumn road — Praised be Jesus Christ — village poverty and period speech, left as printed.",
  "the-quest-of-the-silver-fleece": "Du Bois’ cotton novel: a crop, a school, and the northern money in it.",
  "main-travelled-roads": "Garland’s Midwest farms, without the calendar art.",
  "the-country-of-the-pointed-firs": "Jewett’s Maine harbor, visited slowly, left with the tide.",
  "a-hazard-of-new-fortunes": "Howells’ New York magazine, a strike, and the comfortable people watching.",
  "old-creole-days": "Cable’s New Orleans stories: French, Spanish, and the color line in the same street.",
  "a-night-in-acadie": "Chopin’s Louisiana: heat, Catholic rooms, and women who already know the cost.",
  "the-awakening":
    "A green and yellow parrot at Grand Isle keeps repeating Allez vous-en, and Mr. Pontellier is on the gallery.",
  "the-man-of-property":
    "Stanhope Gate in June: the Forsytes in full plumage, and Aunt Ann’s grey hat.",
  "theresa-raquin":
    "The Arcade of the Pont Neuf is a damp corridor of dumpy shops.",
  "there-is-confusion":
    "Joanna on her father’s knee, asking for a story about somebody great.",
  "the-rise-of-silas-lapham":
    "Bartley Hubbard interviews Silas Lapham for the Solid Men of Boston.",
  indiana: "A rainy château in Brie, and Colonel Delmare by the fire.",
  "the-book-of-wonder": "Weary of London, then a centaur’s wedding bells.",
  buddenbrooks: "And what comes next — Lübeck, Part One, Chapter I.",
  "miss-lulu-bett": "The Deacons were at supper, a tulip under the gas jet in an April Midwest house.",
  ramuntcho: "Sad curlews flee a gray squall over the Bidassoa, and the path starts in moss and rope soles.",
  "the-pit": "Laura Dearborn waits in the Auditorium vestibule while a February draught moves through Chicago.",
  reginald: "Reginald is persuaded to the McKillops’ garden-party, and the reading is that sketch only.",
  "royal-highness": "Noon on the Albrechtstrasse: a general and a lieutenant in grey great-coats.",
  ramona: "Sheep-shearing is late at the Senora Moreno’s Mission ranch, and Felipe is still ill.",
  "almayers-folly": "Kaspar! Makan! — a decaying house on the Pantai at sunset.",
  "the-crux": "The Foote Girls bustle along Margate Street, and the book opens on the Back Way.",
  "the-black-dog": "A freckled rustic pockets his fare, and the reading is the title tale only.",
  "a-hero-of-our-time":
    "Post from Tiflis: a dukhan crowd and camels at the foot of Mount Koishaur.",
  "strange-tales":
    "Mr. Chu steps through a monastery wall painted with Chih Kung and a fairy, and does not come back the same.",
  "the-comedienne":
    "Bukowiec station, a winding line cut among beech and pine hills.",
  "short-stories-from-the-balkans":
    "Leiba Zibal waits under the roof at Podeni for a stage that is already late.",
  "the-damnation-of-theron-ware":
    "A Methodist minister in a New York town meets ideas he cannot put back.",
  "the-king-of-schnorrers-grotesques-and-fantasies":
    "Zangwill’s beggar-king of London Jews — comedy with a ledger.",
  "ghetto-comedies": "More Zangwill: the East End as a theater that bills itself as life.",
  "reuben-sachs": "Reuben Sachs was the pride of his family, and his mother says he must marry money.",
  "the-romance-of-a-shop": "Four sisters open a photography shop and try to live by the work.",
  "the-heavenly-twins": "Sarah Grand’s New Woman novel: marriage as a public health problem.",
  "the-beth-book": "A girl artist against the available script for daughters.",
  keynotes: "George Egerton’s New Woman stories — desire written without asking permission.",
  "the-woman-who-did": "Mrs Dewsbury’s lawn in Surrey is yellow clover, and the oak-clad Weald opens beyond it.",
  "the-green-carnation": "A green carnation in an evening coat, and a Piccadilly glass that already knows the pose.",
  "the-sorrows-of-satan": "A threadbare suit asks what it is to be poor, and an upper-class carriage is already in the street.",
  "cousin-betty": "A July 1838 milord turns down the Rue de l’Université with a National Guard captain inside.",
  "the-king-of-schnorrers": "Lord George Gordon’s London opens on a synagogue stream, a canvas bag, and spring sunshine.",
  hania: "Old Mikolai’s death-bed leaves Hania to a sixteen-year-old’s conscience, with snow on the wind.",
  "the-toys-of-peace": "Eleanor Bope hands her brother a morning-paper cutting about children’s toys and the National Peace Council.",
  "tess-of-the-durbervilles": "A May evening walk from Shaston toward Marlott, and a parson who calls the haggler Sir John.",
  "captains-courageous": "The weather door of the smoking-room stands open to the North Atlantic fog as the liner rolls.",
  "numa-roumestan": "A scorching Sunday in July fills the ancient amphitheatre at Aps for the yearly competitions.",
  dracula: "On 3 May the journal leaves Munich for Bistritz, with paprika still ahead.",
  "the-tug-of-love": "Elias Goldenberg, the head cutter, is betrothed to Fanny Fersht, and Sugarman is the exception.",
  "the-house-of-the-seven-gables": "Halfway down a New England by-street, a rusty house keeps seven gables and the Pyncheon Elm.",
  "toilers-of-the-sea": "Christmas snow falls on Guernsey, from St. Peter’s Port toward Vale.",
  "indian-summer": "Midway on the Ponte Vecchio, Colville looks along the yellow Arno.",
  "a-slav-soul": "Memory walks back to childhood, to Yasha, Matsko, and Bouton.",
  "esther-waters": "She stood on the platform watching the receding train, in a faded yellow dress.",
  "south-wind": "The bishop is confoundedly sea-sick on the way to Nepenthe.",
  "the-village": "The Krasoffs’ great-grandfather, called the Gipsy, was hunted with wolf-hounds.",
  "ditte-girl-alive": "Ditte Child o’ Man stood at the top of the family tree.",
  "a-voyage-to-arcturus": "Lindsay’s planet of colors that are also moral tests.",
  "uncanny-stories": "May Sinclair’s ghost stories from a psychologist’s side of the veil.",
  widdershins: "To Let boards stand inside the paling of an old red brick square.",
  "visible-and-invisible": "E. F. Benson ghosts: the drawing room, then the thing in the passage.",
  "the-room-in-the-tower-and-other-stories": "Benson’s earlier chill — a room you have already dreamed.",
  "the-countess-of-lowndes-square-and-other-stories":
    "Benson’s lighter London: countesses, letters, and a morning that goes wrong.",
  "famous-modern-ghost-stories":
    "A Scarborough anthology of the period’s best hauntings, already in one room.",
  "the-happy-end": "Hergesheimer stories that do not always earn the title.",
  "the-night-operator": "Packard’s railroad nights: wires, wrecks, and men who stay on the job.",
  "free-and-other-stories": "Dreiser stories around Sister Carrie’s America.",
  "the-financier": "Cowperwood learns Philadelphia money, then the crash.",
  "the-titan": "Cowperwood in Chicago, buying the city as if it were a utility.",
  "an-american-tragedy": "A lake, a pregnant girl, and an American climb that needs her gone.",
  "the-song-of-the-lark": "Cather’s prairie girl becomes a singer and leaves the town that made her ears.",
  "a-lost-lady": "Sweet Water along the Burlington, and Niel’s memory of Marian Forrester.",
  "the-wanderer": "He arrived at our home on a Sunday of November, 189… — Sainte-Agathe.",
  "the-late-mattia-pascal": "One of the few things he was sure of was his name: Mattia Pascal.",
  "the-troll-garden-and-selected-stories": "Early Cather: artists, hunger, and the Midwest watching.",
  "youth-and-the-bright-medusa": "Cather stories of artists who got away — and what they paid.",
  "my-mortal-enemy": "A woman who married for love and lives to call it the enemy.",
  "alexander-s-bridge": "Cather’s first novel: an engineer, two women, and a bridge that will not hold.",
  "poor-white": "Anderson’s Midwest inventor, watching the factory arrive.",
  "horses-and-men": "Anderson stories of animals, men, and the feeling that doesn’t speak.",
  "vandover-and-the-brute": "Norris’s San Francisco: a young man sliding toward the animal he fears.",
  "moon-face-and-other-stories": "London stories of faces, feuds, and the north.",
  "pudd-nhead-wilson": "A switched baby in a Missouri town, and a lawyer who collects fingerprints.",
  "the-mysterious-stranger": "It was the winter of 1590, and Austria was far from the world, and asleep in Eseldorf.",
  fanshawe: "Hawthorne’s first, a college romance he later wanted buried.",
  "twice-told-tales": "Hawthorne’s New England allegories, told as if they were news.",
  "mosses-from-an-old-manse": "More Hawthorne: the manse, the garden, the sermon underneath.",
  "the-blithedale-romance": "A utopian farm, a veiled lady, and a drowning that ends the experiment.",
  "the-marble-faun": "Americans in Rome, a statue, and a crime the city already knew.",
  redburn: "A boy’s first voyage, and Melville teaching the docks the hard way.",
  "israel-potter": "A forgotten Revolutionary, wandering Europe without a monument.",
  mardi: "Melville’s South Sea allegory, already too strange for the market.",
  "the-narrative-of-arthur-gordon-pym-of-nantucket":
    "Poe’s polar voyage: a ship, a hoax of a narrative, and a white that will not stop.",
  "tales-volumes-1-2": "Poe’s haunted palaces and sealed rooms, where a raven, a beating heart, or a falling house keeps one burden: never more.",
  "the-sketch-book-of-geoffrey-crayon":
    "Irving’s sketches: Sleepy Hollow weather, English Christmas, a New York already nostalgic.",
  "in-the-midst-of-life-tales-of-soldiers-and-civilians":
    "Bierce’s Civil War and San Francisco — the punchline is a death.",
  "can-such-things-be": "Bierce’s supernatural: yes, and they are not impressed by you.",
  "the-wind-in-the-rose-bush-and-other-stories-of-the-supernatural":
    "Mary Wilkins Freeman ghosts in New England parlors that already knew the dead.",
  "while-the-billy-boils": "Lawson’s bush stories: tea, tracks, and the joke that keeps a man going.",
  "on-the-track": "More Lawson: men walking Australia because staying still is worse.",
  "joe-wilson-and-his-mates": "Lawson’s Joe Wilson — marriage, drink, and the bush as a long afternoon.",
  "the-getting-of-wisdom":
    "Four children on the grass: a fairy-tale princess, and a silk dress already dirty at the hem.",
  "for-the-term-of-his-natural-life":
    "In the breathless stillness of a tropical afternoon the shadow of the Malabar lies on the glittering sea.",
  "the-man-from-snowy-river": "The colt from old Regret has got away to the wild bush horses, and every rider in the district gathers at the homestead to bring him in.",
  "hajji-baba":
    "Kerbelai Hassan, barber of Ispahan, and a razor that starts the road. Period language stays.",
  "best-russian-short-stories": "Best Russian Short Stories (1917), edited by Thomas Seltzer.",
  "three-hundred-tang-poems": "Three Hundred Tang Poems (1763), with Li Bai and Du Fu among the poets.",
  "the-purple-land":
    "Three chapters in the story of a life open into the Banda Oriental, in Uruguay.",
  "malay-sketches": "A quarter of a century ago, where stream meets tide, this reading is A Malay Romance only.",
  "in-court-and-kampong": "Clifford’s Malay world: court, village, and the Englishman taking dictation.",
  "malay-annals-sejarah-melayu": "The Sejarah Melayu: kings, cities, and the peninsula remembering itself.",
  "the-autobiography-of-munshi-abdullah-hikayat-abdullah":
    "Abdullah’s life between Malay courts and the English press.",
  "the-book-of-the-birds-paksi-pakaranam": "A Siamese bird epic, in Crosby’s English.",
  "jamaican-song-and-story": "Jekyll’s Anansi, songs, and the island talking in two tongues.",
  "jamaica-anansi-stories":
    "One great hungry time — one Anansi tale per reading, and this one is the fish pot.",
  "green-mansions":
    "Now that we are cool, he said, and regret that we hurt each other, I am not sorry that it happened.",
  "hadji-murad":
    "I was returning home by the fields, midsummer, the hay in and the rye just beginning.",
  "south-african-folk-tales": "Honey’s collection of southern African tales, animals arguing like people.",
  "west-african-folk-tales": "In the olden days the stories belonged to Nyankupon, and this reading is Spider Tales only.",
  "candide": "In a castle of Westphalia, Candide is expelled from the house of Thunder-ten-Tronckh.",
  "aphrodite": "On the quay at Alexandria a singing-girl stands with two flute-girls on the white parapet.",
  erewhon: "The narrator leaves home for waste crown-land and a sheep-farm across the range.",
  "the-great-hunger": "A northwester gale drives spindrift across a rocky Norwegian fjord and the fisher huts.",
  "children-of-the-frost": "Old Koskoosh listens while the camp must be broken and the dogs wait on the Yukon.",
  "the-poison-tree": "Nagendra Natha Datta is about to travel by boat in Joisto, and Surja Mukhi makes him promise to leave if a storm rises.",
  cosmopolis: "A narrow bookstall in Rome leaves the visitor just room enough to stir.",
  "billy-budd": "Before steamships, a stroller on the docks meets the Handsome Sailor in Billy Budd, Foretopman.",
  "sappho-one-hundred-lyrics": "Carman’s Sappho reconstructions — fragments turned into a book of desire.",
  "a-japanese-nightingale": "Sunset lingers over the bay, and a storm dance begins on a tea-house island.",
  "white-jacket": "Not a very white jacket, but white enough, on a frigate leaving Callao for Cape Horn.",
  "the-house-by-the-medlar-tree": "The Malavoglia were once as numerous as the stones on the road to Trezza.",
  "filipino-popular-tales": "Suan’s mother sends him to school, and he climbs the tree instead.",
  "zuleika-dobson": "That old bell sounds through Oxford station as the undergraduates move to the platform.",
  "eugenie-grandet": "Provincial houses in Saumur wear the melancholy of the steep street and the Grandet house.",
  "laos-folk-lore": "Deep in the forest of the North, a jungle village honors one old woman — A Child of The Woods only.",
  "born-in-exile": "The summer day in 1874 closes Whitelaw College under the Kingsmill smoke-canopy.",
  "the-four-horsemen-of-the-apocalypse":
    "In 1870 Marcelo Desnoyers is nineteen, and the reading opens on Madariaga’s Buenos Aires ranch.",
  "virgin-soil": "At one o’clock in 1868, a shabby young man climbs the back staircase on Officers Street.",
  "the-book-of-khalid":
    "Baalbek’s ruins, the bazaar, and the donkey-boy Khalid.",
  oblomov:
    "Oblomov in bed on Gorokhovaya Street, with a dreaded letter from the estate.",
  "the-lady-with-the-dog-and-other-stories":
    "Gurov at Yalta sees the lady in the béret.",
  zeno: "Zeno’s first cigarettes, and the habit of the last cigarette, in Trieste.",
  "the-red-gods": "Jean d’Esme’s Indochina adventure, imperial heat included.",
  "poems-in-prose": "Baudelaire’s Paris in Symons’ English — spleen, crowds, and the gaslight.",
  "poems-hot-houses-bernard-miall": "Maeterlinck’s hothouse poems, glassed in and breathing strangely.",
  "poems-of-emile-verhaeren": "Verhaeren’s Flanders of rain, factories, and the long-drawn line.",
  "poems-jessie-lemont-translation": "Rilke’s early poems in English, from the quiet colours of Evening to the Virgin, the angels, autumn and a silent hour.",
  "ara-vus-prec": "Eliot’s 1920 London poems — quatrains, Sweeney, and the nerves of a city.",
  "the-tower": "Yeats’s later book: a tower, a winding stair, and history at the door.",
  "the-wind-among-the-reeds": "Early Yeats: the sidhe, the reeds, a Ireland still half-myth.",
  "stories-of-red-hanrahan": "Yeats’s Hanrahan: a poet cursed into wandering his own country.",
  "a-hungarian-nabob":
    "Rain on the puszta in 1822 opens on Peter Bús’s Break-’em-tear-’em csárda.",
  "an-iceland-fisherman": "Five Breton seamen drink in a bilge-water cabin.",
  "the-song-of-the-blood-red-flower":
    "A strawberry song and the girls’ ring open the Gazelle chase.",
  "irish-fairy-tales":
    "Finnian of Moville goes after the disapproved gods and meets Tuan mac Cairill, Chapter I only.",
  "the-crock-of-gold": "Stephens’ philosophers, leprechauns, and a policeman who wanders into myth.",
  deirdre: "Stephens’ Deirdre: the face that starts a war, told without Victorian blush.",
  "a-dreamer-s-tales": "Dunsany’s invented East and the gods who are already bored of us.",
  "lord-arthur-savile-s-crime": "Wilde’s cheiromantist tells a man he will murder — so he tries to get it over with.",
  "the-ballad-of-reading-gaol": "Wilde after prison: a hanging, a yard, and the man who had to watch.",
  "a-house-of-pomegranates": "Wilde’s later fairy tales, jeweled and not for children only.",
  "in-a-german-pension": "Mansfield’s first book: a New Zealander watching Germans at table.",
  "the-imported-bridegroom-and-other-stories-of-the-new-york-ghetto":
    "Cahan’s East Side: a Talmudist imported for a daughter, and the America that unmakes him.",
  // Mira Mon 12 Oct 2026 PITCHES-1 — same sentence as the ritual pitch.
  "a-book-barnes":
    "At dusk a man in a frock coat and top hat creeps through the underbrush by the Buckler farm corral, and on the other side of the fence the horses have gone wild for summer.",
  "a-changed-man":
    "From an oriel window at Top o’ Town a neighbour watches the High Street as a crack regiment of Hussars arrives at the barracks with a splendid band.",
  "a-diversity-of-creatures":
    "In August 2065 Northern Illinois cuts itself off from the planet, and the Board’s reporter is rushed aboard a new airship with four members to find out why.",
  "a-group-of-noble-dames":
    "On a still winter night at King’s-Hintock Court a girl of twelve leans out of a window, hands over her eyes, while her parents quarrel next door over whom she will marry.",
  "a-history-of-chinese-literature":
    "Giles starts before the beginning, with Nothing taking the form of a point in a circle, then walks down to the feudal states of the eighth century B.C.",
  "a-house-of-gentlefolk":
    "A spring evening in 1842 fades over a provincial town, and two women sit at an open window, one a widow of fifty, the other an old lady of seventy.",
  "artists-wives":
    "After dinner in a lamplit studio, a poet asks his happily married friend to find him a wife, and the painter says artists ought never to marry.",
  "auguste-rodin":
    "Rilke begins with Rodin alone before fame and after it, and with the hands that raised a whole forest of forms.",
  "ballads-of-a-bohemian":
    "A street minstrel raises his glass to the mansard days of youth, then sits by his last faggots of fire in a Montparnasse attic in April 1914.",
  "ballads-of-a-cheechako":
    "Service sings the men of the High North: auroras over the Yukon, spruce-bough beds in the snow, and beans fried at forty below.",
  "baudelaire-prose-and-poetry":
    "The Moon looks in on a child asleep in its cradle and leaves her colours on its face, a gift that is half kiss and half poison.",
  "bay-a-book-of-poems":
    "Lawrence watches a still red line of guards in Hyde Park heave into a march, then hears the church clock strike eight over children in the hay.",
  "before-adam":
    "A city boy dreams every night of forests he has never seen, and the fear in those dreams is older than anything in his waking life.",
  "blix":
    "Nine strikes from the cuckoo clock on the Washington Street hill, and Mr. Bessemer starts his Sunday watermelon without waiting, the whole Bay out the window.",
  "bontshe-the-silent":
    "Bontzye Shweig lives and dies so quietly that the wind blows the board off his grave and nobody remembers where he lies.",
  "caesar-or-nothing":
    "The Paris-Ventimiglia express stops at Marseilles on a freezing winter morning, and Cæsar and his sister Laura warm up over café-au-lait in the dining car.",
  "captain-craig":
    "Old, cold and hungry in Tilbury Town, Captain Craig tells a passing sleeve that he must eat, and five or six young men find the spark in him.",
  "charmides-and-other-poems":
    "A Grecian lad home from Sicily with figs and wine climbs to Athena’s temple at dusk and hides until the priests put out the fires.",
  "chinese-literature":
    "The Master asks whether learning, then practising what you have learnt, is not a satisfaction, and his disciples add what they examine in themselves each day.",
  "creative-unity":
    "Tagore begins with civility as a kind of beauty, and the empty kerosene can as its rude opposite.",
  "crucial-instances":
    "An old guide shows a visitor the shuttered villa above Vicenza where nothing in the Duchess’s rooms has changed in two hundred years.",
  "dauber":
    "At sunset on a swift ship out of the tropics, the despised young ship’s painter tells the apprentice Si why he came to sea.",
  "daniel-deronda":
    "In a hazy, gilded casino on a September afternoon, Daniel Deronda can’t stop looking at a young woman at the roulette table, or decide whether she is beautiful.",
  "day-and-night-stories":
    "Fifteen years after a promise made on a steamer deck, a man steps off at a little country station to knock at her garden gate, as he said he would.",
  "essays-and-soliloquies":
    "The introduction sketches Unamuno’s Bilbao boyhood, from the Carlist siege of 1874 to a twopenny notebook of his own philosophy.",
  "eugene-onegin":
    "A young dandy races by post to his dying uncle’s bedside, and Pushkin turns back to tell how Onegin grew up beside the Neva.",
  "eves-ransom":
    "On a wet February dusk at Dudley Port station, two men who half recognise each other board the same third-class carriage for Birmingham.",
  "fairies-and-fusiliers":
    "Graves tells an ungentle critic he will keep his old sunsets, then an old centurion over his wine watches the new legion march by.",
  "faust-part-i":
    "Goethe greets the hovering forms of his youth again, then a theatre manager, a poet and a clown argue over what the crowd wants.",
  "fifty-one-tales":
    "Fame passes the poet by and promises to meet him in a hundred years, and Charon rows on across the river with a single shivering ghost.",
  "fir-flower-tablets":
    "The Shu Road climbs by bird-tracks, sky-ladders and nine turns to a hundred steps, and the traveller on it only wants to go home.",
  "fraternity":
    "On the last afternoon of April in Kensington, a woman at a shop window wonders whether she ought to buy a gentian-blue gown, and an old newspaper seller watches her.",
  "glimpses-of-unfamiliar-japan":
    "Hearn’s first morning in Japan is a kuruma ride out of Yokohama’s European quarter, under blue roofs and blue shop-cloths, in clear spring air off Fuji.",
  "gods-trombones":
    "An old preacher’s prayer opens the book, knee-bowed and body-bent, and then God steps out on space and says he is lonely and will make a world.",
  "hebrew-literature":
    "The Mishnah opens on a night question, from what hour to say the evening Shemah, and the sages argue it out until the pillar of the morn.",
  "hugh-selwyn-mauberley":
    "For three years, out of key with his time, a poet tries to bring a dead art back, and the age demands a plaster mould instead.",
  // Mira Mon 12 Oct 2026 PITCHES-2 — same sentence as the ritual pitch.
  "in-midsummer-days":
    "On Midsummer Eve a ninety-year-old granny lies by her rainbow-stained window, turning her head to make the world summer or winter, while a dove sings outside.",
  "japanese-fairy-world":
    "On the seventh night of the seventh month the Herd-boy star and the Spinning Maiden star cross the Milky Way to meet, and old Japan hangs its poems on bamboo.",
  "japanese-literature":
    "At the court of an Emperor whose name is lost, a lady of no high birth holds all his favour, and the great ladies watch her with malignant eyes.",
  "jewish-children":
    "Busie is a year or two older than the boy who tells this, and he can hardly wait for Passover, when he will show her the ducks on the river.",
  "kimiko":
    "Down the Street of the Geisha the paper lanterns make a half-mile litany of names, and one of them belongs to Kimiko, the second of that name.",
  "korean-folk-tales":
    "At the Governor’s birthday feast in Pyong-an, his gifted sixteen-year-old son dances with Charan, the brightest dancing girl in the province.",
  "lady-windermeres-fan":
    "On her birthday morning Lady Windermere arranges roses in a blue bowl, shows Lord Darlington her husband’s gift of a fan, and tells him he annoyed her last night.",
  "last-poems-housman":
    "At sundown a soldier tells his comrade not to look on the west, and the long cloud and the single pine stand sentinel on the ending line.",
  "leon-roch":
    "A young woman writes to Leon on the thirtieth of August, laughing at her own jealous letter of the day before and asking him to forgive her.",
  "leon-roch-vol-2":
    "The house of Telleria is ruined and pretends to be ill, and its evenings now pass in the Marquesa de San Salomó’s quiet, very pious drawing-room.",
  "lost-illusions":
    "In an Angoulême printing house the old wooden press still groans, and Jerome-Nicolas Sechard, a pressman who cannot read, becomes its master in 1793.",
  "lucky-pehr":
    "On Christmas Eve, high in the church tower, an old bell-ringer sets out porridge for the elf and a trap for the rats, and a voice tells him not to curse Christmas.",
  "mogens":
    "On a stifling summer noon a young man lies under an old oak, and when the rain comes at last he stands bareheaded in it and sings.",
  "more-songs-from-vagabondia":
    "Pipes and tabors sound in the street, and the poets call everyone down from ledgers and shovels to hear the strolling singers.",
  "nationalism":
    "Tagore starts with the problems each people is given, and names India’s from the beginning: many races in close contact, and how to live together.",
  "on-the-eve":
    "On one of the hottest days of 1853, two young men lie in the shade of a lime-tree by the Moskva, one awkward and thoughtful, one fair and charming.",
  "over-the-brazier":
    "The youngest poet in a dim library slips a green book of poems down his neck, takes it to bed, and fills the nursery with words no one understands.",
  "pan-tadeusz":
    "Mickiewicz calls home Lithuania, then shows a wooden manor on a low hill by a brook, its gate wide open to every passing guest.",
  "pans-garden":
    "Sanderson paints trees so that you can almost hear them rustle, and old David Bittacy has one of his cedars framed above his study table.",
  "peacock-pie":
    "A horseman rides over the hill under a clear moon, and then come Ludgate Hill, Mrs. Earth, a talking fish and poor Tired Tim.",
  "piping-hot":
    "On a dull November afternoon Octave Mouret’s cab, with his three trunks, pulls up at a new four-storey house in the Rue de Choiseul.",
  "poems-by-emily-dickinson-series-one":
    "Success is counted sweetest by those who never succeed, and then Dickinson takes her share of night, and her share of morning.",
  "red-oleanders":
    "Kishôr, a digger boy, steals time from the gold mines to bring Nandini red oleanders from the one tree he has found behind a rubbish heap.",
  "rhymes-of-a-rolling-stone":
    "Service promises no idle songs of dalliance, only a lusty love of life, and then sets out a-wandering with the mountains a part of him.",
  "romances-of-old-japan":
    "Through a tempest in old Yedo, Jurobei, a retainer sent away in disgrace, hurries after Shusen, the lord he still serves, sure that a rival means him harm.",
  "rootabaga-pigeons":
    "Blixie Bimber’s mother breaks the hash hatchet, so Blixie goes downtown with fifteen cents and finds the Potato Face Blind Man talking with a green rat.",
  "rootabaga-stories":
    "Gimme the Ax lives in a house where everything is the same as it always was, so he lets his children name themselves.",
  "salammbo":
    "At Megara, in Hamilcar’s gardens outside Carthage, the soldiers he led in Sicily feast at sunset while their master is away.",
  "salt-water-ballads":
    "Masefield sings the ranker, the stoker and the tired look-out, then spins the yarn of the clipper Loch Achray towing out to sea.",
  "saragossa":
    "Four escaped prisoners walk into Saragossa at ten at night with thirty-one cuartos between them and eat dry bread under the leaning tower.",
  // Mira Tue 13 Oct 2026 PITCHES-3 — same sentence as the ritual pitch.
  "siddhartha":
    "In the shade of the fig tree by the river, the Brahman’s handsome son learns to speak the Om silently, and his friend Govinda means to follow him anywhere.",
  "smoke-bellew":
    "Kit Bellew walks into the office of a San Francisco society weekly to pass on a friend’s advice, and walks out an unpaid editor with a serial to write.",
  "song-of-songs":
    "In Solomon’s royal tent, the Shulamite longs for the shepherd she loves and turns away the king’s golden promises.",
  "songs-and-satires":
    "Masters lists the silences, of the stars, the sea, a man and a maid, and an old soldier asked by a boy how he lost his leg.",
  "songs-from-vagabondia":
    "Off with the fetters: the vagabond poets claim art, letters, music and wine, and the comrade heart that outlasts them all.",
  "songs-of-childhood":
    "A child wakes in white moonlight to the gnomies singing in the wood, and by the time the shoes are on, a robin is singing of buttercups and dew.",
  "songs-of-travel":
    "Give me the life I love, sings the vagabond: the jolly heaven above, a bed in the bush with stars to see, and the road before him.",
  "south-sea-tales":
    "An overloaded schooner of pearl buyers, deck passengers, pigs and bananas sails from Rangiroa for Tahiti and lies becalmed on a glassy sea.",
  "st-peter-s-umbrella":
    "The schoolmaster’s widow at Halap leaves only a goat, a fattening goose and a two-year-old girl, and the village gives her a very decent funeral.",
  "stories-from-tagore":
    "Five-year-old Mini chatters through her father’s seventeenth chapter, then runs to the window shouting at a Cabuliwallah passing in the road.",
  "tales-grotesque-and-curious":
    "Everyone at Ike-no-O knows the nose of the priest Zenchi Naigu, five or six inches long, and he pretends not to mind it.",
  "ten-minute-stories":
    "At a moorland crossroads at dusk a walker can’t make his map match the signpost, and takes the arm that reads Over Litacy Hill.",
  "the-black-monk-and-other-stories":
    "Worn out and on his doctor’s advice, Kovrin drives in spring to his old guardian’s estate, where the gardens bloom with more flowers than he has ever seen.",
  "the-cabin":
    "Dawn comes over the huerta near Valencia: the last nightingales, the sparrows off the thatch, and carts creeping toward the city like files of ants.",
  "the-chinese-fairy-book":
    "A little brother sows cooked grain, and the single seed that sprouts grows an ear of millet so huge that a Roc flies off with it to an isle of gold.",
  "the-civilization-of-china":
    "Giles asks what people mean by China, and shows that asking a returning traveller how he liked it is like asking how one liked Europe.",
  "the-complete-original-short-stories":
    "For days the scattered remnants of a beaten army trail through Rouen, and the town waits for the Prussians to come in.",
  "conference":
    "From all the seven circles the birds flock into a great divan to choose a king, and Tajidar the Wise rises, weeping, to speak first.",
  "the-crescent-moon":
    "On the seashore of endless worlds the children meet, building houses of sand and floating boats of withered leaves.",
  "the-cycle-of-spring":
    "The King’s court is in an uproar because the Queen found two grey hairs behind his ear, and to him they ring like a bell.",
  "the-divine-comedy":
    "Midway on the journey of his life Dante finds himself in a dark wood, and at the foot of a hill a panther blocks his way.",
  "the-dream-play":
    "The Daughter of Indra follows a ray of lightning down through the clouds toward the earth, and her father warns her what its people are like.",
  "the-faith-of-men":
    "A traveller in the far North washes his hands of Thomas Stevens, the mighty hunter who once strolled into his camp to borrow a pinch of soda.",
  "the-father":
    "In the Captain’s lamplit sitting room, the trooper Nöjd is called in before the Pastor to say whether he is the father of the servant-girl’s child.",
  "the-fortune-of-the-rougons":
    "Outside the Rome Gate of Plassans lies the Aire Saint-Mittre, an old cemetery gone wild with weeds and pear-trees nobody will pick.",
  "the-fugitive":
    "Tagore addresses the Eternal Fugitive sweeping on through space, then stops at a crossroads to bid a friend farewell.",
  "the-gods-of-pegana":
    "Before Olympus, Mana-Yood-Sushai made the gods and rested, and Skarl the drummer beats on so that he will not wake.",
  "the-golden-whales-of-california":
    "Once in Kalamazoo the gods went walking two by two, for a girl with an innocent heart lived there in a cottage apart.",
  "the-grand-babylon-hotel":
    "At 7.45 on a sultry June night, a stranger in the smoking-room of the Grand Babylon asks the great head waiter Jules for an Angel Kiss.",
  // Mira Tue 13 Oct 2026 PITCHES-4 — same sentence as the ritual pitch.
  "young-adventure":
    "Night falls in the drug-shop, the great jars glow, and Benét retells the fisherman who hauls a brass-bound jar from the sea.",
  "the-napoleon-of-notting-hill":
    "Chesterton explains the game of Cheat the Prophet: humanity listens to the clever men, waits till they are dead, and does something else.",
  "the-romance-of-the-milky-way":
    "On the seventh night of the seventh month the birds of heaven make a bridge across the River of Heaven, so the Weaving-Lady can meet her husband.",
  "the-three-taverns":
    "Robinson walks the Valley of the Shadow, past faces to remember and faces to forget, thwarted clerks and fiddlers, and daughters of the silence.",
  "the-town-down-the-river":
    "Robinson’s gentlemen who jeered at Lincoln look back at the mild, untamable face that was learning them while they laughed.",
  "the-veil-and-other-poems":
    "At twilight an old angler fishes a willow-hung pool with an empty creel, until his float slides gently under.",
  "the-wonderful-adventures-of-nils":
    "On a Sunday morning in March, a lazy fourteen-year-old is left at home with the church service to read while his parents go to church.",
  "twilight-sleep":
    "Nona Manford asks to be squeezed in between her mother’s facial massage, her psycho-analysis and the man with the Persian miniatures.",
  "wanderers":
    "A red-haired painter chopping old Gunhild’s firewood turns out to be Grindhusen, who mended roads with the narrator long ago at Skreia.",
  "yekl":
    "On a sweltering midsummer noon in an idle cloak-shop, Jake holds forth on why Boston beats New York.",
  "the-rainbow":
    "For generations the Brangwens have farmed the Marsh where the Erewash winds through the alders, looking up from the fields at Ilkeston’s church tower.",
  "the-sword-of-welleran":
    "Merimna, city of bronze heroes and marble fountains, has forgotten war, and its unarmed guard sings of Welleran around the walls each night.",
  "time-and-the-gods":
    "When the gods were young they lay sleeping by a river and dreamed in marble, and when they woke, there stood Sardathrion.",
  "the-stolen-bacillus":
    "A Bacteriologist shows a pale, nervous visitor a slide of cholera, then a sealed tube of the living thing.",
  "the-tragic-muse":
    "In the sculpture garden of the great Paris exhibition, an English mother, her two daughters and her son sit in perfect silence on a green bench.",
  "the-patrician":
    "Dawn light travels over the great dining hall at Monkland Court, where the Caradocs have kept the trophies of their centuries.",
  "the-price-of-love":
    "In old Mrs. Maldon’s dim sitting-room, Rachel, in her blue pinafore-apron, stands on a footstool to light the gas.",
  "the-private-papers-of-henry-ryecroft":
    "For more than a week Ryecroft’s old penholder has lain untouched, and for once he is happy to let it gather dust.",
  "kusamakura-unhuman-tour":
    "A painter climbing a mountain path muses that this is a hard world to live in, and that art is how we make it bearable.",
  "unhuman-tour-kusamakura":
    "A painter climbing a mountain path muses that this is a hard world to live in, and that art is how we make it bearable.",
  "the-red-and-the-black":
    "White houses with red-tiled roofs climb the hillside of Verrières above the Doubs, and the nail factory on the Grande-Rue belongs to M. the Mayor.",
  "the-paying-guest":
    "Mumford spots an advertisement from a young lady seeking a home in the suburbs, and Emmeline wonders whether they would quite do.",
  "the-witch-and-other-stories":
    "On a night of thaw and blizzard, the sexton lies awake listening to the storm, sure he knows whose work it is, while his wife sews sacks by the lamp.",
  "the-heart-of-happy-hollow":
    "Robinson Asbury rises from bootblack to owner of the Equal Rights Barber-Shop, where the men of the quarter gather on Saturday nights.",
  "the-horse-stealers-and-other-stories":
    "Lost in a Christmas-week snowstorm on the doctor’s best horse, the hospital assistant Yergunov knocks at a lonely tavern with a bad name.",
  "the-mystery-of-choice":
    "Casting for sea-trout on a Breton stream, Darrel argues flies with the Purple Emperor, the butterfly collector who scoffs at everything he tries.",
  "the-poems-of-emma-lazarus-volume-1":
    "Under a stainless June sky, Lazarus watches the old earth renew her youth, and thin summer rain gray the far hills.",
  "weird-tales":
    "Councillor Krespel builds his house without a plan, walking at the walls until he finds where the door should go.",
  "tragic-sense-of-life":
    "Unamuno sets aside humanity in the abstract for the man of flesh and bone, who eats, sleeps, thinks, wills and dies.",
  "white-buildings":
    "Hart Crane begins with a legend of the moth and the flame, and remembers his grandmother’s letters, brown and soft as snow under the roof.",
  "the-lonely-way":
    "Felix comes home on furlough in his uhlan uniform and talks with his sister Johanna in their father’s little walled garden.",
  "the-inferno":
    "A translator introduces Strindberg, who laid his soul bare, and the autobiography that follows his long struggle with doubt and fear.",
  "yiddish-short-stories":
    "A plain man’s soul arrives at Judgment and watches the angels pour out his good deeds and his bad onto the scales.",
  "the-prose-tales":
    "Young Grineff learns his letters from the gamekeeper Savelitch, and French, in theory, from Monsieur Beaupré, who would rather learn Russian.",
  "the-history-of-yiddish-literature":
    "Wiener starts with the bilingual Middle Ages, when Latin held learning and the Jews turned to Hebrew, and the old romances still pleased them.",
  // Mira Tue 13 Oct 2026 BLURB-FIX — own line from each book’s opening, replacing a tagline written for another book.
  "pierre-or-the-ambiguities":
    "On a still June morning Pierre walks out under the village elms toward a cottage, and pauses at an open window with a crimson flower against a white pillow.",
  "the-piazza-tales":
    "From his country piazza a man watches a far-off window on the mountain, and once rows out to find who lives behind it.",
  "the-confidence-man":
    "A mute goes aboard a boat on the Mississippi, and the passengers begin to show their many minds.",
  "the-mandarin":
    "A month after his strange night, a weary Lisbon clerk scans the telegrams for news of China and drifts back to his small ambitions.",
  "married":
    "A young assistant asks the major for his daughter’s hand, and the major wants figures, not feelings.",
  "the-imported-bridegroom-and-other-stories-of-the":
    "On a snowy afternoon in the back parlor, Flora sets down Little Dorrit and watches the scarlet glow of the stove-glass.",
  "twenty-six-and-one-and-other-stories":
    "Twenty-six bakers roll dough from dawn to night in a damp cellar, and sometimes one of them starts a song.",
  "mother":
    "Every day the factory whistle calls the workers out of the little gray houses, and every evening it lets them go home to supper.",
  "what-diantha-did":
    "Under the vines of the mortgaged Warden house in California, Mrs. Warden crochets bright afghans while her four daughters sit around her.",
  "main-street":
    "On a hill above the Mississippi, Carol Milford leans into the wind, a girl from Blodgett College drinking the air as she longs to drink life.",
  "domesday-book":
    "Masters sets out to trace every ripple from one humble life, that of Elenor Murray, through all the lives it touched.",
  "free-air":
    "Claire Boltwood of Brooklyn drives her roadster through Minnesota rain with her father beside her, straight into the prairie gumbo.",
  "our-mr-wrenn":
    "A meek sales-entry clerk, called down at the office, walks to Fourteenth Street for the friendly nod of a moving-picture ticket-taker.",
  "in-search-of-the-unknown":
    "Safe in his library, a naturalist hesitates before telling what happened after he took charge of the water-fowl at the new Bronx Park zoo.",
  "moving-the-mountain":
    "On a cold Tibetan plateau a woman sees an old American belt buckle on a peasant, and calls out to her lost brother.",
  "fantastic-fables":
    "A Moral Principle meets a Material Interest on a bridge wide enough for only one.",
  "the-secret-rose":
    "A gleeman in a parti-coloured doublet hurries along the road to Sligo, shaking his fist at the crosses on the hill.",
  "in-the-seven-woods":
    "Yeats hears the pigeons of the Seven Woods and the bees in the lime flowers, and for a while forgets the old bitterness.",
  "responsibilities-and-other-poems":
    "Short poems of a witch, a peacock and a mountain tomb, then a child dancing on the shore with salt in her hair.",
  "the-green-helmet-and-other-poems":
    "Yeats dreams he is steering a gaudy ship while the crowd on shore asks about the figure on the bed.",
  "fifty-years-other-poems":
    "Johnson waits with the trembling stars for the tropic sun to rise, then drifts into the smoke of the cigarillos.",
  "self-determining-haiti":
    "Johnson sets out the banking interests behind the American occupation of Haiti, and the diplomatic letters that came before it.",
  "toward-the-gulf":
    "Masters follows the waters from the northern lakes and Itasca’s springs, down through gorges and rills, toward the gulf.",
  "a-illustre-casa-de-ramires":
    "On a hot June Sunday the Fidalgo da Torre works at his historical novel, looking out at the ancient black tower of his family.",
  "roumanian-stories":
    "At sunset on a lake of reeds, a girl in a boat asks the stranger whether he is not afraid of the fairy of the lake.",
  "selected-polish-tales":
    "The river Bialka rises under a hill no bigger than a cottage and runs out across level fields toward the ravines.",
  "gilgamesh":
    "Gish tells his mother his dreams, and she says a man born in the field and reared by the mountain is coming to him.",
  "papeis-avulsos": "Machado’s loose papers open in Itaguaí, where Dr. Simão Bacamarte builds an asylum, then turn to a father’s lesson in mediocrity, a Turkish slipper and a mirror.",
  "papeis-avulsos-incl-the-alienist":
    "The chronicles of Itaguaí tell of Dr. Simão Bacamarte, the greatest physician in Brazil, who came home to give himself to science.",
  "inferno": "Midway upon the journey of his life, Dante finds himself in a dark wood, and the road of the Inferno opens below him.",
  "the-divine-comedy-complete": "Dante’s whole Divine Comedy, from the dark wood down through Hell, up the mountain of Purgatory and into Paradise.",
  "the-epic-of-gilgamesh":
    "Gilgamesh, king of Erech, in a 1917 English translation.",
  "cat":
    "A cat with no name yet begins the story of his life in a schoolteacher’s house.",
  "kokoro":
    "A student remembers the older man he always called Sensei, whom he first met on a beach at Kamakura.",
  "maias":
    "The Maias come to live in the old Lisbon house called the Ramalhete.",
  "the-people-of-hemso":
    "Carlsson, a farmhand from Värmland, comes out to the island of Hemsö to run Widow Flod’s farm.",
  "amaro":
    "Eça de Queirós’s 1875 novel The Crime of Father Amaro.",
  "madmen": "Erdosain opens the glass door to the manager’s office in Buenos Aires and knows at once he is lost: they have found out what he took.",
  "the-marriage-of-heaven-and-hell": "Blake walks among the fires of Hell, delighted, collecting its proverbs: in seed-time learn, in harvest teach, in winter enjoy.",
  "melmoth-the-wanderer": "A Dublin student rides out to the bedside of his dying miser uncle, and finds in a locked closet the portrait of an ancestor whose eyes still live.",
  "father-goriot": "In a shabby Paris boarding house, the lodgers mock the old vermicelli maker whose money is somehow always going to his two fine daughters.",
  "poems-ballads-first-series": "Swinburne opens on a plea to blind love that comes by night and casts out rest: lift up thy lips, turn round, look back.",
  "under-the-greenwood-tree": "To dwellers in a wood every tree has its voice, and down Mellstock Lane on a winter night the old village choir goes out with its fiddles.",
  "a-pair-of-blue-eyes": "In a remote Cornish rectory, Elfride Swancourt waits for the young architect sent to look over the crumbling church tower.",
  "some-chinese-ghosts": "The water-clock marks the hour in the Tower of the Great Bell, and the story begins of the casting that would not ring true.",
  "in-the-midst-of-life-tales-of-soldiers-and-civil": "A young Virginian sentry wakes in a clump of laurel above the valley and sees, on the cliff’s edge, a horseman against the sky.",
  "bayou-folk": "Two young men on Canal Street talk of a run-down plantation on Red River, and one of them is sent up to look the old Santien place over.",
  "the-altar-of-the-dead": "George Stransom keeps every year the date of the woman who died before their wedding, and one day lights candles for all his dead.",
  "what-maisie-knew": "After the divorce a small girl is passed between her father and her mother, six months each, and slowly learns what she must not say.",
  "in-ghostly-japan": "A breath of incense brings back to Hearn a lotus in a bronze vase, the first thing he saw in a Buddhist temple in Japan.",
  "the-awkward-age": "On a wet London night Vanderbank brings an old friend home to his rooms, a man back after thirty years who once loved a girl’s grandmother.",
  "the-octopus": "Presley bicycles down the County Road through the dry California wheat ranches, past Caraher’s saloon, as a far-off steam whistle blows.",
  "the-sacred-fount": "On the train to a country house party, a guest notices that an old acquaintance looks years younger, and starts to wonder who is paying for it.",
  "chamber-music": "Strings in the earth and air make music sweet, and Joyce’s young lover wanders the willowed river with love in his head.",
  "jennie-gerhardt": "A poor mother and her eighteen-year-old daughter ask at the best hotel in Columbus, Ohio, for floors to scrub.",
  "chance": "In a riverside inn, an old sailor tells two yachting men how he got his first berth, and Marlow begins to piece together a young woman’s story.",
  "chitra": "A warrior princess raised as a man asks the god of love for one year of beauty, so that the hero Arjuna will look at her.",
  "the-gardener": "A servant begs the queen for one favour at a late hour: to be the gardener of her flower garden.",
  "victory": "On an island in the eastern seas, the drifting Swede Heyst sits among the ruins of a failed coal company, alone by his own choice.",
  "fruit-gathering": "Tagore offers to gather his fruits in full baskets into the courtyard, though some are lost and some not ripe.",
  "stray-birds": "Stray birds of summer come to the window to sing and fly away, and yellow leaves of autumn fall there with a sigh.",
  "the-hungry-stones-and-other-stories": "Raicharan, a servant of twelve, is given his master’s baby son to nurse, and loves the boy past everything else he has.",
  "mashi-and-other-stories": "Dying young, Jotin lies awake and tells his aunt that his wife should go home to her father’s house, and asks her to open the window a little.",
  "the-triumph-of-the-egg": "Home from Chicago to Willow Springs, Iowa, Rosalind Wescott walks the railroad track one August afternoon with something she cannot tell her mother.",
  "the-doves-nest-and-other-stories": "The Burnell children are given a doll’s house so big it has to stay in the courtyard, and the whole school wants to see it.",
  "whilomville-stories": "Summer comes to the little town of Whilomville, and with it a spoiled city child with a fistful of money.",
  "the-house-of-life": "A sonnet is a moment’s monument, and Rossetti builds a house of them for one love, room by room, from youth to change.",
  "limehouse-nights": "In the low-lit Causeway by West India Dock they still tell the tale of a gentle Chinese shopkeeper and a beaten London girl.",
  "rivers-to-the-sea": "The park is filled with night and fog, the lights along the paths are dim and pearled, and Teasdale asks if this is not enough.",
  "the-monster-and-other-stories": "Little Jim plays at being engine Number 36 on the lawn, while the doctor’s coachman Henry Johnson dresses up for his evening out.",
  "the-white-company": "The great bell of Beaulieu rings, and the monks turn out a brawling novice and send young Alleyne out of the abbey into the world.",
  "crome-yellow": "Denis rides the slow train to a country house full of talkers, rehearsing all the way what he will say to Anne.",
  "new-grub-street": "The Milvains sit down to breakfast as the church clock strikes eight, and Jasper, a young writer on the make, talks about getting on in London.",
  "roderick-hudson": "A rich idle New Englander sees a statuette by a young Northampton sculptor and decides to carry him off to Rome.",
  "the-hand-of-ethelberta": "In a wet seaside town a poor music teacher receives a book of poems, Metres by E., and reads in it the woman he once loved.",
  "life-s-little-ironies": "At a concert by the bandstand, a young widow in a wheeled chair hears a voice behind her she has not heard for years.",
  "villette": "Lucy Snowe remembers the visits of her girlhood to her godmother’s handsome house in the clean old town of Bretton.",
  "pierre-and-jean": "Old Roland fishes off Le Havre with his two grown sons, and news of a legacy left to only one of them is waiting at home.",
  "the-chinese-nightingale-and-other-poems": "Lindsay sings to Peace-of-the-Heart, his love through ancient ages, then walks out of Springfield into a forest age of tigers and parrots.",
  "babbitt": "The towers of Zenith rise above the morning mist, and on a sleeping porch in Floral Heights, George F. Babbitt wakes up to his alarm-clock.",
  "omoo": "On a bright tropical afternoon a sailor escapes from his island and boards a dingy whaler with a sick captain and an unruly crew.",
  "micah-clarke": "An old man tells his grandchildren about his father, Ironside Joe, who fought for Cromwell and raised him in a Hampshire village.",
  "the-black-riders-and-other-lines": "Black riders come from the sea with a clang of spear and shield, and three little birds in a row watch a man go by.",
  "the-man-who-was-afraid": "Ignat Gordyeeff rises from water-pumper to rich barge-owner on the Volga, and his son Foma grows up wondering what all of it is for.",
  "the-scarlet-plague": "An old man and his grandsons walk an overgrown railroad embankment, and he tells them about the world before the plague.",
  "the-light-that-failed": "Two orphans play with a revolver on the beach as children, and years later Dick Heldar, a war artist in the Sudan, finds Maisie again in London.",
  "war-is-kind": "Do not weep, maiden, says Crane, for war is kind, as the booming drums of the regiment beat on.",
  "the-forerunner-his-parables-and-poems": "You are your own forerunner, Gibran begins, and the towers you have built are only the foundation of your giant self.",
  "reincarnations": "Stephens retells old Irish poets in his own voice, from a grey man refusing a wily woman to the beauty of Mary Hynes of Ballylea.",
  "the-house-of-pride-and-other-tales-of-hawaii": "Percival Ford, a rich and righteous man of Honolulu, will not dance at the farewell ball, and watches the dancers with disgust.",
  "the-phantom-rickshaw-and-other-ghost-stories": "Kipling tells what ghosts are found in India, then of a man followed through Simla by a yellow rickshaw no one else can see.",
  "island-tales-on-the-makaloa-mat": "Under a great hau tree by the sea, an old Hawaiian lady of fortune tells her sister of a love she never spoke of.",
  "lost-face": "A crowded Yukon steamboat pulls away from the bank while a man shouts after it for a friend left behind with his message.",
  "life-s-handicap-being-stories-of-mine-own-people": "The Indus rises in flood under the moon, and six bearded men set down the litter of their dying Deputy Commissioner at the bank.",
  "when-god-laughs-and-other-stories": "In a bungalow shaken by a south-easter, a host laughs through his golden wine and tells how two lovers tried to cheat the gods.",
  "actions-and-reactions": "A young American couple, George and Sophie, settle into an old English parish, and find the house and the land have a claim on them.",
  "the-night-born": "Dave Slotter will not leave the outer office until he has seen Mr. Ward, a successful businessman with a secret that is himself.",
  "the-greater-inclination": "At Villa d’Este a young admirer of a dead poet spends a month with the woman the poet’s letters were written to.",
  "the-strength-of-gideon-and-other-stories": "Ben Raymond sings as he hoes, because Viney has said yes and the master has given his blessing and a five-dollar bill.",
  "traffics-and-discoveries": "An old Sikh trooper tells how he rode beside his English officer to a war in South Africa, and how the officer died.",
  "love-of-life-and-other-stories": "John Messner rubs his frozen cheeks as he drives five dogs and a loaded sled along the Yukon trail, after the wildest stampede of the winter.",
  "burning-daylight": "On a quiet night in a Circle City saloon, Burning Daylight bursts in on his birthday, ready to dance, gamble and race the winter trail.",
  "a-dome-of-many-coloured-glass": "Lowell’s first book of poems, from a man bowed before an altar with empty hands to the small bright things of a garden.",
  "motley-and-other-poems": "De la Mare’s little salamander dreams of going free on a night of stars and snow, and a linnet makes the bramble fair.",
  "one-of-ours": "Claude Wheeler wakes before sunrise on a Nebraska farm and shakes his brother up to wash the car for the circus.",
  "the-mothers-recompense": "Kate Clephane, who left her husband and baby years ago, wakes to the Riviera sun in a shabby hotel, and a cable calls her home to New York.",
  "in-a-glass-darkly": "A young doctor opens the papers of his master, Dr. Martin Hesselius, and the first case is a gentle clergyman who has begun to see a small black monkey.",
  "the-jacket": "Darrell Standing writes from a prison cell as he waits to be hanged, of the other lives he lived while they laced him in the jacket.",
  "the-hermit-and-the-wild-woman": "A hermit lives in a cave in a hill across the valley from the town that was burned, until he meets a woman who has run from her convent.",
  "the-princess-casamassima": "A poor London dressmaker brings the small boy she has raised to see his dying mother in prison.",
  "the-son-of-the-wolf": "On the long trail in the white silence, Mason bites the ice out of a failing dog’s toes, with his Indian wife and his partner beside him.",
  "watch-and-ward": "In a hotel, a stranger begs Roger Lawrence for a hundred dollars, is refused, and leaves behind a little daughter.",
  "atalanta-in-calydon": "The chorus sings that the hounds of spring are on winter’s traces, as the hunt for the great boar of Calydon is made ready.",
  "felix-holt-the-radical": "An old lodge-keeper opens the gates of Transome Court for the heir coming home from the East, while his mother waits inside.",
  "soldiers-three": "Far from the officers and the sergeants, Mulvaney, Ortheris and Learoyd sit in an old dry well and tell each other tales.",
  "the-happy-prince-and-other-tales": "Every afternoon the children play in the Giant’s garden, until the Giant comes home and builds a high wall round it.",
  "wessex-tales": "In the April water-meadows, the milkers of an eighty-cow dairy whisper that the farmer brings home his new bride tomorrow.",
  "barrack-room-ballads": "What are the bugles blowing for, asks Files-on-Parade, and the regiment is turned out to watch Danny Deever hanged.",
  "children-of-the-night": "Robinson’s first poems hold the men of Tilbury Town, from Richard Cory, who glittered when he walked, to Luke Havergal at the western gate.",
  "the-days-work": "After three years of labour, the engineer Findlayson sits by his great bridge over the Ganges and waits for the flood.",
  "ghetto-tragedies": "After a year of fasting every Monday and Thursday, Zillah gives birth to the son she has prayed for, and her husband Jossel is amazed.",
  "aurora-leigh": "Aurora Leigh sets out to write her story for her better self, from a motherless childhood in Florence to her aunt’s cold house in England.",
  "a-crystal-age": "A botanist falls into a ravine, comes to under a heap of roots that seem to have grown round him, and climbs out into a country he does not know.",
  "a-warning-to-the-curious-and-other-ghost-stories": "Mr Davidson, alone in a country town in the first week of January, sets off by train to walk a winter valley; M. R. James’s quiet scholars keep stepping where they should not.",
  "amores": "Lawrence hands a lover all his keys, then stands naked on a bank above an old sheep-dip, watching his white shadow quiver in the water.",
  "birds-beasts-and-flowers": "“You tell me I am wrong”: Lawrence opens with pomegranates in Syracuse, Venice and Tuscany, and argues for the fissure in the fruit.",
  "heliodora-and-other-poems": "H. D. begins with a wash of cold river in a glacial land and a crown of honey-flowers for a holy Satyr, in lines as clear and cold as marble.",
  "mrs-craddock": "On a cheerless November afternoon Bertha keeps walking down to the gate, while her aunt reads the autumn lists and asks what she finds there.",
  "new-poems": "A woman washes a dead man with weeping and asks how his mouth, once the first to soften, can lie so hard; Lawrence’s poems of grief and love.",
  "options": "Old Jerome Warren has a rich house, an adopted painter son and a step-niece, and then a letter from a long-lost brother out West changes the arithmetic.",
  "prufrock-and-other-observations": "Smoke and fog on a December afternoon, four wax candles, and a lady who has saved the afternoon for you: Eliot’s first book of poems.",
  "rio-grande-s-last-race-and-other-verses": "A jockey dreams the night before a race that dead men on dead horses ride beside him to give Rio Grande a lead; Paterson’s ballads of the track and the bush.",
  "rolling-stones": "Murray waits in the cell of the condemned with an ant on his table and eight o’clock coming; O. Henry’s last stories and sketches.",
  "strictly-business-more-stories-of-the-four-million": "O. Henry starts by puncturing everything you think you know about stage people, and goes on to the shop clerks and stray hearts of New York.",
  "the-man-who-knew-too-much": "Prince Michael O’Neill, who appears when not wanted and vanishes when the police want him, leaps a farm wall in the sun; Chesterton’s tales of a man who knows too much to act.",
  "the-trembling-of-a-leaf-little-stories-of-the-south-sea-islands": "The Pacific is inconstant like the soul of man; Maugham sails into its silence and finds the people stranded on its islands.",
  "the-trespasser": "In a mean house in South London, Helena plays Mozart with her violin muted and says only that she has lately submitted to many things.",
  "the-trimmed-lamp-and-other-stories-of-the-four-m": "Lou irons in a hand laundry and Nancy sells in a shop; O. Henry introduces two country chums making their way in the big city.",
  "the-waste-land": "April is the cruellest month: Eliot’s poem moves from lilacs and a sled ride in the mountains to a heap of broken images and fear in a handful of dust.",
  "the-wife-of-his-youth-and-other-stories-of-the-c": "Mr. Ryder, dean of the Blue Veins, is going to give a ball; Chesnutt’s stories of the color line in a Northern city after the war.",
  "the-wind-in-the-rose-bush-and-other-stories-of-t": "Rebecca Flint crosses the river by ferry to Ford Village with her bag and lunch basket, holding her rolled shawl on her hip like a child.",
  "tortoises": "A baby tortoise heaves itself from the shell and takes its first solitary bite; Lawrence’s little Ulysses, no bigger than a thumb-nail.",
};

/**
 * Author-level color written for one portrait, then reused on that author's
 * other books. Never a blurb or a preface. A book keeps its own sentence.
 */
const AUTHOR_HOOK: Record<string, string> = {
  "Edith Wharton": "New York manners, money, and the social misstep that becomes a life",
  "Joseph Conrad": "exile, ships, and men tested past the language they brought aboard",
  "H. G. Wells": "inventions, class, and the future already leaking into the suburbs",
  "Henry James": "Americans in rooms where a look is already a plot",
  "O. Henry": "New York clerks, cops, and the twist that arrives on time",
  "F. Scott Fitzgerald": "parties, money, and the hangover that was the point",
  "Willa Cather": "prairie labor, immigrant weather, and the people who stay",
  "D. H. Lawrence": "the Midlands body arguing with the life it was offered",
  "Virginia Woolf": "a mind walking a city until the day rearranges",
  "Thomas Hardy": "Wessex parish weather, and a fate that looks like a neighbor",
  "Robert Louis Stevenson": "adventure told as if the weather were in on it",
  "Nathaniel Hawthorne": "New England allegory that will not stay in church",
  "Charles Dickens": "London as a machine of debt, fog, and sudden kindness",
  "George Gissing": "furnished rooms, thinning luck, and no uplifting exit",
  "Stephen Crane": "war, streets, and sentences that refuse consolation",
  "W. B. Yeats": "Ireland, occult argument, and a tower that keeps the wind",
  "E. M. Forster": "English manners cracking the moment Italy or a house gets involved",
  "Sara Teasdale": "short lyrics of love, weather, and the dark between streetlamps",
  "Oscar Wilde": "wit with a bill attached, and beauty keeping a secret ledger",
  "W. Somerset Maugham": "London and the colonies, told without a soft landing",
  "Charles W. Chesnutt": "the color line as a social science with a knife in it",
  "Jack London": "work, wolves, and the American climb that can eat you",
  "G. K. Chesterton": "paradox in a cape, and a priest who knows the criminal from inside",
  "Algernon Blackwood": "nature and empty houses that know you have come in",
  "Arnold Bennett": "the Five Towns as a whole ordinary century",
  "Robert Frost": "New England talk, stone walls, and choices that look simple from here",
  "Amy Lowell": "imagist cut, lacquer surface, and a room that wants looking",
  "William Carlos Williams": "the American street, spring as fact, not metaphor",
  "Edna St. Vincent Millay": "appetite, wit, and the morning after the candle",
  "Ezra Pound": "the image left when the ornament is cut away",
  "Anzia Yezierska": "Hester Street hunger, English, and the fight to own a name",
  "Claude McKay": "Jamaica, Harlem, and a Black Atlantic that will not sit still",
  "Herman Melville": "the sea as a workplace that becomes a metaphysics",
  "Arthur Machen": "London evenings with an older Wales leaking through",
  "Henry Lawson": "the Australian bush as tea, tracks, and a long joke",
  "Theodore Dreiser": "American money, desire, and the crash already in the ledger",
  "M. R. James": "a scholar, an object, and something that should have stayed catalogued",
  "Saki (H. H. Munro)": "cruel little jokes in perfect Edwardian clothes",
  "Katherine Mansfield": "domestic brilliance with a chill underneath",
  "James Stephens": "Irish myth walking into the next field over",
  "E. F. Benson": "drawing-room ghosts and countesses with a morning post",
  "Rose Macaulay": "the newspaper mind, and women the culture has a lecture for",
  "Aldous Huxley": "clever talk that does not save you",
  "Countee Cullen": "Harlem Renaissance verse holding shine and mourning in one hand",
  "Charlotte Perkins Gilman": "the domestic room as a laboratory of confinement",
  "Bram Stoker": "paperwork of dread — trains, telegrams, and something under the polite roof",
  "Rabindranath Tagore": "devotion as quiet attention, without a sermon",
  "Jane Austen": "the marriage market as a blood sport with good manners",
  "Edgar Allan Poe": "ratiocination, collapse, and the house that falls",
  "Anne Brontë": "a woman leaving a bad marriage without asking the novel’s permission",
  "Joseph Sheridan Le Fanu": "Irish gothic: a guest, a well, a house already plotting",
  "Lafcadio Hearn": "ghosts told softly, whether Louisiana or Japan",
  "Ambrose Bierce": "the punchline is a death",
  "Mark Twain": "the American joke with the river still in it",
  "Paul Laurence Dunbar": "Black lyric life after slavery, without the plantation smile",
  "William Hope Hodgson": "occult night work — cameras, pentacles, pits",
  "James Joyce": "Dublin until language itself starts to sweat",
  "H. D. (Hilda Doolittle)": "sea-flowers, myth, and a line sharp as a shell",
  "Kahlil Gibran": "counsel in a departing voice",
  "Sherwood Anderson": "Midwest grotesques who almost said the true thing",
  "A. E. Coppard": "English country stories, strange without raising their voice",
  "Ernest Hemingway": "war, fishing, and the sentence that stops before the comfort",
  "Vachel Lindsay": "performance poems, drum and dangerous mouth",
  "John Gould Fletcher": "color-wash poems of sea and city",
  "Edwin Arlington Robinson": "portraits of people who almost made it",
  "Amy Levy": "Anglo-Jewish London, unsentimental about the marriage market",
  "Arthur Conan Doyle": "empire adventure before Holmes took the whole room",
  "Sarah Grand": "marriage treated as a public health problem",
  "Israel Zangwill": "London Jewish comedy with a ledger",
  "Eça de Queirós": "Lisbon adultery and the Victorian English that bowdlerized it",
  "Olive Schreiner": "Karoo sky, farm religion, and children who will not convert",
  "Guy de Maupassant": "Paris climbed on other people’s beds and newspapers",
  "August Strindberg": "a kitchen, midsummer, and class as a sexual dare",
  "Natsume Sōseki": "a hot-headed teacher who refuses the provincial game",
  "Sholem Asch": "Yiddish theater of desire that wants a respectable door",
  "Ferenc Molnár": "carnival tenderness, then the afterlife’s day-pass",
  "Mariano Azuela": "the Mexican Revolution without a victory speech",
  Colette: "Paris pearls, appetite, and recognition arriving late",
  "Karel Čapek": "artificial workers who decide they are the future",
  "Jun'ichirō Tanizaki": "obsession as a remodel of someone else’s body",
  "Isaac Babel": "Odessa rumor — bright, then sharp",
  "Yevgeny Zamyatin": "the glass city learning what a soul costs",
  "John Dos Passos": "the city as newsreel you can walk through",
  "Eric Walrond": "Caribbean docks, rooms, and heat that will not apologize",
  "R. R. R. Dhlomo": "a mine, a city, and a life that cannot go home clean",
  "Alfred Döblin": "Berlin as a street choir that will not let a man start clean",
  "Nella Larsen": "passing as a dangerous performance of belonging",
  "Wallace Thurman": "colorism inside Harlem, graded in the same rooms",
  "Roberto Arlt": "Buenos Aires metaphysical comedy with a knife under it",
  "Michael Gold": "the East Side street a boy cannot forget",
  "Sol Plaatje": "Tswana epic of war, cattle, and a woman who will not be a footnote",
  "Dashiell Hammett": "a detective who will not break his one remaining rule",
  "William Blake": "songs that start as nursery and end as accusation",
  "Matthew Gregory Lewis": "a holy man and the devil’s long patience",
  "Charles Robert Maturin": "a wanderer offering the same bargain for centuries",
  "Honoré de Balzac": "Paris after the wars, when a name can be spent",
  "Elizabeth Barrett Browning": "love numbered like a private ledger",
  "Alexandre Dumas": "history as a plot that still wants a tulip",
  "Charlotte Brontë": "a governess in a room that answers back",
  "Christina Rossetti": "fruit, sisters, and a hunger that is not only hunger",
  "Algernon Charles Swinburne": "pagan heat in Victorian type",
  "Marcus Clarke": "transportation as a life sentence that is the country",
  "James Thomson (B.V.)": "a city as a philosophy of not being consoled",
  "W. H. Hudson": "the pampas wandering, not a backdrop",
  "H. Rider Haggard": "a lost city and a woman who has already waited too long",
  "Rudyard Kipling": "the empire still in the room while the story jokes",
  "Arthur Symons": "seaside silhouette, fog, and the half-seen face",
  "George Egerton": "desire written without asking permission",
  "Frank Swettenham": "the peninsula in colonial notes that cannot own it",
  "Robert W. Chambers": "a play that ruins its readers",
  "A. B. Paterson": "a ride, a horse, a legend already moving",
  "Harold Frederic": "a minister who meets ideas he cannot put back",
  "Kate Chopin": "Louisiana heat and women who already know the cost",
  "Hugh Clifford": "court and kampong, with the Englishman taking dictation",
  "Richard Marsh": "London horror that will not stay in its shape",
  "Ethel Lilian Voynich": "conspirators, a priest, and a son who will not forgive the church",
  "Abraham Cahan": "the East Side Talmudist unmade by America",
  "Katherine Neville Fleeson": "Lao tales collected as if the hills were a library",
  "Frank Norris": "greed in a San Francisco that still smells of gold",
  "Mary E. Wilkins Freeman": "New England parlors that already knew the dead",
  "Bliss Carman": "Sappho reconstructed as a book of desire",
  "Walter Jekyll": "Anansi, song, and the island talking in two tongues",
  "James A. Honey": "southern African tales, animals arguing like people",
  "Henry Handel Richardson": "a schoolgirl learning the lessons not on the timetable",
  "Oliver Onions": "a haunting that feels like an idea you cannot put down",
  "James Weldon Johnson": "passing chosen, then lived in",
  "Walter de la Mare": "a house that never answers the knock",
  "Dorothy Richardson": "a life starting in sentences, in a German school",
  "Kabir (tr. Rabindranath Tagore)": "mystic talk about God, dust, and the walking body",
  "Edgar Lee Masters": "a village speaking from under the hill",
  "Ford Madox Ford": "a narrator who keeps discovering he had the story wrong",
  "Carl Sandburg": "the big-shouldered city matching the pace of the elevated",
  "W. H. Barker and Cecilia Sinclair": "Gold Coast stories of spider, tortoise, and the bargain",
  "Abdullah bin Abdul Kadir; tr. W. G. Shellabear": "a life between Malay courts and the English press",
  "Joseph Hergesheimer": "stories that do not always earn a happy end",
  "Frank L. Packard": "railroad nights, wires, wrecks",
  "David Lindsay": "a planet of colors that are also moral tests",
  "Various (ed. Dorothy Scarborough)": "the period’s hauntings already in one room",
  "Charlotte Mew": "a marriage, a silence, and a voice that will not soften it",
  "Louise Bogan": "flesh, desire, and the cost of staying in a body",
  "Wallace Stevens": "Florida light, Hartford mind, the jar on the hill",
  "Martha Warren Beckwith": "Anansi walking, spider and trickster",
  "Jean d'Esme": "Indochina adventure, imperial heat included",
  "Sinclair Lewis": "American professions as a hustle you can still try to stay honest inside",
  "Langston Hughes": "jazz in the bones, Harlem nights",
  "Conrad Aiken": "a city as a mind, scored like a symphony",
  "Washington Irving": "a New York already nostalgic for itself",
  "T. S. Eliot": "London quatrains and the nerves of a city",
  "Lord Dunsany": "invented gods who are already bored of us",
  "Dante Gabriel Rossetti": "the house of life as a sonnet sequence",
  "Thomas Burke": "Limehouse nights, London Chinatown as a yellow-press dream",
  "May Sinclair": "ghosts from a psychologist’s side of the veil",
  "Harold Acton": "a young aesthete trying the water",
  "Evelyn Scott": "city, body, and storm in the same breath",
  "Ameen Rihani": "New York and Lebanon in one Khalid who will not pick a world",
  "William Dean Howells": "comfortable people watching a strike from a magazine",
  "Elinor Wylie": "cool lyrics, jeweled and a little cruel",
  "George Eliot": "a moral experiment set in a city that already had politics",
  "Norman Douglas": "Capri as a talking shop of people who have left England",
  "George Washington Cable": "New Orleans streets where three languages share a color line",
  "John Galsworthy": "an estate, a scandal, and the class that calls it taste",
  "Upton Sinclair": "the stockyard as the American machine",
  "Bjørnstjerne Bjørnson": "Norwegian parish weather and a life decided by other people",
  "Jonas Lie": "a household where daughters wait on other people’s decisions",
  "George Moore": "a servant who keeps the child, without the varnish",
  "Robert Hichens": "the Wilde circle satirized while the trial was still weather",
  "Marie Corelli": "the devil in London society, taking notes",
  "Grant Allen": "a heroine who will not marry, and a scandal that sold",
  "Maxim Gorky": "a man afraid, in a Russia that does not offer a soft job",
  "Onoto Watanna (Winnifred Eaton)": "a Japan-set romance written from a Canadian Chinese life",
  "Grazia Deledda": "Sardinia after the law has already entered the house",
  "Charles Baudelaire (tr. Arthur Symons)": "Paris spleen in English gaslight",
  "Marie Belloc Lowndes": "a quiet lodger and the murders outside",
  "Maurice Maeterlinck (tr. Bernard Miall)": "hothouse poems, glassed in and breathing strangely",
  "Émile Verhaeren (tr. Alma Strettell)": "Flanders of rain, factories, and the long-drawn line",
  "Rainer Maria Rilke (tr. Jessie Lemont)": "angels, rooms, and the look that stays",
  "Omar Khayyam (tr. Edward FitzGerald)": "quatrains of time, dust, and the morning wine",
};

function usable(value: string | undefined) {
  const copy = value?.replace(/\s+/g, " ").trim() ?? "";
  if (copy.length < MIN_BLURB) return "";
  if (/^Project Gutenberg\b/i.test(copy)) return "";
  return copy;
}

const HOLD = "\u2060";
const PAREN_ABBREV = /\((eds?|trans|tr|incl|vol)\.\s+/gi;
const LEADING_INITIALS = /^(?:[A-Z]\.(?:-[A-Z]\.)?\s+)+/;

/**
 * Bracketed credit abbreviations — "(ed. ", "(trans. ", "(incl. ", "(Vol. " — are not
 * sentence ends, and leading initials ("I. L. Peretz") would otherwise peel off as a
 * roman-numeral heading. Hold those spaces with a word joiner while splitting.
 */
function holdCredits(copy: string) {
  return copy
    .replace(PAREN_ABBREV, (_m, abbrev: string) => `(${abbrev}.${HOLD}`)
    .replace(LEADING_INITIALS, (initials: string) => initials.replace(/\s+/g, HOLD));
}

function releaseCredits(copy: string) {
  return copy.split(HOLD).join(" ");
}

export function oneSentence(text: string): string {
  const copy = usable(text);
  if (!copy) return "";
  const first = releaseCredits(splitSentences(holdCredits(copy), 1)[0] ?? "").trim();
  if (!first) return "";
  return /[.!?…]$/.test(first) ? first : `${first}.`;
}

function formPhrase(form: ShelfForm) {
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
  return author.replace(/\s*\([^)]*\btr(?:ans)?\.[\s\S]*$/i, "").replace(/;.*$/, "").trim();
}

function yearPhrase(work: ShelfWork) {
  return work.year == null ? "" : `${work.year} `;
}

const INVITE_NORMS = [
  "sit with the world a moment before the first breath",
  "enter one room at a time",
  "let the first line arrive when you are ready",
  "the house is still dark",
  "a first sitting. start here",
  "a night sitting — let the dark arrive first",
  "a morning sitting — start before the day has an opinion",
  "a quiet sitting — no hurry toward the first line",
  "sit in the body a moment before the first line",
  "read as if walking — one sentence, then the next",
  "a soft sitting. nothing here asks you to be finished",
  "a short sitting. the door is close",
].map((line) => normCopy(line));

const HOOK_NORMS = new Set(Object.values(AUTHOR_HOOK).map((hook) => normCopy(hook)));

function normCopy(text: string) {
  return text
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[.!?…]+$/g, "")
    .trim();
}

function withoutInvitations(text: string) {
  let rest = normCopy(text);
  for (let i = 0; i < 4; i += 1) {
    const invite = INVITE_NORMS.find((line) => rest.endsWith(line));
    if (!invite) break;
    rest = rest.slice(0, -invite.length).trim().replace(/[.!?…]+$/g, "").trim();
  }
  return rest;
}

/** A label plus an author hook, or the hook alone. Not this book's own sentence. */
export function isAuthorHookLine(text: string): boolean {
  const rest = withoutInvitations(text);
  if (!rest) return false;
  if (HOOK_NORMS.has(rest)) return true;
  const colon = rest.lastIndexOf(": ");
  if (colon < 0) return false;
  const prefix = rest.slice(0, colon);
  const body = rest.slice(colon + 2);
  return HOOK_NORMS.has(body) && prefix.length > 0 && prefix.length <= 120 && !prefix.includes(". ");
}

/**
 * A template slot was left blank: "poems: .", "gathered as .", an empty author.
 * Ordinary possessives ("life's", "father's") are not empty slots.
 */
export function hasEmptyInterpolation(text: string): boolean {
  const copy = text.replace(/\s+/g, " ").trim();
  if (!copy) return false;
  return (
    /:\s*[.!?…](?:\s|$)/.test(copy) ||
    /gathered as\s*[.!?…]/i.test(copy) ||
    /^['’]s\b/.test(copy) ||
    /\(\s*\)/.test(copy)
  );
}

function generatedBlurb(work: ShelfWork): string {
  const who = shortAuthor(work.author);
  const title = work.title.replace(/\s+/g, " ").trim();
  if (!who || !title) return "";
  const form = formPhrase(work.form);
  const year = yearPhrase(work);
  let line = `${who}’s ${year}${form} ${title}.`;
  if (work.form === "stories") line = `${who}’s ${year}${form}, gathered as ${title}.`;
  else if (work.form === "poem") line = `${who}’s ${year}poems: ${title}.`;
  else if (work.form === "play") line = `${who}’s ${year}play ${title}.`;
  if (hasEmptyInterpolation(line)) return "";
  return oneSentence(line);
}

/** Keep a book's own sentence. Drop a borrowed author tagline or a blank slot. */
export function publishableCopy(text: string): string {
  const copy = text.replace(/\s+/g, " ").trim();
  if (!copy || isAuthorHookLine(copy) || hasEmptyInterpolation(copy)) return "";
  return copy;
}

function firstSentence(text: string): string {
  const sentence = oneSentence(text);
  if (!sentence || hasEmptyInterpolation(sentence)) return "";
  return sentence;
}

export function blurbFor(work: ShelfWork | string): string {
  const item = typeof work === "string" ? shelfWork(work) : work;
  if (!item) return "";
  const curated = publishableCopy(BLURBS[item.id] ?? "");
  if (curated) {
    // Content notes are the card, including a second sentence ("left as printed").
    if (/^A heads-up before you start\b/.test(curated)) return curated;
    const sentence = firstSentence(curated);
    if (sentence) return sentence;
  }
  const fromPitch = publishableCopy(PITCHES[item.id] ?? "");
  if (fromPitch) {
    const sentence = firstSentence(fromPitch);
    if (sentence) return sentence;
  }
  const fromRitual = publishableCopy(RITUAL_PITCHES[item.id] ?? "");
  if (fromRitual) {
    const sentence = firstSentence(fromRitual);
    if (sentence) return sentence;
  }
  const fromIntro = publishableCopy(item.intro ?? "");
  if (fromIntro) {
    const sentence = firstSentence(fromIntro);
    if (sentence) return sentence;
  }
  return generatedBlurb(item);
}

/** Line under a Ritual title. A card with no ritual pitch uses the shelf blurb. */
export function ritualCardPitch(id: string): string {
  const pitch = ritualPitchFor(id)?.replace(/\s+/g, " ").trim();
  if (pitch) return pitch;
  return blurbFor(id);
}

export function sentenceCount(text: string) {
  return splitSentences(holdCredits(text)).length;
}
