/**
 * The word bank (data/words.json) plus the learner's custom words.
 */
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getDb } from "./db";
import type { BankWord, WordBankFile } from "@/lib/wordbank/types";

export interface CustomWord {
  simplified: string;
  traditional: string;
  pinyin: string;
  pinyinNum: string;
  meaning: string;
  meanings: string[];
  addedAt: string;
}

/** A word the app can teach: a bank word or a custom word. */
export type StudyWord = (BankWord & { custom?: false }) | (CustomWord & { custom: true; rank: number; hsk: null; example: null });

const g = globalThis as unknown as { __bank?: { mtime: number; file: WordBankFile; by: Map<string, BankWord> } };

export function wordBankPath(): string {
  return process.env.WORDS_PATH || path.join(process.cwd(), "data", "words.json");
}

export function loadBank(): { words: BankWord[]; by: Map<string, BankWord> } {
  const file = wordBankPath();
  const mtime = fs.statSync(file).mtimeMs;
  if (!g.__bank || g.__bank.mtime !== mtime) {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as WordBankFile;
    g.__bank = { mtime, file: parsed, by: new Map(parsed.words.map((w) => [w.simplified, w])) };
  }
  return { words: g.__bank.file.words, by: g.__bank.by };
}

export function bankWord(simplified: string): BankWord | undefined {
  return loadBank().by.get(simplified);
}

type CustomRow = { simplified: string; traditional: string; pinyin: string; pinyin_num: string; meaning: string; meanings: string; added_at: string };

export function customWords(): CustomWord[] {
  const rows = getDb().prepare("SELECT * FROM custom_words ORDER BY added_at").all() as CustomRow[];
  return rows.map((r) => ({
    simplified: r.simplified,
    traditional: r.traditional,
    pinyin: r.pinyin,
    pinyinNum: r.pinyin_num,
    meaning: r.meaning,
    meanings: JSON.parse(r.meanings),
    addedAt: r.added_at,
  }));
}

/** Look a word up in the bank first, then among custom words. */
export function studyWord(simplified: string): StudyWord | undefined {
  const b = bankWord(simplified);
  if (b) return b;
  const c = customWords().find((w) => w.simplified === simplified);
  if (!c) return undefined;
  return { ...c, custom: true, rank: loadBank().words.length + 1, hsk: null, example: null };
}
