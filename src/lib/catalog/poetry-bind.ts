import { breathsFor, type Breath, type Scene, type Work } from "../literature.ts";

/** Timed-sit leftovers: "Winter Night · 2", "The little flute · 12". */
export const TIMED_SIT_TITLE = / · \d+$/;
const GENERIC_CHAPTER = /^Chapter [IVXLCDM\d]+$/i;
const NUMBER_TITLE = /^(?:\d{1,3}|[IVXLCDM]{1,8})\.?$/;
const SECTION_MARK =
  /^(?:chapter|part|book|canto|section)\s+[ivxlcdm\d]+(?:\.|$)/i;
const SKIP_LINE =
  /^(?:see page \d+\.?|the end|finis|word count:\s*\d+|\*\*\*.*end of.*\*\*\*)$/i;

/** First-scene titles for the full local bind (ritual openings may differ). */
export const FIRST_SCENE_TITLE: Record<string, string> = {
  gitanjali: "Poem 1",
  "a-hundred-and-seventy-chinese-poems": "Battle",
  "the-weary-blues": "Proem",
};

/** Mira poem-chapter stamps — do not flatten these with the generic rebind. */
export const MIRA_STAMPED_POEM_IDS = [
  "gitanjali",
  "a-hundred-and-seventy-chinese-poems",
  "the-weary-blues",
  "pictures-of-the-floating-world",
  "silhouettes",
  "the-wild-swans-at-coole",
  "copper-sun",
  "color",
  "renascence-and-other-poems",
  "chicago-poems",
  "goblin-market-and-other-poems",
  "the-black-christ-and-other-poems",
  "sword-blades-and-poppy-seed",
  "precipitations",
  "sour-grapes",
] as const;

/** Waley 1918 headings from Winter Night through Last Poem (PG 42290). */
const WALEY_TITLES = [
  "Winter Night",
  "The Rejected Wife",
  "People Hide Their Love",
  "The Ferry",
  "The Waters of Lung-t'ou",
  "Flowers and Moonlight on the Spring River",
  "Tchirek Song",
  "Business Men",
  "Tell Me Now",
  "On Going to a Tavern",
  "Stone Fish Lake",
  "Civilization",
  "A Protest in the Sixth Year of Ch'ien Fu",
  "On the Birth of His Son",
  "The Pedlar of Spells",
  "Boating in Autumn",
  "The Herd-boy",
  "How I Sailed on the Lake Till I Came to the Eastern Stream",
  "A Seventeenth-century Chinese Poem",
  "The Little Cart",
  "An Early Levée",
  "Addressed to Ch'ēn, the Hermit",
  "Being on Duty all night in the Palace and dreaming of the Hsien-yu Temple",
  "The Letter",
  "Golden Bells",
  "Remembering Golden Bells",
  "Illness",
  "The Dragon of the Black Pool",
  "A Satire",
  "The Grain Tribute",
  "The People of Tao-chou",
  "The Old Harp",
  "The Harper of Chao",
  "The Flower Market",
  "The Prisoner",
  "The Chancellor's Gravel-drive",
  "The Man Who Dreamed of Fairies",
  "Magic",
  "The Two Red Towers",
  "The Charcoal-seller",
  "The Politician",
  "The Old Man with the Broken Arm",
  "Kept waiting in the Boat at Chiu-k'ou Ten Days by an adverse Wind",
  "On Board Ship: Reading Yüan Chēn's Poems",
  "Arriving at Hsün-yang",
  "Madly Singing in the Mountains",
  "Releasing a migrant Yen",
  "To a Portrait Painter who desired him to sit",
  "Separation",
  "Having climbed to the topmost Peak of the Incense-burner Mountain",
  "Eating Bamboo-shoots",
  "The Red Cockatoo",
  "After Lunch",
  "Alarm at first entering the Yang-tze Gorges",
  "On Being Removed from Hsün-yang and Sent to Chung-chou",
  "Planting Flowers on the Eastern Embankment",
  "Children",
  "Pruning Trees",
  "Being Visited by a Friend during Illness",
  "On the way to Hangchow: Anchored on the River at Night",
  "Stopping the Night at Jung-yang",
  "The Silver Spoon",
  "The Hat given to the Poet by Li Chien",
  "The Big Rug",
  "After Getting Drunk, becoming Sober in the Night",
  "Realizing the Futility of Life",
  "Rising Late and Playing with A-ts'ui, aged Two",
  "On a Box containing his own Works",
  "On Being Sixty",
  "Climbing the Terrace of Kuan-yin and looking at the City",
  "Climbing the Ling Ying Terrace and looking North",
  "Going to the Mountains with a little Dancing Girl, aged Fifteen",
  "Dreaming of Yüan Chēn",
  "A Dream of Mountaineering",
  "Ease",
  "On hearing someone sing a Poem by Yüan Chēn",
  "The Philosophers",
  "Taoism and Buddhism",
  "Last Poem",
];

export const KNOWN_POEM_TITLES: Record<string, string[]> = {
  "a-hundred-and-seventy-chinese-poems": WALEY_TITLES,
};

export function normalizeTitleKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9']+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const FINITE_VERB =
  /\b(is|are|was|were|have|has|had|will|would|could|should|must|said|says|seemed|seems)\b/i;

export function fixPoetryOcr(text: string): string {
  let t = text;
  // Dialect 'T was / 'T is stays. Bare / quoted T-for-I is OCR.
  t = t.replace(/(^|[^A-Za-z'])T have\b/g, "$1I have");
  t = t.replace(/(^|[^A-Za-z'])T am\b/g, "$1I am");
  t = t.replace(/(^|[^A-Za-z'])T was\b/g, "$1I was");
  t = t.replace(/(^|[^A-Za-z'])T will\b/g, "$1I will");
  t = t.replace(/(^|[^A-Za-z'])T would\b/g, "$1I would");
  t = t.replace(/[“"]T have\b/g, (m) => `${m[0]}I have`);
  t = t.replace(/[“"]T am\b/g, (m) => `${m[0]}I am`);
  t = t.replace(/[“"]T was\b/g, (m) => `${m[0]}I was`);
  t = t.replace(/\bl have\b/g, "I have");
  t = t.replace(/\bl am\b/g, "I am");
  t = t.replace(/\b1 have\b/g, "I have");
  t = t.replace(/\b1 am\b/g, "I am");
  t = t.replace(/\btlie\b/g, "the");
  t = t.replace(/\btbe\b/g, "the");
  t = t.replace(/\*T would\b/g, "'T would");
  t = t.replace(/\*T am\b/g, "'T am");
  t = t.replace(/\*T was\b/g, "'T was");
  t = t.replace(/\*T will\b/g, "'T will");
  return t;
}

function lettersOf(text: string) {
  return text.replace(/[^A-Za-z]/g, "");
}

function upperRatio(text: string) {
  const letters = lettersOf(text);
  if (!letters) return 0;
  return letters.replace(/[^A-Z]/g, "").length / letters.length;
}

function isAllCapsHeading(text: string) {
  const t = text.trim();
  const letters = lettersOf(t);
  if (letters.length < 3 || letters.length > 64) return false;
  if (t.length > 90) return false;
  if (upperRatio(t) < 0.86) return false;
  if (/[.!?]{2}/.test(t)) return false;
  return true;
}

function isTitleCaseHeading(text: string) {
  const t = text.trim();
  if (t.length < 2 || t.length > 64) return false;
  if (/[,;:]$/.test(t)) return false;
  if (FINITE_VERB.test(t)) return false;
  const words = t.replace(/[.:]$/, "").split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 10) return false;
  const small =
    /^(of|the|a|an|and|or|in|on|to|for|from|with|at|by|as|into|over|under|among)$/i;
  const ok = words.every((word, i) => {
    if (small.test(word) && i > 0) return true;
    return /^[A-Z0-9]/.test(word) || /^[“"_([]/.test(word);
  });
  if (!ok) return false;
  if (/[.!?]$/.test(t) && words.length > 4) return false;
  return true;
}

export function splitGluedTitle(text: string): { title: string; rest: string } | null {
  const t = text.trim();
  // Capital "By" only — "Day by day" is verse, not an attribution.
  const m = t.match(/^(.*?)\s+By\s+([A-Z].+)$/);
  if (!m?.[1] || !m[2]) return null;
  const left = m[1].trim();
  if (left.length < 2 || left.length > 64) return null;
  if (isDateOrNoteFragment(left) || /^\d/.test(left)) return null;
  if (!(isAllCapsHeading(left) || isTitleCaseHeading(left) || NUMBER_TITLE.test(left))) {
    return null;
  }
  return { title: left, rest: `By ${m[2].trim()}` };
}

export function isPoemNumberTitle(text: string) {
  return NUMBER_TITLE.test(text.trim());
}

export function isSkipBreath(text: string) {
  const t = text.trim();
  if (!t) return true;
  if (SKIP_LINE.test(t)) return true;
  if (/^\*\*\*\s*START OF/i.test(t)) return true;
  return false;
}

export function isSectionMark(text: string) {
  const t = text.trim();
  if (GENERIC_CHAPTER.test(t) || SECTION_MARK.test(t)) return true;
  if (/^PART [IVXLCDM\d]+[.:]?$/i.test(t)) return true;
  return false;
}

/**
 * A line that should open a new poem scene.
 * Numbers / ALL-CAPS / "TITLE By Author" are hard cuts.
 * Title Case is a cut when the next line is a By-line, or the line is short
 * and does not read as verse.
 */
export function isKnownPoemTitle(text: string, known?: string[]) {
  if (!known?.length) return false;
  const key = normalizeTitleKey(text.split(/\s+By\s+/)[0] ?? text);
  if (!key) return false;
  return known.some((title) => {
    const want = normalizeTitleKey(title);
    if (!want) return false;
    if (key === want) return true;
    if (key.startsWith(`${want} `) && key.length <= want.length + 36) return true;
    return want.startsWith(key) && key.length >= 12 && want.length - key.length <= 24;
  });
}

export function isDateOrNoteFragment(text: string) {
  const t = text.trim();
  if (/^\(?\d{3,4}(?:\s*[-–]\s*\d{2,4})?\)?\.?$/.test(t)) return true;
  if (/^\d{3,4}\)/.test(t)) return true;
  if (/^Written\b/i.test(t) && t.length < 80) return true;
  return false;
}

function prevIsComplete(prev?: string) {
  if (!prev) return true;
  const t = prev.trim();
  if (!t) return true;
  return /[.!?]["'”’)]*$/.test(t);
}

export function isPoemTitleLine(
  text: string,
  next?: string,
  known?: string[],
  prev?: string,
) {
  const t = text.trim();
  if (!t || isSkipBreath(t)) return false;
  if (/^By\s+/i.test(t)) return false;
  if (isDateOrNoteFragment(t)) return false;
  if (isSectionMark(t)) return false;
  if (isKnownPoemTitle(t, known)) return true;
  if (splitGluedTitle(t)) return true;
  if (isAllCapsHeading(t)) return true;
  // Arabic stanza numbers ("2") mid-poem are not chapter breaks.
  // Edition numbers that open a poem carry a period ("2.") or are roman.
  if (isPoemNumberTitle(t)) {
    const bare = t.replace(/\.$/, "");
    if (/^[ivxlcdm]+$/i.test(bare)) return prevIsComplete(prev);
    if (/\.$/.test(t)) return prevIsComplete(prev);
    return false;
  }
  if (!isTitleCaseHeading(t)) return false;
  if (next && /^\s*By\s+[A-Z]/i.test(next)) return true;
  // Refrains ("O Blues!") are verse, not titles.
  if (/!$/.test(t)) return false;
  if (/\?$/.test(t)) return false;
  if (!prevIsComplete(prev)) return false;
  if (/\.$/.test(t)) {
    const words = t.replace(/\.$/, "").split(/\s+/).filter(Boolean);
    if (words.length < 1 || words.length > 6) return false;
    if (/^\d/.test(words[0] ?? "")) return false;
    return true;
  }
  // Bare title-case after a finished line: short headings only.
  const words = t.split(/\s+/).filter(Boolean);
  return words.length >= 1 && words.length <= 6;
}

export function displayPoemTitle(raw: string) {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  const bare = trimmed.replace(/\.$/, "");
  if (NUMBER_TITLE.test(trimmed) || NUMBER_TITLE.test(bare)) {
    const token = bare.replace(/\.$/, "");
    if (/^[ivxlcdm]+$/i.test(token)) return token.toUpperCase();
    return token;
  }
  const letters = lettersOf(bare);
  if (letters.length >= 3 && upperRatio(bare) >= 0.86) {
    const small =
      /^(of|the|a|an|and|or|in|on|to|for|from|with|at|by|as|into|over|under|among)$/i;
    let seenWord = false;
    return bare
      .toLowerCase()
      .split(/(\s+|-)/)
      .map((part) => {
        if (!/[a-z]/.test(part)) return part;
        const keepSmall = seenWord && small.test(part);
        seenWord = true;
        if (keepSmall) return part;
        return part.replace(/^[a-z]/, (ch) => ch.toUpperCase());
      })
      .join("");
  }
  return bare;
}

export function shouldFlattenPoemScenes(work: Pick<Work, "scenes" | "breaths">) {
  const titles = work.scenes.map((scene) => scene.title);
  if (titles.some((title) => TIMED_SIT_TITLE.test(title))) return true;
  if (titles.length <= 1 && work.breaths.length > 40) return true;
  const generic = titles.filter((title) => GENERIC_CHAPTER.test(title)).length;
  const avg = work.breaths.length / Math.max(1, titles.length);
  if (generic >= titles.length * 0.6 && avg >= 18) return true;
  return false;
}

type BuiltScene = { title: string; lines: string[] };

export function keepTitleAsBreath(raw: string) {
  const t = raw.trim();
  if (isPoemNumberTitle(t)) return false;
  if (isAllCapsHeading(t) && !/[.!?]$/.test(t)) return false;
  if (splitGluedTitle(t)) return false;
  // Short titled lyrics ("At Dieppe.") stay in the scroll — not every sentence.
  if (!/\.$/.test(t)) return false;
  const words = t.replace(/\.$/, "").split(/\s+/).filter(Boolean);
  return words.length >= 1 && words.length <= 6 && isTitleCaseHeading(t);
}

function hasVerse(lines: string[]) {
  return lines.some((line) => !keepTitleAsBreath(line));
}

function sceneTitleFrom(title: string, body: string[]) {
  if (title) return title;
  const first = body[0] ?? "Poem";
  if (keepTitleAsBreath(first)) return displayPoemTitle(first);
  if (first.length <= 42 && isTitleCaseHeading(first)) return displayPoemTitle(first);
  return "Poem";
}

function pushScene(out: BuiltScene[], title: string, lines: string[]) {
  const body = lines.map(fixPoetryOcr).filter((line) => line && !isSkipBreath(line));
  if (!body.length) return;
  if (!hasVerse(body)) return;
  out.push({ title: sceneTitleFrom(title, body), lines: body });
}

export function splitLinesIntoPoems(
  lines: string[],
  opts?: { firstTitle?: string; knownTitles?: string[] },
): BuiltScene[] {
  const out: BuiltScene[] = [];
  let title = opts?.firstTitle ?? "";
  let body: string[] = [];
  let started = false;
  let prev = "";

  const flush = () => {
    if (!started && !body.length) return;
    pushScene(out, title, body);
    title = "";
    body = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = fixPoetryOcr(lines[i] ?? "").trim();
    const next = lines[i + 1];
    const known = opts?.knownTitles;
    if (!raw || isSkipBreath(raw)) continue;

    if (isSectionMark(raw)) {
      const following = (next ?? "").trim();
      if (
        isPoemTitleLine(following, lines[i + 2], known, raw) ||
        isSectionMark(following) ||
        !following
      ) {
        continue;
      }
    }

    const glued = splitGluedTitle(raw);
    if (glued) {
      if (hasVerse(body)) flush();
      started = true;
      title = displayPoemTitle(glued.title);
      body = [fixPoetryOcr(glued.rest)];
      prev = body[0] ?? "";
      continue;
    }

    if (isPoemTitleLine(raw, next, known, prev)) {
      if (started && hasVerse(body)) {
        flush();
        title = displayPoemTitle(raw);
        body = keepTitleAsBreath(raw) ? [raw] : [];
      } else {
        if (!title) title = displayPoemTitle(raw);
        if (keepTitleAsBreath(raw)) body.push(raw);
        else title = displayPoemTitle(raw);
      }
      started = true;
      prev = raw;
      continue;
    }

    started = true;
    body.push(raw);
    prev = raw;
  }
  flush();
  return out;
}

function scenesFromBuilt(built: BuiltScene[], prompt: string): Pick<Work, "scenes" | "breaths"> {
  const scenes: Scene[] = [];
  const breaths: Breath[] = [];
  built.forEach((item, index) => {
    const id = `s${index}`;
    const lines = item.lines;
    const firstVerse =
      lines.find((line) => !keepTitleAsBreath(line) && !/^By\s+/i.test(line)) ??
      lines.find((line) => !keepTitleAsBreath(line)) ??
      lines[0] ??
      item.title;
    scenes.push({
      id,
      title: item.title,
      place: item.title,
      reentry: firstVerse,
      prompt,
    });
    breaths.push(...breathsFor(id, lines));
  });
  return { scenes, breaths };
}

function splitExistingScenes(work: Work, known?: string[]): Pick<Work, "scenes" | "breaths"> {
  const prompt = work.scenes[0]?.prompt ?? "A word from this stretch.";
  const built: BuiltScene[] = [];
  for (const scene of work.scenes) {
    const lines = work.breaths
      .filter((breath) => breath.sceneId === scene.id)
      .map((breath) => breath.text);
    const midTitles = lines.some(
      (line, i) => i > 0 && isPoemTitleLine(line, lines[i + 1], known, lines[i - 1]),
    );
    if (!midTitles) {
      const title = GENERIC_CHAPTER.test(scene.title)
        ? displayPoemTitle(scene.title.replace(/^Chapter\s+/i, ""))
        : TIMED_SIT_TITLE.test(scene.title)
          ? displayPoemTitle(lines[0] ?? scene.title)
          : scene.title;
      pushScene(built, title, lines);
      continue;
    }
    const firstTitle =
      GENERIC_CHAPTER.test(scene.title) || TIMED_SIT_TITLE.test(scene.title)
        ? undefined
        : scene.title;
    built.push(...splitLinesIntoPoems(lines, { firstTitle, knownTitles: known }));
  }
  return scenesFromBuilt(built, prompt);
}

export function rebindPoetryWork(work: Work): Work {
  const prompt = work.scenes[0]?.prompt ?? "A word from this stretch.";
  const firstOverride = FIRST_SCENE_TITLE[work.id];
  const known = KNOWN_POEM_TITLES[work.id];
  const lines = work.breaths.map((breath) => breath.text);
  const flatBuilt = splitLinesIntoPoems(lines, { firstTitle: firstOverride, knownTitles: known });
  if (firstOverride && flatBuilt[0] && !TIMED_SIT_TITLE.test(firstOverride)) {
    flatBuilt[0] = { ...flatBuilt[0], title: firstOverride };
  }
  const flat = scenesFromBuilt(flatBuilt, prompt);
  const split = splitExistingScenes(work, known);
  const chops = work.scenes.some((scene) => TIMED_SIT_TITLE.test(scene.title));
  // Flatten when it finds more poems. Timed-sit leftovers always flatten.
  // If flattening would merge already-split poems (titles only on scenes), keep those cuts.
  const next =
    chops || flat.scenes.length >= split.scenes.length || flat.scenes.length > work.scenes.length
      ? flat
      : split;
  if (firstOverride && next.scenes[0]) {
    next.scenes[0] = {
      ...next.scenes[0],
      title: firstOverride,
      place: firstOverride,
    };
  }

  if (!next.breaths.length) return work;

  return {
    ...work,
    scenes: next.scenes,
    breaths: next.breaths,
    minutes: work.minutes,
  };
}

/** Keep opening metadata; take the first N rebound scenes from the full book. */
export function openingFromScenes(full: Work, opening: Work, sceneCount: number): Work {
  const scenes = full.scenes.slice(0, Math.max(1, sceneCount));
  const ids = new Set(scenes.map((scene) => scene.id));
  const breaths = full.breaths.filter((breath) => ids.has(breath.sceneId));
  return {
    ...opening,
    scenes,
    breaths,
  };
}

export function poemTitleBleed(work: Pick<Work, "scenes" | "breaths">) {
  const first = new Map<string, string>();
  for (const breath of work.breaths) {
    if (!first.has(breath.sceneId)) first.set(breath.sceneId, breath.text);
  }
  const hits: { sceneId: string; text: string }[] = [];
  for (const breath of work.breaths) {
    if (first.get(breath.sceneId) === breath.text) continue;
    if (isPoemNumberTitle(breath.text) || isAllCapsHeading(breath.text) || splitGluedTitle(breath.text)) {
      hits.push({ sceneId: breath.sceneId, text: breath.text });
    }
  }
  return hits;
}
