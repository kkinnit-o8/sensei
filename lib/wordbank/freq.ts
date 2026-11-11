/** Loader for data/zh-freq.tsv (wordfreq export). Node only. */
import fs from "node:fs";
import path from "node:path";

export interface FreqTable {
  /** word -> occurrences per billion tokens */
  map: Map<string, number>;
  /** Total frequency mass of all Han-only words in wordfreq, per billion. */
  hanTotal: number;
}

export function loadFreqTable(file = path.join(process.cwd(), "data", "zh-freq.tsv")): FreqTable {
  const map = new Map<string, number>();
  let hanTotal = 1e9;
  if (!fs.existsSync(file)) return { map, hanTotal };
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    if (!line) continue;
    if (line.startsWith("#")) {
      const m = /han_total_per_billion=(\d+)/.exec(line);
      if (m) hanTotal = Number(m[1]);
      continue;
    }
    const tab = line.indexOf("\t");
    if (tab > 0) map.set(line.slice(0, tab), Number(line.slice(tab + 1)));
  }
  return { map, hanTotal };
}

/**
 * Frequency of a word, counting the plain form of erhua words too
 * (text usually writes 一点 where the HSK list has 一点儿).
 */
export function wordFreq(table: FreqTable, word: string): number {
  let f = table.map.get(word) ?? 0;
  const plain = ERHUA_EQUIVALENT[word] ?? (word.length > 1 && word.endsWith("儿") && !NOT_ERHUA.has(word) ? word.slice(0, -1) : null);
  if (plain) f += table.map.get(plain) ?? 0;
  return f;
}

/** Erhua words whose plain form is a different word: 这儿 means 这里, not 这. */
const ERHUA_EQUIVALENT: Record<string, string> = { 这儿: "这里", 那儿: "那里", 哪儿: "哪里" };
/** Words ending in 儿 that are not erhua. */
const NOT_ERHUA = new Set(["女儿", "儿子", "婴儿", "孤儿", "健儿"]);
