/** The day's summary and the streak. */
import "server-only";
import { getDb } from "./db";
import { dailyConversation, messagesOf } from "./chat";
import { chatView, todaysWordUsage, type ChatWord } from "./chat-view";
import { getDay, getOrCreateDay, maybeCompleteDay, overview, saveState, wordsLearnedOn } from "./session";
import { studyWord } from "./words";
import { streak, longestStreak, studyDay } from "@/lib/day";
import { quizScore } from "@/lib/quiz";

export function completedDays(): string[] {
  return (getDb().prepare("SELECT study_day FROM days WHERE completed_at IS NOT NULL ORDER BY study_day").all() as { study_day: string }[]).map(
    (r) => r.study_day,
  );
}

export function streakInfo(now: Date) {
  const days = completedDays();
  const today = studyDay(now);
  return { current: streak(days, today), longest: longestStreak(days), todayDone: days.includes(today), completedDays: days };
}

export interface DaySummary {
  studyDay: string;
  learned: { word: string; pinyinNum: string; meaning: string }[];
  reviews: { total: number; again: number };
  quiz: { correct: number; total: number; wrongWords: string[] } | null;
  corrections: { original: string; explanation: string; corrected: string }[];
  usage: ReturnType<typeof todaysWordUsage>;
  wordsFromChat: ChatWord[];
  conversation: { id: number; exchanges: number; target: number; cost: number; topic: string } | null;
  streak: ReturnType<typeof streakInfo>;
  /** True once every step (except this summary) is finished. */
  ready: boolean;
  completed: boolean;
}

export function daySummary(now: Date, day = studyDay(now)): DaySummary {
  const rec = day === studyDay(now) ? getOrCreateDay(now) : getDay(day);
  const learned = wordsLearnedOn(day).map((w) => {
    const s = studyWord(w);
    return { word: w, pinyinNum: s?.pinyinNum ?? "", meaning: s?.meaning ?? "" };
  });
  const logs = getDb()
    .prepare("SELECT rating FROM review_log WHERE study_day = ? AND kind = 'review' AND scheduled = 1")
    .all(day) as { rating: number }[];
  const conv = dailyConversation(day);
  const msgs = conv ? messagesOf(conv.id) : [];
  const corrections = msgs
    .filter((m) => m.role === "user" && m.correction)
    .map((m) => ({ original: m.text, ...(JSON.parse(m.correction!) as { explanation: string; corrected: string }) }));
  const view = conv ? chatView(conv.id) : null;
  const o = day === studyDay(now) ? overview(now) : null;
  return {
    studyDay: day,
    learned,
    reviews: { total: logs.length, again: logs.filter((l) => l.rating === 1).length },
    quiz: rec?.state.quiz ? quizScore(rec.state.quiz) : null,
    corrections,
    usage: todaysWordUsage(conv?.id ?? null, day),
    wordsFromChat: view?.wordsFromChat ?? [],
    conversation: view ? { id: view.id, exchanges: view.exchanges, target: view.target, cost: view.cost, topic: view.topic } : null,
    streak: streakInfo(now),
    ready: o ? o.steps.filter((s) => s.id !== "summary").every((s) => s.status === "done" || s.status === "skipped") : true,
    completed: !!rec?.completedAt,
  };
}

/** Called when the summary is shown: finishes the day if everything else is done. */
export function markSummarySeen(now: Date): DaySummary {
  const rec = getOrCreateDay(now);
  const before = daySummary(now);
  if (before.ready && !rec.state.summarySeen) {
    rec.state.summarySeen = true;
    saveState(rec.studyDay, rec.state);
    maybeCompleteDay(getDay(rec.studyDay)!, now);
  }
  return daySummary(now);
}
