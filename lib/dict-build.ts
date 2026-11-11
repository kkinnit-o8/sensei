/** CC-CEDICT -> SQLite importer. Plain module so CLI scripts can use it too. */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { parseCedictLine } from "./cedict";

export function cedictSourceFile(): string | null {
  const dir = path.join(process.cwd(), "data", "sources");
  if (!fs.existsSync(dir)) return null;
  const f = fs.readdirSync(dir).find((x) => /^cedict.*\.txt\.gz$/.test(x));
  return f ? path.join(dir, f) : null;
}

export function dictPath(): string {
  return process.env.DICT_PATH || path.join(process.cwd(), "data", "dict.db");
}

/** Import CC-CEDICT into a fresh SQLite file. Returns the number of entries. */
export function buildDict(target = dictPath(), source = cedictSourceFile()): number {
  if (!source) throw new Error("CC-CEDICT source not found in data/sources/");
  const stat = fs.statSync(source);
  const tmp = `${target}.tmp`;
  fs.rmSync(tmp, { force: true });
  const db = new Database(tmp);
  db.exec(`
    CREATE TABLE entries (id INTEGER PRIMARY KEY, simplified TEXT NOT NULL, traditional TEXT NOT NULL,
                          pinyin_num TEXT NOT NULL, definitions TEXT NOT NULL);
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
  `);
  const insert = db.prepare("INSERT INTO entries (simplified, traditional, pinyin_num, definitions) VALUES (?, ?, ?, ?)");
  const text = zlib.gunzipSync(fs.readFileSync(source)).toString("utf8");
  let n = 0;
  db.transaction(() => {
    for (const line of text.split("\n")) {
      const e = parseCedictLine(line);
      if (!e) continue;
      insert.run(e.simplified, e.traditional, e.pinyinNum, JSON.stringify(e.definitions));
      n++;
    }
    db.prepare("INSERT INTO meta VALUES ('source', ?)").run(`${path.basename(source)}:${stat.size}`);
  })();
  db.exec("CREATE INDEX entries_simp ON entries(simplified)");
  db.close();
  fs.renameSync(tmp, target);
  return n;
}

