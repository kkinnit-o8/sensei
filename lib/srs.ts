/**
 * Spaced repetition with FSRS (ts-fsrs). Pure functions; the server stores the cards.
 *
 * Minute-level learning steps are turned off (enable_short_term: false): this app is used once
 * a day, so every interval is in whole days. A card rated Again in the Review step is shown
 * again at the end of that step instead (see lib/server/review.ts).
 */
import { createEmptyCard, fsrs, generatorParameters, type Card, type FSRS, type Grade } from "ts-fsrs";
import { dayEnd } from "./day";

export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
export const RATING_LABELS: Record<Rating, string> = { 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" };

const schedulers = new Map<boolean, FSRS>();
function scheduler(fuzz: boolean): FSRS {
  let s = schedulers.get(fuzz);
  if (!s) {
    s = fsrs(generatorParameters({ enable_fuzz: fuzz, enable_short_term: false, request_retention: 0.9, maximum_interval: 3650 }));
    schedulers.set(fuzz, s);
  }
  return s;
}

/** Serializable card state (what the database stores). */
export interface CardState {
  due: string;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number; // 0 New, 1 Learning, 2 Review, 3 Relearning
  lastReview: string | null;
}

function toCard(s: CardState): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.lastReview ? new Date(s.lastReview) : undefined,
  } as Card;
}

function fromCard(c: Card): CardState {
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    lastReview: c.last_review ? new Date(c.last_review).toISOString() : null,
  };
}

/** A new card, due immediately (so it shows up in the next day's review). */
export function newCard(now: Date): CardState {
  return fromCard(createEmptyCard(now));
}

export function rate(card: CardState, rating: Rating, now: Date, fuzz = true): CardState {
  return fromCard(scheduler(fuzz).next(toCard(card), now, rating as Grade).card);
}

/** Days until the card would be due again for each rating (for the rating buttons). */
export function previewIntervals(card: CardState, now: Date): Record<Rating, number> {
  const rec = scheduler(false).repeat(toCard(card), now);
  const out = {} as Record<Rating, number>;
  for (const r of [1, 2, 3, 4] as Rating[]) out[r] = (rec as unknown as Record<number, { card: Card }>)[r].card.scheduled_days;
  return out;
}

/** Is the card due on the study day containing `now`? */
export function isDue(card: Pick<CardState, "due">, now: Date): boolean {
  return new Date(card.due).getTime() < dayEnd(now).getTime();
}

export function formatInterval(days: number): string {
  if (days < 1) return "<1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(days < 3650 ? 1 : 0)}y`;
}
