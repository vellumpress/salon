import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";

/**
 * Locked recommend → Next → Later ranking for local binds, plus Adapted by tbr.
 *
 * Live locked recommend rank (Mike A24≥9, Mira elevate Sun Sep 20):
 * Enchanted April, The Bridge of San Luis Rey, Mr. Fortune’s Maggot,
 * then The House of Mirth, then Quicksand. See FEATURED_CAROUSEL_IDS.
 * Home does not render a recommend strip — those five live on Rituals
 * (and remain the sit-together shuffle preference).
 *
 * Next keeps the remaining Host-a-sit queue:
 * The Attendant’s Confession (A24 South America lane).
 * Rashōmon (Asia lane).
 * A High Wind in Jamaica (Jamaica / before-sleep Host-a-sit Ch1).
 * Noli Me Tangere (Manila / unwind Host-a-sit Ch1).
 * Vera (Cornwall / before-sleep Host-a-sit Ch I).
 * On a Chinese Screen (China / waking Host-a-sit Parlour).
 * Futility (Petersburg coast / waking Host-a-sit sisters).
 * Trooper Peter Halket (Mashonaland / before-sleep Host-a-sit kopje).
 * The Home and the World (Bengal / before-sleep) — worldly Asia, behind the
 * locked recommend lead (April → Bridge → Maggot → Mirth → Quicksand).
 * The Immoralist (France / before-sleep) — strong Next only; not cold-open.
 * Letters of a Javanese Princess and Blood and Sand are ritual Next sits only —
 * not the locked recommend list.
 * Where Angels Fear to Tread and The Gadfly are ritual Next sits only —
 * not the locked recommend list.
 * Ecstasy, An Outcast of the Islands, The Underdogs, and The Diary of a
 * Chambermaid are ritual Next sits only — not the locked recommend list.
 * The Painted Veil, The Good Soldier, Growth of the Soil, and Nada the Lily
 * are ritual Next sits only — not the locked recommend list, not For you.
 * All Quiet on the Western Front, We, The Story of Gösta Berling, and Thaïs
 * are ritual Next sits only — not the locked recommend list, not For you.
 * Demian and Death Comes for the Archbishop are ritual Next sits only —
 * not the locked recommend list, not For you. The Getting of Wisdom is a
 * Rituals waking sit only — not locked recommend, not For you.
 * Bliss, Dubliners, Gitanjali, and Martin Birck’s Youth are ritual Next
 * sits only — not locked recommend, not For you. A Hundred and Seventy
 * Chinese Poems is a Rituals before-sleep sit only — not locked recommend,
 * not For you. Harmonium is a Rituals before-sleep sit only — The Snow Man
 * open, never Featured, not For you.
 * The Poison Tree is Later (Bengal / unwind) — not Next, not locked recommend.
 * Nacha Regules (unwind), Krakatit (before-sleep), The Peasants (waking),
 * and Cane (For you + before-sleep) are ritual Next sits only — not locked
 * recommend, not Featured. Cane may surface on For you after the cold-open
 * trio; Mirth → Quicksand → Botchan stay first.
 * Noon cycle (Sep 21) sits on the Next track, ahead of Later: A Hero of Our
 * Time (Caucasus—Georgia), Strange Tales (Painted Wall), Short Stories from
 * the Balkans (Easter Candles), and The Awakening (For you after the
 * cold-open trio, then Cane). A Few Figs from Thistles is Rituals
 * before-sleep only — poem chapters, First Fig — not Next, not Featured.
 * PM cycle (Sep 21) sits on Next after that noon queue: Tropic Death is the
 * Next lead (Drought, Barbados), then There Is Confusion (For you after the
 * cold-open trio), then Miss Lulu Bett (For you). Buddenbrooks is Later
 * (soft inflation) — not Next, not Featured. Color is Rituals only — Yet Do
 * I Marvel, then Incident, poem chapters — not Next, not Featured.
 * Cold-open stays Mirth → Quicksand → Botchan.
 * Tier A CLEAR (Sep 22) sits on Next after that queue, before-sleep only —
 * never Featured. Cold-open stays Mirth → Quicksand → Botchan. Noli stays the
 * live Derbyshire Host bind already on Next / Unwind.
 * BATCH-4 CLEAR (Sep 22) sits on Next after Tier A, before-sleep only —
 * never Featured, not For you. Cold-open stays Mirth → Quicksand → Botchan.
 * BATCH-5 CLEAR (Sep 22) sits on Next after BATCH-4, before-sleep only —
 * never Featured, not For you. Cold-open stays Mirth → Quicksand → Botchan.
 * BATCH-8 CLEAR (Sep 22) sits on Next after All Quiet and BATCH-5, before-sleep only —
 * never Featured, not For you. Cold-open stays Mirth → Quicksand → Botchan.
 * Tier B format-min batches 15–16 sit on Later only — never Featured, not Next,
 * not For you. Cold-open stays Mirth → Quicksand → Botchan.
 * BATCH-11 CLEAR (Sep 22) sits on Next after BATCH-8 (after All Quiet),
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan.
 * BATCH-10 CLEAR (Sep 22) sits on Next after All Quiet on the Western Front,
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan. Inferno stays HOLD (no invented Dante PG).
 * BATCH-9 CLEAR (Sep 22) sits on Next after All Quiet (after BATCH-10),
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan.
 * BATCH-12 CLEAR (Sep 22) sits on Next after BATCH-9 (after All Quiet),
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan. Ids already full-text local keep that bind.
 * BATCH-14 CLEAR (Sep 22) sits on Next after BATCH-13 (after All Quiet),
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan. Ids already full-text local keep that bind
 * (Yiddish Tales, Pharaoh, Brazilian Tales, Mashi, Casanova's Homecoming).
 * Bertha Garlan stays on its earlier Next seat; the bind now opens on Chapter I.
 * Tier B format-min batches 9–10 (Sep 22) are Later binds only — not Featured,
 * not Next, not For you. Mother is one of those Later rows. The chambermaid
 * stub stays unbound; Diary of a Chambermaid is the fuller local bind.
 * BATCH-13 CLEAR (Sep 22) sits on Next after BATCH-12 (after All Quiet),
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan. Siddhartha is the PG 2500 English, off the old EN hold.
 * The Divine Comedy is PG 1004 (Longfellow), not an invented Dante id.
 * Hands Around (Reigen) was already full-text local on main, so this batch leaves that bind.
 * BATCH-15 CLEAR (Sep 22) sits on Next after BATCH-14 (after All Quiet),
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan. the-inferno is Strindberg (PG 44108), not Dante.
 * Steppenwolf, The Red Room, and Queen of Spades and Other Stories keep their
 * fuller local binds and stay off this Next queue. Marianela keeps the fuller
 * Clara Bell English (PG 48818) in the BATCH-10 seat.
 * BATCH-16 CLEAR (Sep 22) sits on Next after BATCH-15 (after All Quiet),
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan. Fifty Years & Other Poems, Japanese Fairy Tales,
 * Some Chinese Ghosts, and Shadowings were already full-text local (the last
 * three fuller than this host-one pack), so those binds stay.
 * EXTRACTABLE-8 CLEAR (Sep 22, last pack) sits on Next after BATCH-16 (after
 * All Quiet), before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan. No Project Gutenberg ids. Anandamath is the
 * 1906 Abbey of Bliss, not Poison Tree. Conference of the Birds is FitzGerald’s
 * abridged Bird Parliament. Lady Macbeth hosts the one Chamot tale. Hadji Murad
 * left this Next seat for the 6PM For you lane. Anandamath left this Next seat
 * for the Wed 8AM For you lane.
 * Mira 8AM CLEAR ×5 (Sep 22) — Recommend only, never Featured. Gentlemen Prefer
 * Blondes leads Next with Of One Blood and Maria Chapdelaine (Blake EN 4383,
 * not FR 13525) on before-sleep. Lady into Fox is Rituals only. Seven Brothers
 * (Matson EN 79566) is For you only — not Next. Cold-open stays
 * Mirth → Quicksand → Botchan.
 * Generosity (Amber Later, 2026) is the Mira CLEAR local manuscript — rights
 * tbr, no Project Gutenberg id. Recommend For you only — not Next, never Featured.
 * Story through I'm sorry, then Poem I–VII. Cold-open stays
 * Mirth → Quicksand → Botchan.
 * NOON2 CLEAR (Sep 22) — Recommend only, never Featured. African Farm joins
 * Next / before-sleep on the Karoo moon (PG 1441). Marianela stays in its
 * BATCH-10 Next seat, Bell English, ads after THE END stripped (PG 48818).
 * On the Seaboard leaves Next for For you (and the walk / before-sleep sit);
 * Preface skipped, Goosestone bay open (PG 44184). Siddhartha and The Red
 * Room stay unstamped this wave. Cold-open stays Mirth → Quicksand → Botchan.
 * 4PM CLEAR (Sep 22) — Recommend only, never Featured. A Passage to India leads
 * this cycle’s Next append (Chandrapore / Marabar, English 1924, PG 61221),
 * then Mhudi (Bechuana open, Lovedale 1930, no Project Gutenberg id), then
 * María, moved off its EXTRACTABLE-8 seat onto this Next tail. María is Ogden’s
 * English 1890, lock-of-hair open, distinct from Marianela. Bel-Ami is For you
 * only (French 1885, PG 3733; no invented English year), after the cold-open
 * trio and before Generosity. Magnhild is Rituals only — before-sleep and a
 * walk, PG 33683, Preface skipped, Dust cut — not Next, not For you.
 * Cold-open stays Mirth → Quicksand → Botchan. Tang Poems and The Bronze
 * Horseman stay HOLD.
 * 6PM CLEAR (Sep 22) — Recommend only, never Featured. Of Human Bondage leads
 * this cycle’s Next append (gray morning / Wake up Philip, English 1915,
 * PG 351; first sit is Chapter I only), then Green Mansions (skip Foreword,
 * Ch I flight, PG 942), then Nada the Lily, moved off Later onto this Next
 * tail (skip Dedication / Preface / Intro, PG 1207) with the imperialism
 * Host-note kept visible. Hadji Murad leaves its EXTRACTABLE-8 Next seat for
 * For you only — Maude’s 1912 English, thistle prologue, no Project Gutenberg
 * id invented — after Bel-Ami and before Generosity. Jamaica Anansi Stories
 * is Rituals only: one tale per sit (hungry-time fish pot, PG 72735), not
 * Next, not For you. Cold-open stays Mirth → Quicksand → Botchan. Tang Poems
 * and The Bronze Horseman stay HOLD. The Painted Veil and A High Wind in
 * Jamaica stay their own books.
 * Wed 8AM CLEAR (Sep 23) — Recommend only, never the homepage Featured band.
 * Death Comes for the Archbishop leads this cycle’s Next append (Cruciform Tree
 * horseman, “ONE afternoon in the autumn of 1851”, English 1927, PG 69730;
 * skip the Rome / Sabine prologue). Banjo follows (Chapter I breakwater, 1929,
 * no Project Gutenberg id; dialect stays). Nacha Regules is the harder Next
 * bar (August Centennial cabaret, Ongley 1922, PG 59441). Anandamath leaves
 * its EXTRACTABLE-8 Next seat for For you only — Sen-Gupta 1906 Abbey of Bliss,
 * Padachinha famine, no Project Gutenberg id, not Poison Tree — after Hadji
 * Murad and before Generosity. An African Tragedy is Rituals only: leave-
 * teaching open, stop at the Chapter I boundary, no Project Gutenberg id, not
 * Next, not For you. Cold-open stays Mirth → Quicksand → Botchan. Tang Poems
 * and The Bronze Horseman stay HOLD.
 * Noon Wed 23 Sep 2026 CLEAR — Recommend only, never a new homepage Featured
 * pin. Enchanted April leads this cycle’s Next append (Woman’s Club / Agony
 * Column, 1922, PG 16389), then Quicksand (shaded lamp, 1928, no Project
 * Gutenberg id; distinct from Passing), then Underdogs as the harder Next
 * bar (sierra dog-bark, “That's no animal, I tell you!”, Munguía English,
 * PG 549). April and Quicksand stay on the locked recommend list, so their
 * track remains featured; they are not new Featured pins. Kwaidan is Rituals
 * only: one tale, Mimi-Nashi-Hōïchi at Dan-no-ura, PG 1210, footnotes already
 * stripped. Thaïs is For you only — Douglas English, PG 2078, Part First —
 * The Lotus — not Next. Cold-open stays Mirth → Quicksand → Botchan. Tang
 * Poems, The Bronze Horseman, and Inferno (wrong PG) stay HOLD.
 * ~4:14 Wed 23 Sep 2026 CLEAR — Recommend only, never a new homepage Featured
 * pin. Lolly Willowes leads this cycle’s Next append (Chapter I spare-room,
 * “Of course, you will come to us.”, PG 72223; soft against Mr. Fortune’s
 * Maggot). Chéri follows (pearls / wrought-iron bed, Flanner English local,
 * no Project Gutenberg id; soft against Bel-Ami). All Quiet keeps its earlier
 * Next seat and is repeated here so this cycle reads in order (rest billet,
 * beef and haricot beans, Wheen, PG 75011; war densify — do not sanitize).
 * The Gadfly is the harder Next bar (Pisa seminary / Fragola, PG 3431; soft
 * against Enchanted April’s Italy). Brazilian Tales is Rituals only: one
 * tale, The Attendant's Confession, PG 21040, stop at the tale boundary,
 * soft against Tropic. Cold-open stays Mirth → Quicksand → Botchan. Tang
 * Poems, The Bronze Horseman, and Inferno (wrong PG) stay HOLD. The Painted
 * Veil pack stays out of this ship.
 * 4pm Wed 23 Sep 2026 CLEAR — Recommend only, never a new homepage Featured
 * pin. The Painted Veil leads this cycle’s Next append (shuttered room,
 * Chapter I, English 1925, PG 64682; it was held and is cleared now). Growth
 * of the Soil follows (long moor road, red-beard Isak, Worster English, PG
 * 10984, year 1917). Tropic stays Rituals: Drought only, stop at the tale
 * boundary, and it keeps its earlier Next seat. Bunner Sisters is For you
 * (Stuyvesant shop-window, PG 311) and stays on bite-sized. The Purple Land
 * is the harder Next bar (three-chapters frame, Uruguay, PG 7132), soft
 * against Green Mansions. Cold-open stays Mirth → Quicksand → Botchan. Tang
 * Poems, The Bronze Horseman, and Inferno stay HOLD.
 * Midday Thu 24 Sep 2026 CLEAR — Recommend only, never a new homepage Featured
 * pin. The Peasants leads this cycle’s Next append (Autumn volume, PG 75846,
 * “Praised be Jesus Christ!”). A Hungarian Nabob follows (rainy puszta, PG
 * 20978). An Iceland Fisherman keeps its earlier Next seat and is repeated
 * here so this cycle reads in order (cabin, five seamen, PG 2196, year 1886
 * only). The Song of the Blood-Red Flower is the harder Next bar (strawberry
 * song, PG 12935, no translator named). Irish Fairy Tales is Rituals only:
 * Chapter I, Finnian and Tuan, PG 2892, stop at the chapter boundary.
 * Cold-open stays Mirth → Quicksand → Botchan. Tang Poems, The Bronze
 * Horseman, Inferno, and Rudin stay off this ship.
 * Thu eve 24 Sep 2026 CLEAR — Recommend only, never a new homepage Featured
 * pin. Dragon’s Teeth (basilio, Serrano EN, PG 74442) leads this cycle’s Next
 * append. Oblomov follows (Hogarth EN, PG 54700, abridged). The Lady with the
 * Dog is Rituals only: title story, Chapter I, PG 13415, not on the late-season
 * lane. Confessions of Zeno and The Book of Khalid are For you. Khalid opens
 * at Chapter II. Krakatit stays off. Cold-open stays Mirth → Quicksand → Botchan.
 * Tang Poems, The Bronze Horseman, Inferno, and Rudin stay off this ship.
 * Night 24–25 Sep 2026 CLEAR — Recommend only, never a new homepage Featured
 * pin. The Blacker the Berry leads this cycle’s Next append (Emma Lou’s
 * complexion, Thurman 1929, PG 78747). A Lost Lady follows (Sweet Water /
 * Burlington, Cather 1923, PG 65636), soft against Death Comes. Lady Macbeth
 * of Mtsensk leaves its EXTRACTABLE-8 Next seat for Rituals only — Chamot
 * 1923, no Project Gutenberg id. Summer, Jacob’s Room, The Tenant of Wildfell
 * Hall, and Herland are For you. The Last Man is later For you only. Dragon’s
 * Teeth stays covered on Next. Cold-open stays Mirth → Quicksand → Botchan.
 * Fri 25 Sep 2026 CLEAR — The Wanderer (Delisle 1928) is the EN Next sit after
 * Lost Lady. French meaulnes stays catalog-only. The Late Mattia Pascal
 * (Livingston 1923) is For you. Neither has a US Project Gutenberg id.
 * Hotel Savoy, Envy, Nettles, Wild Geese, Santa, One No One, and Quiroga stay off.
 * Fri 25 Sep 2026 ~10:04 CLEAR — Cabala leads Next (Wilder 1926, PG 68105).
 * Reuben Sachs and The Sun Also Rises follow on Next. Trooper Peter Halket
 * of Mashonaland and The Garden Party (At the Bay I) are Rituals only.
 * Never Featured. Bridge stays Bridge. Blood and Sand stays Spain.
 * The Africa novel pile stays off Trooper. Bliss stays off this Garden Party sit.
 * Fri 25 Sep 2026 ~2:04 noon CLEAR — The Man of Property leads Next
 * (Galsworthy 1906, PG 2559, Volume 1). The Awakening and Theresa Raquin
 * follow on Next. Where Angels Fear to Tread is For you only — not Next
 * (Italy stays off this Next append). Cane is Rituals only, Karintha.
 * Never Featured. Emmeline stays untouched. The morning Cabala queue stays.
 * Fri 25 Sep 2026 ~4:14 afternoon CLEAR — There Is Confusion leads this
 * Next append (Joanna / somebody great, Fauset 1924, PG 78915). Pointed
 * Roofs follows (Saratoga trunk / Fraeulein, Richardson 1915, PG 3019,
 * Pilgrimage vol. 1; Beresford skipped; not For you). The Rise of Silas
 * Lapham follows (Bartley / Solid Men of Boston, Howells 1885, PG 154).
 * Indiana follows (rainy Brie / Delmare, Sand 1832, Ives English, PG 63445;
 * prefaces skipped). The Book of Wonder is Rituals only — Preface plus
 * The Bride of the Man-Horse, Dunsany 1912, PG 7477 — not this Next queue.
 * Never Featured. Noon Man of Property and morning Cabala stay ahead.
 * Soft guards hold: Fauset ≠ Larsen; Hanover ≠ Italy; Boston ≠ London;
 * Brie ≠ Pont Neuf; Dunsany ≠ Carmilla / Maggot.
 * Fri 25 Sep 2026 ~7:14 evening CLEAR — The Hidden Force leads this Next
 * append (blood-red moon / Lange Laan / Residency, Couperus 1900, Teixeira
 * English, PG 34725; translator’s note skipped). The Home and the World
 * follows (Bimala’s vermilion, Tagore 1916, Surendranath English, PG 7166).
 * Hunger follows (Christiania attic, Hamsun 1890, Egerton English, PG 8387).
 * Jude the Obscure follows (Marygreen schoolmaster, Hardy 1895, PG 153).
 * Dubliners is Rituals only — Araby, Joyce 1914, PG 2814 — not this Next
 * queue. Never Featured. Afternoon Confusion, noon Man of Property, and
 * morning Cabala stay ahead. Soft guards hold: Java ≠ Hague; Bengal house
 * ≠ Anandamath; Kristiania ≠ Growth of the Soil; Marygreen ≠ Tess;
 * Araby ≠ Irish Fairy Tales.
 * Mira Fri 25 Sep 2026 ~6PM CLEAR — Recommend only, never Featured.
 * A High Wind in Jamaica leads this cycle’s Next append (Emancipation ruins,
 * Derby Hill, then Ferndale, PG 75530, 1929). Period racial language in the
 * sit is flagged and not sanitized. Vera follows (garden gate, PG 34366,
 * 1921), then Futility (Simbirsk vanish and the dirty table-cloth, Wharton
 * preface out of the bind, PG 77253, 1922), then The Comedienne (Bukowiec,
 * Obecny English, PG 25760, PL 1896). Strange Stories from a Chinese Studio
 * is Rituals only for this cycle — The Painted Wall, Giles English 1880,
 * PG 43629 — and keeps its earlier Next seat. It is not For you. Futility
 * leaves For you for this Next seat. Cold-open stays
 * Mirth → Quicksand → Botchan. Evening Hidden Force, afternoon Confusion,
 * noon Man of Property, morning Cabala, and Emmeline stay ahead and untouched.
 * Soft guards hold: High Wind novel ≠ Anansi folk; Vera ≠ Enchanted April;
 * Futility ≠ Hunger; Comedienne ≠ Peasants; Painted Wall ≠ Kwaidan.
 * Mira Sat 26 Sep 2026 AM CLEAR — Recommend only, never Featured.
 * The Moon and Sixpence leads this cycle’s Next append (Strickland greatness,
 * “He disturbs and arrests”, Maugham 1919, PG 222; title apparatus skipped).
 * Tahiti later is not Hong Kong and not a London medical apprenticeship.
 * My Brilliant Career follows (gum-trees / salt-shed / first recollection,
 * Franklin 1901, PG 11620; special notice and prefaces skipped). The Plumed
 * Serpent follows (Sunday after Easter / Kate’s heart sank, Lawrence 1926,
 * PG 73677). The Red Room follows (Moses Height / wind over Stockholm,
 * Strindberg, Schleussner English, Swedish 1879 / Latimer 1913, PG 37039).
 * Brazilian Tales is Rituals only — The Fortune-Teller, Goldberg English 1921,
 * PG 21040 — and keeps its earlier ritual seats. It is not this Next queue
 * and not For you. Cold-open stays Mirth → Quicksand → Botchan. Fri 6PM
 * High Wind, evening Hidden Force, afternoon Confusion, noon Man of Property,
 * morning Cabala, and Emmeline stay ahead and untouched.
 * Soft guards hold: Moon Tahiti ≠ Painted Veil HK / Bondage London medical;
 * Brilliant Career Australia preferred; Plumed mystic-expat ≠ Underdogs
 * revolution; Mexico ≠ Pamplona; Red Room Stockholm ≠ Hunger Kristiania;
 * Red Room ≠ Inferno; Fortune-Teller ≠ Attendant’s Confession.
 * Mira Sat 26 Sep 2026 MIDDAY CLEAR — Recommend only, never Featured.
 * The Green Carnation leads this cycle’s Next append (green carnation in the
 * evening coat, Piccadilly glass, Hichens 1894, PG 24499; credit block
 * skipped). Soft London after Reuben Sachs and the Forsytes is absorbed as
 * the lead. Hajji Baba follows (Kerbelai Hassan, barber of Ispahan, Morier,
 * first 1824 / Macmillan 1895, PG 21331; Curzon introduction and Macmillan
 * apparatus skipped). Period Orientalism stays as printed. The Purple Land
 * follows and keeps its earlier Next seat (three chapters, Banda Oriental,
 * Hudson, Sampson Low 1885, PG 7132; 1904 preface skipped). Uruguay is not
 * Guyana. The Master of Ballantrae follows (Durrisdeer, 1745, Stevenson 1889,
 * PG 864; dedication and contents rhymes skipped). A Set of Six is Rituals
 * only — Gaspar Ruiz, Conrad 1908, PG 2305 — and is not this Next queue and
 * not For you. Cold-open stays Mirth → Quicksand → Botchan. Sat AM Moon,
 * Fri 6PM High Wind, evening Hidden Force, afternoon Confusion, noon Man of
 * Property, morning Cabala, and Emmeline stay ahead and untouched.
 * Mira Sat 26 Sep 2026 AFTERNOON CLEAR — Recommend only, never Featured.
 * The Hill of Dreams leads this cycle’s Next append (furnace-glow sky,
 * Lucian Taylor’s lose-himself lane, Machen 1907, PG 13969; credits and
 * contents skipped). The open stays in Gwent; later London is soft after
 * The Green Carnation. LEAD kept — not African Farm. The Story of an African
 * Farm follows (full moon on the Karoo, Schreiner 1883, first issued as
 * Ralph Iron, PG 1441; preface, glossary, and epigraph skipped). The Karoo
 * is not Mashonaland, not Mhudi, and not Gaspar Ruiz. The earlier
 * african-farm seat stays. The Imperialist follows (Mother Beggarlegs,
 * Elgin, Duncan, PG text 1904 only, PG 5301; produced-by credit skipped).
 * No score is invented. The first breath is 585 words — phone-hard, left
 * as printed. Kim follows (Zam Zammah / Lahore Wonder House, Kipling 1901,
 * PG 2226; verse epigraph skipped). “Half-caste” and “burned black as any
 * native” stay as printed. Calvary stays held. Mogens, and Other Stories
 * is Rituals only — Mogens timed cut, Jacobsen, Grabow’s 1921 English of
 * the 1882 Danish, PG 6765 — and is not this Next queue and not For you.
 * Denmark is not Stockholm after The Red Room. The earlier mogens seat
 * stays. Cold-open stays Mirth → Quicksand → Botchan. Sat midday Green
 * Carnation, Sat AM Moon, Fri 6PM High Wind, evening Hidden Force,
 * afternoon Confusion, noon Man of Property, morning Cabala, and Emmeline
 * stay ahead and untouched.
 * Mira Sat 26 Sep 2026 EVENING CLEAR — Recommend only, never Featured.
 * The Road to the Open leads this cycle’s Next append (George alone, the
 * empty father’s chair, September sun, Schnitzler, Horace Samuel’s English,
 * German 1908 / Latimer 1913, PG 45895; title page skipped). LEAD kept —
 * not Calvary. Soft against Bertha Garlan: same author, different title.
 * Calvary follows (October birth at Saint-Michel-les-Hêtres, Orne, Mirbeau,
 * Louis Rich’s English, French 1886 / 1922, PG 48773). The Host stays in
 * the Orne and the Tourouvre forest; a later city is soft and not in the
 * Host. The earlier calvary seat stays. Anna of the Five Towns follows
 * (Sunday-school yard, The Kindling of Love, Bennett, Chatto 1902 only,
 * PG 35505). No score is invented. The Potteries are not London. The first
 * breath is 371 words — phone-hard, left as printed. Small Souls follows
 * (Hague rain, Dorine, wet umbrella, Couperus, Teixeira’s English, Dutch
 * 1901 / Dodd Mead 1914, PG 34021). The Hague is not the Java Residency.
 * The earlier small-souls and road seats stay. Stories and Pictures is
 * Rituals only — Bontzye Shweig, Peretz, Helena Frank’s English, Yiddish
 * 1894 / 1906, PG 37242 — and is not this Next queue and not For you.
 * Bontzye is not the Poland theater. Odessa is blocked and not stamped.
 * The earlier bontshe-the-silent seat stays. Cold-open stays
 * Mirth → Quicksand → Botchan. Sat afternoon Hill of Dreams, Sat midday
 * Green Carnation, Sat AM Moon, Fri 6PM High Wind, evening Hidden Force,
 * afternoon Confusion, noon Man of Property, morning Cabala, and Emmeline
 * stay ahead and untouched.
 * Mira Sat 26 Sep 2026 ~6PM CLEAR — Recommend only, never Featured.
 * White Jacket leads this cycle’s Next append (not a very white jacket,
 * Callao, Cape Horn bound, Melville, New York March 1850, PG 10712; note
 * and contents skipped). LEAD kept — not A Japanese Nightingale. Soft
 * Pacific after The Moon and Sixpence: a Callao ship is not Tahiti. No
 * score is invented. A Japanese Nightingale follows (sunset bay, The Storm
 * Dance, Eaton as Onoto Watanna, Harper 1901, PG 63181; illustration list
 * and contents skipped). Japan after Botchan and Kwaidan; the Unhuman Tour
 * stays held. Maria Chapdelaine follows (Peribonka church door, April snow,
 * Hémon, Blake’s English, French 1913 / Macmillan 1921, PG 4383; reprint
 * table skipped). Peribonka is not Elgin, Ontario. The House by the
 * Medlar-Tree follows (Malavoglia stones, Padron ’Ntoni, the Provvidenza,
 * Verga, Mary A. Craig’s English, Italian 1881 / Harper 1890, PG 54684;
 * Howells’s introduction skipped). Sicily is not Rome. The earlier
 * white-jacket, chapdelaine, and medlar seats stay. Filipino Popular Tales
 * is Rituals only — Suan’s Good Luck, Fansler, 1921, PG 8299 — and is not
 * this Next tail and not For you. One tale this sit. The earlier
 * filipino-popular-tales seat stays. Cold-open stays
 * Mirth → Quicksand → Botchan. Sat evening Road to the Open, afternoon
 * Hill of Dreams, midday Green Carnation, Sat AM Moon, Fri 6PM High Wind,
 * evening Hidden Force, afternoon Confusion, noon Man of Property, morning
 * Cabala, and Emmeline stay ahead and untouched.
 * Mira Sun 27 Sep 2026 AM CLEAR — Recommend only, never Featured.
 * The Marrow of Tradition leads this cycle’s Next append (Stay here beside
 * her, major, At Break of Day, cicada, magnolias, Chesnutt, 1901, PG 11228;
 * contents and the Lamb epigraph skipped). LEAD kept — not Zuleika Dobson.
 * The printed line “not he needed” stays. Soft against Cane: Wilmington is
 * not Georgia. No score is invented. Zuleika Dobson follows (that old bell,
 * Oxford station, the Warden of Judas, Beerbohm, 1911, PG 1845; the 1922
 * note skipped). Oxford is not London, and not the Potteries. The earlier
 * zuleika seat stays. Eugénie Grandet follows (provincial houses, Saumur’s
 * steep street, Balzac, Katharine Prescott Wormeley’s English, French 1833,
 * PG 1715; the dedication to Maria skipped). No Wormeley year is invented.
 * Saumur is not the Orne, and not Paris. The earlier eugenie seat stays.
 * Seven Brothers follows carefully (Jukola Farm, Häme, Toukola, Kivi, Alex
 * Matson’s English, Finnish 1870 / Faber 1929, PG 79566; Faber apparatus and
 * the preface skipped). Notion 61 is thin — do not inflate it. The For you
 * seat stays; this is not a new Featured path. Laos Folk-Lore is Rituals
 * only — A Child of The Woods, Fleeson, 1899, PG 35564 — and is not this
 * Next tail. One tale this sit. Laos is not Pampanga after Suan. The earlier
 * laos-folk-lore-of-farther-india seat stays. Cold-open stays
 * Mirth → Quicksand → Botchan. Sat 6PM White Jacket, evening Road to the
 * Open, afternoon Hill of Dreams, midday Green Carnation, Sat AM Moon,
 * Fri 6PM High Wind, evening Hidden Force, afternoon Confusion, noon Man of
 * Property, morning Cabala, and Emmeline stay ahead and untouched.
 * Mira Sun 27 Sep 2026 POST-#169 CLEAR — Recommend only, never Featured.
 * Born in Exile leads this cycle’s Next append (Whitelaw College, the
 * Kingsmill statue, the smoke-canopy, Gissing, 1892, PG 4526; Part-label
 * apparatus skipped). LEAD kept — not Four Horsemen, not After the Divorce.
 * Kingsmill is not Oxford, not London, and not the Potteries. Inventory is
 * medium. No Notion or Launch rank is invented. The Four Horsemen of the
 * Apocalypse follows carefully (Chapter II, Madariaga, the Centaur, Buenos
 * Aires and the ranch, Blasco Ibáñez, Charlotte Brewster Jordan’s English,
 * Spanish 1916 / 1918, PG 1484; Chapter I, The Tryst, skipped). Argentina is
 * not Uruguay, and not Gaspar Ruiz. Notion 75 is medium. Launch shelf no.
 * After the Divorce follows (Porru strangers’ room, the courtyard cricket,
 * Deledda, Maria Hornor Lansdale’s English, Italian 1902 / Holt 1905, PG
 * 39834; the St Luke epigraph skipped). Sardinia is not Sicily. Inventory is
 * medium. No Launch rank is invented. Virgin Soil follows carefully
 * (Officers Street staircase, “Is Nejdanov at home?”, Turgenev, R. S.
 * Townsend’s English, Russian 1877, PG 2466; the epigraph and the
 * introduction skipped). No Townsend year is invented. St Petersburg after
 * Futility — do not inflate it. There is no For you seat to keep. Hungry
 * Hearts is Rituals only — Wings, Yezierska, 1920, PG 41232 — and is not
 * this Next tail. One tale this sit. The Lower East Side is not Laos. The
 * earlier Sun AM seats stay ahead. Cold-open stays
 * Mirth → Quicksand → Botchan.
 * Mira Sun 27 Sep 2026 POST-#170 CLEAR — Recommend only, never Featured.
 * The Sport of the Gods leads this cycle’s Next append (Chapter I, The
 * Hamiltons, the Berry cottage, the Oakley mansion, a butler’s dignity,
 * Dunbar, 1902, PG 17854; contents skipped; the timed sit stops before the
 * New York chapters). LEAD kept — not Ramuntcho, not Miss Lulu Bett. Soft
 * Southern Oakley is not Wilmington after Marrow. The Host stays in the
 * South, after Wings on the Lower East Side. Inventory 84 is medium. No
 * Notion or Launch rank is invented. The whole novel continues north.
 * Ramuntcho follows carefully (Part I, Chapter I, sad curlews, the Bidassoa,
 * Loti, Henri Pene du Bois’s English, French 1897, PG 9616; produced-by
 * skipped). No English translator year is invented. Soft Basque is not
 * Saumur, not the Orne, and not Paris. Inventory 74 is easy — do not
 * inflate it. There is no For you seat to keep. Miss Lulu Bett follows
 * (Chapter I, April, the Deacon supper, Gale, inventory Appleton 1920 / the
 * 1921 header, PG 10429; contents skipped). Soft Midwest is new. Inventory
 * 84 is easy. No Launch rank is invented. The earlier For you seat stays.
 * The Pit follows (Chapter I, the Auditorium vestibule, Laura Dearborn,
 * Norris, 1903, PG 4382; principal characters, the trilogy note, and the
 * dedication skipped). Soft Chicago is new. Inventory 87 is medium. No
 * Launch rank is invented. Reginald is Rituals only — the title sketch,
 * Saki, 1904, PG 2830 — and is not this Next tail. One sketch this sit.
 * Soft London, carefully. The earlier Next seat for Reginald stays. The
 * earlier Sun POST-#169 seats stay ahead. Cold-open stays
 * Mirth → Quicksand → Botchan.
 * Mira Sun 27 Sep 2026 POST-#171 CLEAR — Recommend only, never Featured.
 * Royal Highness leads this cycle’s Next append (Prelude, Albrechtstrasse
 * noon, a general and a lieutenant in grey great-coats, Mann, A. Cecil
 * Curtis’s English, German 1909 / Curtis English 1916, PG 36028; contents
 * and the imprint skipped). LEAD SWAP — not Ramona. Soft Germany is new
 * after three American sits. Inventory 80 is medium. No Notion or Launch
 * rank is invented. Ramona follows carefully (Chapter I, sheep-shearing,
 * the Senora Moreno, Felipe, Jackson, 1884, PG 2802; produced-by skipped).
 * Soft Mission country is not Oakley, not the Midwest, and not Chicago.
 * Inventory 80 is medium. No Notion or Launch rank is invented. Almayer’s
 * Folly follows carefully (Chapter I, “Kaspar! Makan!”, the verandah, Pantai
 * at sunset, Conrad, 1895, PG 720; the Amiel epigraph and the edition block
 * skipped). Soft Conrad is not Gaspar Ruiz. Notion 71 is medium. Launch
 * shelf is no — For you only if the shelf is already dense — do not inflate
 * it. There is no For you seat to keep. The Crux follows (Chapter I, The
 * Back Way, the Foote Girls, Gilman, 1911, PG 38551; the verse epigraph
 * skipped). The Host opens in New England before Colorado. Inventory 87 is
 * easy. No Launch rank is invented. The Black Dog is Rituals only — the
 * title tale, Coppard, 1923, PG 61016 — and is not this Next tail. One tale
 * this sit. Soft England village, carefully, after Reginald. Inventory 88
 * is medium. No Launch rank is invented. The earlier Next seats for Royal
 * Highness, The Crux, and The Black Dog stay. The earlier Sun POST-#170
 * seats stay ahead. Cold-open stays Mirth → Quicksand → Botchan.
 *
 * Remakes are tbr original adaptations of PD sources. They are their own
 * catalog track — never locked recommend, Next, or Later classics.
 */
export type CuratorialTrack = "featured" | "next" | "later" | "adapted";

export const NEXT_FEATURED_TRACK_IDS = [
  "attendants-confession",
  "rashomon",
  "high-wind-jamaica",
  "noli-me-tangere",
  "vera",
  "on-a-chinese-screen",
  "trooper-peter-halket",
  "the-home-and-the-world",
  "the-immoralist",
  "a-hero-of-our-time",
  "strange-tales",
  "short-stories-from-the-balkans",
  "the-awakening",
  "tropic",
  "there-is-confusion",
  "miss-lulu-bett",
  // Mira BATCH-1 CLEAR (Sep 22) — after the PM queue. Never Featured.
  "the-three-impostors",
  "reginald",
  "last-poems-housman",
  "the-dynamiter",
  "candide",
  // Full Trooper bind is Rituals (Fri ~10:04 CLEAR), not this Next seat.
  // The short trooper-peter-halket card stays. Africa novels stay their own pile.
  "the-toys-of-peace",
  "the-black-dog",
  "children-of-the-frost",
  "south-sea-tales",
  "fairies-and-fusiliers",
  "young-adventure",
  "the-tempers",
  "the-crescent-moon",
  "poems-by-emily-dickinson-series-one",
  "a-diversity-of-creatures",
  "an-american-tragedy",
  "bertha-garlan",
  "born-in-exile",
  "calvary",
  "charmides-and-other-poems",
  "cousin-betty",
  "dauber",
  "eugenie-grandet",
  "heart-of-darkness",
  "in-a-glass-darkly",
  "in-the-world",
  "indiana",
  "lady-windermeres-fan",
  "pans-garden",
  "peacock-pie",
  "prosas-profanas",
  "resurrection",
  "rosmersholm",
  "salome",
  "salt-water-ballads",
  "small-souls",
  "songs-and-satires",
  "tess-of-the-durbervilles",
  "the-ballad-of-the-white-horse",
  "the-colonel-s-dream",
  "the-comedienne",
  "the-crux",
  "the-dream",
  "the-gods-of-pegana",
  "the-grand-babylon-hotel",
  "the-hidden-force",
  "the-house-by-the-medlar-tree",
  "the-house-of-the-seven-gables",
  "the-jacket",
  "the-job",
  "the-magic-skin",
  "the-man-of-property",
  "the-napoleon-of-notting-hill",
  "the-party-and-other-stories",
  "the-pit",
  "the-poison-tree",
  "the-reign-of-greed",
  "the-rise-of-david-levinsky",
  "the-rise-of-silas-lapham",
  "the-road-to-the-open",
  "the-romance-of-the-milky-way",
  "the-three-taverns",
  "the-titan",
  "the-town-down-the-river",
  "the-veil-and-other-poems",
  "the-village",
  "the-wolves-of-god",
  "the-wonderful-adventures-of-nils",
  "theresa-raquin",
  "three-soldiers",
  "twilight-sleep",
  "virgin-soil",
  "wanderers",
  "white-jacket",
  "yekl",
  "zuleika-dobson",
  "all-quiet-on-the-western-front",
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
  "toilers-of-the-sea",
  "toward-the-gulf",
  "a-house-of-gentlefolk",
  "artists-wives",
  "blix",
  "emaux-et-camees",
  "eves-ransom",
  "fraternity",
  "hania",
  "indian-summer",
  "les-heures-claires",
  "les-trophees",
  "numa-roumestan",
  "royal-highness",
  "the-emancipated",
  "the-great-hunger",
  "the-patrician",
  "the-price-of-love",
  "the-private-papers-of-henry-ryecroft",
  "unhuman-tour-kusamakura",
  // Mira BATCH-11 CLEAR — after All Quiet. Never Featured. Not For you.
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
  // Mira BATCH-10 CLEAR (Sep 22) — after All Quiet. Never Featured. Not For you.
  "before-adam",
  "bruges-la-morte",
  "casmurro",
  "les-civilises",
  "ein-landarzt",
  "hien-le-maboul",
  "knulp",
  "iracema",
  // French meaulnes (PG 5781) stays catalog-only. EN sit is the-wanderer.
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
  "smoke",
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
  // Mira BATCH-13 CLEAR — after All Quiet. Never Featured. Not For you.
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
  // our-lady-of-the-pillar leaves this inventory seat for Rituals (POST-#184, Host-only).
  "the-sweet-miracle",
  "red-oleanders",
  "stories-from-tagore",
  "the-fugitive",
  "nationalism",
  "the-cycle-of-spring",
  "creative-unity",
  "the-lonely-way",
  // Mira BATCH-15 CLEAR — after All Quiet. Never Featured. Not For you.
  "rootabaga-stories",
  "rootabaga-pigeons",
  "auguste-rodin",
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
  // Mira BATCH-16 CLEAR — after All Quiet. Never Featured. Not For you.
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
  // Mira EXTRACTABLE-8 CLEAR — after All Quiet. Never Featured. Not For you. No PG.
  "smoke-and-steel",
  "gods-trombones",
  // lady-macbeth left this Next seat for Rituals (Emmeline night 24–25 Sep).
  "layla",
  "conference",
  // Mira 8AM CLEAR ×5 — after EXTRACTABLE-8. Never Featured. Gentlemen leads Next.
  "gentlemen-prefer-blondes",
  "of-one-blood",
  "maria-chapdelaine",
  // Mira NOON2 CLEAR — after 8AM. Never Featured. Not For you.
  "african-farm",
  // Mira 4PM CLEAR — Passage leads Next. Never Featured. Not For you.
  "a-passage-to-india",
  "mhudi",
  "maria",
  // Mira 6PM CLEAR — Bondage leads Next. Never Featured. Not For you.
  "of-human-bondage",
  "green-mansions",
  "nada-the-lily",
  // Mira Wed 8AM CLEAR — Death Comes leads Next. Never Featured. Not For you.
  "death-comes-for-the-archbishop",
  "banjo",
  "nacha-regules",
  // Mira Noon Wed 23 Sep CLEAR — April leads Next. Never a new Featured pin.
  "enchanted-april",
  "quicksand",
  "underdogs",
  // Mira ~4:14 Wed 23 Sep CLEAR — Lolly leads Next. Never a new Featured pin.
  // All Quiet is already seated above; this second seat is the cycle order.
  "lolly-willowes",
  "cheri",
  "all-quiet-on-the-western-front",
  "the-gadfly",
  // Mira 4pm Wed 23 Sep CLEAR — Painted Veil leads Next. Never a new Featured pin.
  // Tropic stays Rituals (earlier Next seat kept). Bunner Sisters is For you.
  "the-painted-veil",
  "growth-of-the-soil",
  "the-purple-land",
  // Mira Evening Wed 23 Sep CLEAR — Noli leads Next. Never a new Featured pin.
  // Noli and Bertha already have earlier Next seats; these are the cycle order.
  // Stamp id gosta is the non-local Swedish alias. The Flach bind is
  // the-story-of-gosta-berling. Letters stay Rituals. Bertha Garlan is For you.
  "noli-me-tangere",
  "bread-givers",
  "the-story-of-gosta-berling",
  // Mira Thu 8am 24 Sep CLEAR — Hero leads Next. Never a new Featured pin.
  // Hero already sits on Before sleep and has an earlier Next seat; this is the cycle order.
  // White Nights and West African Folk-Tales stay Rituals. Birthright stays off.
  "a-hero-of-our-time",
  "after-the-divorce",
  "blood-and-sand",
  // Mira midday Thu 24 Sep CLEAR — Peasants leads Next. Never a new Featured pin.
  // Iceland already has an earlier Next seat; this is the cycle order.
  // Irish Fairy Tales stays Rituals, Chapter I only. Rudin stays off.
  "the-peasants",
  "a-hungarian-nabob",
  "an-iceland-fisherman",
  "the-song-of-the-blood-red-flower",
  // Mira Thu eve 24 Sep CLEAR — Dragon’s Teeth leads Next. Never a new Featured pin.
  // Lady with the Dog stays Rituals, title story only, off the late-season lane.
  // Zeno and Khalid are For you. Krakatit stays off. Rudin stays off.
  "basilio",
  "oblomov",
  // Mira night 24–25 Sep 2026 CLEAR — Blacker leads Next. Never Featured.
  // Lady Macbeth is Rituals only. Summer through Herland are For you.
  // The Last Man is later For you only. Dragon’s Teeth stays covered above.
  "blacker",
  "a-lost-lady",
  // Mira Fri 25 Sep 2026 CLEAR — Wanderer follows Lost Lady. Never Featured.
  // French meaulnes left the BATCH-10 Next seat. Mattia Pascal is For you.
  "the-wanderer",
  // Mira Fri 25 Sep 2026 ~10:04 CLEAR — Cabala leads Next. Never Featured.
  // Reuben and Sun follow. Trooper and Garden Party are Rituals, not this queue.
  "the-cabala",
  "reuben-sachs",
  "the-sun-also-rises",
  // Mira Fri 25 Sep 2026 ~2:04 noon CLEAR — Man of Property leads Next.
  // Awakening and Theresa follow. Angels is For you, not this queue.
  // Cane is Rituals (Karintha), not this queue. Never Featured.
  "the-man-of-property",
  "the-awakening",
  "theresa-raquin",
  // Mira Fri 25 Sep 2026 ~4:14 afternoon CLEAR — Confusion leads Next.
  // Pointed Roofs, Silas Lapham, and Indiana follow. Wonder is Rituals,
  // not this queue. Never Featured. Noon and morning packs stay ahead.
  "there-is-confusion",
  "pointed-roofs",
  "the-rise-of-silas-lapham",
  "indiana",
  // Mira Fri 25 Sep 2026 ~7:14 evening CLEAR — Hidden Force leads Next.
  // Home and the World, Hunger, and Jude follow. Dubliners is Rituals
  // (Araby only), not this queue. Never Featured. Afternoon, noon, and
  // morning packs stay ahead.
  "the-hidden-force",
  "the-home-and-the-world",
  "hunger",
  "jude-the-obscure",
  // Mira Fri 25 Sep 2026 ~6PM CLEAR — High Wind leads Next.
  // Vera, Futility, and The Comedienne follow. Strange Tales is Rituals
  // (The Painted Wall only) and keeps its earlier Next seat, not this tail.
  // Never Featured. Evening, afternoon, noon, and morning packs stay ahead.
  "high-wind-jamaica",
  "vera",
  "futility",
  "the-comedienne",
  // Mira Sat 26 Sep 2026 AM CLEAR — Moon leads Next. Never Featured.
  // Brilliant Career, Plumed Serpent, and Red Room follow. Brazilian Tales
  // is Rituals (The Fortune-Teller only) and keeps its earlier ritual seats,
  // not this tail. Fri packs stay ahead.
  "the-moon-and-sixpence",
  "my-brilliant-career",
  "the-plumed-serpent",
  "the-red-room",
  // Mira Sat 26 Sep 2026 MIDDAY CLEAR — Green Carnation leads Next. Never Featured.
  // Purple Land already has an earlier Next seat; this is the cycle order.
  // A Set of Six is Rituals (Gaspar Ruiz only), not this tail.
  // Sat AM and Fri packs stay ahead.
  "the-green-carnation",
  "hajji-baba",
  "the-purple-land",
  "the-master-of-ballantrae",
  // Mira Sat 26 Sep 2026 AFTERNOON CLEAR — Hill of Dreams leads Next. Never Featured.
  // The earlier african-farm seat stays; this cycle uses the-story-of-an-african-farm.
  // Mogens is Rituals (timed Mogens cut only), not this tail.
  // Midday, Sat AM, and Fri packs stay ahead.
  "the-hill-of-dreams",
  "the-story-of-an-african-farm",
  "the-imperialist",
  "kim",
  // Mira Sat 26 Sep 2026 EVENING CLEAR — Road to the Open leads Next. Never Featured.
  // Earlier seats for Road, Calvary, and Small Souls stay. This is the cycle order.
  // Stories and Pictures is Rituals (Bontzye Shweig only), not this tail.
  // Afternoon, midday, Sat AM, and Fri packs stay ahead.
  "the-road-to-the-open",
  "calvary",
  "anna-of-the-five-towns",
  "small-souls",
  // Mira Sat 26 Sep 2026 ~6PM CLEAR — White Jacket leads Next. Never Featured.
  // Earlier seats for White Jacket, Chapdelaine, and Medlar stay. This is the cycle order.
  // Filipino Popular Tales is Rituals (Suan’s Good Luck only), not this tail.
  // Evening, afternoon, midday, Sat AM, and Fri packs stay ahead.
  "white-jacket",
  "a-japanese-nightingale",
  "maria-chapdelaine",
  "the-house-by-the-medlar-tree",
  // Mira Sun 27 Sep 2026 AM CLEAR — Marrow of Tradition leads Next. Never Featured.
  // Earlier seats for Zuleika and Eugenie stay. Seven Brothers joins Next
  // carefully; the For you seat stays. Laos Folk-Lore is Rituals
  // (A Child of The Woods only), not this tail.
  // Sat 6PM White Jacket and the earlier packs stay ahead.
  "the-marrow-of-tradition",
  "zuleika-dobson",
  "eugenie-grandet",
  "seven-brothers",
  // Mira Sun 27 Sep 2026 POST-#169 CLEAR — Born in Exile leads Next. Never Featured.
  // Earlier seats for Born in Exile, After the Divorce, and Virgin Soil stay.
  // Four Horsemen joins Next carefully. Hungry Hearts is Rituals (Wings only),
  // not this tail. Sun AM Marrow and the earlier packs stay ahead.
  "born-in-exile",
  "the-four-horsemen-of-the-apocalypse",
  "after-the-divorce",
  "virgin-soil",
  // Mira Sun 27 Sep 2026 POST-#170 CLEAR — The Sport of the Gods leads Next. Never Featured.
  // Earlier seats for Miss Lulu Bett, The Pit, and Ramuntcho stay.
  // Reginald is Rituals (title sketch only), not this tail.
  // Sun POST-#169 Born in Exile and the earlier packs stay ahead.
  "the-sport-of-the-gods",
  "ramuntcho",
  "miss-lulu-bett",
  "the-pit",
  // Mira Sun 27 Sep 2026 POST-#171 CLEAR — Royal Highness leads Next. Never Featured.
  // LEAD SWAP — not Ramona. Earlier seats for Royal Highness, The Crux, and
  // The Black Dog stay. The Black Dog is Rituals (title tale only), not this tail.
  // Sun POST-#170 The Sport of the Gods and the earlier packs stay ahead.
  "royal-highness",
  "ramona",
  "almayers-folly",
  "the-crux",
  // Mira Sun 27 Sep 2026 POST-#172 CLEAR — Daisy Miller leads Next. Never Featured.
  // LEAD SWAP — not South Wind. Earlier Village seat stays. Flappers and
  // Philosophers is Rituals (Bernice Bobs Her Hair only), not this tail.
  // Sun POST-#171 Royal Highness and the earlier packs stay ahead.
  "daisy-miller",
  "south-wind",
  "the-village",
  "ditte-girl-alive",
  // Mira Sun 27 Sep 2026 MIDDAY CLEAR — Candide leads Next. Never Featured.
  // LEAD kept — not Aphrodite, not Iola Leroy. Earlier Candide and Aphrodite
  // seats stay. West African Folk-Tales is Rituals (Spider Tales only),
  // not this tail. Sun POST-#172 Daisy Miller and the earlier packs stay ahead.
  "candide",
  "iola-leroy",
  "esther-waters",
  "aphrodite",
  // Mira Sun 27 Sep 2026 POST-#174 CLEAR — Erewhon leads Next. Never Featured.
  // LEAD kept — not Ann Veronica, not The Great Hunger, not The Mysterious Stranger.
  // Children of the Frost is Rituals (The Law of Life only), not this tail.
  // Earlier Erewhon, Great Hunger, and Children of the Frost seats stay.
  // Sun MIDDAY Candide and the earlier packs stay ahead.
  "erewhon",
  "ann-veronica",
  "the-great-hunger",
  "the-mysterious-stranger",
  // Mira Sun 27 Sep 2026 POST-#175 CLEAR — The Poison Tree leads Next. Never Featured.
  // LEAD kept — not Cosmopolis, not The Woman Who Did, not Billy Budd.
  // Malay Sketches is Rituals (A Malay Romance only), not this tail.
  // Earlier Poison Tree inventory seat on Next stays. The Later poison-tree unwind seat stays.
  // Sun POST-#174 Erewhon and the earlier packs stay ahead.
  "the-poison-tree",
  "cosmopolis",
  "the-woman-who-did",
  "billy-budd",
  // Mira Sun 27 Sep 2026 POST-#176 CLEAR — Cousin Betty leads Next. Never Featured.
  // LEAD kept — not The Sorrows of Satan, not The King of Schnorrers, not Hania.
  // The Toys of Peace is Rituals (the title sketch only), not this tail.
  // Earlier Cousin Betty and Hania inventory seats on Next stay.
  // Sun POST-#175 Poison Tree and the earlier packs stay ahead.
  "cousin-betty",
  "the-sorrows-of-satan",
  "the-king-of-schnorrers",
  "hania",
  // Mira Sun 27 Sep 2026 POST-#177 CLEAR — Tess of the d’Urbervilles leads Next. Never Featured.
  // LEAD kept — not Captains Courageous, not Numa Roumestan, not Dracula.
  // The Tug of Love is Rituals (the title sketch only), not this tail.
  // Earlier Tess and Numa inventory seats on Next stay.
  // Sun POST-#176 Cousin Betty and the earlier packs stay ahead.
  "tess-of-the-durbervilles",
  "captains-courageous",
  "numa-roumestan",
  "dracula",
  // Mira Sun 27 Sep 2026 POST-#178 CLEAR — The House of the Seven Gables leads Next. Never Featured.
  // LEAD kept — not Heart of Darkness, not Toilers of the Sea, not Indian Summer.
  // A Slav Soul is Rituals (the title sketch only), not this tail.
  // Earlier Seven Gables, Heart, Toilers, and Indian Summer inventory seats on Next stay.
  // Sun POST-#177 Tess and the earlier packs stay ahead.
  "the-house-of-the-seven-gables",
  "heart-of-darkness",
  "toilers-of-the-sea",
  "indian-summer",
  // Mira Sun 27 Sep 2026 POST-#179 CLEAR — Cabbages and Kings leads Next. Never Featured.
  // LEAD kept — not Dorian Gray, not The Job, not The Reign of Greed.
  // A Cross Line is Rituals (the title sketch only), not this tail.
  // Earlier The Job inventory seat on Next stays. Earlier the-reign-of-greed stays on its own slug.
  // Sun POST-#178 Seven Gables and the earlier packs stay ahead.
  "cabbages-and-kings",
  "picture-of-dorian-gray",
  "the-job",
  "reign-of-greed",
  // Mira Sun 27 Sep 2026 POST-#180 CLEAR — The Shadow of the Cathedral leads Next. Never Featured.
  // LEAD kept — not The Way of All Flesh, not The Family at Gilje, not Resurrection.
  // The Beckoning Fair One is Rituals (the title tale only), not this tail.
  // Earlier Resurrection inventory seat on Next stays. Earlier the-shadow-of-the-cathedral,
  // the-way-of-all-flesh, and the-family-at-gilje stay on their own slugs.
  // Sun POST-#179 Cabbages and the earlier packs stay ahead.
  "shadow-of-the-cathedral",
  "way-of-all-flesh",
  "family-at-gilje",
  "resurrection",
  // Mira Sun 27 Sep 2026 POST-#181 CLEAR — Typee leads Next. Never Featured.
  // LEAD kept — not Kangaroo, not Casanova’s Homecoming, not The Mother.
  // Lord Arthur Savile’s Crime is Rituals (the title tale only), not this tail.
  // Earlier Typee, Kangaroo, and Casanova’s Homecoming shelf rows keep these slugs.
  // Sun POST-#180 Shadow of the Cathedral and the earlier packs stay ahead.
  "typee",
  "kangaroo",
  "casanovas-homecoming",
  "the-mother",
  // Mira Sun 27 Sep 2026 POST-#182 CLEAR — Three Soldiers leads Next. Never Featured.
  // LEAD kept — not Doctor Pascal, not In the World, not Leila.
  // Earlier Next inventory seats for Three Soldiers and In the World stay.
  // CHARAN is Rituals (the title tale only), not this tail.
  // Sun POST-#181 Typee and the earlier packs stay ahead.
  "three-soldiers",
  "doctor-pascal",
  "in-the-world",
  "leila",
  // Mira Mon 28 Sep 2026 POST-#183 CLEAR — Sister Carrie leads Next. Never Featured.
  // LEAD kept — not Antic Hay, not A spring-time case, not Eline Vere.
  // Earlier catalog rows for Sister Carrie, Antic Hay, and Eline Vere keep these slugs.
  // Earlier a-spring-time-case stays on its own slug. The Hungry Stones is Rituals (the title tale only).
  // Sun POST-#182 Three Soldiers and the earlier packs stay ahead.
  "sister-carrie",
  "antic-hay",
  "spring-time-case",
  "eline-vere",
  // Mira Mon 28 Sep 2026 POST-#184 CLEAR — Smoke leads Next. Never Featured.
  // LEAD kept — not Niels Lyhne, not The Emancipated, not Germinal.
  // Earlier Next inventory seats for Smoke and The Emancipated stay where they sit.
  // Germinal’s earlier shelf row keeps this slug and was not on Next.
  // Our Lady of the Pillar is Rituals (the title tale only), not this tail.
  // Mon POST-#183 Sister Carrie and the earlier packs stay ahead.
  "smoke",
  "niels-lyhne",
  "the-emancipated",
  "germinal",
  // Mira Mon 28 Sep 2026 POST-#185 CLEAR — Kipps leads Next. Never Featured.
  // LEAD kept — not The Professor, not A Room with a View, not Martin Eden.
  // Earlier shelf rows for these four keep their slugs. They were not on Next.
  // Madame Heurtebise is Rituals (the title sketch only), not this tail.
  // Mon POST-#184 Smoke and the earlier packs stay ahead.
  "kipps",
  "the-professor",
  "a-room-with-a-view",
  "martin-eden",
  // Mira Mon 28 Sep 2026 POST-#186 CLEAR — Une Vie leads Next. Never Featured.
  // LEAD kept — not My Ántonia, not Look Back on Happiness, not The Good Soldier.
  // Earlier shelf rows for My Ántonia, Look Back on Happiness, and The Good Soldier keep these slugs.
  // The earlier before-sleep listing of The Good Soldier moves onto this tail.
  // The Father of Yoto is Rituals (the title sketch only), not this tail.
  // Mon POST-#185 Kipps and the earlier packs stay ahead.
  "une-vie",
  "my-antonia",
  "look-back-on-happiness",
  "the-good-soldier",
  // Mira Mon 28 Sep 2026 POST-#187 CLEAR — Crime and Punishment leads Next. Never Featured.
  // LEAD kept — not Uncle Silas, not The Rise of David Levinsky, not For the Term of His Natural Life.
  // Earlier shelf rows for Uncle Silas and For the Term of His Natural Life keep these slugs.
  // The earlier inventory seat the-rise-of-david-levinsky stays on its own slug.
  // The Bottle Imp is Rituals (the title tale only), not this tail.
  // Mon POST-#186 Une Vie and the earlier packs stay ahead.
  "crime-and-punishment",
  "uncle-silas",
  "rise-of-david-levinsky",
  "for-the-term-of-his-natural-life",
  // Mira Mon 28 Sep 2026 POST-#188 CLEAR — Death in Venice leads Next. Never Featured.
  // LEAD kept — not Elmer Gantry, not The Colonel’s Dream, not Hard Times.
  // Earlier shelf rows for Elmer Gantry and Hard Times keep these slugs and move onto this tail.
  // The earlier inventory seats the-colonels-dream and the-great-god-pan stay on their own slugs.
  // The Great God Pan is Rituals (the title novella only), not this tail.
  // Mon POST-#187 Crime and Punishment and the earlier packs stay ahead.
  "death-in-venice",
  "elmer-gantry",
  "colonels-dream",
  "hard-times",
  // Mira Mon 28 Sep 2026 POST-#189 CLEAR — Manalive leads Next. Never Featured.
  // LEAD kept — not Captain Blood, not The Monomaniac, not Tartarin de Tarascon.
  // The Time Machine is Rituals (the whole short novel only), not this tail.
  // Mon POST-#188 Death in Venice and the earlier packs stay ahead.
  "manalive",
  "captain-blood",
  "the-monomaniac",
  "tartarin-de-tarascon",
  // Mira Mon 28 Sep 2026 POST-#190 CLEAR — The Prisoner of Zenda leads Next. Never Featured.
  // LEAD kept — not Kidnapped, not The Revolt of the Angels, not Children of the Soil.
  // The Invisible Man is Rituals (the whole short novel only), not this tail.
  // Mon POST-#189 Manalive and the earlier packs stay ahead.
  "prisoner-of-zenda",
  "kidnapped",
  "revolt-of-the-angels",
  "children-of-the-soil",
  // Mira Tue 29 Sep 2026 POST-#191 CLEAR — The Village in the Jungle leads Next. Never Featured.
  // LEAD kept — not The Joy of Captain Ribot, not Saracinesca, not The Torrents of Spring.
  // The Bet is before-sleep Rituals only (the one story), not this tail.
  // Mon POST-#190 Zenda and the earlier packs stay ahead.
  "the-village-in-the-jungle",
  "the-joy-of-captain-ribot",
  "saracinesca",
  "the-torrents-of-spring",
  // Mira Tue 29 Sep 2026 POST-#192 CLEAR — The Bitter Tea of General Yen leads Next. Never Featured.
  // LEAD kept — not The Woman of Andros, not Bella Donna, not Nina Balatka.
  // La Lupa is Rituals only (the one story), not this tail.
  // Tue POST-#191 Village and the earlier packs stay ahead.
  "the-bitter-tea-of-general-yen",
  "the-woman-of-andros",
  "bella-donna",
  "nina-balatka",
  // Mira Tue 29 Sep 2026 POST-#197 CLEAR — A Farewell to Arms leads Next. Never Featured.
  // LEAD kept — not Alice Adams, not Quartet, not The Song of Songs.
  // Its Wavering Image is Rituals only (the one story), not this tail.
  // Tue POST-#192 Yen and the earlier packs stay ahead.
  "a-farewell-to-arms",
  "alice-adams",
  "quartet",
  "song-of-songs-sudermann",
  // Mira Wed 30 Sep 2026 POST-#204 CLEAR — Java Head leads Next. Never Featured.
  // LEAD kept — not Sunshine Sketches, not Guest the One-Eyed, not The Blind Musician.
  // Magnolia Flower is Rituals only (the one story), not this tail.
  // Tue POST-#197 Farewell and the earlier packs stay ahead.
  "java-head",
  "sunshine-sketches-of-a-little-town",
  "guest-the-one-eyed",
  "the-blind-musician",
  // Mira Wed 30 Sep 2026 POST-#206 CLEAR — In the Mountains leads Next. Never Featured.
  // LEAD kept — not The Two Countesses, not El Ombú, not Halil the Pedlar.
  // The White Sand-Path is Rituals only (the one story), not this tail.
  // Wed POST-#204 Java Head and the earlier packs stay ahead.
  "in-the-mountains",
  "the-two-countesses",
  "el-ombu",
  "halil-the-pedlar",
  // Mira Wed 30 Sep 2026 POST-#210 CLEAR — Liliecrona's Home leads Next. Never Featured.
  // LEAD kept — not Doctor Luke of the Labrador, not Morriña, not A Happy Boy.
  // The Desjardins is Rituals only (the one story), not this tail.
  // Wed POST-#206 In the Mountains and the earlier packs stay ahead.
  "liliecronas-home",
  "doctor-luke-of-the-labrador",
  "morrina",
  "a-happy-boy",
  // Mira Thu 1 Oct 2026 POST-#212 CLEAR — Gone to Earth leads Next. Never Featured.
  // LEAD kept — not The Real Charlotte, not Pembroke, not The Argonauts.
  // At the Roadside Station is Rituals only (the one story), not this tail.
  // Wed POST-#210 Liliecrona's Home and the earlier packs stay ahead.
  "gone-to-earth",
  "the-real-charlotte",
  "pembroke",
  "the-argonauts",
  // Mira Thu 1 Oct 2026 POST-#213 CLEAR — The Will to Live leads Next. Never Featured.
  // LEAD kept — not Doom Castle, not Mayflower, not Susan Proudleigh.
  // The Peat Moor is Rituals only (the one story), not this tail.
  // Thu POST-#212 Gone to Earth and the earlier packs stay ahead.
  "the-will-to-live",
  "doom-castle",
  "mayflower",
  "susan-proudleigh",
  // Mira Thu 1 Oct 2026 POST-#217 CLEAR — Life and Death of Harriett Frean leads Next. Never Featured.
  // LEAD kept — not Farewell Love!, not The Son of His Mother, not My Lady Nobody.
  // New Year's Night is Rituals only (the one story), not this tail.
  // Thu POST-#213 The Will to Live and the earlier packs stay ahead.
  "life-and-death-of-harriett-frean",
  "farewell-love",
  "the-son-of-his-mother",
  "my-lady-nobody",
  // Mira Fri 2 Oct 2026 POST-#218 CLEAR — The Old House leads Next. Never Featured.
  // LEAD kept — not The Sworn Brothers, not Dusty Answer, not Christine of the Hills.
  // The Story of a Woman is Rituals only (the one story), not this tail.
  // Thu POST-#217 Harriett Frean and the earlier packs stay ahead.
  "the-old-house",
  "the-sworn-brothers",
  "dusty-answer",
  "christine-of-the-hills",
  // Mira Fri 2 Oct 2026 POST-#221 CLEAR — Daughters of Men leads Next. Never Featured.
  // LEAD kept — not The Bright Shawl, not Irresolute Catherine, not The Old Room.
  // The Fur Coat is Rituals only (the one story), not this tail.
  // Fri POST-#218 The Old House and the earlier packs stay ahead.
  "daughters-of-men",
  "the-bright-shawl",
  "irresolute-catherine",
  "the-old-room",
  // Mira Fri 2 Oct 2026 POST-#222 CLEAR — The Corsican Brothers leads Next, after The Old Room. Never Featured.
  // LEAD kept — not Jocelyn, not The Woman of Knockaloe. Pearl of Pearl Island is cut.
  // The Taking of the Redoubt is Rituals only (the one story, Host-only), not this tail.
  "the-corsican-brothers",
  "jocelyn",
  "the-woman-of-knockaloe",
  // Mira Sat 3 Oct 2026 POST-#224 CLEAR — The Man in the Brown Suit leads Next, after The Woman of Knockaloe. Never Featured.
  // LEAD kept — not Wang the Ninth, not Garram the Hunter. Gay-Neck is cut.
  // His Dead Wife's Photograph is Rituals only (the one story, Host-only), not this tail.
  "the-man-in-the-brown-suit",
  "wang-the-ninth",
  "garram-the-hunter",
  // Mira Sat 3 Oct 2026 POST-#225 CLEAR — The Face in the Abyss leads Next, after Garram the Hunter. Never Featured.
  // LEAD kept — not Mary Magdalen. At the Emperor's Wish and Kronstadt are cut; no alternates.
  // The Hoop is Rituals only (the one story, Host-only), not this tail.
  "the-face-in-the-abyss",
  "mary-magdalen",
  // Mira Sat 3 Oct 2026 POST-#227 CLEAR — Love's Shadow leads Next, after Mary Magdalen. Never Featured.
  // LEAD kept — not Lewis and Irene (Next carefully: the content notes). Old Dances is not used.
  // A Monkey is Rituals only (the one story, Host-only), not this tail.
  "love-s-shadow",
  "lewis-and-irene",
  // Mira Sun 4 Oct 2026 POST-#228 CLEAR — The Counterfeiters leads Next carefully, after Lewis and Irene. Never Featured.
  // One work this pack (the content notes are on the card).
  "the-counterfeiters",
  // Thérèse follows immediately, Next carefully only. Never Featured. Off every Ritual lane.
  "therese",
  // Mira Sun 4 Oct 2026 PM — Maximina follows Thérèse immediately, Next carefully only (the content notes are on the card).
  // Never Featured. Off every Ritual lane (unwind, on-a-walk, before-sleep).
  "maximina",
  // Mira Mon 5 Oct 2026 POST-#238 — Love Among the Chickens follows Maximina, plain Next. Never Featured. Off every Ritual lane.
  "love-among-the-chickens",
] as const;

/**
 * Mira pack — Adapted by tbr lane only. Do not add to locked recommend / Next.
 * Recasts are short stories only (Mike lock Sep 21). Whole-story remakes:
 * one shelf id / one read path each. Never splice a remake into waking /
 * unwind / before-sleep sibling sits (Mike lock Sep 20).
 *
 * FINAL LOCK — Mira + Thea + CoS (Sep 21): KEEP 14 only. Ignore any 15/20
 * variant. miss-brill-remake → miss-brill-adapted. Novels-glam×10, Madame
 * Bovary Tokyo, during-carnival, decapitated-chicken-lisbon, he-woke-changed,
 * a-coat-worthy-of-respect, hunger-artist-milan, queen-of-spades-paris, the
 * soft nine, and uninvented ids (the-kiss-nice, jewels-monaco) stay off this
 * list — not Featured, not Adapted. CUT shorts leave ritual lanes too.
 */
export const ADAPTED_BY_SALON_IDS = [
  "prefer-not",
  "bliss-tokyo",
  "masque-rio",
  "the-pattern",
  "garden-party-barcelona",
  "boule-de-suif-istanbul",
  "story-of-an-hour-buenos-aires",
  "late-season",
  "open-window-singapore",
  "miss-brill-adapted",
  "the-nose-cape-town",
  "usher-prague",
  "araby-seville",
  "between-the-drop-and-the-water",
] as const;

const FEATURED = new Set(FEATURED_CAROUSEL_IDS);
const NEXT = new Set<string>(NEXT_FEATURED_TRACK_IDS);
const ADAPTED = new Set<string>(ADAPTED_BY_SALON_IDS);

export function isAdaptedBySalon(id: string) {
  return ADAPTED.has(id);
}

export function curatorialTrack(id: string): CuratorialTrack {
  if (ADAPTED.has(id)) return "adapted";
  if (FEATURED.has(id)) return "featured";
  if (NEXT.has(id)) return "next";
  return "later";
}

export function worksOnTrack(
  ids: readonly string[],
  track: CuratorialTrack,
): string[] {
  return ids.filter((id) => curatorialTrack(id) === track);
}
