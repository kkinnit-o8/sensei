/**
 * CC-CEDICT in SQLite (data/dict.db, git-ignored). Built automatically from the
 * committed source file data/sources/cedict_*.txt.gz the first time it is needed
 * (takes a couple of seconds), or with `npm run build:dict`.
 */
import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { isProperNoun } from "@/lib/cedict";
import { buildDict, cedictSourceFile, dictPath } from "@/lib/dict-build";

export { buildDict, dictPath };

export interface DictEntry {
  simplified: string;
  traditional: string;
  pinyinNum: string;
  definitions: string[];
}

const g = globalThis as unknown as { __dictDb?: Database.Database | null; __dictHeadwords?: Set<string> };

/** Open the dictionary, building it first if it is missing or out of date. Null if no source. */
export function getDictDb(): Database.Database | null {
  if (g.__dictDb !== undefined) return g.__dictDb;
  const file = dictPath();
  const source = cedictSourceFile();
  let stale = !fs.existsSync(file);
  if (!stale && source) {
    try {
      const probe = new Database(file, { readonly: true });
      const row = probe.prepare("SELECT value FROM meta WHERE key = 'source'").get() as { value: string } | undefined;
      probe.close();
      stale = row?.value !== `${path.basename(source)}:${fs.statSync(source).size}`;
    } catch {
      stale = true;
    }
  }
  if (stale) {
    if (!source) {
      g.__dictDb = null;
      return null;
    }
    console.log("[dict] importing CC-CEDICT into SQLite ...");
    const n = buildDict(file, source);
    console.log(`[dict] imported ${n} entries`);
  }
  g.__dictDb = new Database(file, { readonly: true });
  return g.__dictDb;
}

function rowToEntry(r: { simplified: string; traditional: string; pinyin_num: string; definitions: string }): DictEntry {
  return { simplified: r.simplified, traditional: r.traditional, pinyinNum: r.pinyin_num, definitions: JSON.parse(r.definitions) };
}

/** All entries for a simplified headword; common readings before proper nouns. */
export function lookup(simplified: string): DictEntry[] {
  const db = getDictDb();
  if (!db) return [];
  const rows = db
    .prepare("SELECT simplified, traditional, pinyin_num, definitions FROM entries WHERE simplified = ? ORDER BY id")
    .all(simplified) as Parameters<typeof rowToEntry>[0][];
  const entries = rows.map(rowToEntry);
  return [...entries.filter((e) => !isProperNoun(e)), ...entries.filter((e) => isProperNoun(e))];
}

/** Every simplified headword (cached in memory, ~120k strings). */
export function headwords(): Set<string> {
  if (g.__dictHeadwords) return g.__dictHeadwords;
  const db = getDictDb();
  const set = new Set<string>();
  if (db) for (const r of db.prepare("SELECT DISTINCT simplified FROM entries").iterate() as Iterable<{ simplified: string }>) set.add(r.simplified);
  g.__dictHeadwords = set;
  return set;
}
