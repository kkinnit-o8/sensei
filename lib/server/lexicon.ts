/**
 * The server-side Lexicon: word bank + custom words + CC-CEDICT + wordfreq.
 * Rebuilt only when the word bank file or the custom words change.
 */
import "server-only";
import { makeLexicon } from "@/lib/wordbank/lexicon";
import { loadFreqTable, type FreqTable } from "@/lib/wordbank/freq";
import { tokenize } from "@/lib/zh/annotate";
import type { Lexicon, Token } from "@/lib/zh/types";
import { headwords, lookup } from "./dict";
import { customWords, loadBank } from "./words";

const g = globalThis as unknown as {
  __lex?: { key: string; words: unknown; lex: Lexicon };
  __freq?: FreqTable;
  __readings?: Map<string, string[]>;
};

export function freqTable(): FreqTable {
  if (!g.__freq) g.__freq = loadFreqTable();
  return g.__freq;
}

function dictReadings(word: string): string[] {
  if (!g.__readings) g.__readings = new Map();
  let r = g.__readings.get(word);
  if (!r) {
    r = lookup(word).map((e) => e.pinyinNum.toLowerCase());
    if (g.__readings.size > 50_000) g.__readings.clear();
    g.__readings.set(word, r);
  }
  return r;
}

export function getLexicon(): Lexicon {
  const bank = loadBank();
  const custom = customWords();
  const key = custom.map((c) => c.simplified).join(",");
  if (g.__lex && g.__lex.key === key && g.__lex.words === bank.words) return g.__lex.lex;

  const entries = new Map<string, { readings: string[]; pos: string[] }>();
  for (const w of bank.words) entries.set(w.simplified, { readings: [w.pinyinNum, ...w.otherReadings.map((r) => r.pinyinNum)], pos: w.pos });
  for (const c of custom) if (!entries.has(c.simplified)) entries.set(c.simplified, { readings: [c.pinyinNum], pos: [] });

  const freq = freqTable();
  const lex = makeLexicon({
    bank: entries,
    dictWords: headwords(),
    dictReadings,
    freq: (w) => freq.map.get(w) ?? 0,
  });
  g.__lex = { key, words: bank.words, lex };
  return lex;
}

export function tokenizeText(text: string): Token[] {
  return tokenize(text, getLexicon());
}
