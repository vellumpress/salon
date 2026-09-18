/** Synopsis-style pitches for Featured / reader threshold (hand-curated). */
export const PITCHES: Record<string, string> = {
  basilio:
    "Mary Jane Serrano’s Dragon’s Teeth (Ticknor, Boston, 1889) — the only ≤1930 English of O Primo Basílio. A bowdlerized Victorian cut, not Campbell 1953 or Jull Costa. Sit with it as Dragon’s Teeth, not as modern Cousin Basilio.",
  vengeance:
    "Sholem Asch’s Yiddish theater of desire and shame: a house of pleasure that wants respectability. The room keeps score while everyone pretends the door is locked.",
  naomi:
    "In Tokyo, a husband remakes a young woman into the Western ideal he cannot stop wanting. Tanizaki’s obsession novel — fashion, power, and the cost of the remodel.",
  odessa:
    "Babel’s Black Sea city: gangsters, sun, and sudden violence between jokes. Odessa stories that move like rumor — bright, then sharp.",
  we:
    "Zamyatin’s glass city of perfect numbers learns what a soul costs. Surveillance as architecture — and the crack where desire gets in.",
  manhattan:
    "Dos Passos cuts New York as montage: arrivals, ads, and lives slicing across each other. The city as newsreel you can walk through.",
  tropic:
    "Eric Walrond’s Caribbean stories of color, labor, and heat that refuse soft focus. Docks, rooms, and the weather that won’t apologize.",
  berlin:
    "Berlin talks through Franz Biberkopf after prison — noise, politics, and fate in Döblin’s street choir. A city that will not let a man start clean.",
  passing:
    `Irene Redfield sorts her morning mail in Harlem and finds a thin envelope in purple ink—no return address, a hand she knows at once. Clare Kendry, the childhood friend who slipped into another world, is writing again. Nella Larsen’s 1929 New York novel opens on that letter, still unopened, and the careful life it threatens to unsettle.`,
  madmen:
    "Macedonio’s Buenos Aires invents a prophet of chaos and the men who follow him. Metaphysical comedy with knife-edge seriousness underneath.",
  gold:
    "Anzia Yezierska’s Lower East Side childhood told hard, funny, and without apology. Hunger, English, and the fight to own your own name.",
  crime:
    "A student tests the right to kill — and cannot live with the answer. Dostoevsky’s Petersburg heat: theory first, then the body keeps the receipt.",
  dorian:
    "Wilde’s beautiful face stays young while the portrait keeps the score. London drawing rooms, opium dens, and a bargain that looks like taste.",
  bovary:
    "Provincial longing, debt, and the romance novels that ruin a life. Flaubert’s Emma wants a finer plot than the town will sell her.",
  dracula:
    "Letters and journals track a count who crosses into England hungry. Stoker’s paperwork of dread — trains, telegrams, and blood under polite roofs.",
  anna:
    "Passion against the grain of society — and the train that waits at the end. Tolstoy’s Anna wants a life the salon cannot hold.",
  underground:
    "A spiteful man talks himself into a corner and will not leave. Dostoevsky’s underground note — resentment as philosophy, then as habit.",
  "a-room-with-a-view":
    "Florence light, English manners, and a kiss that rearranges a carefully planned life. Forster’s comedy of class with the windows suddenly open.",
  "liza-of-lambeth":
    "A factory girl in Lambeth learns how little the street forgives. Maugham’s early London — heat, gossip, and no soft landing.",
  banjo:
    "Marseille quays, a banjo on the strap — McKay’s Black Atlantic without a neat plot. Dockside music, argument, and men who refuse to be finished.",
  "in-our-time":
    `A drunk battery on a dark road—then a Michigan lake at dawn, and Nick Adams in a rowboat with his father. Ernest Hemingway’s 1925 American collection opens with a war vignette snapped against “Indian Camp”: spare sentences, long silences, the method already underway.`,
  "the-sun-also-rises":
    `Paris cafés, Burguete trout, Pamplona heat — Jake Barnes narrating what he cannot touch, Brett Ashley walking in with the wrong crowd. Ernest Hemingway’s 1926 novel opens on Robert Cohn, still boxing ghosts from Princeton, before the fiesta has even started.`,
  "lolly-willowes":
    `After her father’s death, Laura Willowes is packed off to London — useful, gentle, a black mushroom hat — until Great Mop and a quieter kind of bargain. Sylvia Townsend Warner’s 1926 aunt novel opens on that spare-room negotiation: family logistics first, the devil a few chapters later.`,
  "a-passage-to-india":
    `Chandrapore under an enormous sky — Mosque, Caves, Temple — and the English civil station that shares nothing with the city except the air. E. M. Forster’s 1924 novel opens on mud, gardens, and the Marabar echo still twenty miles off.`,
  "plum-bun":
    `Opal Street is no jewel — only imitation — and a Philadelphia household where color and ambition share a narrow parlor. Jessie Redmon Fauset’s 1929 novel opens on that street before Angela Murray takes the train toward a different mask.`,
  cheri:
    "Paris pearls and a kept boy — Flanner’s Colette, appetite turning into recognition. Aging beauty meets the younger lover who was never going to stay.",
  liliom:
    "Carousel barker, cheap room, day-pass from the dead — Glazer’s Theatre Guild Liliom. Molnár’s rough tenderness between the carnival and the afterlife.",
  "the-cherry-orchard":
    "May frost on a blossoming orchard, and a merchant who already knows the land will be cut into dachas. Julius West’s English of Chekhov’s 1904 play opens in the nursery at dawn — the train is late, the trees are in flower, and the house is already sold in everything but name.",
};

/** Preferred Featured carousel order (must have full text + pitch). */
export const FEATURED_CAROUSEL_IDS: string[] = [
  "vengeance",
  "passing",
  "we",
  "berlin",
  "manhattan",
  "crime",
  "dorian",
  "bovary",
  "odessa",
  "naomi",
  "dracula",
  "gold",
];

export function pitchFor(id: string): string | undefined {
  return PITCHES[id];
}
