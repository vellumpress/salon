export type Form = "novel" | "stories" | "poem" | "play";

export type Work = {
  id: string;
  title: string;
  author: string;
  year: number;
  form: Form;
  language: string;
  opening: string;
  pitch?: string;
  intro?: string;
  gutenberg?: number;
  source: "local-bind" | "gutenberg";
};

export type Chapter = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type WorkText = {
  id: string;
  chapters: Chapter[];
};

export const WORKS: Work[] = [
  {
    id: "carmilla",
    title: "Carmilla",
    author: "Joseph Sheridan Le Fanu",
    year: 1872,
    form: "stories",
    language: "English",
    gutenberg: 10007,
    source: "gutenberg",
    opening:
      "Upon a paper attached to the Narrative which follows, Doctor Hesselius has written a rather elaborate note, which he accompanies with a reference to his Essay on the strange subject which the MS. illuminates.",
    pitch:
      "A Styrian guest, a lonely schloss, and dread that arrives through dreams. Vampire fiction before Dracula made the template familiar.",
    intro:
      "A lonely schloss in Styria. A teenage narrator with too few neighbors. A carriage accident on a moonlit road—and a mysterious young guest who settles in as if she already belongs.\n\nJoseph Sheridan Le Fanu’s Carmilla, an Irish gothic novella first serialized in the London magazine The Dark Blue (December 1871–March 1872) and collected the same year in In a Glass Darkly, is vampire fiction before Dracula made the template familiar: intimate, atmospheric, and unsettling in a way that still feels modern on a late subway ride home. Le Fanu writes friendship and fascination with equal care; the dread arrives slowly, through dreams, solitude, and a guest who will not quite explain herself.\n\nOpen to Chapter I—“An Early Fright”—and step into that forest castle before the next carriage rolls in.",
  },
  {
    id: "songs-of-innocence-and-of-experience",
    title: "Songs of Innocence and of Experience",
    author: "William Blake",
    year: 1794,
    form: "poem",
    language: "English",
    source: "local-bind",
    opening: "Piping down the valleys wild,",
    pitch:
      "Blake’s paired songs: nursery light on one side, harder truths on the other. Read them as morning weather — clear, then clouded.",
    intro:
      "Blake’s paired songs: nursery light on one side, harder truths on the other.\n\nSongs of Innocence (1789) and Songs of Experience (1794) belong together as one book of two weathers. Open on the piper in the valley, then cross into the songs that will not stay gentle.",
  },
  {
    id: "miss-julie",
    title: "Miss Julie",
    author: "August Strindberg",
    year: 1888,
    form: "play",
    language: "Swedish",
    gutenberg: 8499,
    source: "gutenberg",
    opening: "COUNTESS JULIE",
    pitch:
      "Midsummer night in the count’s kitchen. Class, desire, and a dance that will not stay downstairs.",
    intro:
      "Midsummer night. The count is away. In the kitchen, a valet and the young mistress of the house test how far a dance can go.\n\nAugust Strindberg’s Miss Julie (1888) is a naturalist play of class and appetite in a single charged night. Open as the servants talk, before Julie comes down.",
  },
  {
    id: "maggie-a-girl-of-the-streets",
    title: "Maggie: A Girl of the Streets",
    author: "Stephen Crane",
    year: 1893,
    form: "novel",
    language: "English",
    gutenberg: 447,
    source: "gutenberg",
    opening:
      "A very little boy stood upon a heap of gravel for the honor of Rum Alley.",
    pitch:
      "Bowery tenements, street fights, and a city written close to the pavement. Crane’s New York without soft focus.",
    intro:
      "Rum Alley vs. Devil’s Row—a gravel heap, flying stones, and a very little boy who will not run.\n\nStephen Crane’s Maggie: A Girl of the Streets, first published in 1893 under the pseudonym Johnston Smith (Crane paid for a private printing himself), then revised for D. Appleton & Company in 1896, drops you into the Bowery when the elevated rattled overhead and tenement stairs smelled of frying and whiskey. It is New York written close to the pavement: Irish immigrant households, street fights, collar factories, music halls, and the thin hope of looking finer than the block will allow. Crane was twenty-one when the first edition appeared; the prose is spare, ironic, and hard of hearing toward sentiment.\n\nFor readers who walk these same avenues today—or ride past them on the F—this is the city before Midtown glass, told without soft focus. Open at Chapter I and meet Jimmie on that heap of gravel.",
  },
  {
    id: "kwaidan-stories-and-studies-of-strange-things",
    title: "Kwaidan: Stories and Studies of Strange Things",
    author: "Lafcadio Hearn",
    year: 1904,
    form: "stories",
    language: "English",
    gutenberg: 1210,
    source: "gutenberg",
    opening:
      "More than seven hundred years ago, at Dan-no-ura, in the Straits of Shimonoséki, was fought the last battle of the long contest between the Heiké, or Taira clan, and the Genji, or Minamoto clan.",
    pitch:
      "Hearn’s Japan after dark: soft-spoken ghosts, fox wives, and strange studies that prefer a whisper to a scream.",
    intro:
      "Late train, headphones in—and a voice from another century telling you the room might not be empty.\n\nLafcadio Hearn’s Kwaidan (1904) gathers Japanese ghost stories and weird tales he shaped in English from old books and living memory: blind minstrels and temple nights, snow on the road, faces that aren’t faces, dreams that last a lifetime. Hearn—born in Europe, forged as a New Orleans newspaperman, then settled in Japan—wrote these for Western readers who wanted strangeness without a lecture. The title’s old-style spelling of kaidan simply means ghost story.\n\nOpen on “The Story of Mimi-Nashi-Hōïchi,” then wander piece by piece; the book closes with short insect studies that feel like quiet aftershock. No syllabus required—just the subway, a dark window, and the next turn of the page.",
  },
  {
    id: "the-house-of-mirth",
    title: "The House of Mirth",
    author: "Edith Wharton",
    year: 1905,
    form: "novel",
    language: "English",
    gutenberg: 284,
    source: "gutenberg",
    opening: "Selden paused in surprise.",
    pitch:
      "Lily Bart in the crush of Grand Central. New York society measuring people by invitations, and a summer that will not stay light.",
    intro:
      "Grand Central on a Monday in early September—the afternoon rush, the heat, the crowd. Lawrence Selden notices Lily Bart standing apart from it all, vivid against the dull tints of the station, looking for all the world as if she might be catching a train… or waiting for something else entirely.\n\nEdith Wharton’s The House of Mirth, first published in 1905, is the New York society novel that made her famous: drawing rooms and country houses, shrewd glances and carefully timed entrances, a city that measures people by invitations and appearances. Wharton knew that world from the inside—the money, the manners, the quiet rules that decide who belongs.\n\nLily is beautiful, well-born, and not quite secure enough. Selden is the spectator who can’t look away. Between them stretches a city summer of chance meetings, tea trays, and the kind of talk that sounds light until it isn’t.\n\nOpen to Chapter I and meet them where New York novels so often begin: in the crush of Grand Central, before the next train leaves.",
  },
  {
    id: "post-office",
    title: "The Post Office",
    author: "Rabindranath Tagore",
    year: 1912,
    form: "play",
    language: "Bengali",
    gutenberg: 6523,
    source: "gutenberg",
    opening: "[MADHAV'S House] MADHAV.",
    pitch:
      "A sick boy at the window watches the road and waits for the king’s letter. Tagore’s short play of attention and leave-taking.",
    intro:
      "A sick boy at an open window. The road goes by. He is waiting for a letter that may never come from the king.\n\nRabindranath Tagore’s The Post Office (1912) is a short play of watching, waiting, and the dignity of a child’s attention. Open in Madhav’s house.",
  },
  {
    id: "bunner-sisters",
    title: "Bunner Sisters",
    author: "Edith Wharton",
    year: 1916,
    form: "novel",
    language: "English",
    gutenberg: 311,
    source: "gutenberg",
    opening:
      "In the days when New York's traffic moved at the pace of the drooping horse-car, when society applauded Christine Nilsson at the Academy of Music and basked in the sunsets of the Hudson River School on the walls of the National Academy of Design, an inconspicuous shop with a single show-window was intimately and favourably known to the feminine population of the quarter bordering on Stuyvesant Square.",
    pitch:
      "Two sisters, one shop window near Stuyvesant Square, and a New York that still moved at the pace of the horse-car.",
    intro:
      "An inconspicuous shop with a single show-window, known to the women of the quarter bordering on Stuyvesant Square.\n\nEdith Wharton’s Bunner Sisters (1916) is a New York novella of two sisters, a clock, and the small hopes that a shop can hold. Open when the city’s traffic still moved at the pace of the drooping horse-car.",
  },
  {
    id: "hungry-hearts",
    title: "Hungry Hearts",
    author: "Anzia Yezierska",
    year: 1920,
    form: "stories",
    language: "English",
    gutenberg: 41232,
    source: "gutenberg",
    opening:
      '"My heart chokes in me like in a prison! I\'m dying for a little love and I got nobody--nobody!" wailed Shenah Pessah, as she looked out of the dismal basement window.',
    pitch:
      "Lower East Side kitchens, shop floors, and the hunger that isn’t only for bread. Yezierska’s immigrant New York, story by story.",
    intro:
      "Basement light on a Lower East Side Sunday—and a young woman opening the window for the first spring sun.\n\nAnzia Yezierska’s Hungry Hearts (1920) is a book of short stories from the tenements and shop floors of immigrant New York: janitresses and factory hands, matchmakers and landlords, kitchens that double as worlds. Yezierska writes the hunger that isn’t only for bread—the push for schooling, dignity, a little beauty, a life that feels like America and not just work. The voices are close to the ear: Yiddish-inflected English, street names you still know, the crush of cold-water flats.\n\nOpen on “Wings,” then move story by story. No syllabus, no spoilers—just the city as it felt when the new world was still being argued over in hallways and on stoops. Read it on the F train downtown, or walking past Essex and Delancey: these pages still know the neighborhood.",
  },
  {
    id: "rur",
    title: "R.U.R.",
    author: "Karel Čapek",
    year: 1920,
    form: "play",
    language: "Czech",
    gutenberg: 59112,
    source: "gutenberg",
    opening: "ACT ONE",
    pitch:
      "A factory of artificial workers, and the word robot entering English. Čapek’s play of manufacture, revolt, and what a soul costs.",
    intro:
      "An island factory that makes artificial workers. Managers talk of progress. The new labor has other plans.\n\nKarel Čapek’s R.U.R. (1920) is the play that gave English the word robot. Open at Act One, before the revolt.",
  },
  {
    id: "in-our-time",
    title: "In Our Time",
    author: "Ernest Hemingway",
    year: 1925,
    form: "stories",
    language: "English",
    source: "local-bind",
    opening:
      "Everybody was drunk. The whole battery was drunk going along the road in the dark.",
    pitch:
      "1925 Boni & Liveright: Nick Adams stories with war vignettes snapped in like news photos. Hemingway’s early cuts — clean, cold, and unfinished on purpose.",
    intro:
      "War wires, café talk, a Michigan lake at dawn—and a prose line cut so close it still feels modern on a phone screen.\n\nErnest Hemingway’s In Our Time (Boni & Liveright, New York, 1925) is his first American story collection: short Nick Adams pieces set against brief italic interchapters—bullrings, fronts, city rooms—snapped in like news photographs. The book that made his name arrives without throat-clearing: you meet the method (what’s left out matters) before the myths.\n\nThis shelf ships the 1925 U.S. text—vignettes woven through the stories, ending at L’Envoi—not later Scribner’s additions. Open on Chapter I, then “Indian Camp,” and keep going story by story. No syllabus. Read it on the 1 train uptown or with coffee on a too-bright morning: spare sentences, long silences, the twentieth century already underway.",
  },
  {
    id: "the-weary-blues",
    title: "The Weary Blues",
    author: "Langston Hughes",
    year: 1926,
    form: "poem",
    language: "English",
    gutenberg: 77837,
    source: "gutenberg",
    opening:
      "Droning a drowsy syncopated tune, Rocking back and forth to a mellow croon, I heard a Negro play.",
    pitch:
      "Hughes at the piano: jazz in the bones, Harlem nights, and a drowsy syncopated tune. Poems that walk like music down Lenox Avenue.",
    intro:
      "Hughes at the piano: jazz in the bones, Harlem nights, and a drowsy syncopated tune.\n\nThe Weary Blues (1926) is Langston Hughes’s first book of poems. Open on the title poem and stay for the rest of the night — poems that walk like music down Lenox Avenue.",
  },
  {
    id: "banjo",
    title: "Banjo",
    author: "Claude McKay",
    year: 1929,
    form: "novel",
    language: "English",
    source: "local-bind",
    opening:
      "Heaving along from side to side, like a sailor on the unsteady deck of a ship, Lincoln Agrippa Daily, familiarly known as Banjo, patrolled the magnificent length of the great breakwater of Marseilles, a banjo in his hand.",
    pitch:
      "Marseille quays, a banjo on the strap — McKay’s Black Atlantic without a neat plot. Dockside music, argument, and men who refuse to be finished.",
    intro:
      "Lincoln Agrippa Daily—Banjo to anyone who knows him—comes swinging down the breakwater of Marseilles with an instrument in his hand and the whole Atlantic in his walk. Beach boys from the Caribbean, Senegal, the States, and points between share wine, jokes, and the next meal on the docks of the sailor’s dream port.\n\nClaude McKay’s Banjo, first published in 1929, is a story without a plot in the best sense: vignettes of music, hunger, friendship, and the international Black life that gathered between boxcar and bistro after the Great War. For New York readers who know McKay from Harlem, this is the same restless ear turned outward—to the Mediterranean, to the “Ditch,” to a city that feels as crowded and alive as any subway platform. Open at Chapter I and meet Banjo where the land meets the sea.",
  },
  {
    id: "passing",
    title: "Passing",
    author: "Nella Larsen",
    year: 1929,
    form: "novel",
    language: "English",
    gutenberg: 78747,
    source: "gutenberg",
    opening:
      "It was the last letter in Irene Redfield's little pile of morning mail.",
    pitch:
      "Nella Larsen’s two women, one secret, and the color line drawn through friendship. Chicago heat, Harlem rooms — belonging as a dangerous performance.",
    intro:
      "A letter at the bottom of the morning pile. Two women, one secret, and the color line drawn through friendship.\n\nNella Larsen’s Passing, published in 1929, moves between Chicago heat and Harlem rooms — belonging as a dangerous performance. Open on the letter that will not stay unopened.",
  },
];

export const FORM_RAILS: { form: Form; label: string }[] = [
  { form: "novel", label: "Novels" },
  { form: "stories", label: "Stories" },
  { form: "poem", label: "Poems" },
  { form: "play", label: "Plays" },
];

const byId = new Map(WORKS.map((work) => [work.id, work]));

export function getWork(id: string): Work | undefined {
  return byId.get(id);
}

export function searchWorks(query: string): Work[] {
  const q = query.trim().toLowerCase();
  if (!q) return WORKS;
  return WORKS.filter((work) => {
    const hay = `${work.title} ${work.author} ${work.year}`.toLowerCase();
    return hay.includes(q);
  });
}

export function worksByForm(form: Form): Work[] {
  return WORKS.filter((work) => work.form === form);
}

export async function loadWorkText(id: string): Promise<WorkText> {
  const response = await fetch(`/catalog/${id}.json`);
  if (!response.ok) {
    throw new Error(`Missing text for ${id}`);
  }
  return (await response.json()) as WorkText;
}
