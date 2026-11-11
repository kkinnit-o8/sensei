/**
 * The core display rule. Pure and deterministic, used everywhere Chinese is shown.
 *
 *   - A word the learner has learned is shown in characters.
 *   - A segment that is not itself learned (e.g. a compound not in the word bank) is shown in
 *     characters only if it can be split completely into learned words; otherwise in pinyin.
 *     Word-bank words must be learned themselves.
 *   - Punctuation, numbers, Latin text and spaces pass through unchanged.
 *   - Pinyin words are separated by spaces from neighbouring words so mixed text is readable.
 */
import { joinSyllables } from "./pinyin";
import type { Token, WordToken } from "./types";

export type DisplayToken =
  | { mode: "hanzi"; token: WordToken; spaceBefore: boolean }
  | { mode: "pinyin"; token: WordToken; spaceBefore: boolean }
  | { mode: "other"; token: Exclude<Token, WordToken>; spaceBefore: boolean };

export type LearnedSet = ReadonlySet<string>;

/** Can `word` be split completely into learned words? (DP over prefixes.) */
export function splitsIntoLearned(word: string, learned: LearnedSet, maxLen = 8): boolean {
  const chars = Array.from(word);
  const ok = new Array<boolean>(chars.length + 1).fill(false);
  ok[0] = true;
  for (let i = 0; i < chars.length; i++) {
    if (!ok[i]) continue;
    for (let j = i + 1; j <= Math.min(chars.length, i + maxLen); j++) {
      if (learned.has(chars.slice(i, j).join(""))) ok[j] = true;
    }
  }
  return ok[chars.length];
}

/** Should this word token be shown in characters? */
export function showAsHanzi(token: WordToken, learned: LearnedSet): boolean {
  if (learned.has(token.text)) return true;
  if (token.bank) return false; // bank words must be learned themselves
  return splitsIntoLearned(token.text, learned);
}

const ASCII_CLAUSE_PUNCT = /[,.!?;:)\]]$/;

/**
 * Decide characters vs pinyin for every token and where spaces go.
 * With `ruby`, every word is shown in characters (the UI adds pinyin above).
 */
export function renderTokens(tokens: Token[], learned: LearnedSet, opts: { ruby?: boolean } = {}): DisplayToken[] {
  const out: DisplayToken[] = [];
  tokens.forEach((token) => {
    if (token.kind === "word") {
      const mode = opts.ruby || showAsHanzi(token, learned) ? "hanzi" : "pinyin";
      out.push({ mode, token, spaceBefore: false });
    } else {
      out.push({ mode: "other", token, spaceBefore: false });
    }
  });

  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1];
    const cur = out[i];
    const prevIsSpace = prev.mode === "other" && prev.token.kind === "space";
    const curIsSpace = cur.mode === "other" && cur.token.kind === "space";
    if (prevIsSpace || curIsSpace) continue;
    const curPunct = cur.mode === "other" && cur.token.kind === "punct";
    const prevPunct = prev.mode === "other" && prev.token.kind === "punct";
    if (curPunct) continue; // punctuation attaches to what comes before it

    if (cur.mode === "pinyin") {
      // Space after any word, Latin text or number; after ASCII punctuation like "," too.
      cur.spaceBefore = prevPunct ? ASCII_CLAUSE_PUNCT.test(prev.token.text) : true;
    } else if (prev.mode === "pinyin") {
      // Characters, numbers or Latin text right after a pinyin word.
      cur.spaceBefore = true;
    }
  }
  return out;
}

/** Text of one display token. Pinyin uses the chosen tone style. */
export function displayTokenText(d: DisplayToken, style: "marks" | "numbers" = "marks"): string {
  if (d.mode === "pinyin") return joinSyllables(d.token.syllables.map((s) => s.pinyin), style);
  return d.token.text;
}

/** Plain-text rendering, e.g. "你今天 chī 了什么？" (used in tests, copy, and aria labels). */
export function renderPlain(tokens: Token[], learned: LearnedSet, style: "marks" | "numbers" = "marks"): string {
  return renderTokens(tokens, learned)
    .map((d) => (d.spaceBefore ? " " : "") + displayTokenText(d, style))
    .join("");
}

/** Full pinyin of a word token, e.g. "jīntiān". */
export function wordPinyin(token: WordToken, style: "marks" | "numbers" = "marks"): string {
  return joinSyllables(token.syllables.map((s) => s.pinyin), style);
}

/** Words shown in pinyin (not learned) in a token list: the "Words from chat" candidates. */
export function unlearnedWords(tokens: Token[], learned: LearnedSet): WordToken[] {
  const seen = new Set<string>();
  const out: WordToken[] = [];
  for (const t of tokens) {
    if (t.kind !== "word" || showAsHanzi(t, learned) || seen.has(t.text)) continue;
    seen.add(t.text);
    out.push(t);
  }
  return out;
}
