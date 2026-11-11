import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { setDbForTests } from "@/lib/server/db";
import { saveSettings } from "@/lib/server/settings";
import { queueWord } from "@/lib/server/queue";
import { loadBank } from "@/lib/server/words";
import { getCard, rateWord } from "@/lib/server/cards";
import {
  answerTodayQuiz,
  getOrCreateDay,
  getOrCreateQuiz,
  learnPlan,
  markLearned,
  overview,
  reviewQueue,
} from "@/lib/server/session";
import { dayStart } from "@/lib/day";

const at = (day: string, hour = 10) => new Date(dayStart(day).getTime() + (hour - 4) * 3600e3);
const D1 = "2026-11-11";
const D2 = "2026-11-12";

function learnAll(now: Date) {
  const rec = getOrCreateDay(now);
  for (const w of learnPlan(rec)) markLearned(w, now);
  return rec;
}

beforeEach(() => {
  setDbForTests(new Database(":memory:"));
});

describe("daily session (server logic)", () => {
  it("day one: nothing to review, ten new words in frequency order", () => {
    const now = at(D1);
    const o = overview(now);
    expect(o.steps.map((s) => s.status)).toEqual(["skipped", "available", "locked", "locked", "locked"]);
    const plan = learnPlan(getOrCreateDay(now));
    expect(plan).toEqual(loadBank().words.slice(0, 10).map((w) => w.simplified));
  });

  it("puts queued words first in the Learn step", () => {
    const now = at(D1);
    expect(queueWord("银行", now)).toEqual({ ok: true, custom: false });
    const plan = learnPlan(getOrCreateDay(now));
    expect(plan[0]).toBe("银行");
    expect(plan).toHaveLength(10);
  });

  it("learning a word creates its review card and removes it from the queue", () => {
    const now = at(D1);
    queueWord("银行", now);
    learnAll(now);
    expect(getCard("银行")).not.toBeNull();
    expect(queueWord("银行", now)).toEqual({ ok: false, error: "You have already learned this word" });
    expect(overview(now).steps.find((s) => s.id === "learn")!.status).toBe("done");
  });

  it("quiz: a wrong first answer rates the word Again; the question comes back", () => {
    const now = at(D1);
    const rec = learnAll(now);
    const quiz = getOrCreateQuiz(rec, now, false)!;
    expect(quiz.questions).toHaveLength(10);
    const first = quiz.queue[0];
    const q = quiz.questions[first];
    const wrong = q.options.find((o) => o !== q.word)!;
    const res = answerTodayQuiz(rec, first, wrong, now);
    expect(res.correct).toBe(false);
    expect(res.state.queue[res.state.queue.length - 1]).toBe(first);
    const card = getCard(q.word)!;
    expect(card.reps).toBe(1);
    expect(new Date(card.due).getTime()).toBeGreaterThan(now.getTime());
    // Finish the quiz correctly.
    let state = res.state;
    while (state.queue.length) {
      const i = state.queue[0];
      state = answerTodayQuiz(rec, i, state.questions[i].word, now).state;
    }
    expect(overview(now).steps.find((s) => s.id === "quiz")!.status).toBe("done");
  });

  it("day two: yesterday's words are due, capped by the daily maximum", () => {
    learnAll(at(D1));
    saveSettings({ maxReviewsPerDay: 6 });
    const rec = getOrCreateDay(at(D2));
    expect(rec.plan.reviewWords).toHaveLength(6);
    expect(overview(at(D2)).current).toBe("review");
  });

  it("Again sends a card to the end of today's review without rescheduling it twice", () => {
    learnAll(at(D1));
    const now = at(D2);
    const rec = getOrCreateDay(now);
    const [a, b] = rec.plan.reviewWords;
    rateWord(a, 1, "review", now);
    let queue = reviewQueue(rec, now);
    expect(queue[0]).toBe(b);
    expect(queue[queue.length - 1]).toBe(a);
    const dueAfterAgain = getCard(a)!.due;
    rateWord(a, 3, "review", now); // same-day repeat: logged only
    expect(getCard(a)!.due).toBe(dueAfterAgain);
    queue = reviewQueue(rec, now);
    expect(queue).not.toContain(a);
    for (const w of queue) rateWord(w, 3, "review", now);
    expect(reviewQueue(rec, now)).toEqual([]);
    expect(overview(now).steps[0].status).toBe("done");
  });

  it("before 04:00 it is still the previous study day", () => {
    learnAll(at(D1));
    const lateNight = new Date(dayStart(D2).getTime() - 30 * 60e3); // 03:30 on the 12th
    expect(getOrCreateDay(lateNight).studyDay).toBe(D1);
    expect(getOrCreateDay(lateNight).plan.reviewWords).toEqual([]);
  });

  it("adds a word outside the word bank as a custom word from CC-CEDICT", () => {
    const now = at(D1);
    const res = queueWord("咖啡馆", now);
    expect(res).toEqual({ ok: true, custom: true });
    expect(learnPlan(getOrCreateDay(now))[0]).toBe("咖啡馆");
  });
});
