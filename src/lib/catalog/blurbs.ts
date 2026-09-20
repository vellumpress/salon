import { splitSentences } from "../sentences.ts";
import { PITCHES } from "./pitches.ts";
import { RITUAL_PITCHES } from "./rituals.ts";
import { shelfWork, type ShelfForm, type ShelfWork } from "./shelf.ts";

const MIN_BLURB = 24;

/** Homepage one-sentence synopses. Overrides pitch/ritual/intro when present. */
const BLURBS: Record<string, string> = {
  basilio:
    "Mary Jane Serrano’s 1889 Dragon’s Teeth is the only ≤1930 English of O Primo Basílio — a bowdlerized Victorian cut, not a modern Cousin Basilio.",
  vengeance:
    "Asch’s Yiddish theater of desire and shame: a house of pleasure that wants respectability while the room keeps score.",
  naomi:
    "In Tokyo, a husband remakes a young woman into the Western ideal he cannot stop wanting.",
  odessa:
    "Babel’s Black Sea city: gangsters, sun, and sudden violence between jokes.",
  we: "Zamyatin’s glass city of perfect numbers learns what a soul costs.",
  manhattan: "Dos Passos cuts New York as montage: arrivals, ads, and lives slicing across each other.",
  tropic:
    "Walrond’s Caribbean stories of color, labor, and heat that refuse soft focus.",
  berlin:
    "Berlin talks through Franz Biberkopf after prison — noise, politics, and fate in Döblin’s street choir.",
  passing:
    "Larsen’s two women, one secret, and the color line drawn through friendship.",
  quicksand:
    "Eight in the evening in Naxos: Helga Crane sits alone and will not open the door.",
  "attendants-confession":
    "A marked man offers a human document—and asks you not to publish it until he’s dead.",
  rashomon:
    "Evening under Rashōmon—one lackey waiting out the rain, and no one else in the gate.",
  "high-wind-jamaica":
    "After Emancipation, Derby Hill is swallowed by bush until a rank plant holds the front door open.",
  "noli-me-tangere":
    "Capitan Tiago announces a dinner at the last minute—and all of Binondo, the Walled City, and Manila’s hangers-on begin polishing shoes and rehearsing intimacy.",
  madmen:
    "Arlt’s Buenos Aires invents a prophet of chaos and the men who follow him.",
  gold:
    "Michael Gold’s Lower East Side childhood: tenements, hunger, and a street that never lets a boy stay innocent.",
  crime:
    "A student tests the right to kill — and cannot live with the answer.",
  dorian:
    "Wilde’s beautiful face stays young while the portrait keeps the score.",
  bovary:
    "Provincial longing, debt, and the romance novels that ruin a life.",
  dracula:
    "Letters and journals track a count who crosses into England hungry.",
  anna: "Passion against the grain of society — and the train that waits at the end.",
  underground:
    "A spiteful man talks himself into a corner and will not leave.",
  "a-room-with-a-view":
    "Florence light, English manners, and a kiss that rearranges a carefully planned life.",
  "liza-of-lambeth":
    "A factory girl in Lambeth learns how little the street forgives.",
  banjo:
    "Marseille quays, a banjo on the strap — McKay’s Black Atlantic without a neat plot.",
  "in-our-time":
    "Nick Adams stories with war vignettes snapped in like news photos — Hemingway’s early cuts.",
  cheri:
    "Colette’s aging beauty and her younger lover in a Paris of pearls and appetite.",
  liliom:
    "A carousel barker, a cheap room, and a day-pass from the dead — Molnár’s rough tenderness.",
  "the-cherry-orchard":
    "A Russian estate in blossom — Chekhov’s family cannot keep the orchard they still call home.",
  "african-farm":
    "On a Karoo farm, two children grow up against religion, land, and a sky that will not blink.",
  "bel-ami":
    "A handsome arriviste climbs Paris on other people’s beds and other people’s newspapers.",
  "miss-julie":
    "Midsummer night in the kitchen: a count’s daughter and a valet bet the house on desire.",
  wallpaper:
    "A rented room, a yellow pattern, and a mind under careful watch.",
  "miss-brill-adapted":
    "A camel coat, a river-park bench, and a couple who tell the afternoon what she is.",
  "prefer-not":
    "A midtown clerk prefers not to — and a gentle office learns the shape of its limits.",
  "late-season":
    "Off-season Cape May, a small white dog, and an affair that will not stay temporary.",
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
  botchan:
    "A hot-headed Tokyo teacher is posted to the provinces and refuses to learn the local game.",
  "post-office":
    "A sick boy keeps the village post office of the mind — Tagore’s small play of waiting.",
  underdogs:
    "Azuela rides with Pancho Villa’s men and writes the revolution without a victory speech.",
  rur: "A factory makes artificial workers; the workers decide they are the future.",
  "bread-givers":
    "A Hester Street daughter fights a father, a language, and the right to own her own name.",
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
    "A small-town girl arrives in Chicago and learns what the city charges for a rise.",
  falcon:
    "Spade keeps the falcon, the lies, and the one rule he will not break for a woman.",
  "winesburg-ohio":
    "A Midwest town speaks in grotesques — people who almost said the true thing.",
  "my-antonia":
    "Nebraska prairie, immigrant labor, and a girl who outlasts the men who remember her.",
  "o-pioneers":
    "Alexandra Bergson stays with the land when everyone else wants to leave it.",
  "death-comes-for-the-archbishop":
    "A bishop’s long work in New Mexico light — faith, friendship, and the mesa’s weather.",
  "the-bridge-of-san-luis-rey":
    "Five travellers fall from a Peruvian bridge — Wilder asks whether those lives were accident or intention.",
  "the-sun-also-rises":
    "Paris cafés, Pamplona heat, and Jake Barnes narrating what he cannot touch.",
  "lolly-willowes":
    "An aunt refuses the spare room — Warner’s witchcraft as a woman reclaiming her hours.",
  "plum-bun":
    "Opal Street, a Philadelphia parlor, and the cost of passing told from inside the family.",
  "the-secret-agent":
    "Conrad’s London anarchists, a shop in Soho, and a bomb that lands on the wrong person.",
  "heart-of-darkness":
    "A steamer upriver toward a man the company still calls its agent.",
  "the-island-of-doctor-moreau":
    "A Pacific island where a doctor teaches beasts to walk like men.",
  "the-time-machine":
    "A machine, a dinner table, and a future split between Eloi and Morlocks.",
  "the-war-of-the-worlds":
    "Martians land in the Home Counties and London learns it is not the center.",
  "the-invisible-man":
    "A chemist disappears — then the bandages, and the terror, come off.",
  "sons-and-lovers":
    "A Nottingham miner’s son cannot leave his mother’s claim on him.",
  "women-in-love":
    "Two sisters, two men, and Lawrence’s argument about what a life together costs.",
  "howards-end":
    "Who will inherit the house — and the England attached to it.",
  "a-portrait-of-the-artist-as-a-young-man":
    "Stephen Dedalus talks his way out of church, family, and Ireland.",
  dubliners: "Joyce’s city in fifteen stories that end just after the truth arrives.",
  ulysses: "One Dublin day, walked until language itself starts to sweat.",
  "the-voyage-out": "A young woman sails toward a first love and does not sail home unchanged.",
  "jacob-s-room": "Woolf builds a man from the rooms and people he has already left.",
  "night-and-day": "London talk, two couples, and the long negotiation of who gets to want what.",
  "monday-or-tuesday": "Short Woolf pieces that catch a mind in the act of looking.",
  "of-human-bondage": "A club foot, a medical student, and a love that humiliates on purpose.",
  "the-moon-and-sixpence": "A stockbroker walks out of a life to paint — Maugham’s Gauguin rumor.",
  "the-magician": "Paris occult, a charlatan who might not be, and a marriage that becomes a dare.",
  "the-old-wives-tale": "Two sisters from the Five Towns, told across a whole ordinary century.",
  "the-man-who-was-thursday": "A poet-detective joins a council of anarchists who keep turning into jokes.",
  "the-innocence-of-father-brown": "A small priest sees the crime because he knows the sinner from the inside.",
  "the-good-soldier": "Ford’s narrator tells a story of passion and keeps discovering he had it wrong.",
  "pointed-roofs": "Miriam Henderson goes to Germany as a pupil-teacher and starts a life in sentences.",
  "the-autobiography-of-an-ex-colored-man":
    "A musician chooses passing, then has to live inside the choice.",
  blacker: "Thurman on colorism inside Harlem — a dark-skinned woman and the rooms that grade her.",
  "hungry-hearts":
    "Yezierska’s immigrant women hungry for English, rooms, and a self that is not a sacrifice.",
  "children-of-loneliness":
    "More Yezierska stories of the jump from tenement to the lonely side of American education.",
  herland: "Three men find a country of women and discover they are the joke.",
  "the-jungle": "Chicago stockyards, an immigrant family, and the machine that eats them.",
  arrowsmith: "A doctor tries to stay honest inside American medicine’s hustle.",
  "the-custom-of-the-country":
    "Undine Spragg wants the next room, the next husband, the next New York.",
  summer: "A New England town, a librarian’s charge, and a season that will not stay innocent.",
  "the-reef": "Wharton in France: desire among people who thought they had already chosen.",
  "bunner-sisters": "Two shopwomen on a poor New York street, and a kindness that ruins them.",
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
  "flappers-and-philosophers": "Fitzgerald’s early stories of parties that already know they will end.",
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
  mhudi: "Plaatje’s Tswana epic of war, cattle, and a woman who will not be a footnote.",
  "african-tragedy": "Dhlomo’s short novel of a mine, a city, and a life that cannot go home clean.",
  "kwaidan-stories-and-studies-of-strange-things":
    "Hearn’s Japan after dark: soft-spoken ghosts, fox wives, and studies that prefer a whisper.",
  "chita-a-memory-of-last-island":
    "A Gulf storm erases a Louisiana island; a child is left in the wreckage.",
  "the-rubaiyat-of-omar-khayyam":
    "FitzGerald’s Omar wakes in the bowl of night and pours the morning wine.",
  "songs-of-innocence-and-of-experience":
    "Blake’s paired songs: nursery light on one side, harder truths on the other.",
  "spring-and-all":
    "Williams on the road to the contagious hospital, watching the first green push through.",
  "a-few-figs-from-thistles":
    "Millay burns her candle at both ends and means it.",
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
  gitanjali: "Tagore’s song offerings settle the breath without a sermon.",
  "songs-of-kabir":
    "Kabir, through Tagore’s English: mystic poems that don’t need a church.",
  "pictures-of-the-floating-world":
    "Lowell’s lacquer prints and quiet looking — Japan as color, surface, and pause.",
  silhouettes: "Symons at Dieppe and other soft-focus shores.",
  "the-garden-party-and-other-stories":
    "Mansfield mornings: party light, then a turn toward the lane you weren’t meant to notice.",
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
  magnhild: "A mountain parish, a girl, and the quiet Norwegian weather of a life.",
  "the-family-at-gilje":
    "A Norwegian official’s household where daughters wait on other people’s decisions.",
  "after-the-divorce":
    "Sardinia after a conviction: a marriage legally ended and still occupying the house.",
  "the-lodger":
    "A London couple take a quiet lodger and begin to wonder about the murders outside.",
  "the-king-in-yellow":
    "A play that ruins its readers, and stories that catch the yellow stain.",
  mcteague: "A Polk Street dentist, gold, and a marriage that turns to greed and heat.",
  "the-sea-wolf": "A ferry wreck, a sealing schooner, and a captain who philosophizes with his fists.",
  "martin-eden": "A sailor educates himself into a writer and finds the prize is hollow.",
  "the-iron-heel": "London’s oligarchy of the future, told as a warning already coming true.",
  "the-open-boat-and-other-stories":
    "Crane’s men in a dinghy, and other stories that refuse a consoling shore.",
  maggie: "A girl of the New York streets, written without the usual apology.",
  "the-red-badge-of-courage": "A boy goes to war to feel a wound that would prove he was there.",
  "the-scarlet-letter": "A Massachusetts scaffold, a child, and a letter that will not come off.",
  "moby-dick": "A captain hunts a whale and takes the ship with him.",
  "the-adventures-of-huckleberry-finn":
    "A boy and a man on a raft, heading south through a country that will not let them be.",
  "pride-and-prejudice": "A country dance, a proud man, and the long work of being wrong about someone.",
  frankenstein: "A student makes a creature and then refuses to be its father.",
  "jane-eyre": "A governess with no fortune and a house that answers back.",
  "wuthering-heights": "Two houses on the moor, and a love that does not stay in its grave.",
  "great-expectations": "A boy is told he has prospects, and the source of them is the point.",
  "crime-and-punishment":
    "A student tests the right to kill — and cannot live with the answer.",
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
  kim: "An Irish boy in India learns the Great Game between the bazaar and the hills.",
  "plain-tales-from-the-hills":
    "Kipling’s Simla and cantonment stories — gossip with the empire still in the room.",
  she: "Ayesha waits in a lost city for a man who has already died once.",
  "the-monk": "A Madrid abbey, a holy man, and the devil’s long patience.",
  carmilla: "A lonely schloss, a guest who arrives by carriage wreck, and a thirst.",
  "uncle-silas": "A ward sent to a gloomy uncle, and a house that is already a plot.",
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
  "daisy-miller": "An American girl in Europe who will not take the warning.",
  "the-portrait-of-a-lady": "An heiress is free to choose, and the choice is the trap.",
  "lord-jim": "A jump from a sinking ship that a man spends the rest of his life explaining.",
  nostromo: "A silver mine, a republic, and the men who cannot put the metal down.",
  typhoon: "A steamer into a storm, and a captain too stubborn to have an imagination.",
  "almayer-s-folly": "A European on a Borneo river, waiting for a fortune that will not come.",
  "an-outcast-of-the-islands": "Conrad’s archipelago of men who have already been thrown out once.",
  "under-western-eyes": "A student in Geneva, a betrayal in Russia, and the west watching.",
  "the-shadow-line": "A first command, a becalmed ship, and the line between youth and the job.",
  "the-arrow-of-gold": "Conrad’s Carlist Marseille: a woman, a cause, and streets with a reputation.",
  "the-rover": "An aging seaman comes into Toulon when the Revolution is already a weather.",
  "the-rescue": "Conrad returns to the islands: a yacht, a lagoon, and a rescue that costs.",
  "within-the-tides": "Shorter Conrad: coasts, debts, and men who arrive too late.",
  "twixt-land-and-sea": "Conrad stories of captains between a berth and a shore they cannot trust.",
  "a-set-of-six": "Six Conrad tales of spies, duels, and the joke that isn’t.",
  "tales-of-unrest": "Early Conrad: outposts where the climate is already an argument.",
  "new-arabian-nights": "Stevenson’s London and Paris as a game of disguises and clubs.",
  "the-master-of-ballantrae": "Two Scottish brothers, a war, and a hatred that outlives the estate.",
  catriona: "David Balfour again, now in love and in Dutch and Scottish trouble.",
  "the-black-arrow": "Wars of the Roses, a young man, and a company that shoots from the woods.",
  "the-merry-men-and-other-tales-and-fables":
    "Stevenson tales of wreckers, islands, and weather that wants a share.",
  "island-nights-entertainments": "South Sea stories: a bottle, a beach, and a bargain.",
  "treasure-island": "A map, a mutiny, and a boy who keeps the ship’s accounts in his head.",
  "kidnapped": "A kidnapped heir walks Scotland with an outlaw who will not shut up.",
  "the-strange-case-of-dr-jekyll-and-mr-hyde":
    "A respectable doctor finds a door in himself and walks through it.",
  "hard-times": "Coketown, facts, and a circus that knows more than the school.",
  "little-dorrit": "A child of the Marshalsea, a family of prisoners who are not all inside.",
  "our-mutual-friend": "A drowned man, a dust heap, and London’s money in the river.",
  "the-mystery-of-edwin-drood": "A cathedral town, an opium habit, and a nephew who disappears.",
  "barnaby-rudge": "Gordon riots, a raven, and a simple man in a complicated mob.",
  "northanger-abbey": "A girl trained on gothic novels visits a house that is only a house — maybe.",
  "lady-susan": "A widow writes her way through other people’s marriages.",
  "agnes-grey": "A governess with no plot armor, only the work.",
  "the-tenant-of-wildfell-hall":
    "A woman leaves a drunken husband and paints for a living — scandal enough.",
  "the-professor": "Charlotte Brontë’s Brussels schoolroom, before Jane Eyre made it famous.",
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
  "kipps": "A draper’s assistant comes into money and does not know which fork is the trap.",
  "tono-bungay": "A patent medicine fortune, and Wells taking England apart from the inside.",
  "ann-veronica": "A young woman walks out of her father’s house and into the century.",
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
  "the-hill-of-dreams": "A Welsh writer ruins himself on a Roman hill and a London room.",
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
  harmonium: "Stevens’ first book: Florida light, Hartford mind, the jar on the hill.",
  color: "Cullen’s first poems of race, beauty, and the God who may not be looking.",
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
  "the-farmer-s-bride": "Charlotte Mew: a marriage, a silence, and a voice that will not soften it.",
  "look-we-have-come-through": "Lawrence’s poems of a marriage that is also a war.",
  "the-white-peacock": "Lawrence’s first novel: Midlands fields and a love that will not sit.",
  "the-lost-girl": "A Midlands woman leaves for Italy and a life the town cannot name.",
  "the-plumed-serpent": "Lawrence in Mexico, looking for a god the tourists didn’t pack.",
  "the-prussian-officer-and-other-stories":
    "Lawrence stories of soldiers, mines, and the body as an argument.",
  "the-longest-journey": "Forster’s Cambridge, a brother, and a life that keeps choosing the wrong loyalty.",
  "the-celestial-omnibus-and-other-stories": "Forster fantasies where a bus might actually go to heaven.",
  "the-eternal-moment-and-other-stories": "Later Forster stories of Italy, time, and the thing you didn’t say.",
  "where-angels-fear-to-tread": "English visitors in Italy, and a baby who becomes a battlefield.",
  "a-passage-to-india": "A cave, an accusation, and the empire failing a friendship.",
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
  "anna-of-the-five-towns": "A Methodist fortune, a girl, and the town’s idea of goodness.",
  "riceyman-steps": "A Clerkenwell bookseller, a miser, and a marriage in a shop of dust.",
  "the-four-million": "O. Henry’s New York of clerks, cops, and the gift that arrives on time.",
  "the-trimmed-lamp-and-other-stories-of-the-four-million":
    "More of the four million: shopgirls, rooms, and a twist you can see coming and still feel.",
  "the-voice-of-the-city": "O. Henry listening to New York as if it were a single talker.",
  "sixes-and-sevens": "Later O. Henry: the same city, a little more tired.",
  "cabbages-and-kings": "O. Henry in a banana republic of his own invention.",
  "heart-of-the-west": "O. Henry goes west and still hears New York in the punchline.",
  "the-gentle-grafter": "A con man with manners, working the American joke.",
  "roads-of-destiny": "O. Henry on the roads that fork, then fork again.",
  whirligigs: "More O. Henry machinery: spin, snap, done.",
  "the-conjure-woman": "Chesnutt’s Uncle Julius, a plantation, and a conjure that is also a negotiation.",
  "the-wife-of-his-youth-and-other-stories-of-the-color-line":
    "Chesnutt on the color line as a social science with a knife in it.",
  "the-house-behind-the-cedars": "Passing in the Carolinas, and a family that cannot both be seen.",
  "the-marrow-of-tradition": "Wilmington 1898: a novel that remembers a massacre the papers called a riot.",
  "folks-from-dixie": "Dunbar’s stories of Black life after slavery, without the plantation smile.",
  "the-complete-poems-of-paul-laurence-dunbar":
    "Dunbar’s lyrics in dialect and in the English he was told not to waste.",
  "the-sport-of-the-gods": "A Black family north to New York, and the city that was supposed to be better.",
  "iola-leroy": "A woman of mixed race after the war, choosing a people instead of a pass.",
  "of-one-blood": "Hopkins’ Boston and Meroe: a mystery of race that goes underground.",
  "imperium-in-imperio": "Griggs’ secret Black nation inside the United States — a political thought-experiment.",
  cane: "Toomer’s Georgia and Washington in poems, stories, and the space between.",
  "the-quest-of-the-silver-fleece": "Du Bois’ cotton novel: a crop, a school, and the northern money in it.",
  "main-travelled-roads": "Garland’s Midwest farms, without the calendar art.",
  "the-country-of-the-pointed-firs": "Jewett’s Maine harbor, visited slowly, left with the tide.",
  "a-hazard-of-new-fortunes": "Howells’ New York magazine, a strike, and the comfortable people watching.",
  "old-creole-days": "Cable’s New Orleans stories: French, Spanish, and the color line in the same street.",
  "a-night-in-acadie": "Chopin’s Louisiana: heat, Catholic rooms, and women who already know the cost.",
  "the-awakening": "Edna Pontellier swims out from a marriage and does not swim back.",
  "the-damnation-of-theron-ware":
    "A Methodist minister in a New York town meets ideas he cannot put back.",
  "the-king-of-schnorrers-grotesques-and-fantasies":
    "Zangwill’s beggar-king of London Jews — comedy with a ledger.",
  "ghetto-comedies": "More Zangwill: the East End as a theater that bills itself as life.",
  "reuben-sachs": "Amy Levy’s Anglo-Jewish London, unsentimental about the marriage market.",
  "the-romance-of-a-shop": "Four sisters open a photography shop and try to live by the work.",
  "the-heavenly-twins": "Sarah Grand’s New Woman novel: marriage as a public health problem.",
  "the-beth-book": "A girl artist against the available script for daughters.",
  keynotes: "George Egerton’s New Woman stories — desire written without asking permission.",
  "the-woman-who-did": "Grant Allen’s heroine who will not marry, and the novel that made a scandal of it.",
  "the-green-carnation": "Hichens’ satire of the Wilde circle, published while the trial was still a weather.",
  "the-sorrows-of-satan": "Corelli’s bestseller: the devil in London society, taking notes.",
  "the-gadfly": "Voynich’s Italy of conspirators, a priest, and a son who will not forgive the church.",
  "esther-waters": "A servant has a child and keeps it — Moore’s London without the varnish.",
  "south-wind": "Capri as a talking shop: Douglas’s island of people who have already left England.",
  "a-voyage-to-arcturus": "Lindsay’s planet of colors that are also moral tests.",
  "uncanny-stories": "May Sinclair’s ghost stories from a psychologist’s side of the veil.",
  widdershins: "Oliver Onions: hauntings that feel like an idea you cannot put down.",
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
  "a-lost-lady": "A beautiful woman in a prairie town, remembered by a boy who cannot save her.",
  "the-troll-garden-and-selected-stories": "Early Cather: artists, hunger, and the Midwest watching.",
  "youth-and-the-bright-medusa": "Cather stories of artists who got away — and what they paid.",
  "my-mortal-enemy": "A woman who married for love and lives to call it the enemy.",
  "alexander-s-bridge": "Cather’s first novel: an engineer, two women, and a bridge that will not hold.",
  "poor-white": "Anderson’s Midwest inventor, watching the factory arrive.",
  "horses-and-men": "Anderson stories of animals, men, and the feeling that doesn’t speak.",
  "vandover-and-the-brute": "Norris’s San Francisco: a young man sliding toward the animal he fears.",
  "moon-face-and-other-stories": "London stories of faces, feuds, and the north.",
  "pudd-nhead-wilson": "A switched baby in a Missouri town, and a lawyer who collects fingerprints.",
  "the-mysterious-stranger": "Twain’s late fable: an angel who is not a comfort.",
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
  "tales-volumes-1-2": "Poe’s tales as a set: ratiocination, collapse, and the house that falls.",
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
  "the-getting-of-wisdom": "A Melbourne schoolgirl learns the lessons that are not on the timetable.",
  "for-the-term-of-his-natural-life":
    "A transported man in Van Diemen’s Land, and a sentence that is the country.",
  "the-man-from-snowy-river": "Paterson’s bush ballads: a ride, a horse, a legend already moving.",
  "the-purple-land": "Hudson’s Uruguay: an Englishman wandering a country that is not a backdrop.",
  "malay-sketches": "Swettenham’s peninsula: colonial notes that cannot quite own the place.",
  "in-court-and-kampong": "Clifford’s Malay world: court, village, and the Englishman taking dictation.",
  "malay-annals-sejarah-melayu": "The Sejarah Melayu: kings, cities, and the peninsula remembering itself.",
  "the-autobiography-of-munshi-abdullah-hikayat-abdullah":
    "Abdullah’s life between Malay courts and the English press.",
  "the-book-of-the-birds-paksi-pakaranam": "A Siamese bird epic, in Crosby’s English.",
  "laos-folk-lore-of-farther-india": "Fleeson’s Lao tales, collected as if the hills were a library.",
  "jamaican-song-and-story": "Jekyll’s Anansi, songs, and the island talking in two tongues.",
  "jamaica-anansi-stories": "Beckwith’s Anansi: spider, trickster, and the story that walks.",
  "south-african-folk-tales": "Honey’s collection of southern African tales, animals arguing like people.",
  "west-african-folk-tales": "Gold Coast stories of spider, tortoise, and the bargain.",
  "sappho-one-hundred-lyrics": "Carman’s Sappho reconstructions — fragments turned into a book of desire.",
  "a-japanese-nightingale": "Winnifred Eaton’s Japan-set romance, written from a Canadian Chinese life.",
  "the-book-of-khalid": "Rihani’s New York and Lebanon: a Khalid who will not pick one world.",
  "the-red-gods": "Jean d’Esme’s Indochina adventure, imperial heat included.",
  "poems-in-prose": "Baudelaire’s Paris in Symons’ English — spleen, crowds, and the gaslight.",
  "poems-hot-houses-bernard-miall": "Maeterlinck’s hothouse poems, glassed in and breathing strangely.",
  "poems-of-emile-verhaeren": "Verhaeren’s Flanders of rain, factories, and the long-drawn line.",
  "poems-jessie-lemont-translation": "Rilke in Lemont’s English: angels, rooms, and the look that stays.",
  "ara-vus-prec": "Eliot’s 1920 London poems — quatrains, Sweeney, and the nerves of a city.",
  "the-tower": "Yeats’s later book: a tower, a winding stair, and history at the door.",
  "the-wind-among-the-reeds": "Early Yeats: the sidhe, the reeds, a Ireland still half-myth.",
  "stories-of-red-hanrahan": "Yeats’s Hanrahan: a poet cursed into wandering his own country.",
  "irish-fairy-tales": "Stephens retelling the old Irish cycles as if they were still in the next field.",
  "the-crock-of-gold": "Stephens’ philosophers, leprechauns, and a policeman who wanders into myth.",
  deirdre: "Stephens’ Deirdre: the face that starts a war, told without Victorian blush.",
  "a-dreamer-s-tales": "Dunsany’s invented East and the gods who are already bored of us.",
  "lord-arthur-savile-s-crime": "Wilde’s cheiromantist tells a man he will murder — so he tries to get it over with.",
  "the-ballad-of-reading-gaol": "Wilde after prison: a hanging, a yard, and the man who had to watch.",
  "a-house-of-pomegranates": "Wilde’s later fairy tales, jeweled and not for children only.",
  "in-a-german-pension": "Mansfield’s first book: a New Zealander watching Germans at table.",
  "the-imported-bridegroom-and-other-stories-of-the-new-york-ghetto":
    "Cahan’s East Side: a Talmudist imported for a daughter, and the America that unmakes him.",
};

/** Concrete author-level line when a work has no curated sentence. */
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

export function oneSentence(text: string): string {
  const copy = usable(text);
  if (!copy) return "";
  const first = (splitSentences(copy, 1)[0] ?? "").trim();
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
  return author.replace(/\s*\([^)]*tr\.[\s\S]*$/i, "").replace(/;.*$/, "").trim();
}

function generatedBlurb(work: ShelfWork): string {
  const hook = AUTHOR_HOOK[work.author];
  if (hook) return oneSentence(`${work.title} (${work.year}): ${hook}.`);
  const who = shortAuthor(work.author);
  const form = formPhrase(work.form);
  if (work.form === "stories") {
    return oneSentence(`${who}’s ${work.year} ${form}, gathered as ${work.title}.`);
  }
  if (work.form === "poem") {
    return oneSentence(`${who}’s ${work.year} poems: ${work.title}.`);
  }
  if (work.form === "play") {
    return oneSentence(`${who}’s ${work.year} play ${work.title}.`);
  }
  return oneSentence(`${who}’s ${work.year} ${form} ${work.title}.`);
}

export function blurbFor(work: ShelfWork | string): string {
  const item = typeof work === "string" ? shelfWork(work) : work;
  if (!item) return "";
  const curated = BLURBS[item.id];
  if (curated) return oneSentence(curated);
  const fromPitch = oneSentence(PITCHES[item.id] ?? "");
  if (fromPitch) return fromPitch;
  const fromRitual = oneSentence(RITUAL_PITCHES[item.id] ?? "");
  if (fromRitual) return fromRitual;
  const fromIntro = oneSentence(item.intro ?? "");
  if (fromIntro) return fromIntro;
  return generatedBlurb(item);
}

export function sentenceCount(text: string) {
  return splitSentences(text).length;
}
