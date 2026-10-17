/**
 * Breath indexes a lit passage may end on and must not continue past.
 * One list per book: the opening sit, and the ritual sitting when that
 * ends on a different breath. Scene ends are included so a passage cannot
 * step into the next scene. A cut is a character end inside a breath when
 * the sit stops before that breath does. Checked against the binds by
 * merge-stop-index.test.ts.
 */

export const MERGE_STOP_INDEX: Readonly<Record<string, readonly number[]>> = {
  "a-book-barnes": [
    80
  ],
  "a-boy-s-will": [
    91
  ],
  "a-changed-man": [
    3
  ],
  "a-diversity-of-creatures": [
    15
  ],
  "a-dreamer-s-tales": [
    88
  ],
  "a-farewell-to-arms": [
    41
  ],
  "a-few-figs-from-thistles": [
    0
  ],
  "a-group-of-noble-dames": [
    292
  ],
  "a-happy-boy": [
    57
  ],
  "a-hazard-of-new-fortunes": [
    95
  ],
  "a-hero-of-our-time": [
    56
  ],
  "a-house-of-gentlefolk": [
    21
  ],
  "a-house-of-pomegranates": [
    95
  ],
  "a-hundred-and-seventy-chinese-poems": [
    3
  ],
  "a-hungarian-nabob": [
    47
  ],
  "a-japanese-blossom": [
    41
  ],
  "a-japanese-nightingale": [
    12
  ],
  "a-laodicean": [
    95
  ],
  "a-london-life-and-other-tales": [
    95
  ],
  "a-lost-lady": [
    38
  ],
  "a-night-in-acadie": [
    95
  ],
  "a-passage-to-india": [
    95
  ],
  "a-portrait-of-the-artist-as-a-young-man": [
    95
  ],
  "a-room-with-a-view": [
    21
  ],
  "a-russian-gentleman": [
    4
  ],
  "a-set-of-six": [
    13
  ],
  "a-thin-ghost-and-others": [
    95
  ],
  "a-voyage-to-arcturus": [
    95
  ],
  "adam-eve-pinch-me": [
    95
  ],
  "african-farm": [
    95
  ],
  "african-tragedy": [
    95
  ],
  "after-the-divorce": [
    24
  ],
  "agnes-grey": [
    95
  ],
  "al-que-quiere": [
    88
  ],
  "alice-adams": [
    40
  ],
  "all-quiet-on-the-western-front": [
    47
  ],
  "all-the-sad-young-men": [
    94
  ],
  "almayer-s-folly": [
    95
  ],
  "almayers-folly": [
    7
  ],
  "an-american-tragedy": [
    36
  ],
  "an-iceland-fisherman": [
    46
  ],
  "an-outcast-of-the-islands": [
    143
  ],
  "anandamath": [
    95
  ],
  "ann-veronica": [
    17
  ],
  "anna-of-the-five-towns": [
    18
  ],
  "annals-of-the-parish": [
    18
  ],
  "anne-of-green-gables": [
    20
  ],
  "antic-hay": [
    11
  ],
  "aphrodite": [
    107
  ],
  "aquarium": [
    95
  ],
  "ara-vus-prec": [
    94
  ],
  "arne": [
    6
  ],
  "arrowsmith": [
    95
  ],
  "artists-wives": [
    46
  ],
  "attendants-confession": [
    9
  ],
  "ballads-of-a-bohemian": [
    26
  ],
  "ballads-of-a-cheechako": [
    4
  ],
  "banjo": [
    95
  ],
  "barnaby-rudge": [
    95
  ],
  "basilio": [
    47
  ],
  "baudelaire-prose-and-poetry": [
    4
  ],
  "bay-a-book-of-poems": [
    31
  ],
  "beasts-and-super-beasts": [
    95
  ],
  "before-adam": [
    21
  ],
  "bel-ami": [
    95
  ],
  "bella-donna": [
    19
  ],
  "berlin": [
    95
  ],
  "bertha-garlan": [
    104
  ],
  "billy-budd": [
    6
  ],
  "blacker": [
    47
  ],
  "bliss": [
    163
  ],
  "bliss-and-other-stories": [
    163
  ],
  "blix": [
    46
  ],
  "blood-and-sand": [
    377
  ],
  "body-of-this-death": [
    86
  ],
  "born-in-exile": [
    26
  ],
  "botchan": [
    17
  ],
  "brazilian-tales": [
    61
  ],
  "bread-givers": [
    95
  ],
  "buddenbrooks": [
    33
  ],
  "bunner-sisters": [
    23
  ],
  "cabbages-and-kings": [
    9
  ],
  "caesar-or-nothing": [
    108
  ],
  "calvary": [
    5
  ],
  "can-grande-s-castle": [
    95
  ],
  "can-such-things-be": [
    95
  ],
  "candide": [
    7
  ],
  "cane": [
    8
  ],
  "canzoni-ripostes": [
    84
  ],
  "captain-blood": [
    10
  ],
  "captain-craig": [
    85
  ],
  "captains-courageous": [
    33
  ],
  "carmilla": [
    55
  ],
  "carnacki-the-ghost-finder": [
    95
  ],
  "casanovas-homecoming": [
    4
  ],
  "catriona": [
    95
  ],
  "charmides-and-other-poems": [
    22
  ],
  "cheri": [
    95
  ],
  "chicago-poems": [
    93
  ],
  "children-of-loneliness": [
    95
  ],
  "children-of-the-frost": [
    21
  ],
  "children-of-the-soil": [
    15
  ],
  "chinese-literature": [
    34
  ],
  "chita-a-memory-of-last-island": [
    95
  ],
  "christine-of-the-hills": [
    27
  ],
  "clayhanger": [
    95
  ],
  "clorinda-walks-in-heaven": [
    95
  ],
  "colonel-chabert": [
    94
  ],
  "colonels-dream": [
    10
  ],
  "color": [
    13
  ],
  "comedies-incl-jeppe-of-the-hill": [
    49
  ],
  "conference": [
    29
  ],
  "constab-ballads": [
    88
  ],
  "copper-sun": [
    18
  ],
  "cosmopolis": [
    6
  ],
  "cousin-betty": [
    23
  ],
  "cranford": [
    15
  ],
  "creative-unity": [
    64
  ],
  "crime-and-punishment": [
    6
  ],
  "crucial-instances": [
    148
  ],
  "daisy-miller": [
    13
  ],
  "dalloway": [
    95
  ],
  "dangerous-ages": [
    95
  ],
  "daniel-deronda": [
    53
  ],
  "dark-of-the-moon": [
    86
  ],
  "dauber": [
    65
  ],
  "daughters-of-men": [
    9
  ],
  "day-and-night-stories": [
    44
  ],
  "death-comes-for-the-archbishop": [
    94
  ],
  "death-in-venice": [
    4
  ],
  "deephaven": [
    18
  ],
  "deirdre": [
    95
  ],
  "demian": [
    90
  ],
  "desperate-remedies": [
    94
  ],
  "diary-of-a-chambermaid": [
    171
  ],
  "ditte-girl-alive": [
    19
  ],
  "doctor-luke-of-the-labrador": [
    10
  ],
  "doctor-pascal": [
    9
  ],
  "doom-castle": [
    23
  ],
  "dracula": [
    7
  ],
  "dreams-schreiner": [
    21
  ],
  "dubliners": [
    36
  ],
  "dusty-answer": [
    31
  ],
  "easter": [
    307
  ],
  "ecstasy": [
    62
  ],
  "el-ombu": [
    8
  ],
  "eline-vere": [
    22
  ],
  "elmer-gantry": [
    21
  ],
  "embarrassments": [
    95
  ],
  "enchanted-april": [
    47
  ],
  "erewhon": [
    8
  ],
  "essays-and-soliloquies": [
    51
  ],
  "esther-waters": [
    6
  ],
  "ethan-frome": [
    95
  ],
  "eugene-onegin": [
    89
  ],
  "eugenie-grandet": [
    6
  ],
  "eves-ransom": [
    78
  ],
  "exultations": [
    87
  ],
  "fairies-and-fusiliers": [
    3
  ],
  "falcon": [
    34
  ],
  "family-at-gilje": [
    10
  ],
  "famous-modern-ghost-stories": [
    95
  ],
  "fanshawe": [
    95
  ],
  "fantasy": [
    18
  ],
  "farewell-love": [
    29
  ],
  "faust-part-i": [
    19
  ],
  "fifty-one-tales": [
    5
  ],
  "filipino-popular-tales": [
    13
  ],
  "fir-flower-tablets": [
    0
  ],
  "flame-and-shadow": [
    89
  ],
  "flappers-and-philosophers": [
    303
  ],
  "folks-from-dixie": [
    95
  ],
  "for-the-term-of-his-natural-life": [
    8
  ],
  "fraternity": [
    135
  ],
  "fraulein-schmidt-and-mr-anstruther": [
    17
  ],
  "free-and-other-stories": [
    94
  ],
  "friendship-village": [
    24
  ],
  "froth": [
    13
  ],
  "futility": [
    33
  ],
  "garman-and-worse": [
    27
  ],
  "garram-the-hunter": [
    13
  ],
  "gatsby": [
    94
  ],
  "general-william-booth-enters-into-heaven-and-other-poems": [
    95
  ],
  "generosity": [
    75
  ],
  "gentlemen-prefer-blondes": [
    37
  ],
  "germinal": [
    11
  ],
  "ghetto-comedies": [
    95
  ],
  "ghost-stories-of-an-antiquary": [
    95
  ],
  "gitanjali": [
    18
  ],
  "goblin-market-and-other-poems": [
    89
  ],
  "goblins-and-pagodas": [
    95
  ],
  "gods-trombones": [
    7
  ],
  "gold": [
    95
  ],
  "gone-to-earth": [
    45
  ],
  "green-mansions": [
    95
  ],
  "growth-of-the-soil": [
    63
  ],
  "guest-the-one-eyed": [
    88
  ],
  "hadji-murad": [
    95
  ],
  "hajji-baba": [
    5
  ],
  "halil-the-pedlar": [
    22
  ],
  "hania": [
    7
  ],
  "hard-times": [
    22
  ],
  "harlem-shadows": [
    89
  ],
  "harmonium": [
    14
  ],
  "heart-of-darkness": [
    6
  ],
  "heart-of-the-west": [
    95
  ],
  "helen-of-troy-and-other-poems": [
    93
  ],
  "here-and-beyond": [
    95
  ],
  "herland": [
    47
  ],
  "high-wind-jamaica": [
    6
  ],
  "horses-and-men": [
    95
  ],
  "howards-end": [
    94
  ],
  "hugh-selwyn-mauberley": [
    4
  ],
  "hunger": [
    9
  ],
  "hungry-hearts": [
    166
  ],
  "hymen": [
    92
  ],
  "in-a-german-pension": [
    95
  ],
  "in-court-and-kampong": [
    95
  ],
  "in-our-time": [
    96
  ],
  "in-the-cage": [
    95
  ],
  "in-the-midst-of-life-tales-of-soldiers-and-civil": [
    95
  ],
  "in-the-mountains": [
    19
  ],
  "in-the-world": [
    26
  ],
  "incredible-adventures": [
    95
  ],
  "indian-summer": [
    3
  ],
  "indiana": [
    8
  ],
  "iola-leroy": [
    31
  ],
  "irish-fairy-tales": [
    17
  ],
  "irradiations-sand-and-spray": [
    95
  ],
  "irresolute-catherine": [
    16
  ],
  "island-nights-entertainments": [
    95
  ],
  "israel-potter": [
    95
  ],
  "its-wavering-image": [
    9
  ],
  "jacob-s-room": [
    47
  ],
  "jamaica-anansi-stories": [
    94
  ],
  "jamaican-song-and-story": [
    95
  ],
  "java-head": [
    27
  ],
  "jewish-children": [
    75
  ],
  "jocelyn": [
    35
  ],
  "joe-wilson-and-his-mates": [
    95
  ],
  "jude-the-obscure": [
    22
  ],
  "kangaroo": [
    65
  ],
  "keynotes": [
    95
  ],
  "kidnapped": [
    11
  ],
  "kim": [
    5
  ],
  "kimiko": [
    4
  ],
  "kipps": [
    3
  ],
  "kora-in-hell-improvisations": [
    94
  ],
  "krakatit": [
    46
  ],
  "kwaidan-stories-and-studies-of-strange-things": [
    47
  ],
  "lady-into-fox": [
    39
  ],
  "lady-macbeth": [
    5
  ],
  "lady-susan": [
    92
  ],
  "lady-windermeres-fan": [
    219
  ],
  "laos-folk-lore": [
    3
  ],
  "laos-folk-lore-of-farther-india": [
    95
  ],
  "last-poems-housman": [
    10
  ],
  "leila": [
    24
  ],
  "leon-roch": [
    15
  ],
  "leon-roch-vol-2": [
    73
  ],
  "letters-of-a-javanese-princess": [
    31
  ],
  "lewis-and-irene": [
    28
  ],
  "life-and-death-of-harriett-frean": [
    56
  ],
  "liliecronas-home": [
    35
  ],
  "liliom": [
    95
  ],
  "limbo": [
    95
  ],
  "limehouse-nights": [
    95
  ],
  "little-dorrit": [
    95
  ],
  "little-mexican-other-stories": [
    95
  ],
  "liza-of-lambeth": [
    95
  ],
  "lolly-willowes": [
    95
  ],
  "look-back-on-happiness": [
    9
  ],
  "look-we-have-come-through": [
    92
  ],
  "lord-arthur-savile-s-crime": [
    95
  ],
  "lord-arthur-saviles-crime": [
    90
  ],
  "lost-illusions": [
    54
  ],
  "love-among-the-chickens": [
    39
  ],
  "love-and-mr-lewisham": [
    94
  ],
  "love-s-shadow": [
    58
  ],
  "love-songs": [
    95
  ],
  "lucky-pehr": [
    175
  ],
  "lustra": [
    80
  ],
  "madame-de-treymes": [
    95
  ],
  "madmen": [
    95
  ],
  "maggie-a-girl-of-the-streets": [
    95
  ],
  "magnhild": [
    95
  ],
  "magnolia-flower": [
    13
  ],
  "malay-annals-sejarah-melayu": [
    95
  ],
  "malay-sketches": [
    545
  ],
  "manalive": [
    4
  ],
  "manhattan": [
    95
  ],
  "mardi": [
    95
  ],
  "maria": [
    95
  ],
  "maria-chapdelaine": [
    23
  ],
  "marianela": [
    95
  ],
  "marie-claire": [
    10
  ],
  "martin-bircks-youth": [
    3
  ],
  "martin-eden": [
    5
  ],
  "mary-magdalen": [
    22
  ],
  "maximina": [
    58
  ],
  "mayflower": [
    24
  ],
  "mcteague": [
    95
  ],
  "melmoth-the-wanderer": [
    95
  ],
  "men-without-women": [
    95
  ],
  "men-women-and-ghosts": [
    95
  ],
  "merlin": [
    95
  ],
  "mhudi": [
    95
  ],
  "micah-clarke": [
    95
  ],
  "michael-robartes-and-the-dancer": [
    95
  ],
  "miss-julie": [
    95
  ],
  "miss-lulu-bett": [
    37
  ],
  "moby-dick": [
    10
  ],
  "mogens": [
    257
  ],
  "mogens-and-other-stories": [
    6
  ],
  "monday-or-tuesday": [
    95
  ],
  "moon-face-and-other-stories": [
    95
  ],
  "more-ghost-stories-of-an-antiquary": [
    95
  ],
  "more-songs-from-vagabondia": [
    5
  ],
  "morrina": [
    15
  ],
  "mortal-coils": [
    95
  ],
  "mosses-from-an-old-manse": [
    95
  ],
  "mountain-interval": [
    92
  ],
  "mr-fortunes-maggot": [
    13
  ],
  "muslin": [
    52
  ],
  "my-antonia": [
    8
  ],
  "my-brilliant-career": [
    22
  ],
  "my-lady-nobody": [
    47
  ],
  "nacha-regules": [
    95
  ],
  "nada-the-lily": [
    95
  ],
  "naomi": [
    95
  ],
  "nationalism": [
    69
  ],
  "nets-to-catch-the-wind": [
    95
  ],
  "new-arabian-nights": [
    95
  ],
  "new-hampshire": [
    95
  ],
  "new-years-night": [
    35
  ],
  "niels-lyhne": [
    11
  ],
  "night-and-day": [
    95
  ],
  "nina-balatka": [
    8
  ],
  "noli-me-tangere": [
    202
  ],
  "north-of-boston": [
    93
  ],
  "northanger-abbey": [
    95
  ],
  "nostalgia": [
    34
  ],
  "numa-roumestan": [
    24
  ],
  "o-pioneers": [
    95
  ],
  "oblomov": [
    47
  ],
  "odessa": [
    95
  ],
  "of-human-bondage": [
    95
  ],
  "old-creole-days": [
    95
  ],
  "one-of-life-s-slaves": [
    42
  ],
  "on-the-eve": [
    68
  ],
  "on-the-seaboard": [
    95
  ],
  "on-the-track": [
    95
  ],
  "orlando": [
    95
  ],
  "our-lady-of-the-pillar": [
    7
  ],
  "our-mutual-friend": [
    95
  ],
  "over-the-brazier": [
    5
  ],
  "pan-tadeusz": [
    69
  ],
  "pans-garden": [
    422
  ],
  "passing": [
    60
  ],
  "peacock-pie": [
    0
  ],
  "pembroke": [
    31
  ],
  "personae": [
    95
  ],
  "picture-of-dorian-gray": [
    17
  ],
  "pictures-of-the-floating-world": [
    48
  ],
  "piping-hot": [
    162
  ],
  "plain-tales-from-the-hills": [
    95
  ],
  "plum-bun": [
    95
  ],
  "poems-ballads-first-series": [
    91
  ],
  "poems-by-emily-dickinson-series-one": [
    2
  ],
  "poems-hot-houses-bernard-miall": [
    89
  ],
  "poems-in-prose": [
    92
  ],
  "poems-jessie-lemont-translation": [
    84
  ],
  "poems-of-emile-verhaeren": [
    93
  ],
  "pointed-roofs": [
    12
  ],
  "post-office": [
    95
  ],
  "potterism": [
    94
  ],
  "precious-bane": [
    6
  ],
  "precipitations": [
    8
  ],
  "prisoner-of-zenda": [
    26
  ],
  "pudd-nhead-wilson": [
    95
  ],
  "quartet": [
    84
  ],
  "quicksand": [
    27
  ],
  "ramona": [
    10
  ],
  "ramuntcho": [
    19
  ],
  "rashomon": [
    5
  ],
  "red-oleanders": [
    34
  ],
  "redburn": [
    95
  ],
  "reginald": [
    28
  ],
  "reginald-in-russia-and-other-sketches": [
    95
  ],
  "reign-of-greed": [
    3
  ],
  "renascence-and-other-poems": [
    94
  ],
  "resurrection": [
    9
  ],
  "reuben-sachs": [
    6
  ],
  "revolt-of-the-angels": [
    11
  ],
  "rhymes-of-a-rolling-stone": [
    0
  ],
  "riceyman-steps": [
    91
  ],
  "rise-of-david-levinsky": [
    8
  ],
  "rivers-to-the-sea": [
    95
  ],
  "roads-of-destiny": [
    95
  ],
  "romola": [
    95
  ],
  "royal-highness": [
    7
  ],
  "rur": [
    95
  ],
  "salammbo": [
    101
  ],
  "salt-water-ballads": [
    4
  ],
  "sappho-one-hundred-lyrics": [
    95
  ],
  "saracinesca": [
    17
  ],
  "saragossa": [
    8
  ],
  "sea-garden": [
    91
  ],
  "second-april": [
    92
  ],
  "seven-brothers": [
    5
  ],
  "shadow-of-the-cathedral": [
    7
  ],
  "she": [
    94
  ],
  "short-stories-from-the-balkans": [
    138
  ],
  "siddhartha": [
    52
  ],
  "silhouettes": [
    7
  ],
  "sister-carrie": [
    6
  ],
  "sixes-and-sevens": [
    93
  ],
  "small-souls": [
    33
  ],
  "smoke": [
    1
  ],
  "smoke-bellew": [
    245
  ],
  "song-of-songs": [
    14
  ],
  "song-of-songs-sudermann": [
    51
  ],
  "songs-and-satires": [
    2
  ],
  "songs-from-vagabondia": [
    44
  ],
  "songs-of-childhood": [
    2
  ],
  "songs-of-innocence-and-of-experience": [
    89
  ],
  "songs-of-kabir": [
    89
  ],
  "songs-of-travel": [
    3
  ],
  "sonnets-from-the-portuguese": [
    94
  ],
  "sons-and-lovers": [
    95
  ],
  "sour-grapes": [
    12
  ],
  "south-african-folk-tales": [
    95
  ],
  "south-sea-tales": [
    115
  ],
  "south-wind": [
    15
  ],
  "spoon-river-anthology": [
    91
  ],
  "spring-and-all": [
    94
  ],
  "spring-time-case": [
    7
  ],
  "st-peter-s-umbrella": [
    11
  ],
  "stories-and-pictures": [
    98
  ],
  "stories-from-tagore": [
    71
  ],
  "stories-of-red-hanrahan": [
    95
  ],
  "strait-is-the-gate": [
    16
  ],
  "strange-tales": [
    4
  ],
  "summer": [
    47
  ],
  "sunshine-sketches-of-a-little-town": [
    28
  ],
  "susan-proudleigh": [
    10
  ],
  "sword-blades-and-poppy-seed": [
    42
  ],
  "tales-by-polish-authors": [
    31,
    588
  ],
  "tales-from-the-fjeld": [
    5,
    1697
  ],
  "tales-of-men-and-ghosts": [
    92
  ],
  "tales-of-space-and-time": [
    95
  ],
  "tales-of-the-jazz-age": [
    94
  ],
  "tales-of-unrest": [
    95
  ],
  "tales-volumes-1-2": [
    95
  ],
  "tartarin-de-tarascon": [
    11
  ],
  "ten-minute-stories": [
    17
  ],
  "tess-of-the-durbervilles": [
    34
  ],
  "thais": [
    47
  ],
  "the-age-of-innocence": [
    74
  ],
  "the-argonauts": [
    16
  ],
  "the-arrow-of-gold": [
    95
  ],
  "the-aspern-papers": [
    95
  ],
  "the-autobiography-of-an-ex-colored-man": [
    95
  ],
  "the-autobiography-of-munshi-abdullah-hikayat-abd": [
    94
  ],
  "the-awakening": [
    16
  ],
  "the-ballad-of-reading-gaol": [
    92
  ],
  "the-ballad-of-the-white-horse": [
    14
  ],
  "the-beautiful-and-damned": [
    95
  ],
  "the-beetle": [
    95
  ],
  "the-bet": [
    19
  ],
  "the-beth-book": [
    95
  ],
  "the-bitter-tea-of-general-yen": [
    22
  ],
  "the-black-arrow": [
    94
  ],
  "the-black-christ-and-other-poems": [
    17
  ],
  "the-black-dog": [
    234
  ],
  "the-black-monk-and-other-stories": [
    195
  ],
  "the-black-riders-and-other-lines": [
    85
  ],
  "the-black-tulip": [
    95
  ],
  "the-blind-musician": [
    29
  ],
  "the-blithedale-romance": [
    94
  ],
  "the-book-of-khalid": [
    12
  ],
  "the-book-of-the-birds-paksi-pakaranam": [
    95
  ],
  "the-book-of-wonder": [
    18
  ],
  "the-bostonians": [
    95
  ],
  "the-bridge-of-san-luis-rey": [
    95
  ],
  "the-bright-shawl": [
    12
  ],
  "the-cabala": [
    1
  ],
  "the-cabin": [
    95
  ],
  "the-celestial-omnibus-and-other-stories": [
    95
  ],
  "the-cherry-orchard": [
    95
  ],
  "the-chronicles-of-clovis": [
    95
  ],
  "the-city-of-dreadful-night": [
    94
  ],
  "the-club-of-queer-trades": [
    95
  ],
  "the-comedienne": [
    19
  ],
  "the-complete-original-short-stories": [
    321
  ],
  "the-complete-poems-of-paul-laurence-dunbar": [
    94
  ],
  "the-confession": [
    21
  ],
  "the-congo-and-other-poems": [
    95
  ],
  "the-conjure-woman": [
    95
  ],
  "the-corsican-brothers": [
    67
  ],
  "the-counterfeiters": [
    43
  ],
  "the-countess-of-lowndes-square-and-other-stories": [
    94
  ],
  "the-country-house": [
    94
  ],
  "the-country-of-the-blind-and-other-stories": [
    93
  ],
  "the-crescent-moon": [
    5
  ],
  "the-crock-of-gold": [
    95
  ],
  "the-crux": [
    23
  ],
  "the-custom-of-the-country": [
    92
  ],
  "the-cycle-of-spring": [
    462
  ],
  "the-damnation-of-theron-ware": [
    95
  ],
  "the-descent-of-man-and-other-stories": [
    90
  ],
  "the-divine-comedy": [
    45
  ],
  "the-door-in-the-wall-and-other-stories": [
    95
  ],
  "the-dream-play": [
    28
  ],
  "the-emancipated": [
    4
  ],
  "the-empty-house-and-other-ghost-stories": [
    95
  ],
  "the-eternal-moment-and-other-stories": [
    95
  ],
  "the-europeans": [
    95
  ],
  "the-face-in-the-abyss": [
    19
  ],
  "the-faith-of-men": [
    43
  ],
  "the-family-at-gilje": [
    95
  ],
  "the-farmer-s-bride": [
    95
  ],
  "the-father": [
    368
  ],
  "the-financier": [
    95
  ],
  "the-finer-grain": [
    95
  ],
  "the-fortune-of-the-rougons": [
    153
  ],
  "the-four-horsemen-of-the-apocalypse": [
    176
  ],
  "the-four-million": [
    95
  ],
  "the-fruit-of-the-tree": [
    88
  ],
  "the-fugitive": [
    128
  ],
  "the-gadfly": [
    95
  ],
  "the-garden-party-and-other-stories": [
    54
  ],
  "the-gentle-grafter": [
    95
  ],
  "the-getting-of-wisdom": [
    146
  ],
  "the-glimpses-of-the-moon": [
    92
  ],
  "the-gods-of-pegana": [
    12
  ],
  "the-golden-age": [
    40
  ],
  "the-golden-bowl": [
    56
  ],
  "the-golden-whales-of-california": [
    4
  ],
  "the-good-soldier": [
    5
  ],
  "the-goose-man": [
    30
  ],
  "the-grand-babylon-hotel": [
    148
  ],
  "the-great-hunger": [
    15
  ],
  "the-green-carnation": [
    10
  ],
  "the-happy-end": [
    95
  ],
  "the-harp-weaver-and-other-poems": [
    93
  ],
  "the-heart-of-happy-hollow": [
    191
  ],
  "the-heavenly-twins": [
    95
  ],
  "the-hidden-force": [
    16
  ],
  "the-hill-of-dreams": [
    4
  ],
  "the-history-of-mr-polly": [
    95
  ],
  "the-home-and-the-world": [
    17
  ],
  "the-horse-stealers-and-other-stories": [
    132
  ],
  "the-house-behind-the-cedars": [
    95
  ],
  "the-house-by-the-medlar-tree": [
    3
  ],
  "the-house-of-cobwebs": [
    95
  ],
  "the-house-of-dust-a-symphony": [
    95
  ],
  "the-house-of-life": [
    94
  ],
  "the-house-of-mirth": [
    16
  ],
  "the-house-of-souls": [
    95
  ],
  "the-house-of-the-seven-gables": [
    3
  ],
  "the-house-on-the-borderland": [
    94
  ],
  "the-immoralist": [
    47
  ],
  "the-imperialist": [
    3
  ],
  "the-imported-bridegroom-and-other-stories-of-the": [
    95
  ],
  "the-inferno": [
    65
  ],
  "the-innocence-of-father-brown": [
    95
  ],
  "the-invisible-man": [
    34
  ],
  "the-iron-heel": [
    95
  ],
  "the-island-of-doctor-moreau": [
    95
  ],
  "the-job": [
    10
  ],
  "the-joy-of-captain-ribot": [
    50
  ],
  "the-jungle": [
    95
  ],
  "the-king-in-yellow": [
    95
  ],
  "the-king-of-schnorrers": [
    8
  ],
  "the-king-of-schnorrers-grotesques-and-fantasies": [
    95
  ],
  "the-lady-with-the-dog-and-other-stories": [
    18
  ],
  "the-lair-of-the-white-worm": [
    95
  ],
  "the-last-man": [
    18
  ],
  "the-late-mattia-pascal": [
    12
  ],
  "the-listeners-and-other-poems": [
    91
  ],
  "the-little-clay-cart": [
    38
  ],
  "the-lodger": [
    95
  ],
  "the-lonely-way": [
    286
  ],
  "the-longest-journey": [
    95
  ],
  "the-lost-girl": [
    95
  ],
  "the-madman-his-parables-and-poems": [
    95
  ],
  "the-magician": [
    95
  ],
  "the-man-against-the-sky": [
    94
  ],
  "the-man-from-snowy-river": [
    72
  ],
  "the-man-in-the-brown-suit": [
    67
  ],
  "the-man-of-property": [
    13
  ],
  "the-man-who-was-afraid": [
    95
  ],
  "the-man-who-was-thursday": [
    95
  ],
  "the-marble-faun": [
    95
  ],
  "the-marrow-of-tradition": [
    24
  ],
  "the-master-of-ballantrae": [
    8
  ],
  "the-merry-men-and-other-tales-and-fables": [
    95
  ],
  "the-monk": [
    95
  ],
  "the-monomaniac": [
    11
  ],
  "the-monster-and-other-stories": [
    95
  ],
  "the-moon-and-sixpence": [
    4
  ],
  "the-mother": [
    22
  ],
  "the-mysterious-stranger": [
    7
  ],
  "the-mystery-of-choice": [
    173
  ],
  "the-mystery-of-edwin-drood": [
    95
  ],
  "the-napoleon-of-notting-hill": [
    14
  ],
  "the-narrative-of-arthur-gordon-pym-of-nantucket": [
    94
  ],
  "the-nether-world": [
    94
  ],
  "the-night-operator": [
    95
  ],
  "the-odd-women": [
    95
  ],
  "the-old-house": [
    33
  ],
  "the-old-room": [
    53
  ],
  "the-old-wives-tale": [
    95
  ],
  "the-open-boat-and-other-stories": [
    95
  ],
  "the-painted-veil": [
    37
  ],
  "the-patrician": [
    79
  ],
  "the-paying-guest": [
    75
  ],
  "the-peasants": [
    47
  ],
  "the-pit": [
    14
  ],
  "the-plattner-story-and-others": [
    95
  ],
  "the-plumed-serpent": [
    37
  ],
  "the-poems-of-emma-lazarus-volume-1": [
    4
  ],
  "the-poison-tree": [
    11
  ],
  "the-price-of-love": [
    182
  ],
  "the-private-papers-of-henry-ryecroft": [
    132
  ],
  "the-professor": [
    6
  ],
  "the-prophet": [
    95
  ],
  "the-prose-tales": [
    71
  ],
  "the-prussian-officer-and-other-stories": [
    95
  ],
  "the-purple-land": [
    4
  ],
  "the-rainbow": [
    44
  ],
  "the-real-charlotte": [
    27
  ],
  "the-real-thing-and-other-tales": [
    94
  ],
  "the-red-and-the-black": [
    13
  ],
  "the-red-gods": [
    95
  ],
  "the-red-room": [
    6
  ],
  "the-reef": [
    95
  ],
  "the-rescue": [
    95
  ],
  "the-rise-of-silas-lapham": [
    26
  ],
  "the-road-to-the-open": [
    5
  ],
  "the-romance-of-a-shop": [
    95
  ],
  "the-romance-of-the-milky-way": [
    12
  ],
  "the-room-in-the-tower-and-other-stories": [
    97
  ],
  "the-rover": [
    95
  ],
  "the-rubaiyat-of-omar-khayyam": [
    75
  ],
  "the-sea-wolf": [
    95
  ],
  "the-secret-agent": [
    95
  ],
  "the-shadow-line": [
    95
  ],
  "the-shooting-party": [
    40
  ],
  "the-sketch-book-of-geoffrey-crayon": [
    95
  ],
  "the-son-of-his-mother": [
    21
  ],
  "the-song-of-the-blood-red-flower": [
    47
  ],
  "the-song-of-the-lark": [
    94
  ],
  "the-sorrows-of-satan": [
    2
  ],
  "the-spoils-of-poynton": [
    95
  ],
  "the-spoilt-child": [
    57
  ],
  "the-sport-of-the-gods": [
    15
  ],
  "the-steel-flea": [
    31
  ],
  "the-stolen-bacillus": [
    50
  ],
  "the-story-of-an-african-farm": [
    28
  ],
  "the-story-of-gosta-berling": [
    69
  ],
  "the-sun-also-rises": [
    9
  ],
  "the-sword-of-welleran": [
    58
  ],
  "the-sworn-brothers": [
    22
  ],
  "the-tenant-of-wildfell-hall": [
    47
  ],
  "the-three-taverns": [
    4
  ],
  "the-time-machine": [
    77
  ],
  "the-titan": [
    16
  ],
  "the-torrents-of-spring": [
    13
  ],
  "the-touchstone": [
    95
  ],
  "the-tower": [
    95
  ],
  "the-town-down-the-river": [
    3
  ],
  "the-tragic-muse": [
    90
  ],
  "the-trimmed-lamp-and-other-stories-of-the-four-m": [
    92
  ],
  "the-troll-garden-and-selected-stories": [
    95
  ],
  "the-trumpet-major": [
    95
  ],
  "the-two-countesses": [
    42
  ],
  "the-unclassed": [
    94
  ],
  "the-underdogs": [
    43
  ],
  "the-vegetable": [
    95
  ],
  "the-veil-and-other-poems": [
    1
  ],
  "the-village": [
    8
  ],
  "the-village-in-the-jungle": [
    6
  ],
  "the-voice-of-the-city": [
    92
  ],
  "the-voyage-out": [
    95
  ],
  "the-wanderer": [
    47
  ],
  "the-weary-blues": [
    70
  ],
  "the-well-beloved": [
    94
  ],
  "the-whirlpool": [
    95
  ],
  "the-white-company": [
    95
  ],
  "the-white-peacock": [
    95
  ],
  "the-wife-of-his-youth-and-other-stories-of-the-c": [
    95
  ],
  "the-wild-swans-at-coole": [
    137
  ],
  "the-will-to-live": [
    46
  ],
  "the-willows": [
    95
  ],
  "the-wind-among-the-reeds": [
    95
  ],
  "the-wind-in-the-rose-bush-and-other-stories-of-t": [
    95
  ],
  "the-wisdom-of-father-brown": [
    95
  ],
  "the-witch-and-other-stories": [
    122
  ],
  "the-woman-of-andros": [
    37
  ],
  "the-woman-of-knockaloe": [
    57
  ],
  "the-woman-who-did": [
    12
  ],
  "the-wonderful-adventures-of-nils": [
    233
  ],
  "the-woodlanders": [
    95
  ],
  "there-is-confusion": [
    24
  ],
  "theresa-raquin": [
    18
  ],
  "therese": [
    31
  ],
  "this-side-of-paradise": [
    95
  ],
  "three-john-silence-stories": [
    95
  ],
  "three-soldiers": [
    20
  ],
  "time-and-the-gods": [
    25
  ],
  "toilers-of-the-sea": [
    1
  ],
  "tono-bungay": [
    95
  ],
  "trafalgar": [
    18
  ],
  "tragic-sense-of-life": [
    66
  ],
  "tropic": [
    282
  ],
  "twelve-stories-and-a-dream": [
    95
  ],
  "twice-told-tales": [
    95
  ],
  "twilight-sleep": [
    26
  ],
  "twixt-land-and-sea": [
    94
  ],
  "two-on-a-tower": [
    92
  ],
  "typee": [
    16
  ],
  "typhoon": [
    92
  ],
  "uncanny-stories": [
    95
  ],
  "uncle-silas": [
    9
  ],
  "under-western-eyes": [
    95
  ],
  "underdogs": [
    95
  ],
  "une-vie": [
    1
  ],
  "unhuman-tour-kusamakura": [
    40
  ],
  "vengeance": [
    95
  ],
  "vera": [
    14
  ],
  "virgin-soil": [
    57
  ],
  "visible-and-invisible": [
    93
  ],
  "wallpaper": [
    95
  ],
  "walter-pieterse": [
    39
  ],
  "wanderers": [
    22
  ],
  "wang-the-ninth": [
    31
  ],
  "washington-square": [
    94
  ],
  "way-of-all-flesh": [
    5
  ],
  "we": [
    29
  ],
  "weird-tales": [
    25
  ],
  "west-african-folk-tales": [
    4
  ],
  "what-not": [
    95
  ],
  "when-the-sleeper-wakes": [
    95
  ],
  "where-angels-fear-to-tread": [
    16
  ],
  "while-the-billy-boils": [
    95
  ],
  "whilomville-stories": [
    95
  ],
  "whirligigs": [
    95
  ],
  "white-buildings": [
    5
  ],
  "white-jacket": [
    12
  ],
  "white-nights": [
    376
  ],
  "widdershins": [
    22
  ],
  "winesburg-ohio": [
    95
  ],
  "winnie-the-pooh": [
    92
  ],
  "within-the-tides": [
    95
  ],
  "women-in-love": [
    95
  ],
  "xingu": [
    94
  ],
  "yekl": [
    77
  ],
  "yiddish-short-stories": [
    23
  ],
  "young-adventure": [
    95
  ],
  "youth-and-the-bright-medusa": [
    95
  ],
  "zanzibar-tales": [
    66
  ],
  "zeno": [
    47
  ],
  "zuleika-dobson": [
    19
  ]
};

export const MERGE_STOP_CUTS: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  "the-cabala": [
    [
      1,
      326
    ]
  ]
};

const cached = new Map<string, ReadonlySet<number> | undefined>();
const cutCache = new Map<string, ReadonlyMap<number, number> | undefined>();

/** Stops for the loaded book. A book with none returns undefined. */
export function stopsForWork(id: string): ReadonlySet<number> | undefined {
  if (cached.has(id)) return cached.get(id);
  const list = Object.prototype.hasOwnProperty.call(MERGE_STOP_INDEX, id) ? MERGE_STOP_INDEX[id] : undefined;
  const set = list && list.length > 0 ? new Set<number>(list) : undefined;
  cached.set(id, set);
  return set;
}

/** Character end inside a stop breath. The next sentence in that breath stays out. */
export function cutsForWork(id: string): ReadonlyMap<number, number> | undefined {
  if (cutCache.has(id)) return cutCache.get(id);
  const list = Object.prototype.hasOwnProperty.call(MERGE_STOP_CUTS, id) ? MERGE_STOP_CUTS[id] : undefined;
  const map = list && list.length > 0 ? new Map<number, number>(list.map(([index, end]) => [index, end])) : undefined;
  cutCache.set(id, map);
  return map;
}
