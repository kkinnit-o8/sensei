/**
 * Word segmentation for Chinese text.
 *
 * Several algorithms are implemented so they can be compared in tests
 * (see tests/unit/segment.test.ts). The default, `segmentUnigram`, picks the
 * split with the highest probability under a unigram model: word probabilities
 * come from wordfreq; candidates are word-bank words, custom words and CC-CEDICT
 * entries; single characters are always allowed. Word-bank words get a small
 * bonus so that segments line up with the units the learner studies.
 */
import type { Lexicon } from "./types";

/** CJK Unified Ideographs (+ Ext A, compatibility) and 〇. */
export const HAN_RE = /[㐀-䶿一-鿿豈-﫿〇]/;
const HAN_RUN_RE = /[㐀-䶿一-鿿豈-﫿〇]+/g;

export function isHan(ch: string): boolean {
  return HAN_RE.test(ch);
}

export type Piece = { text: string; han: boolean };

/** Split text into alternating runs of Han and non-Han characters. */
export function splitRuns(text: string): Piece[] {
  const out: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(HAN_RUN_RE)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index), han: false });
    out.push({ text: m[0], han: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), han: false });
  return out;
}

// Tuned on the gold set in tests/unit/segment.test.ts.
const BANK_BONUS = Math.log(4);
const PHRASE_PENALTY = Math.log(4);
const FLOOR_COST = -Math.log(0.5e-9); // known word without frequency data
const UNKNOWN_CHAR_COST = -Math.log(0.05e-9); // single char not in any dictionary

function wordCost(lex: Lexicon, w: string): number {
  const f = lex.freq(w);
  let cost: number;
  if (f > 0) cost = -Math.log(f / 1e9);
  else if (lex.has(w)) cost = FLOOR_COST;
  else cost = UNKNOWN_CHAR_COST;
  if (lex.inBank(w)) cost -= BANK_BONUS;
  else if (PHRASE_PENALTY > 0 && Array.from(w).length >= 3 && splitsIntoBank(lex, w)) cost += PHRASE_PENALTY;
  return cost;
}

/**
 * Dictionary entries of 3+ characters made entirely of word-bank words (不太好, 下个星期)
 * are usually phrases; a small penalty lets the bank words win when the context prefers them.
 */
const splitCache = new WeakMap<Lexicon, Map<string, boolean>>();
function splitsIntoBank(lex: Lexicon, w: string): boolean {
  let cache = splitCache.get(lex);
  if (!cache) splitCache.set(lex, (cache = new Map()));
  const hit = cache.get(w);
  if (hit !== undefined) return hit;
  const chars = Array.from(w);
  const ok = new Array<boolean>(chars.length + 1).fill(false);
  ok[0] = true;
  for (let i = 0; i < chars.length; i++) {
    if (!ok[i]) continue;
    for (let j = i + 1; j <= chars.length && j - i < chars.length; j++) {
      if (lex.inBank(chars.slice(i, j).join(""))) ok[j] = true;
    }
  }
  cache.set(w, ok[chars.length]);
  return ok[chars.length];
}

/** Maximum-probability segmentation of one run of Han characters. */
export function segmentUnigram(run: string, lex: Lexicon): string[] {
  const chars = Array.from(run);
  const n = chars.length;
  const best = new Array<number>(n + 1).fill(Infinity);
  const back = new Array<number>(n + 1).fill(0);
  best[0] = 0;
  for (let i = 0; i < n; i++) {
    if (best[i] === Infinity) continue;
    for (let len = 1; len <= Math.min(lex.maxLen, n - i); len++) {
      const w = chars.slice(i, i + len).join("");
      if (len > 1 && !lex.has(w)) continue;
      const c = best[i] + wordCost(lex, w);
      if (c < best[i + len]) {
        best[i + len] = c;
        back[i + len] = i;
      }
    }
  }
  const out: string[] = [];
  for (let j = n; j > 0; j = back[j]) out.unshift(chars.slice(back[j], j).join(""));
  return applyRules(out);
}

/**
 * Small context rules the unigram model can't see.
 * 的话 "if" ends a clause; followed directly by more words it is 的 + 话 ("the words that ...").
 */
function applyRules(words: string[]): string[] {
  const out: string[] = [];
  words.forEach((w, i) => {
    if (w === "的话" && i < words.length - 1) out.push("的", "话");
    else out.push(w);
  });
  return out;
}

/** Forward maximum matching (greedy longest match from the left). */
export function segmentForward(run: string, lex: Lexicon): string[] {
  const chars = Array.from(run);
  const out: string[] = [];
  let i = 0;
  while (i < chars.length) {
    let len = Math.min(lex.maxLen, chars.length - i);
    for (; len > 1; len--) if (lex.has(chars.slice(i, i + len).join(""))) break;
    out.push(chars.slice(i, i + len).join(""));
    i += len;
  }
  return out;
}

/** Backward maximum matching (greedy longest match from the right). */
export function segmentBackward(run: string, lex: Lexicon): string[] {
  const chars = Array.from(run);
  const out: string[] = [];
  let j = chars.length;
  while (j > 0) {
    let len = Math.min(lex.maxLen, j);
    for (; len > 1; len--) if (lex.has(chars.slice(j - len, j).join(""))) break;
    out.unshift(chars.slice(j - len, j).join(""));
    j -= len;
  }
  return out;
}

/** Bidirectional maximum matching: fewer words wins, then fewer single characters, then backward. */
export function segmentBidirectional(run: string, lex: Lexicon): string[] {
  const f = segmentForward(run, lex);
  const b = segmentBackward(run, lex);
  if (f.length !== b.length) return f.length < b.length ? f : b;
  const singles = (s: string[]) => s.filter((w) => Array.from(w).length === 1).length;
  return singles(f) < singles(b) ? f : b;
}

/** ICU's dictionary-based segmenter, available in Node and modern browsers. */
export function segmentIntl(run: string): string[] {
  const seg = new Intl.Segmenter("zh", { granularity: "word" });
  return Array.from(seg.segment(run), (s) => s.segment);
}

export type SegmentAlgorithm = "unigram" | "forward" | "backward" | "bidirectional" | "intl";

export function segmentRun(run: string, lex: Lexicon, algo: SegmentAlgorithm = "unigram"): string[] {
  switch (algo) {
    case "forward":
      return segmentForward(run, lex);
    case "backward":
      return segmentBackward(run, lex);
    case "bidirectional":
      return segmentBidirectional(run, lex);
    case "intl":
      return segmentIntl(run);
    default:
      return segmentUnigram(run, lex);
  }
}

/** Segment a whole text into Han words and non-Han pieces (kept as-is). */
export function segmentText(text: string, lex: Lexicon, algo: SegmentAlgorithm = "unigram"): Piece[] {
  const out: Piece[] = [];
  for (const piece of splitRuns(text)) {
    if (!piece.han) out.push(piece);
    else for (const w of segmentRun(piece.text, lex, algo)) out.push({ text: w, han: true });
  }
  return out;
}
