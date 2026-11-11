/**
 * Builds the real lexicon (word bank + CC-CEDICT + wordfreq) for tests, without the
 * server modules. Cached per test worker.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parseCedictLine, isProperNoun, type CedictEntry } from "@/lib/cedict";
import { loadFreqTable } from "@/lib/wordbank/freq";
import { makeLexicon } from "@/lib/wordbank/lexicon";
import type { WordBankFile } from "@/lib/wordbank/types";
import type { Lexicon } from "@/lib/zh/types";

let cached: { lex: Lexicon; bank: WordBankFile; cedict: Map<string, CedictEntry[]> } | null = null;

export function realLexicon() {
  if (cached) return cached;
  const root = process.cwd();
  const bank: WordBankFile = JSON.parse(fs.readFileSync(path.join(root, "data", "words.json"), "utf8"));
  const src = fs.readdirSync(path.join(root, "data", "sources")).find((f) => /^cedict.*\.txt\.gz$/.test(f))!;
  const cedict = new Map<string, CedictEntry[]>();
  for (const line of zlib.gunzipSync(fs.readFileSync(path.join(root, "data", "sources", src))).toString("utf8").split("\n")) {
    const e = parseCedictLine(line);
    if (e) cedict.set(e.simplified, [...(cedict.get(e.simplified) ?? []), e]);
  }
  const freq = loadFreqTable();
  const lex = makeLexicon({
    bank: new Map(bank.words.map((w) => [w.simplified, { readings: [w.pinyinNum, ...w.otherReadings.map((r) => r.pinyinNum)], pos: w.pos }])),
    dictWords: new Set(cedict.keys()),
    dictReadings: (x) => {
      const l = cedict.get(x) ?? [];
      return [...l.filter((e) => !isProperNoun(e)), ...l.filter(isProperNoun)].map((e) => e.pinyinNum.toLowerCase());
    },
    freq: (x) => freq.map.get(x) ?? 0,
  });
  cached = { lex, bank, cedict };
  return cached;
}
