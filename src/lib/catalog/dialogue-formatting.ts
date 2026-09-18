import type { Breath, Scene, Work } from "../literature.ts";

/** First-load opening length — keep in step with `work-shape.ts`. */
export const DIALOGUE_OPENING_BREATHS = 96;

const TITLE =
  "(?:MRS|MR|MS|MISS|DR|PROF|COL|CAPT|GEN|SIR|LADY|LORD|FATHER|MOTHER|UNCLE|AUNT|COUNT|COUNTESS|PRINCE|PRINCESS|MADAME|MME|ST|DOCTOR|PROFESSOR|COLONEL|CAPTAIN|GENERAL)\\.";
const TOKEN = "(?:[A-Z][A-Z''\\-]{1,}|OF|THE|FROM|AT|AND|DE|VON|VAN|DA|DI|DEL|LA|LE|DU)";
const NAME = `(?:${TITLE}\\s+${TOKEN}(?:\\s+${TOKEN}){0,3}|${TOKEN}(?:\\s+(?:${TITLE}\\s+)?${TOKEN}){0,4})(?:\\s+(?:JR|SR)\\.?)?`;
const STAGE = "(?:\\s*(?:\\[[^\\]]*\\]|\\([^)]*\\)|_[^_]+_))";

const WHOLE_CUE = new RegExp(`^(${NAME})${STAGE}?\\s*[.:]?$`);
const LEADING_CUE = new RegExp(`^(${NAME})(?:${STAGE})?\\s*[.:]\\s+(\\S[\\s\\S]*)$`);
const LEADING_BARE = new RegExp(`^(${NAME})(?:${STAGE})?\\s+([A-Z“"‘(\\[][\\s\\S]*)$`);
const ALREADY_PREFIXED = /^[A-Z][a-zA-Z''.\-]*(?: [A-Z][a-zA-Z''.\-]*){0,4}: /;

const HEADER =
  /^(?:act|scene|chapter|book|part|characters|curtain|finis|prologue|epilogue|intermission|dramatis|personae|contents|preface|introduction|foreword|appendix)\b/i;
const HEADER_EXACT =
  /^(?:curtain|characters|finis|end|prologue|epilogue|enter|exit|exeunt|pause|silence|tableau|blackout|lights)\.?$/i;
const ROMAN = /^(?:M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3}))\.?$/;
const TITLE_PREP =
  /^(?:AT|AFTER|ON|BEFORE|UNDER|FROM|IN|OVER|BETWEEN|TOWARD|TOWARDS|INTO|BEYOND|AMONG|WITHIN|WITHOUT|ABOUT|ABOVE|AROUND|ACROSS|ALONG|AGAINST|DURING|SINCE|UNTIL|UPON|NEAR|AMID)\s+/;
const TITLE_NOT_SPEAKER =
  /^(?:THE END|THE OLD MANSE|THE SISTERS|THE DEAD|THE KISS|THE LOOK|THE MARK|THE END\.)$/;
const ROLE_THE =
  /^THE (?:VOICE|CROWD|CHORUS|OTHERS|SERVANTS|GUESTS|COMPANY|SOLDIERS|PEOPLE|ORCHESTRA|BAND|CHILDREN|BOYS|GIRLS|WOMEN|MEN|ROBOTS)\b/;
const TITLE_ABBREV = /^(?:MRS|MR|MS|DR|ST|PROF|COL|CAPT|GEN|MISS|MME)\.?$/;
const NUMBER_WORD =
  /^(?:ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)$/;
const PUBLISHER_TAIL = /\b(?:COMPANY|CO|PRESS|PUBLISHERS|BOOKS|INC|LTD|GAZETTE|HERALD|SPECTATOR|ATHENAEUM)\.?$/;
const JOURNAL_HEADING = /\b(?:journal|diary|letter|telegram|memorandum)\b/i;
const SALUTATION = /^(?:DEAR|MY DEAR|TO MY|PLEASE)\b/;
const INTERROGATIVE_START = /^(?:HOW|WHY|WHAT|WHEN|WHERE|WHICH|WHO)\b/;
const GENRE_TITLE =
  /^(?:SONG|SONNET|CANZON|CANZONE|PASTORAL|PASTEL|HYMN|ENVOI|L'ENVOI|RONDEL|ODE|ELEGY|BALLAD|PSALM|DIRGE|LULLABY|PRAYER|NOCTURNE|PANTOMIME|FOOTNOTES|NOTES|NOTE|CONTENTS|INDEX|PREFACE|INTRODUCTION|FOREWORD|APPENDIX|CHAP|CHAPTER|ANSWER|PARADISE|DREAMS|PARTED|BRIDE|AUTUMN|DAYBREAK|MORNING|DUST|PIG|SKETCH|ECHOES|REWARDS|PERFUME|SOUVENIR|QUEST|TEARS|FANTOCHES|MAQUILLAGE|MORBIDEZZA|REQUIES|PORTRAIT)\b/;
const SMALL_WORD = new Set(["of", "the", "from", "at", "and", "de", "da", "von", "van", "du", "la", "le", "di", "del"]);
const STOP_NAME = new Set([
  "YES",
  "NO",
  "OH",
  "AH",
  "HA",
  "OK",
  "GO",
  "COME",
  "LOOK",
  "WAIT",
  "STOP",
  "HELP",
  "FIRE",
  "CLANG",
  "RANGA",
  "BOOM",
  "AND",
  "THE",
  "BUT",
  "FOR",
  "NOT",
  "YOU",
  "ALL",
  "HIS",
  "HER",
  "HIM",
  "SHE",
  "HE",
  "WE",
  "THEY",
  "THIS",
  "THAT",
  "WITH",
  "FROM",
  "HAVE",
  "WERE",
  "BEEN",
  "WHEN",
  "WHAT",
  "YOUR",
  "WILL",
  "THERE",
  "THEIR",
  "SAID",
  "THEN",
  "THEM",
  "IN",
  "ON",
  "AT",
  "BY",
  "TO",
  "OF",
  "OR",
  "IF",
  "SO",
  "AN",
  "DAY",
  "WHICH",
  "WANTED",
  "RIGHT",
  "LEFT",
  "NEW",
  "OLD",
  "SONG",
]);

export type CueHit = {
  index: number;
  text: string;
  speaker: string;
};

type NestState = {
  square: number;
  paren: number;
  italic: boolean;
};

function cleanName(raw: string) {
  return raw.replace(/[.:]\s*$/, "").replace(/\s+/g, " ").trim();
}

export function isStructuralHeader(text: string) {
  const t = text.trim();
  if (!t) return false;
  if (HEADER_EXACT.test(t)) return true;
  if (HEADER.test(t)) return true;
  if (/^curtain\.?$/i.test(t)) return true;
  const inner = t.replace(/^[_*]+|[_*.]+$/g, "").trim();
  if (/^[_*]/.test(t) && inner.length < 80 && JOURNAL_HEADING.test(inner)) return true;
  return false;
}

function isRomanName(name: string) {
  const t = name.replace(/\.$/, "");
  if (t.length < 1 || t.length > 8) return false;
  if (ROMAN.test(t)) return true;
  return t.length >= 4 && /^[IVXLCDM]+$/.test(t) && /X/.test(t);
}

export function isPlausibleSpeakerName(raw: string) {
  const name = cleanName(raw).toUpperCase();
  if (!name || name.length > 48) return false;
  if (isRomanName(name)) return false;
  if (isStructuralHeader(name)) return false;
  if (TITLE_NOT_SPEAKER.test(name)) return false;
  if (TITLE_PREP.test(name)) return false;
  if (TITLE_ABBREV.test(name)) return false;
  if (NUMBER_WORD.test(name)) return false;
  if (PUBLISHER_TAIL.test(name)) return false;
  if (SALUTATION.test(name)) return false;
  if (INTERROGATIVE_START.test(name)) return false;
  if (GENRE_TITLE.test(name)) return false;
  if (/^ANOTHER /.test(name) && !/VOICE|FIGURE/.test(name)) return false;
  if (/^(?:A|AN) /.test(name)) return false;
  if (/^THE /.test(name) && !ROLE_THE.test(name) && name.split(/\s+/).length >= 2) return false;
  if (/^TO [A-Z]/.test(name) && name.split(/\s+/).length <= 3) return false;
  if (/^(?:HER|HIS|OUR|MY) [A-Z]/.test(name)) return false;
  if (/^HELP WANTED\b/.test(name) || /\bWANTED\b/.test(name)) return false;
  if (/^LOVE (?:SONG|IN|AND)\b/.test(name)) return false;
  const tokens = name.split(/\s+/);
  if (tokens.length < 1 || tokens.length > 5) return false;
  const first = tokens[0] ?? "";
  if (tokens.length === 1 && STOP_NAME.has(first) && first !== "HE" && first !== "SHE") {
    return false;
  }
  if (tokens.length === 1 && first.length < 2) return false;
  if (tokens.length === 1 && first.length > 16) return false;
  if (tokens.length === 1 && !/[AEIOUY]/.test(first)) return false;
  return WHOLE_CUE.test(name) || WHOLE_CUE.test(`${name}.`);
}

function stageSuffix(full: string, name: string) {
  const rest = full.slice(name.length).trim().replace(/[.:]\s*$/, "").trim();
  return rest;
}

/** Whole-breath cue: `LOPAKHIN.` / `JEAN [Smelling the food].` / `[MADHAV'S House] MADHAV.` */
export function matchCueOnlyBreath(text: string): { speaker: string; stage: string } | null {
  const t = text.trim();
  const lead = t.match(/^(\[[^\]]*\]|\([^)]*\)|_[^_]+_)\s+/);
  const leadStage = lead?.[1] ?? "";
  const rest = lead ? t.slice(lead[0].length).trim() : t;
  if (!rest) return null;
  const match = rest.match(WHOLE_CUE);
  if (!match?.[1]) return null;
  const speaker = cleanName(match[1]);
  if (!isPlausibleSpeakerName(speaker)) return null;
  const tail = stageSuffix(rest, match[1]);
  const stage = [leadStage, tail].filter(Boolean).join(" ");
  return { speaker, stage };
}

function isAllCapsHeading(text: string) {
  const t = text.trim().replace(/[.:]+$/, "");
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3) return false;
  if (letters !== letters.toUpperCase()) return false;
  return t.split(/\s+/).length <= 10;
}

function looksLikeSpeechAfterCue(text: string | undefined) {
  if (!text) return false;
  const t = text.trim();
  if (!t) return false;
  if (isStructuralHeader(t)) return false;
  if (matchCueOnlyBreath(t)) return false;
  if (isAllCapsHeading(t)) return false;
  return true;
}

function looksLikeDialogueLine(text: string | undefined) {
  if (!looksLikeSpeechAfterCue(text)) return false;
  const t = text!.trim();
  if (/^["“‘']/.test(t) || /[?]/.test(t)) return true;
  if (/^(?:The|A|An)\s+[a-z]/.test(t) && t.length > 42 && !/\b(?:I|I'm|you|your|we|they|don't|didn't)\b/i.test(t)) {
    return false;
  }
  if (t.length <= 96) return true;
  if (t.length > 180 && !/["“]/.test(t)) return false;
  return /(?:[!]|^\s*(?:I|O|Oh|Ah|Yes|No|Well|Don't|What|Why|How|I'm|I'll)\b)/i.test(t);
}

function isQuotedLine(text: string | undefined) {
  if (!text) return false;
  return /^["“‘']/.test(text.trim()) || /[?]/.test(text);
}

function isAttributedLine(text: string | undefined, speaker?: string) {
  if (!text) return false;
  if (!/\b(?:said|asked|replied|answered|whispered|murmured)\b/i.test(text)) return false;
  if (!speaker) return true;
  const last = cleanName(speaker).split(/\s+/).at(-1);
  if (!last || last.length < 3) return true;
  return new RegExp(`\\b${last.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
}

function looksConversational(text: string | undefined) {
  if (!looksLikeDialogueLine(text)) return false;
  const t = text!.trim();
  return /[!?]|^["“‘']|\b(?:I|I'm|I'll|I'd|I've|we|you|your|don't|won't|what's|that's|thank God)\b/i.test(
    t,
  );
}

function bump(
  counts: Map<
    string,
    {
      total: number;
      withPeriod: number;
      confirmed: number;
      conversational: number;
      quoted: number;
      attributed: number;
      at: number[];
    }
  >,
  speaker: string,
  opts: {
    withPeriod: boolean;
    confirmed: boolean;
    conversational: boolean;
    quoted: boolean;
    attributed: boolean;
    index: number;
  },
) {
  const key = speaker.toUpperCase();
  const entry = counts.get(key) ?? {
    total: 0,
    withPeriod: 0,
    confirmed: 0,
    conversational: 0,
    quoted: 0,
    attributed: 0,
    at: [],
  };
  entry.total += 1;
  if (opts.withPeriod) entry.withPeriod += 1;
  if (opts.confirmed) entry.confirmed += 1;
  if (opts.conversational) entry.conversational += 1;
  if (opts.quoted) entry.quoted += 1;
  if (opts.attributed) entry.attributed += 1;
  entry.at.push(opts.index);
  counts.set(key, entry);
}

function nearbyOtherSpeaker(
  name: string,
  counts: Map<string, { total: number; confirmed: number; at: number[] }>,
  window = 10,
  minTotal = 1,
) {
  const self = counts.get(name)?.at ?? [];
  for (const [other, entry] of counts) {
    if (other === name || entry.total < minTotal || entry.confirmed < 1) continue;
    for (const i of self) {
      if (entry.at.some((j) => Math.abs(j - i) <= window)) return true;
    }
  }
  return false;
}

type SpeakerEntry = {
  total: number;
  withPeriod: number;
  confirmed: number;
  conversational: number;
  quoted: number;
  attributed: number;
  at: number[];
};

function isMostlyPeriodless(entry: SpeakerEntry) {
  return entry.withPeriod / Math.max(entry.total, 1) <= 0.34;
}

/**
 * Names that actually function as speaker cues in this pack.
 * Title lists (one-off ALL CAPS headings) and letter signatures are ignored.
 */
export function collectSpeakerMeta(texts: string[]): {
  speakers: Set<string>;
  periodless: Set<string>;
} {
  const counts = new Map<string, SpeakerEntry>();
  for (let i = 0; i < texts.length; i++) {
    const t = (texts[i] ?? "").trim();
    const cue = matchCueOnlyBreath(t);
    if (cue) {
      let j = i + 1;
      while (j < texts.length) {
        const next = texts[j] ?? "";
        if (isPureStageDirection(next) && !isStructuralHeader(next) && !speechOf(next)) {
          j += 1;
          continue;
        }
        break;
      }
      bump(counts, cue.speaker, {
        withPeriod: /[.:]\s*$/.test(t),
        confirmed: looksLikeDialogueLine(texts[j]),
        conversational: looksConversational(texts[j]),
        quoted: isQuotedLine(texts[j]),
        attributed: isAttributedLine(texts[j], cue.speaker),
        index: i,
      });
      continue;
    }
    const leading = t.match(LEADING_CUE);
    if (leading?.[1] && isPlausibleSpeakerName(leading[1]) && leading[2]) {
      bump(counts, cleanName(leading[1]), {
        withPeriod: true,
        confirmed: looksLikeDialogueLine(leading[2]),
        conversational: looksConversational(leading[2]),
        quoted: isQuotedLine(leading[2]),
        attributed: isAttributedLine(leading[2], cleanName(leading[1])),
        index: i,
      });
    }
  }

  const unique = counts.size;
  const total = [...counts.values()].reduce((sum, entry) => sum + entry.total, 0);
  const diversity = total === 0 ? 1 : unique / total;
  const conversation = total >= 8 && diversity <= 0.45;
  const hasRecurring = [...counts.values()].some((entry) => entry.total >= 4 && entry.confirmed >= 1);
  const shortPack = texts.length <= 48;

  const speakers = new Set<string>();
  const periodless = new Set<string>();
  for (const [name, entry] of counts) {
    if (entry.confirmed < 1) continue;
    const mostlyPeriodless = isMostlyPeriodless(entry);
    if (mostlyPeriodless && entry.total < 4 && !shortPack) continue;
    if (entry.total >= 4 && entry.confirmed >= (mostlyPeriodless ? 2 : 1)) {
      speakers.add(name);
      if (mostlyPeriodless) periodless.add(name);
      continue;
    }
    if (!mostlyPeriodless && entry.total >= 3 && entry.confirmed >= 1) {
      speakers.add(name);
      continue;
    }
    if (shortPack && entry.confirmed >= 1 && (entry.withPeriod >= 1 || entry.total >= 2)) {
      speakers.add(name);
      if (mostlyPeriodless) periodless.add(name);
      continue;
    }
    if (
      entry.withPeriod >= 1 &&
      (entry.conversational >= 1 || entry.quoted >= 1) &&
      (conversation || nearbyOtherSpeaker(name, counts, 32, 4) || (hasRecurring && entry.total >= 2))
    ) {
      speakers.add(name);
      continue;
    }
    if (entry.withPeriod >= 1 && entry.total === 1 && entry.attributed >= 1) {
      speakers.add(name);
    }
  }
  return { speakers, periodless };
}

export function collectSpeakerNames(texts: string[]): Set<string> {
  return collectSpeakerMeta(texts).speakers;
}

export function titleCaseSpeaker(name: string) {
  const cleaned = cleanName(name);
  const parts = cleaned.split(/(\s+|-)/);
  let seenWord = false;
  return parts
    .map((part) => {
      if (/^\s+$/.test(part) || part === "-") return part;
      const lower = part.toLowerCase();
      const first = !seenWord;
      seenWord = true;
      if (!first && SMALL_WORD.has(lower.replace(/\.$/, ""))) return lower;
      if (/^(?:mrs|mr|ms|dr|st|prof|col|capt|gen)\.?$/i.test(part)) {
        const core = part.replace(/\.$/, "");
        return `${core.charAt(0).toUpperCase()}${core.slice(1).toLowerCase()}${part.endsWith(".") ? "." : ""}`;
      }
      return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
    })
    .join("");
}

function emptyNest(): NestState {
  return { square: 0, paren: 0, italic: false };
}

function feedNest(text: string, state: NestState): { speech: string; state: NestState } {
  let { square, paren, italic } = state;
  let speech = "";
  for (const ch of text) {
    if (ch === "[") {
      square += 1;
      continue;
    }
    if (ch === "]" && square > 0) {
      square -= 1;
      continue;
    }
    if (ch === "(" && square === 0) {
      paren += 1;
      continue;
    }
    if (ch === ")" && paren > 0) {
      paren -= 1;
      continue;
    }
    if (ch === "_" && square === 0 && paren === 0) {
      italic = !italic;
      continue;
    }
    if (square === 0 && paren === 0 && !italic) speech += ch;
  }
  return { speech: speech.trim(), state: { square, paren, italic } };
}

function speechOf(text: string, state: NestState = emptyNest()) {
  return feedNest(text, state).speech;
}

export function isPureStageDirection(text: string, state: NestState = emptyNest()) {
  const t = text.trim();
  if (!t) return true;
  if (/^\[[^\]]*\]\.?$/.test(t)) return true;
  if (/^\([^)]*\)\.?$/.test(t)) return true;
  if (/^_[^_]+_\.?$/.test(t)) return true;
  const { speech } = feedNest(t, state);
  return speech.length === 0;
}

function prefixSpeaker(speaker: string, text: string) {
  const label = `${speaker}: `;
  if (text.startsWith(label)) return text;
  if (ALREADY_PREFIXED.test(text)) return text;
  return label + text;
}

function shouldPrefix(text: string, nest: NestState) {
  const t = text.trim();
  if (!t) return false;
  if (isStructuralHeader(t)) return false;
  if (isPureStageDirection(t, nest)) return false;
  if (ALREADY_PREFIXED.test(t)) return false;
  const { speech } = feedNest(t, nest);
  return speech.length > 0;
}

type Parsed = {
  leading: string;
  speaker: string | null;
  stage: string;
  dialogue: string;
};

function parseAgainstSpeakers(text: string, speakers: Set<string>, periodless?: Set<string>): Parsed {
  const t = text.trim();
  const existing = t.match(/^([A-Za-z][A-Za-z''.\-]*(?: [A-Za-z][A-Za-z''.\-]*){0,4}): /);
  if (existing?.[1] && speakers.has(cleanName(existing[1]).toUpperCase())) {
    return { leading: "", speaker: existing[1], stage: "", dialogue: t };
  }

  const whole = matchCueOnlyBreath(t);
  if (whole && speakers.has(whole.speaker.toUpperCase())) {
    const terminated = /[.:]\s*$/.test(t) || Boolean(whole.stage);
    if (!terminated && periodless && !periodless.has(whole.speaker.toUpperCase())) {
      return { leading: "", speaker: null, stage: "", dialogue: t };
    }
    return { leading: "", speaker: whole.speaker, stage: whole.stage, dialogue: "" };
  }

  const leading = t.match(LEADING_CUE);
  if (leading?.[1] && speakers.has(cleanName(leading[1]).toUpperCase()) && leading[2]) {
    const stage = stageSuffix(t.slice(0, t.length - leading[2].length), leading[1]);
    return {
      leading: "",
      speaker: cleanName(leading[1]),
      stage,
      dialogue: leading[2].trim(),
    };
  }

  const bare = t.match(LEADING_BARE);
  if (bare?.[1] && speakers.has(cleanName(bare[1]).toUpperCase()) && bare[2]) {
    const remainder = bare[2].trim();
    const anotherCue =
      matchCueOnlyBreath(remainder) ||
      /^[A-Z][A-Z''.\-]*(?:\s+[A-Z][A-Z''.\-]*){0,4}\s*_/.test(remainder);
    if (!/^[a-z]/.test(remainder) && !anotherCue) {
      const stage = stageSuffix(t.slice(0, t.length - remainder.length), bare[1]);
      return {
        leading: "",
        speaker: cleanName(bare[1]),
        stage,
        dialogue: remainder,
      };
    }
  }

  return { leading: "", speaker: null, stage: "", dialogue: t };
}

function emitLine(
  out: string[],
  text: string,
  speaker: string | null,
  nest: NestState,
): NestState {
  const t = text.trim();
  if (!t) return nest;
  if (speaker && shouldPrefix(t, nest)) {
    out.push(prefixSpeaker(speaker, t));
  } else {
    out.push(t);
  }
  return feedNest(t, nest).state;
}

export function mergeAttributedSpeech(
  lines: string[],
  speakers?: Set<string>,
  periodless?: Set<string>,
): string[] {
  const meta = speakers ? { speakers, periodless: periodless ?? speakers } : collectSpeakerMeta(lines);
  if (meta.speakers.size === 0) return lines.slice();

  const out: string[] = [];
  let speaker: string | null = null;
  let nest = emptyNest();

  for (const raw of lines) {
    const parsed = parseAgainstSpeakers(raw, meta.speakers, meta.periodless);
    if (parsed.leading) nest = emitLine(out, parsed.leading, speaker, nest);
    if (parsed.speaker) {
      speaker = titleCaseSpeaker(parsed.speaker);
      if (parsed.stage) nest = emitLine(out, parsed.stage, null, nest);
      if (parsed.dialogue) nest = emitLine(out, parsed.dialogue, speaker, nest);
      continue;
    }
    if (parsed.dialogue) nest = emitLine(out, parsed.dialogue, speaker, nest);
  }
  return out;
}

function reindexBreaths(sceneId: string, lines: string[]): Breath[] {
  return lines.map((text, i) => ({ id: `${sceneId}-${i}`, sceneId, text }));
}

export function mergeWorkDialogue<T extends Work>(work: T): T {
  const texts = work.breaths.map((breath) => breath.text);
  const { speakers, periodless } = collectSpeakerMeta(texts);
  if (speakers.size === 0) return work;

  const byScene = new Map<string, string[]>();
  for (const breath of work.breaths) {
    const list = byScene.get(breath.sceneId) ?? [];
    list.push(breath.text);
    byScene.set(breath.sceneId, list);
  }

  const breaths: Breath[] = [];
  const scenes: Scene[] = work.scenes.map((scene) => {
    const merged = mergeAttributedSpeech(byScene.get(scene.id) ?? [], speakers, periodless);
    breaths.push(...reindexBreaths(scene.id, merged));
    const first = merged[0] ?? scene.reentry;
    return { ...scene, reentry: first };
  });

  return { ...work, scenes, breaths };
}

export function openingFromWork<T extends Work>(work: T, limit = DIALOGUE_OPENING_BREATHS): T {
  const breaths = work.breaths.slice(0, limit);
  const ids = new Set(breaths.map((breath) => breath.sceneId));
  const scenes = work.scenes
    .filter((scene) => ids.has(scene.id))
    .map((scene) => {
      const first = breaths.find((breath) => breath.sceneId === scene.id);
      return first ? { ...scene, reentry: first.text } : scene;
    });
  return { ...work, scenes, breaths };
}

export function findCueOnlyBreaths(texts: string[]): CueHit[] {
  const { speakers, periodless } = collectSpeakerMeta(texts);
  if (speakers.size === 0) return [];
  const hits: CueHit[] = [];
  for (let i = 0; i < texts.length; i++) {
    const cue = matchCueOnlyBreath(texts[i] ?? "");
    if (!cue) continue;
    if (!speakers.has(cue.speaker.toUpperCase())) continue;
    const terminated = /[.:]\s*$/.test((texts[i] ?? "").trim()) || Boolean(cue.stage);
    if (!terminated && !periodless.has(cue.speaker.toUpperCase())) continue;
    hits.push({ index: i, text: texts[i] ?? "", speaker: cue.speaker });
  }
  return hits;
}

export function workHasCueOnlyBreaths(work: { breaths: { text: string }[] }) {
  return findCueOnlyBreaths(work.breaths.map((breath) => breath.text)).length > 0;
}
