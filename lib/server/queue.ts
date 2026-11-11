/** The learning queue: words to introduce first in the next Learn steps. */
import "server-only";
import { getDb } from "./db";
import { lookup } from "./dict";
import { bankWord, customWords } from "./words";
import { shortGloss } from "@/lib/wordbank/gloss";
import { isReferenceDefinition } from "@/lib/cedict";
import { joinSyllables, numToMarks } from "@/lib/zh/pinyin";
import { isLearned } from "./learned";

export type QueueResult = { ok: true; custom: boolean } | { ok: false; error: string };

export function queuedWords(): string[] {
  return (getDb().prepare("SELECT word FROM learn_queue ORDER BY queued_at, rowid").all() as { word: string }[]).map((r) => r.word);
}

export function isQueued(word: string): boolean {
  return !!getDb().prepare("SELECT 1 FROM learn_queue WHERE word = ?").get(word);
}

/**
 * Put a word at the front of the next new words. Words outside the word bank are added as
 * custom words using their CC-CEDICT entry.
 */
export function queueWord(word: string, now = new Date()): QueueResult {
  const w = word.trim();
  if (!w) return { ok: false, error: "No word given" };
  if (isLearned(w)) return { ok: false, error: "You have already learned this word" };
  let custom = false;
  if (!bankWord(w) && !customWords().some((c) => c.simplified === w)) {
    const entries = lookup(w).filter((e) => e.definitions.some((d) => !isReferenceDefinition(d))).concat(lookup(w));
    const e = entries[0];
    if (!e) return { ok: false, error: `${w} is not in the dictionary` };
    const pinyinNum = e.pinyinNum.toLowerCase();
    getDb()
      .prepare(
        "INSERT INTO custom_words (simplified, traditional, pinyin, pinyin_num, meaning, meanings, added_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(w, e.traditional, joinSyllables(pinyinNum.split(" ").map(numToMarks)), pinyinNum, shortGloss(e.definitions), JSON.stringify(e.definitions), now.toISOString());
    custom = true;
  }
  getDb().prepare("INSERT OR IGNORE INTO learn_queue (word, queued_at) VALUES (?, ?)").run(w, now.toISOString());
  return { ok: true, custom };
}

export function unqueueWord(word: string) {
  getDb().prepare("DELETE FROM learn_queue WHERE word = ?").run(word);
}
