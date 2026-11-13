/** Export and import all progress as one JSON file. */
import "server-only";
import { getDb } from "./db";

/** Tables in dependency order (parents first). */
const TABLES = [
  "settings",
  "custom_words",
  "learned",
  "cards",
  "review_log",
  "learn_queue",
  "days",
  "conversations",
  "messages",
  "game_runs",
  "game_messages",
] as const;

export interface Backup {
  app: "chinese-teacher";
  format: 1;
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

export function exportAll(now = new Date()): Backup {
  const db = getDb();
  const tables: Backup["tables"] = {};
  for (const t of TABLES) tables[t] = db.prepare(`SELECT * FROM ${t}`).all() as Record<string, unknown>[];
  return {
    app: "chinese-teacher",
    format: 1,
    schemaVersion: db.pragma("user_version", { simple: true }) as number,
    exportedAt: now.toISOString(),
    tables,
  };
}

function columns(table: string): string[] {
  return (getDb().prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
}

/** Replace all progress with the backup's contents. Throws on an invalid file (nothing is changed). */
export function importAll(data: unknown): Record<string, number> {
  const b = data as Partial<Backup>;
  if (!b || b.app !== "chinese-teacher" || b.format !== 1 || typeof b.tables !== "object" || !b.tables) {
    throw new Error("This is not a Chinese Teacher backup file.");
  }
  const db = getDb();
  const current = db.pragma("user_version", { simple: true }) as number;
  if ((b.schemaVersion ?? 0) > current) throw new Error("This backup comes from a newer version of the app. Update the app first.");
  const counts: Record<string, number> = {};
  db.transaction(() => {
    for (const t of [...TABLES].reverse()) db.prepare(`DELETE FROM ${t}`).run();
    for (const t of TABLES) {
      const rows = b.tables![t] ?? [];
      if (!Array.isArray(rows)) throw new Error(`Table ${t} is not a list.`);
      const cols = columns(t);
      for (const row of rows) {
        if (!row || typeof row !== "object") throw new Error(`Bad row in ${t}.`);
        const keys = Object.keys(row).filter((k) => cols.includes(k));
        if (keys.length === 0) continue;
        db.prepare(`INSERT INTO ${t} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`).run(
          ...keys.map((k) => (row as Record<string, unknown>)[k] as never),
        );
      }
      counts[t] = rows.length;
    }
  })();
  return counts;
}
