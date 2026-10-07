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
    "A club foot, a medical student, and a love that humiliates on purpose. It opens at Chapter I on the gray morning — Wake up, Philip — and this reading keeps to that chapter. Sit with that weather before the first breath.",
  gatsby:
    "West Egg money, a green light, and a man who throws parties for a ghost. Fitzgerald’s 1925 summer asks you to watch the lights before anyone arrives. Sit with the bay a moment, then enter.",
  ulysses:
    "One Dublin day, walked until language itself starts to sweat. Joyce’s 1922 novel does not hurry you toward a plot. Let the city arrive a sentence at a time.",
  dubliners:
    "North Richmond Street is blind until the Christian Brothers’ School lets the boys out. This reading is just Araby, through the bazaar.",
  "sister-carrie":
    "When Caroline Meeber boarded the afternoon train for Chicago, her total outfit consisted of a small trunk and four dollars. Chapter I — Caroline Meeber, the afternoon train, and August 1889. Theodore Dreiser’s 1900 novel.",
  smoke:
    "On the 10th of August 1862, at four o'clock in the afternoon, a great number of people were thronging before the well-known Konversation in Baden-Baden. Chapter I — the Konversation, Baden-Baden, and holiday sunshine. Ivan Turgenev, in Constance Garnett’s English, 1867. First published in Russian in 1867; this translation is from 1906.",
  "niels-lyhne":
    "She had the black, luminous eyes of the Blid family. Chapter I — Bartholine, poetry and faith, and Lönborggaard. J. P. Jacobsen, in Hanna Astrup Larsen’s English, 1880. First published in Danish in 1880; this translation is from 1919.",
  "the-emancipated":
    "By a window looking from Posillipo upon the Bay of Naples sat an English lady, engaged in letter-writing. Part I, Chapter I — Posillipo, a widow’s letter, and November sunlight. George Gissing’s 1890 novel. Naples is secular.",
  germinal:
    "Over the open plain, beneath a starless sky as dark and thick as ink, a man walked alone along the highway from Marchiennes to Montsou. Part One, Chapter I — the Marchiennes–Montsou highway, a starless sky, and beetroot fields. Émile Zola, in Havelock Ellis’s English, 1885.",
  "our-lady-of-the-pillar":
    "In 1474, a year abounding in divine favours for all Christendom, when King Henry IV. reigned in Castile, there came to live in the city of Segovia a youthful knight named Don Ruy de Cardenas. This reading is just Our Lady of the Pillar — 1474 Segovia and Don Ruy de Cardenas. This reading ends with the tale. Eça de Queirós, in Edgar Prestage’s English, 1906.",
  kipps:
    "Until he was nearly arrived at adolescence it did not become clear to Kipps how it was that he was under the care of an aunt and uncle instead of having a father and mother like other boys. Book I, Chapter I — the New Romney little shop, an aunt and uncle, and a white-dress mother. H. G. Wells’s 1905 novel.",
  "the-professor":
    "The other day, in looking over my papers, I found in my desk the following copy of a letter, sent by me a year since to an old school acquaintance. Chapter I, Introductory — an Eton letter and Crimsworth the outsider. Charlotte Brontë’s 1857 novel.",
  "a-room-with-a-view":
    "\"The Signora had no business to do it,\" said Miss Bartlett, \"no business at all.\" Part One, Chapter I — the Bertolini, south rooms with a view, and a Cockney accent. E. M. Forster’s 1908 novel.",
  "martin-eden":
    "The one opened the door with a latch-key and went in, followed by a young fellow who awkwardly removed his cap. Chapter I — a latch-key hall, sea-smacked rough clothes, and a rolling gait. Jack London’s 1909 novel.",
  "madame-heurtebise":
    "She was certainly not intended for an artist's wife, above all for such an artist as this outrageous fellow. This reading is just Madame Heurtebise — a jeweller’s-shop wife and the poet Heurtebise. Alphonse Daudet, in Laura Ensor’s English, 1874.",
  "une-vie":
    "The weather was most distressing. It had rained all night. Chapter I, The Home by the Sea — Jeanne free of the convent, rain gutters, and an 1819 calendar. Guy de Maupassant, in Albert M. C. McMaster and A. E. Henderson’s English, 1883.",
  "look-back-on-happiness":
    "I have gone to the forest. Chapter I — the forest, overfed success, and a hair-shirt. Knut Hamsun, in Paula Wiking’s English, 1912.",
  "father-of-yoto":
    "Sweet human hearts—a tale of carnival, moon-haunted nights. This reading is just The Father of Yoto — Marigold Vassiloff, Tai Ling, and West India Dock Road. Thomas Burke’s 1916 sketch.",
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
  "the-age-of-innocence":
    "Old New York marries correctly and then spends a lifetime paying for it. Wharton’s 1920 drawing rooms are already watching. Sit with the manners before anyone speaks.",
  "ethan-frome":
    "A Starkfield winter, a sick wife, and a sled that does not forgive a wish. Wharton’s 1911 novella is cold on purpose. Give the snow a moment, then enter.",
  "my-antonia":
    "I first heard of Ántonia on what seemed to me an interminable journey across the great midland plain of North America. Book I, Chapter I — the midland plain, Jake Marpole, and Nebraska grandparents. Willa Cather’s 1918 novel.",
  "winesburg-ohio":
    "A Midwest town speaks in grotesques — people who almost said the true thing. Anderson’s 1919 stories ask you to listen in small rooms. Enter one voice at a time.",
  "howards-end":
    "Who will inherit the house — and the England attached to it. Forster’s 1910 novel begins in letters and a country place. Sit with the house before the first breath.",
  "sons-and-lovers":
    "A Nottingham miner’s son cannot leave his mother’s claim on him. Lawrence’s 1913 novel is close, heated, domestic. Sit with the kitchen a moment, then enter.",
  "heart-of-darkness":
    "The Nellie, a cruising yawl, lies at Gravesend. The frame turns toward the Congo after the Thames. Conrad’s 1902 novel. Serialized in 1899; published as a book in 1902.",
  "the-time-machine":
    `The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us. This reading is just The Time Machine — the Time Traveller, a fire, and silver lilies. It opens at the Introduction. This reading ends with the novel. H. G. Wells’s 1895 novel.`,
  "the-war-of-the-worlds":
    "Martians land in the Home Counties and London learns it is not the center. Wells’s 1898 novel begins as ordinary weather. Sit with the ordinary a moment.",
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
    "If the apartment which Doña Nogueira de Pardiñas and her only son Rogelio occupied in Madrid was neither the sunniest nor the most spacious to be found in the city, it possessed, on the other hand, the inestimable advantage of being situated in the Calle Ancha de San Bernardo, so close to the Central University that to live in it was, as one might say, the same as living in the university itself. Chapter I — a doting mother in a Madrid flat near the university follows her student son with her gaze, and a young maid from Galicia comes to serve them. A heads-up before you start: the son seduces the maid, and the book ends with her implied suicide. Twenty-three chapters. Told with worldly irony.",
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
  "the-dancing-master":
    `“The Dancing-Master” is one complete story from Parisian Points of View — asked by a hostess to engage old Morin, a dancing-master, for her little girls, a guest goes behind the scenes at the opera one February night in 1881, finds him on stage as a bishop in “The Prophet,” and in the wings gets an earnest lecture on why France needs more dancing. It ends “…withstood the shock of this avalanche of dancers.” A heads-up before you start: the old teacher talks frankly, in the manner of his day, about sizing up a partner's figure while waltzing. Amused and brisk, for a walk. Paris.`,
  "the-golden-age":
    `“Alarums and Excursions” is one complete story from The Golden Age — on a hot June day three children are playing at knights in the orchard when a troop of soldiers jingles past the hedge, and the narrator and his little brother Harold chase it across country, sure a battle lies ahead. It ends “…to the fact that the battle had been postponed.” A heads-up before you start: on the way the narrator tells Harold that Indians scalp and burn their prisoners, a schoolboy notion of the period, left as printed; and the boys get lost in the rain before the old doctor drives them home. Bright and comic, made for walking. An English village and the fields beyond it.`,
  "strait-is-the-gate":
    `Some people might have made a book out of it; but the story I am going to tell is one which it took all my strength to live and over which I spent all my virtue. Chapter I — Jerome's summers at his uncle Bucolin's house at Fongueusemare, near Le Havre, with his cousins Alissa, Juliette and Robert; his beautiful, idle aunt Lucile; and the year he saw Alissa and understood that they had ceased to be children. The first reading is Chapter I up to its first printed break, ending “…who afterwards became my friend.” A heads-up before you start: later in Chapter I the aunt makes a sexual advance on Jerome when he is a boy; her West Indian origins in Martinique are described in the period's terms; and there are deaths in the family later in the book. Eight chapters, then Alissa’s journal.`,
  "fraulein-schmidt-and-mr-anstruther":
    `Dear Roger,—This is only to tell you that I love you, supposing you should have forgotten it by the time you get to London. Letters I and II — an hour after Roger Anstruther, the English student who has lived a year with her family, asks her to marry him and leaves for London, Rose-Marie Schmidt writes to him from the unlit room in Jena; next morning she writes again, to tell him how poor they are. The first reading is Letters I and II, ending “…Thank God, say I, for mornings.” It was first published as by the author of “Elizabeth and Her German Garden.” The whole novel is told in Rose-Marie's letters, eighty-one of them, each under its date.`,
  "a-japanese-blossom":
    `THE children sat in a little semi-circle about their grandmother, listening intently as she read to them the last letter from their father in America. Chapter I — a Japanese household hears that father has married an American widow and is bringing her home, and the eldest son swears he will not bow to her. The first reading is Chapter I whole, ending “…and soon he was to have it!” A heads-up before you start: in the opening chapter the eldest son calls the new American stepmother a "barbarian" and dreams she is a fox-woman; a pail of water is thrown in a crying child's face. Later chapters include a teasing "Jappy Jap" nursery rhyme, Russo-Japanese War material, and deaths on the page. All of it is left as printed. Twenty-nine chapters.`,
  "the-spoilt-child":
    `BABURAM BABU, a resident of Vaidyabati, was a man of large experience in business affairs: he was famous for his long service in the Revenue and Criminal Courts. Chapter I, Matilall at Home — at Vaidyabati a rich man's adored only son outwits every tutor his father can hire, and the whole household pays for it. The first reading is Chapter I whole, ending “…it is cruel work coming to a place like this! *Tauba! Tauba!*” A heads-up before you start: the opening chapter shows a spoilt boy scratching and biting his tutors, throwing live charcoal, and setting a Persian teacher's beard alight while calling him "Mussulman"; characters mock a Brahman tutor, and the father repeats the slight just after this chapter. Later chapters carry more period slights against Muslims, Kulin marriage customs, a second marriage, and the father's death on the page. All of it is left as printed. The Bengali original, Alaler Gharer Dulal, first appeared in book form in 1858. Thirty chapters.`,
  "winnie-the-pooh":
    `Edward Bear, known to his friends as Winnie-the-Pooh, or Pooh for short, was walking through the forest one day, humming proudly to himself. “In Which Pooh Goes Visiting and Gets into a Tight Place” is one complete chapter from Winnie-the-Pooh — after morning Stoutness Exercises and a brand-new hum, Pooh calls on Rabbit, stays for honey, and finds the front door a little tight on the way out. It ends “…Silly old Bear!” Bright and comic, made for waking. The forest.`,
  "the-taoist-priest-of-lao-shan":
    `There lived in our village a Mr. Wang, the seventh son in an old family. This reading is just “The Taoist Priest of Lao-shan” — Wang goes to Lao-shan to learn immortality, chops wood for months, learns only how to walk through walls, brags at home, and runs into the bricks. This reading is the whole story, ending “cursed the old priest for his base ingratitude.” From Strange Stories from a Chinese Studio. Tart and comic, for the evening rather than for sleep.`,
  "elysium":
    `The Triad came into my life as I walked underneath the arch by which the sentinels sit in Olympian state upon their rather long-legged chargers, receiving, as is their due, the silent homage of the passing nurserymaids. This reading is just “Elysium” — a soldier just back from the Flanders front walks home through St. James's with his sweetheart on one arm and his sister on the other, past the clubs and two old colonels on the steps, wrapped apart from the whole world. This reading is the whole sketch, ending “for five long days.” A heads-up before you start: the First World War sits just behind this story. The soldier is home from the front in Flanders on five days' leave. From Brought Forward. Quiet and tender, for the last minutes before sleep. Pall Mall, London.`,
  "the-mist":
    `The sun had just set. This reading is just “The Mist” — after sunset, mist rises over a quiet village meadow and tells a night-flower how he is dew, cloud, and spring-water in turn, until morning blows him into a dew-drop and the sun laughs. This reading is the whole story, ending “You’re right enough there!” said the sun. And he laughed. From The Spider and Other Tales. Quiet and gently comic, for the last minutes before sleep. The glade.`,
  "the-fresco":
    `In the Great Highway of Eternal Fixity, Mong Flowing-spring and his friend Choo Little-lotus were slowly walking, clothed in the long light green dress of the students. This reading is just “The Fresco” — two successful students lose themselves in the lanes of Pekin, enter a temple of the Mysterious-way, and Mong Flowing-spring follows a goddess who steps out of a fresco. This reading is the whole story, ending “Love has touched her. She has become a woman and is waiting for you in your village.” From Strange Stories from the Lodge of Leisures. Soft and magical, for the last minutes before sleep.`,
  "muslin":
    `The convent was situated on a hilltop, and through the green garden the white dresses of the schoolgirls fluttered like the snowy plumage of a hundred doves. Chapter I — prize day at the Convent of the Holy Child: Alice Barton has written the play, her sister Olive is to star in it, and their father arrives to promise that before many days the girls will be charming the young men of Galway. The first reading is Chapter I whole, ending “…until the bell was rung for the children to assemble in the school-hall.” The novel first appeared in 1886 as A Drama in Muslin; this is Moore’s 1915 version. Twenty-nine chapters.`,
  "love-among-the-chickens":
    `"A gentleman called to see you when you were out last night, sir," said Mrs. Medley, my landlady, removing the last of the breakfast things. Chapter I, “A Letter with a Postscript” — Garnet's landlady announces a caller with a powerful voice; a friend's letter from Yeovil confirms that Stanley Featherstonehaugh Ukridge is on his trail; Ukridge then thunders upstairs and is in Garnet's midst. The first reading is Chapter I whole, ending “Stanley Featherstonehaugh Ukridge was in my midst.” This is the 1920 version, which Wodehouse’s dedication says was practically re-written from the 1906 book. Twenty-three chapters.`,
  "the-secret-agent":
    "Conrad’s London anarchists, a shop in Soho, and a bomb that lands on the wrong person. The 1907 novel is fog, errands, and a marriage. Sit with the shop a moment.",
  "a-portrait-of-the-artist-as-a-young-man":
    "Stephen Dedalus talks his way out of church, family, and Ireland. Joyce’s 1916 novel begins in a child’s ear. Sit with the first sounds before they become argument.",
  "the-voyage-out":
    "A young woman sails toward a first love and does not sail home unchanged. Woolf’s 1915 first novel is ship, heat, and talk. Sit with the water before the first breath.",
  "jacob-s-room":
    "Betty Flanders writing in the sand — Cornwall, then the room that will be Jacob’s. The experimental voice is the point of this reading.",
  "the-good-soldier":
    "This is the saddest story I have ever heard. Part I, Chapter I — the Ashburnhams and nine seasons at Nauheim. Ford Madox Ford’s 1915 novel.",
  "pointed-roofs":
    "Miriam leaves the gaslit hall and goes slowly upstairs, the Saratoga trunk already in the firelight, deciding what she will say to the Fraeulein. It opens at Chapter I. This reading stops on governessing and old age. Richardson’s 1915 novel, Pilgrimage volume 1 only.",
  "the-autobiography-of-an-ex-colored-man":
    "A musician chooses passing, then has to live inside the choice. Johnson’s 1912 novel is told as if to one listener. Sit with that confidence before the first breath.",
  "the-awakening":
    "A green and yellow parrot at Grand Isle keeps repeating Allez vous-en. This reading is the Pontellier gallery, Chapter I. The novel continues.",
  "lord-jim":
    "A jump from a ship, and a life spent trying to outrun it. Conrad’s 1900 novel begins in rumor. Sit with the story before you meet the man.",
  "billy-budd":
    "In the time before steamships, a stroller along the docks would notice the Handsome Sailor. This reading is just Billy Budd, Foretopman — Chapter I. Herman Melville’s 1924 novella.",
  "elmer-gantry":
    `Elmer Gantry was drunk. He was eloquently drunk, lovingly and pugnaciously drunk. He leaned against the bar of the Old Home Sample Room, the most gilded and urbane saloon in Cato, Missouri. Chapter I — Cato, Missouri, the Old Home Sample Room, and a man eloquently drunk. Sinclair Lewis’s 1927 novel.`,
  "death-in-venice":
    `On a spring afternoon of the year 19--, when our continent lay under such threatening weather for whole months, Gustav Aschenbach, or von Aschenbach as his name read officially after his fiftieth birthday, had left his apartment on the Prinzregentenstrasse in Munich and had gone for a long walk. Chapter I — a spring afternoon, the Prinzregentenstrasse, and Aschenbach. Thomas Mann, in Kenneth Burke’s English, 1912.`,
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
  "prisoner-of-zenda":
    `"I wonder when in the world you're going to do anything, Rudolf?" said my brother's wife. Chapter 1 — a Rassendyll breakfast, Elphberg hair, and doing nothing. Anthony Hope’s 1894 novel.`,
  "kidnapped":
    `I will begin the story of my adventures with a certain morning early in the month of June, the year of grace 1751, when I took the key for the last time out of the door of my father's house. Chapter I — Essendean, a June morning, a key, and the House of Shaws. Robert Louis Stevenson’s 1886 novel.`,
  "revolt-of-the-angels":
    `Beneath the shadow of St. Sulpice the ancient mansion of the d'Esparvieu family rears its austere three stories between a moss-grown fore-court and a garden hemmed in, as the years have elapsed, by ever loftier and more intrusive buildings, wherein, nevertheless, two tall chestnut trees still lift their withered heads. Chapter I — the d’Esparvieu mansion and chestnut trees. Anatole France, in Emilie Jackson’s English, 1914.`,
  "children-of-the-soil":
    `It was the first hour after midnight when Pan Stanislav Polanyetski was approaching the residence in Kremen. Chapter I — Kremen, a July midnight mist, and Pan Stanislav. Henryk Sienkiewicz, in Jeremiah Curtin’s English, 1895.`,
  "the-painted-veil":
    "Shuttered Hong Kong room after tiffin; someone tries the door; Kitty whispers “Walter.” This reading is Chapter I only. This reading opens on “How shall I get out?”",
  "the-moon-and-sixpence":
    "I confess that when first I made acquaintance with Charles Strickland I never for a moment discerned that there was in him anything out of the ordinary. Yet now few will be found to deny his greatness. Tahiti comes later in the novel.",
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
  return author.replace(/\s*\([^)]*\btr(?:ans)?\.[\s\S]*$/i, "").replace(/;.*$/, "").trim();
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
