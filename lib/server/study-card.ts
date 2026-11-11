/** Data for a word card in the Review and Learn steps (example sentence pre-tokenized). */
import "server-only";
import { studyWord } from "./words";
import { tokenizeText } from "./lexicon";
import type { OtherReading } from "@/lib/wordbank/types";
import type { Token } from "@/lib/zh/types";

export interface StudyCard {
  simplified: string;
  traditional: string;
  pinyin: string;
  pinyinNum: string;
  meaning: string;
  meanings: string[];
  otherReadings: OtherReading[];
  hsk: number | null;
  rank: number | null;
  custom: boolean;
  /** Tokens of the word itself (for tone colours). */
  tokens: Token[];
  example: { zh: string; en: string; tokens: Token[] } | null;
}

export function studyCard(word: string): StudyCard | null {
  const w = studyWord(word);
  if (!w) return null;
  return {
    simplified: w.simplified,
    traditional: w.traditional,
    pinyin: w.pinyin,
    pinyinNum: w.pinyinNum,
    meaning: w.meaning,
    meanings: w.meanings.slice(0, 4),
    otherReadings: "otherReadings" in w && w.otherReadings ? w.otherReadings : [],
    hsk: w.hsk ?? null,
    rank: w.custom ? null : w.rank,
    custom: !!w.custom,
    tokens: tokenizeText(w.simplified),
    example: w.example ? { zh: w.example.zh, en: w.example.en, tokens: tokenizeText(w.example.zh) } : null,
  };
}
