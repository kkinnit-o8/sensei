/** Numbers for the Progress page. */
import "server-only";
import { getDb } from "./db";
import { dueTomorrowCount } from "./cards";
import { customWords, loadBank } from "./words";
import { freqTable } from "./lexicon";
import { streakInfo } from "./summary";
import { wordFreq } from "@/lib/wordbank/freq";
import { addDays, studyDay } from "@/lib/day";

export interface DayActivity {
  day: string;
  reviews: number;
  learned: number;
  messages: number;
  completed: boolean;
}

export interface ProgressStats {
  learnedCount: number;
  bankCount: number;
  learnedByHsk: { level: number; learned: number; total: number }[];
  customLearned: number;
  dueTomorrow: number;
  totalReviews: number;
  daysStudied: number;
  streak: { current: number; longest: number };
  /** Share of running text (words) made up of learned words, 0..1. */
  coverage: number;
  /** Coverage if every word in the bank were learned. */
  bankCoverage: number;
  /** Coverage milestones: how many bank words (in learning order) reach each share. */
  milestones: { share: number; words: number }[];
  activity: DayActivity[];
  today: string;
}

export function progressStats(now: Date, weeks = 26): ProgressStats {
  const db = getDb();
  const bank = loadBank().words;
  const learned = new Set((db.prepare("SELECT word FROM learned").all() as { word: string }[]).map((r) => r.word));
  const table = freqTable();
  const share = (w: string) => wordFreq(table, w) / table.hanTotal;

  const coverage = [...learned].reduce((s, w) => s + share(w), 0);
  let cumulative = 0;
  const milestones: { share: number; words: number }[] = [];
  const targets = [0.5, 0.6, 0.7, 0.75];
  bank.forEach((w, i) => {
    const before = cumulative;
    cumulative += share(w.simplified);
    for (const t of targets) if (before < t && cumulative >= t) milestones.push({ share: t, words: i + 1 });
  });

  const today = studyDay(now);
  const from = addDays(today, -(weeks * 7 - 1));
  const byDay = new Map<string, DayActivity>();
  const get = (day: string) => {
    let a = byDay.get(day);
    if (!a) byDay.set(day, (a = { day, reviews: 0, learned: 0, messages: 0, completed: false }));
    return a;
  };
  for (const r of db.prepare("SELECT study_day d, COUNT(*) n FROM review_log WHERE kind = 'review' AND study_day >= ? GROUP BY study_day").all(from) as { d: string; n: number }[])
    get(r.d).reviews = r.n;
  for (const r of db.prepare("SELECT study_day d, COUNT(*) n FROM learned WHERE study_day >= ? GROUP BY study_day").all(from) as { d: string; n: number }[])
    get(r.d).learned = r.n;
  for (const r of db
    .prepare(
      "SELECT c.study_day d, COUNT(*) n FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE m.role = 'user' AND c.study_day >= ? GROUP BY c.study_day",
    )
    .all(from) as { d: string; n: number }[])
    get(r.d).messages = r.n;
  const s = streakInfo(now);
  for (const d of s.completedDays) if (d >= from) get(d).completed = true;

  const activity: DayActivity[] = [];
  for (let d = from; d <= today; d = addDays(d, 1)) activity.push(byDay.get(d) ?? { day: d, reviews: 0, learned: 0, messages: 0, completed: false });

  const levels = [1, 2, 3].map((level) => {
    const words = bank.filter((w) => w.hsk === level);
    return { level, total: words.length, learned: words.filter((w) => learned.has(w.simplified)).length };
  });
  const custom = customWords().filter((c) => learned.has(c.simplified)).length;

  return {
    learnedCount: learned.size,
    bankCount: bank.length,
    learnedByHsk: levels,
    customLearned: custom,
    dueTomorrow: dueTomorrowCount(now),
    totalReviews: (db.prepare("SELECT COUNT(*) n FROM review_log WHERE kind = 'review' AND scheduled = 1").get() as { n: number }).n,
    daysStudied: (db.prepare("SELECT COUNT(DISTINCT study_day) n FROM learned").get() as { n: number }).n,
    streak: { current: s.current, longest: s.longest },
    coverage,
    bankCoverage: cumulative,
    milestones,
    activity,
    today,
  };
}
