/** Build a Lexicon (for segmentation + pinyin) from in-memory data. */
import type { Lexicon } from "../zh/types";

export interface LexiconSource {
  /** Bank (and custom) words: simplified -> main reading first, then other readings (numeric pinyin). */
  bank: Map<string, { readings: string[]; pos: string[] }>;
  /** Every dictionary headword (simplified). */
  dictWords: Set<string>;
  /** CC-CEDICT readings for a word (numeric pinyin), common nouns before proper nouns. */
  dictReadings: (word: string) => string[];
  freq: (word: string) => number;
  maxLen?: number;
}

export function makeLexicon(src: LexiconSource): Lexicon {
  return {
    has: (w) => src.bank.has(w) || src.dictWords.has(w),
    freq: src.freq,
    inBank: (w) => src.bank.has(w),
    pos: (w) => src.bank.get(w)?.pos,
    readings: (w) => {
      const b = src.bank.get(w)?.readings ?? [];
      const d = src.dictReadings(w);
      return [...b, ...d.filter((r) => !b.includes(r))];
    },
    maxLen: src.maxLen ?? 8,
  };
}
