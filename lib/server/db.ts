/**
 * The progress database (one local SQLite file, git-ignored).
 * Path: $DB_PATH or data/progress.db.
 */
import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS: string[] = [
  // 1: initial schema
  `
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

  -- Words the learner added that are not in the word bank (from CC-CEDICT).
  CREATE TABLE custom_words (
    simplified TEXT PRIMARY KEY,
    traditional TEXT NOT NULL,
    pinyin TEXT NOT NULL,
    pinyin_num TEXT NOT NULL,
    meaning TEXT NOT NULL,
    meanings TEXT NOT NULL,          -- JSON array
    added_at TEXT NOT NULL
  );

  -- A word counts as learned once it was introduced in a Learn step.
  CREATE TABLE learned (
    word TEXT PRIMARY KEY,
    learned_at TEXT NOT NULL,
    study_day TEXT NOT NULL
  );

  -- FSRS state per learned word.
  CREATE TABLE cards (
    word TEXT PRIMARY KEY,
    due TEXT NOT NULL,
    stability REAL NOT NULL,
    difficulty REAL NOT NULL,
    scheduled_days INTEGER NOT NULL,
    learning_steps INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    lapses INTEGER NOT NULL,
    state INTEGER NOT NULL,
    last_review TEXT
  );
  CREATE INDEX cards_due ON cards(due);

  CREATE TABLE review_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    rating INTEGER NOT NULL,         -- 1 Again, 2 Hard, 3 Good, 4 Easy
    kind TEXT NOT NULL,              -- review | relearn | quiz
    scheduled INTEGER NOT NULL,      -- 1 if this rating updated the FSRS schedule
    reviewed_at TEXT NOT NULL,
    study_day TEXT NOT NULL,
    due_after TEXT
  );
  CREATE INDEX review_log_day ON review_log(study_day);

  -- Words to learn first (queued from the chat or the word pages).
  CREATE TABLE learn_queue (word TEXT PRIMARY KEY, queued_at TEXT NOT NULL);

  -- One row per study day: the plan snapshot and step progress.
  CREATE TABLE days (
    study_day TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    plan TEXT NOT NULL,              -- JSON
    state TEXT NOT NULL,             -- JSON
    completed_at TEXT
  );

  CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    study_day TEXT NOT NULL,
    topic TEXT NOT NULL,
    model TEXT NOT NULL,
    target_exchanges INTEGER NOT NULL,
    is_daily INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    cost REAL NOT NULL DEFAULT 0,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,              -- teacher | user
    text TEXT NOT NULL,
    translation TEXT,
    hint TEXT,
    correction TEXT,                 -- JSON {explanation, corrected} on the user's message
    raw TEXT,                        -- unparsed model output when JSON was invalid
    created_at TEXT NOT NULL
  );
  CREATE INDEX messages_conv ON messages(conversation_id);
  `,
  // 2: City Adventures game
  `
  CREATE TABLE game_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scene_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    goals TEXT NOT NULL DEFAULT '[]',  -- JSON: completed goal ids
    hearts INTEGER NOT NULL,
    hints INTEGER NOT NULL DEFAULT 0,
    complete INTEGER NOT NULL DEFAULT 0,
    stars INTEGER NOT NULL DEFAULT 0,
    model TEXT NOT NULL,
    cost REAL NOT NULL DEFAULT 0,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX game_runs_scene ON game_runs(scene_id);

  CREATE TABLE game_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES game_runs(id) ON DELETE CASCADE,
    turn INTEGER NOT NULL,
    role TEXT NOT NULL,              -- player | npc
    speaker TEXT,                    -- character id for npc lines
    text TEXT NOT NULL,
    translation TEXT,
    expression TEXT,
    hint TEXT,
    hint_used INTEGER NOT NULL DEFAULT 0,
    correction TEXT,                 -- JSON on player messages
    not_chinese INTEGER NOT NULL DEFAULT 0,
    raw TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX game_messages_run ON game_messages(run_id);
  `,
];

export function dbPath(): string {
  return process.env.DB_PATH || path.join(process.cwd(), "data", "progress.db");
}

function open(file: string): Database.Database {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

export function migrate(db: Database.Database) {
  const version = db.pragma("user_version", { simple: true }) as number;
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
}

const g = globalThis as unknown as { __progressDb?: { file: string; db: Database.Database } };

/** The shared connection (survives dev hot reloads). */
export function getDb(): Database.Database {
  const file = dbPath();
  if (!g.__progressDb || g.__progressDb.file !== file) {
    g.__progressDb?.db.close();
    g.__progressDb = { file, db: open(file) };
  }
  return g.__progressDb.db;
}

/** Use an in-memory or test database (tests only). */
export function setDbForTests(db: Database.Database) {
  migrate(db);
  g.__progressDb = { file: dbPath(), db };
}
