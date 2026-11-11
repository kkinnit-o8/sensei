/**
 * CC-CEDICT line parser. Pure; used by the dictionary importer and the word bank build.
 * Format: 傳統 传统 [chuan2 tong3] /tradition/traditional/convention/
 */
import { numToMarks } from "./zh/pinyin";

export interface CedictEntry {
  traditional: string;
  simplified: string;
  /** Numeric pinyin as in the source, normalised: "ni3 hao3", "nü3 er2". */
  pinyinNum: string;
  /** Tone-marked pinyin syllables joined by spaces: "nǐ hǎo". */
  pinyin: string;
  definitions: string[];
}

const LINE = /^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\/(.*)\/\s*$/;

export function parseCedictLine(line: string): CedictEntry | null {
  if (!line || line.startsWith("#")) return null;
  const m = LINE.exec(line);
  if (!m) return null;
  const pinyinNum = m[3]
    .trim()
    .split(/\s+/)
    .map((s) => s.replace(/u:/g, "ü").replace(/U:/g, "Ü"))
    .join(" ");
  return {
    traditional: m[1],
    simplified: m[2],
    pinyinNum,
    pinyin: pinyinNum.split(" ").map(numToMarks).join(" "),
    definitions: m[4].split("/").filter(Boolean),
  };
}

/** True if the entry is only a proper noun (surname, place...), judged by capitalised pinyin. */
export function isProperNoun(e: Pick<CedictEntry, "pinyinNum">): boolean {
  return /^[A-Z]/.test(e.pinyinNum);
}

/** Definitions that are just cross-references ("variant of X") are less useful as glosses. */
export function isReferenceDefinition(def: string): boolean {
  return /^(old |archaic |erhua |Japanese |)variant of |^see [^ ]+\[|^used in /i.test(def);
}
