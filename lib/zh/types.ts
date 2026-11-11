import type { Tone } from "./pinyin";

/** What the segmenter and annotator need to know about words. */
export interface Lexicon {
  /** Is this string a known word (word bank, custom word or CC-CEDICT)? */
  has(word: string): boolean;
  /** Occurrences per billion tokens (wordfreq), 0 if unknown. */
  freq(word: string): number;
  /** Is this word in the 2,000-word bank (or a custom word added by the learner)? */
  inBank(word: string): boolean;
  /** Parts of speech for bank words (HSK dataset codes: v, n, r, d, a, ...). */
  pos(word: string): string[] | undefined;
  /** Candidate dictionary readings, numeric pinyin ("dui4 bu5 qi3"); bank main reading first. */
  readings(word: string): string[];
  /** Longest word length worth trying. */
  maxLen: number;
}

export interface Syllable {
  /** The Chinese character this syllable belongs to. */
  char: string;
  /** Tone-marked pinyin in context (sandhi applied), e.g. "yí", "le", "r" for erhua 儿. */
  pinyin: string;
  tone: Tone;
}

export type Token =
  | {
      kind: "word";
      text: string;
      syllables: Syllable[];
      /** In the word bank or a custom word. */
      bank: boolean;
      /** Has a dictionary entry (bank, custom or CC-CEDICT). */
      dict: boolean;
    }
  | { kind: "punct" | "latin" | "number" | "space"; text: string };

export type WordToken = Extract<Token, { kind: "word" }>;
