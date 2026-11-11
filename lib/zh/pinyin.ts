/**
 * Pure pinyin helpers: tone marks <-> tone numbers, syllable splitting,
 * word formatting. No dependencies, safe to use in the browser and in scripts.
 */

export type Tone = 1 | 2 | 3 | 4 | 5;

const MARKS: Record<string, string[]> = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
};

const MARKED_TO_BASE: Record<string, [string, Tone]> = {};
for (const [base, marks] of Object.entries(MARKS)) {
  marks.forEach((m, i) => {
    MARKED_TO_BASE[m] = [base, (i + 1) as Tone];
    MARKED_TO_BASE[m.toUpperCase()] = [base.toUpperCase(), (i + 1) as Tone];
  });
}
// Rare marked letters that appear in some dictionaries (ê, m̄, ń, ň, ǹ).
MARKED_TO_BASE["ń"] = ["n", 2];
MARKED_TO_BASE["ň"] = ["n", 3];
MARKED_TO_BASE["ǹ"] = ["n", 4];
MARKED_TO_BASE["ḿ"] = ["m", 2];

/** Normalise the many ways ü is written in numeric pinyin (u:, v, U:). */
export function normaliseU(s: string): string {
  return s.replace(/u:/g, "ü").replace(/U:/g, "Ü").replace(/v/g, "ü").replace(/V/g, "Ü");
}

/** Put a tone mark on a bare syllable, e.g. ("hao", 3) -> "hǎo". Tone 5 = neutral. */
export function addToneMark(base: string, tone: number): string {
  const s = normaliseU(base);
  if (tone < 1 || tone > 4) return s;
  const lower = s.toLowerCase();
  let idx = -1;
  if (lower.includes("a")) idx = lower.indexOf("a");
  else if (lower.includes("e")) idx = lower.indexOf("e");
  else if (lower.includes("ou")) idx = lower.indexOf("o");
  else {
    for (let i = lower.length - 1; i >= 0; i--) {
      if ("iouü".includes(lower[i])) {
        idx = i;
        break;
      }
    }
  }
  if (idx === -1) {
    // Syllables like "m", "n", "ng" (interjections) - mark the first letter if we can.
    return s;
  }
  const ch = lower[idx];
  let marked = MARKS[ch][tone - 1];
  if (s[idx] !== ch) marked = marked.toUpperCase();
  return s.slice(0, idx) + marked + s.slice(idx + 1);
}

/** "hao3" -> "hǎo", "nu:3" -> "nǚ", "r5" -> "r", "ma" -> "ma". */
export function numToMarks(syllable: string): string {
  const m = /^([a-zA-Zü:ÜvV]+)([1-5])?$/.exec(syllable.trim());
  if (!m) return syllable;
  return addToneMark(m[1], m[2] ? Number(m[2]) : 5);
}

/** Convert a space-separated numeric pinyin string: "ni3 hao3" -> "nǐ hǎo". */
export function numStringToMarks(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map(numToMarks)
    .join(" ");
}

/** Split a marked syllable into its bare form and tone: "hǎo" -> {base:"hao", tone:3}. */
export function parseMarked(syllable: string): { base: string; tone: Tone } {
  let tone: Tone = 5;
  let base = "";
  for (const ch of syllable.normalize("NFC")) {
    const hit = MARKED_TO_BASE[ch];
    if (hit) {
      base += hit[0];
      tone = hit[1];
    } else base += ch;
  }
  return { base, tone };
}

/** "hǎo" -> "hao3", "ma" -> "ma5", "r" -> "r5". */
export function marksToNum(syllable: string): string {
  const { base, tone } = parseMarked(syllable);
  return `${base}${tone}`;
}

/** Tone of a single syllable written either with marks or with a trailing number. */
export function toneOf(syllable: string): Tone {
  const num = /([1-5])$/.exec(syllable);
  if (num) return Number(num[1]) as Tone;
  return parseMarked(syllable).tone;
}

/** Remove tone marks and tone numbers, lower-case: "Nǐ hǎo3" -> "ni hao". */
export function stripTones(s: string): string {
  let out = "";
  for (const ch of normaliseU(s).normalize("NFC")) {
    const hit = MARKED_TO_BASE[ch];
    out += hit ? hit[0] : ch;
  }
  return out.replace(/[1-5]/g, "").toLowerCase();
}

/** Display a syllable in the chosen style. Neutral tone gets no number. */
export function formatSyllable(marked: string, style: "marks" | "numbers"): string {
  if (style === "marks") return marked;
  const { base, tone } = parseMarked(marked);
  return tone === 5 ? base : `${base}${tone}`;
}

/**
 * Join the syllables of one word: ["xī","ān"] -> "xī'ān", ["yì","diǎn","r"] -> "yìdiǎnr".
 * An apostrophe separates syllables when the next starts with a, o or e.
 */
export function joinSyllables(syllables: string[], style: "marks" | "numbers" = "marks"): string {
  let out = "";
  syllables.forEach((syl, i) => {
    const shown = formatSyllable(syl, style);
    if (i > 0 && /^[aoeāáǎàōóǒòēéěè]/i.test(syl) && syl !== "r") out += "'";
    out += shown;
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Syllable splitting (used to read typed pinyin and messy dataset rows) */
/* ------------------------------------------------------------------ */

const INITIALS = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w", ""];
const FINALS = [
  "a", "o", "e", "ai", "ei", "ao", "ou", "an", "en", "ang", "eng", "ong", "er",
  "i", "ia", "ie", "iao", "iu", "ian", "in", "iang", "ing", "iong",
  "u", "ua", "uo", "uai", "ui", "uan", "un", "uang", "ueng",
  "ü", "üe", "üan", "ün", "ue", "uan", "un",
];

/** Every valid toneless pinyin syllable (a generous superset is fine here). */
export const SYLLABLES: Set<string> = (() => {
  const set = new Set<string>();
  for (const i of INITIALS) for (const f of FINALS) set.add(i + f);
  // Common irregular spellings and interjections.
  ["yi", "wu", "yu", "ye", "yue", "yuan", "yun", "you", "yan", "yin", "yang", "ying", "yong", "yao", "ya", "yo",
    "wa", "wo", "wai", "wei", "wan", "wen", "wang", "weng", "zi", "ci", "si", "zhi", "chi", "shi", "ri",
    "m", "n", "ng", "hm", "hng", "r"].forEach((s) => set.add(s));
  return set;
})();

/**
 * Split a run of toneless (optionally tone-numbered) latin letters into syllables
 * with greedy longest match, backtracking when needed. Returns null if it can't.
 * "nihao" -> ["ni","hao"], "ni3hao3" -> ["ni3","hao3"], "xian" -> ["xian"].
 */
export function splitSyllables(input: string): string[] | null {
  const s = normaliseU(input.toLowerCase());
  const memo = new Map<number, string[] | null>();
  const go = (pos: number): string[] | null => {
    if (pos === s.length) return [];
    if (memo.has(pos)) return memo.get(pos)!;
    for (let len = Math.min(6, s.length - pos); len >= 1; len--) {
      const cand = s.slice(pos, pos + len);
      const plain = stripTones(cand);
      if (!SYLLABLES.has(plain)) continue;
      let end = pos + len;
      let syl = cand;
      if (end < s.length && /[1-5]/.test(s[end])) {
        syl += s[end];
        end++;
      }
      const rest = go(end);
      if (rest) {
        const res = [syl, ...rest];
        memo.set(pos, res);
        return res;
      }
    }
    memo.set(pos, null);
    return null;
  };
  return go(0);
}

/** Toneless, space-free key for comparing pinyin spellings: "Nǐ hǎo!" -> "nihao". */
export function pinyinKey(s: string): string {
  return stripTones(s).replace(/[^a-zü]/g, "");
}
