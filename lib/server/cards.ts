/** FSRS cards and review ratings in the database. */
import "server-only";
import { getDb } from "./db";
import { newCard, rate, type CardState, type Rating } from "@/lib/srs";
import { dayEnd, studyDay } from "@/lib/day";

type CardRow = {
  word: string;
  due: string;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
};

const fromRow = (r: CardRow): CardState => ({
  due: r.due,
  stability: r.stability,
  difficulty: r.difficulty,
  scheduledDays: r.scheduled_days,
  learningSteps: r.learning_steps,
  reps: r.reps,
  lapses: r.lapses,
  state: r.state,
  lastReview: r.last_review,
});

export function getCard(word: string): CardState | null {
  const r = getDb().prepare("SELECT * FROM cards WHERE word = ?").get(word) as CardRow | undefined;
  return r ? fromRow(r) : null;
}

export function saveCard(word: string, c: CardState) {
  getDb()
    .prepare(
      `INSERT INTO cards (word, due, stability, difficulty, scheduled_days, learning_steps, reps, lapses, state, last_review)
       VALUES (@word, @due, @stability, @difficulty, @scheduledDays, @learningSteps, @reps, @lapses, @state, @lastReview)
       ON CONFLICT(word) DO UPDATE SET due=excluded.due, stability=excluded.stability, difficulty=excluded.difficulty,
         scheduled_days=excluded.scheduled_days, learning_steps=excluded.learning_steps, reps=excluded.reps,
         lapses=excluded.lapses, state=excluded.state, last_review=excluded.last_review`,
    )
    .run({ word, ...c });
}

export function ensureCard(word: string, now: Date): CardState {
  const existing = getCard(word);
  if (existing) return existing;
  const c = newCard(now);
  saveCard(word, c);
  return c;
}

/**
 * Words due on the current study day, most overdue first. Words learned today are left out
 * (they are practised in today's quiz and first reviewed tomorrow).
 */
export function dueWords(now: Date, limit: number): string[] {
  if (limit <= 0) return [];
  const today = studyDay(now);
  return (
    getDb()
      .prepare(
        `SELECT c.word FROM cards c JOIN learned l ON l.word = c.word
         WHERE c.due < ? AND l.study_day < ? ORDER BY c.due, c.word LIMIT ?`,
      )
      .all(dayEnd(now).toISOString(), today, limit) as { word: string }[]
  ).map((r) => r.word);
}

/** Number of words that will be due on the study day after the one containing `now`. */
export function dueTomorrowCount(now: Date): number {
  const tomorrowEnd = new Date(dayEnd(now).getTime() + 24 * 3600e3);
  return (getDb().prepare("SELECT COUNT(*) n FROM cards WHERE due < ?").get(tomorrowEnd.toISOString()) as { n: number }).n;
}

/** Was this word already rated today in a way that updated its schedule? */
export function scheduledToday(word: string, now: Date): boolean {
  return !!getDb().prepare("SELECT 1 FROM review_log WHERE word = ? AND study_day = ? AND scheduled = 1").get(word, studyDay(now));
}

/**
 * Rate a word. Only the first rating of the day changes the FSRS schedule; later ratings the
 * same day (the in-session repeats of Again cards) are only logged.
 */
export function rateWord(word: string, rating: Rating, kind: "review" | "quiz", now: Date): { scheduled: boolean; card: CardState } {
  const db = getDb();
  return db.transaction(() => {
    const card = ensureCard(word, now);
    const day = studyDay(now);
    if (scheduledToday(word, now)) {
      db.prepare("INSERT INTO review_log (word, rating, kind, scheduled, reviewed_at, study_day, due_after) VALUES (?, ?, ?, 0, ?, ?, ?)").run(
        word,
        rating,
        kind === "review" ? "relearn" : kind,
        now.toISOString(),
        day,
        card.due,
      );
      return { scheduled: false, card };
    }
    const next = rate(card, rating, now);
    saveCard(word, next);
    db.prepare("INSERT INTO review_log (word, rating, kind, scheduled, reviewed_at, study_day, due_after) VALUES (?, ?, ?, 1, ?, ?, ?)").run(
      word,
      rating,
      kind,
      now.toISOString(),
      day,
      next.due,
    );
    return { scheduled: true, card: next };
  })();
}

/** Ratings logged today for the given words, oldest first. */
export function ratingsToday(words: string[], now: Date): { word: string; rating: number; kind: string }[] {
  if (words.length === 0) return [];
  const placeholders = words.map(() => "?").join(",");
  return getDb()
    .prepare(`SELECT word, rating, kind FROM review_log WHERE study_day = ? AND word IN (${placeholders}) ORDER BY id`)
    .all(studyDay(now), ...words) as { word: string; rating: number; kind: string }[];
}

/** First (schedule-changing) review ratings done today, for the daily cap. */
export function reviewsDoneToday(now: Date): number {
  return (
    getDb().prepare("SELECT COUNT(*) n FROM review_log WHERE study_day = ? AND kind = 'review' AND scheduled = 1").get(studyDay(now)) as {
      n: number;
    }
  ).n;
}
