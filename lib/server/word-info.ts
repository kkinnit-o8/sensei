/** Everything the word popup and word page need to know about one word. */
import "server-only";
import { lookup } from "./dict";
import { bankWord, customWords, loadBank } from "./words";
import { isLearned } from "./learned";
import { isQueued } from "./queue";
import { getLexicon } from "./lexicon";
import { decompose } from "@/lib/wordbank/check-example";
import { isReferenceDefinition } from "@/lib/cedict";
import { shortGloss } from "@/lib/wordbank/gloss";
import { joinSyllables, numToMarks } from "@/lib/zh/pinyin";
import type { ExampleSentence, OtherReading } from "@/lib/wordbank/types";

export interface WordPart {
  simplified: string;
  pinyin: string;
  pinyinNum: string;
  meaning: string;
  learned: boolean;
}

export interface WordInfo {
  simplified: string;
  traditional: string;
  pinyin: string;
  /** Numeric pinyin, e.g. "jin1 tian1". */
  pinyinNum: string;
  meaning: string;
  meanings: string[];
  source: "bank" | "custom" | "dictionary" | "none";
  rank: number | null;
  hsk: number | null;
  learned: boolean;
  queued: boolean;
  otherReadings: OtherReading[];
  example: ExampleSentence | null;
  /** For words outside the bank: how the word splits into bank words. */
  parts: WordPart[];
}

const marks = (num: string) => joinSyllables(num.toLowerCase().split(" ").map(numToMarks));

export function wordInfo(word: string): WordInfo {
  const base = { learned: isLearned(word), queued: isQueued(word), parts: [] as WordPart[] };
  const b = bankWord(word);
  if (b) {
    return {
      ...base,
      simplified: b.simplified,
      traditional: b.traditional,
      pinyin: b.pinyin,
      pinyinNum: b.pinyinNum,
      meaning: b.meaning,
      meanings: b.meanings,
      source: "bank",
      rank: b.rank,
      hsk: b.hsk,
      otherReadings: b.otherReadings,
      example: b.example,
    };
  }
  const entries = lookup(word);
  const c = customWords().find((x) => x.simplified === word);
  const useful = entries.filter((e) => e.definitions.some((d) => !isReferenceDefinition(d)));
  const main = c ? null : (useful[0] ?? entries[0]);

  // Split compounds into bank words so the popup can explain the pieces.
  const lex = getLexicon();
  const bank = loadBank();
  const rank = new Map(bank.words.map((w) => [w.simplified, w.rank]));
  const split = Array.from(word).length > 1 ? decompose(word, (x) => (x === word ? undefined : rank.get(x)), lex.maxLen) : null;
  const parts: WordPart[] = (split ?? []).map((p) => {
    const pb = bankWord(p)!;
    return { simplified: p, pinyin: pb.pinyin, pinyinNum: pb.pinyinNum, meaning: pb.meaning, learned: isLearned(p) };
  });

  if (c) {
    return {
      ...base,
      parts,
      simplified: c.simplified,
      traditional: c.traditional,
      pinyin: c.pinyin,
      pinyinNum: c.pinyinNum,
      meaning: c.meaning,
      meanings: c.meanings,
      source: "custom",
      rank: null,
      hsk: null,
      otherReadings: [],
      example: null,
    };
  }
  if (main) {
    const others = useful
      .filter((e) => e !== main && e.pinyinNum.toLowerCase() !== main.pinyinNum.toLowerCase())
      .map((e) => ({ pinyin: marks(e.pinyinNum), pinyinNum: e.pinyinNum.toLowerCase(), meaning: shortGloss(e.definitions) }));
    return {
      ...base,
      parts,
      simplified: word,
      traditional: main.traditional,
      pinyin: marks(main.pinyinNum),
      pinyinNum: main.pinyinNum.toLowerCase(),
      meaning: shortGloss(main.definitions),
      meanings: main.definitions.filter((d) => !isReferenceDefinition(d)),
      source: "dictionary",
      rank: null,
      hsk: null,
      otherReadings: others,
      example: null,
    };
  }
  return {
    ...base,
    parts,
    simplified: word,
    traditional: word,
    pinyin: "",
    pinyinNum: "",
    meaning: "",
    meanings: [],
    source: "none",
    rank: null,
    hsk: null,
    otherReadings: [],
    example: null,
  };
}
