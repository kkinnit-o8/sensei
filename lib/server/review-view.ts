import "server-only";
import { getCard, scheduledToday } from "./cards";
import { studyCard, type StudyCard } from "./study-card";
import { reviewProgress, type DayRecord } from "./session";
import { previewIntervals, type Rating } from "@/lib/srs";

export interface ReviewCard extends StudyCard {
  /** Days until due for each rating; null when this is a same-day repeat (schedule already set). */
  intervals: Record<Rating, number> | null;
}

export function reviewView(rec: DayRecord, now: Date): { queue: ReviewCard[]; done: number; total: number } {
  const p = reviewProgress(rec, now);
  const queue = p.queue
    .map((w) => {
      const card = studyCard(w);
      if (!card) return null;
      const state = getCard(w);
      return { ...card, intervals: state && !scheduledToday(w, now) ? previewIntervals(state, now) : null };
    })
    .filter((c): c is ReviewCard => !!c);
  return { queue, done: p.done, total: p.total };
}
