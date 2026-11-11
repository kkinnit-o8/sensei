/**
 * Today's guided session: Review → Learn → Quick check → Conversation → Summary.
 * The plan is snapshotted in the `days` table when the day starts, so leaving and coming back
 * resumes exactly where you were.
 */
import "server-only";
import { getDb } from "./db";
import { getSettings } from "./settings";
import { dueWords, ensureCard, rateWord, ratingsToday, reviewsDoneToday } from "./cards";
import { loadBank, studyWord, type StudyWord } from "./words";
import { queuedWords } from "./queue";
import { studyDay } from "@/lib/day";
import { answerQuiz, buildQuiz, quizScore, seededRandom, type QuizState, type QuizWord } from "@/lib/quiz";

export interface DayPlan {
  /** Review cards due when the day started (capped by the daily maximum). */
  reviewWords: string[];
  /** New words for the Learn step; chosen when the step is first opened. */
  learnWords: string[] | null;
}

export interface DayState {
  quiz: QuizState | null;
  conversationId: number | null;
  conversationDone: boolean;
  summarySeen: boolean;
}

export interface DayRecord {
  studyDay: string;
  createdAt: string;
  plan: DayPlan;
  state: DayState;
  completedAt: string | null;
}

const EMPTY_STATE: DayState = { quiz: null, conversationId: null, conversationDone: false, summarySeen: false };

type DayRow = { study_day: string; created_at: string; plan: string; state: string; completed_at: string | null };

const toRecord = (r: DayRow): DayRecord => ({
  studyDay: r.study_day,
  createdAt: r.created_at,
  plan: JSON.parse(r.plan),
  state: { ...EMPTY_STATE, ...JSON.parse(r.state) },
  completedAt: r.completed_at,
});

export function getDay(day: string): DayRecord | null {
  const r = getDb().prepare("SELECT * FROM days WHERE study_day = ?").get(day) as DayRow | undefined;
  return r ? toRecord(r) : null;
}

/** Today's record, created (with the review snapshot) on first access. */
export function getOrCreateDay(now: Date): DayRecord {
  const day = studyDay(now);
  const existing = getDay(day);
  if (existing) return existing;
  const settings = getSettings();
  const cap = Math.max(0, settings.maxReviewsPerDay - reviewsDoneToday(now));
  const plan: DayPlan = { reviewWords: dueWords(now, cap), learnWords: null };
  getDb()
    .prepare("INSERT OR IGNORE INTO days (study_day, created_at, plan, state) VALUES (?, ?, ?, ?)")
    .run(day, now.toISOString(), JSON.stringify(plan), JSON.stringify(EMPTY_STATE));
  return getDay(day)!;
}

function savePlan(day: string, plan: DayPlan) {
  getDb().prepare("UPDATE days SET plan = ? WHERE study_day = ?").run(JSON.stringify(plan), day);
}

export function saveState(day: string, state: DayState) {
  getDb().prepare("UPDATE days SET state = ? WHERE study_day = ?").run(JSON.stringify(state), day);
}

/* -------------------------------- Review -------------------------------- */

/**
 * Words still to review today: snapshot words not rated yet, then words whose latest rating
 * today was Again (shown again at the end until you get them).
 */
export function reviewQueue(rec: DayRecord, now: Date): string[] {
  const logs = ratingsToday(rec.plan.reviewWords, now).filter((l) => l.kind === "review" || l.kind === "relearn");
  const last = new Map<string, number>();
  for (const l of logs) {
    last.delete(l.word); // keep insertion order = order of latest rating
    last.set(l.word, l.rating);
  }
  const unrated = rec.plan.reviewWords.filter((w) => !last.has(w));
  const again = [...last.entries()].filter(([, r]) => r === 1).map(([w]) => w);
  return [...unrated, ...again];
}

export function reviewProgress(rec: DayRecord, now: Date) {
  const queue = reviewQueue(rec, now);
  const total = rec.plan.reviewWords.length;
  return { total, done: total - new Set(queue).size, queue };
}

/* -------------------------------- Learn --------------------------------- */

function learnedSet(): Set<string> {
  return new Set((getDb().prepare("SELECT word FROM learned").all() as { word: string }[]).map((r) => r.word));
}

/** Which new words today: queued words first, then the word bank in frequency order. */
export function chooseNewWords(count: number): string[] {
  if (count <= 0) return [];
  const learned = learnedSet();
  const out: string[] = [];
  for (const w of queuedWords()) {
    if (out.length >= count) break;
    if (!learned.has(w) && studyWord(w)) out.push(w);
  }
  for (const w of loadBank().words) {
    if (out.length >= count) break;
    if (!learned.has(w.simplified) && !out.includes(w.simplified)) out.push(w.simplified);
  }
  return out;
}

/** The Learn plan, chosen the first time it's needed today. */
export function learnPlan(rec: DayRecord): string[] {
  if (rec.plan.learnWords) return rec.plan.learnWords;
  const words = chooseNewWords(getSettings().newWordsPerDay);
  rec.plan.learnWords = words;
  savePlan(rec.studyDay, rec.plan);
  return words;
}

/** A word counts as learned once it has been introduced in a Learn step. */
export function markLearned(word: string, now: Date) {
  const db = getDb();
  db.transaction(() => {
    db.prepare("INSERT OR IGNORE INTO learned (word, learned_at, study_day) VALUES (?, ?, ?)").run(word, now.toISOString(), studyDay(now));
    ensureCard(word, now);
    db.prepare("DELETE FROM learn_queue WHERE word = ?").run(word);
  })();
}

export function wordsLearnedOn(day: string): string[] {
  return (getDb().prepare("SELECT word FROM learned WHERE study_day = ? ORDER BY learned_at").all(day) as { word: string }[]).map((r) => r.word);
}

/* --------------------------------- Quiz --------------------------------- */

export function toQuizWord(w: StudyWord): QuizWord {
  return { simplified: w.simplified, pinyin: w.pinyin, pinyinNum: w.pinyinNum, meaning: w.meaning };
}

/** Words for today's quiz: today's new words, or (if none) words reviewed today. */
export function quizTargets(rec: DayRecord, now: Date): string[] {
  const learnedToday = wordsLearnedOn(rec.studyDay);
  if (learnedToday.length) return learnedToday;
  const reviewed = [...new Set(ratingsToday(rec.plan.reviewWords, now).map((l) => l.word))];
  return reviewed.slice(0, 10);
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return h >>> 0;
}

export function getOrCreateQuiz(rec: DayRecord, now: Date, audio: boolean): QuizState | null {
  if (rec.state.quiz) return rec.state.quiz;
  const targets = quizTargets(rec, now)
    .map(studyWord)
    .filter((w): w is StudyWord => !!w)
    .map(toQuizWord);
  if (targets.length === 0) return null;
  const learned = learnedSet();
  const pool = [...learned].map(studyWord).filter((w): w is StudyWord => !!w).map(toQuizWord);
  const fallback = loadBank()
    .words.filter((w) => !learned.has(w.simplified))
    .slice(0, 40)
    .map((w) => toQuizWord(w));
  const quiz = buildQuiz(targets, pool, { audio, rng: seededRandom(hashSeed(rec.studyDay)), fallback });
  rec.state.quiz = quiz;
  saveState(rec.studyDay, rec.state);
  return quiz;
}

export function answerTodayQuiz(rec: DayRecord, question: number, choice: string, now: Date) {
  if (!rec.state.quiz) throw new Error("No quiz today");
  const res = answerQuiz(rec.state.quiz, question, choice);
  rec.state.quiz = res.state;
  saveState(rec.studyDay, rec.state);
  // A wrong first answer rates the word Again in the review schedule.
  if (!res.correct && res.firstTry) rateWord(rec.state.quiz.questions[question].word, 1, "quiz", now);
  maybeCompleteDay(rec, now);
  return res;
}

/* -------------------------------- Steps --------------------------------- */

export type StepId = "review" | "learn" | "quiz" | "conversation" | "summary";
export type StepStatus = "locked" | "available" | "in_progress" | "done" | "skipped";

export interface Step {
  id: StepId;
  title: string;
  status: StepStatus;
  done: number;
  total: number;
  detail: string;
  href: string;
}

export interface Overview {
  studyDay: string;
  steps: Step[];
  current: StepId | null;
  completed: boolean;
}

const finished = (s: StepStatus) => s === "done" || s === "skipped";

export function overview(now: Date): Overview {
  const rec = getOrCreateDay(now);
  const settings = getSettings();

  const rv = reviewProgress(rec, now);
  const review: Omit<Step, "status"> & { raw: StepStatus } = {
    id: "review",
    title: "Review",
    href: "/session/review",
    done: rv.done,
    total: rv.total,
    detail: rv.total === 0 ? "Nothing due today" : `${rv.total} word${rv.total === 1 ? "" : "s"} due`,
    raw: rv.total === 0 ? "skipped" : rv.queue.length === 0 ? "done" : rv.done > 0 || rv.queue.length < rv.total ? "in_progress" : "available",
  };

  const plan = rec.plan.learnWords ?? chooseNewWords(settings.newWordsPerDay);
  const learned = learnedSet();
  const learnDone = plan.filter((w) => learned.has(w)).length;
  const learn = {
    id: "learn" as const,
    title: "Learn",
    href: "/session/learn",
    done: learnDone,
    total: plan.length,
    detail: plan.length === 0 ? "No new words today" : `${plan.length} new word${plan.length === 1 ? "" : "s"}`,
    raw: (plan.length === 0 ? "skipped" : learnDone === plan.length ? "done" : learnDone > 0 ? "in_progress" : "available") as StepStatus,
  };

  const quizState = rec.state.quiz;
  const quizScoreNow = quizState ? quizScore(quizState) : null;
  const quizWordCount = quizState ? quizState.questions.length : null;
  const quiz = {
    id: "quiz" as const,
    title: "Quick check",
    href: "/session/quiz",
    done: quizState ? quizState.questions.length - new Set(quizState.queue).size : 0,
    total: quizWordCount ?? 0,
    detail: quizScoreNow?.done ? `${quizScoreNow.correct} of ${quizScoreNow.total} right first time` : "A short quiz on today's words",
    raw: (quizScoreNow?.done ? "done" : quizState ? "in_progress" : "available") as StepStatus,
  };

  const conversation = {
    id: "conversation" as const,
    title: "Conversation",
    href: "/session/chat",
    done: 0,
    total: settings.exchangesPerDay,
    detail: `${settings.exchangesPerDay} exchanges with your teacher`,
    raw: (rec.state.conversationDone ? "done" : rec.state.conversationId ? "in_progress" : "available") as StepStatus,
  };

  const summary = {
    id: "summary" as const,
    title: "Summary",
    href: "/session/summary",
    done: rec.state.summarySeen ? 1 : 0,
    total: 1,
    detail: "What you did today",
    raw: (rec.state.summarySeen ? "done" : "available") as StepStatus,
  };

  // Steps unlock in order; a step can't be "skipped" until it's reachable (quiz targets depend on Learn).
  const ordered = [review, learn, quiz, conversation, summary];
  const steps: Step[] = [];
  let blocked = false;
  for (const s of ordered) {
    let status: StepStatus = s.raw;
    if (blocked && !finished(status)) status = "locked";
    if (s.id === "quiz" && !blocked && !quizState && quizTargets(rec, now).length === 0) status = "skipped";
    steps.push({ id: s.id, title: s.title, href: s.href, done: s.done, total: s.total, detail: s.detail, status });
    if (!finished(status)) blocked = true;
  }
  const current = steps.find((s) => !finished(s.status))?.id ?? null;
  return { studyDay: rec.studyDay, steps, current, completed: !!rec.completedAt || current === null };
}

/** Mark the day complete (for the streak) once every step is finished. */
export function maybeCompleteDay(rec: DayRecord, now: Date) {
  if (rec.completedAt) return;
  const o = overview(now);
  if (o.current === null) {
    getDb().prepare("UPDATE days SET completed_at = ? WHERE study_day = ? AND completed_at IS NULL").run(now.toISOString(), rec.studyDay);
  }
}
