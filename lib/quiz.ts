/**
 * The Quick check quiz. Pure functions; the quiz state is stored in the day record so the quiz
 * can be resumed.
 *
 * Question types: characters → meaning, audio → characters, meaning → characters.
 * Wrong options come from other learned words. A wrongly answered question is repeated at the
 * end of the quiz (and the word is rated Again by the caller, once).
 */
import { pinyinKey } from "./zh/pinyin";

export type QuizType = "meaning" | "audio" | "reverse";

export interface QuizWord {
  simplified: string;
  pinyin: string;
  pinyinNum: string;
  meaning: string;
}

export interface QuizQuestion {
  word: string;
  type: QuizType;
  /** Options are words (simplified); the UI shows meanings or characters depending on type. */
  options: string[];
}

export interface QuizAttempt {
  question: number;
  choice: string;
  correct: boolean;
}

export interface QuizState {
  questions: QuizQuestion[];
  words: Record<string, QuizWord>;
  /** Questions still to answer, in order; wrong answers are appended again. */
  queue: number[];
  attempts: QuizAttempt[];
}

/** Small deterministic PRNG (mulberry32) so quizzes can be reproduced in tests. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const firstGloss = (m: string) => m.split(/[;,]/)[0].trim().toLowerCase();

/** Could `other` be confused with `target` as a wrong option (same meaning or same sound)? */
function clashes(target: QuizWord, other: QuizWord, type: QuizType): boolean {
  if (other.simplified === target.simplified) return true;
  if (firstGloss(other.meaning) === firstGloss(target.meaning)) return true;
  if (type === "audio" && pinyinKey(other.pinyinNum) === pinyinKey(target.pinyinNum)) return true;
  return false;
}

/**
 * Build a quiz: one question per target word, types mixed.
 * @param pool other learned words to draw wrong options from
 * @param fallback extra words used only when the learned pool is too small (e.g. on day one)
 */
export function buildQuiz(
  targets: QuizWord[],
  pool: QuizWord[],
  opts: { audio: boolean; rng: () => number; fallback?: QuizWord[]; optionCount?: number },
): QuizState {
  const { rng } = opts;
  const optionCount = opts.optionCount ?? 4;
  const types: QuizType[] = shuffle(opts.audio ? ["meaning", "audio", "reverse"] : ["meaning", "reverse"], rng);
  const words: Record<string, QuizWord> = {};
  const order = shuffle(targets, rng);
  const questions = order.map((t, i) => {
    const type = types[i % types.length];
    const pick = (source: QuizWord[], taken: QuizWord[]) => {
      const ok = source.filter((w) => !clashes(t, w, type) && !taken.some((x) => x.simplified === w.simplified || clashes(x, w, type)));
      // Prefer options with the same number of characters, so length doesn't give the answer away.
      const len = Array.from(t.simplified).length;
      return shuffle(ok, rng).sort((a, b) => Math.abs(Array.from(a.simplified).length - len) - Math.abs(Array.from(b.simplified).length - len));
    };
    const distractors: QuizWord[] = [];
    for (const w of pick(pool, distractors)) {
      if (distractors.length >= optionCount - 1) break;
      if (!distractors.some((x) => x.simplified === w.simplified || clashes(x, w, type))) distractors.push(w);
    }
    if (distractors.length < optionCount - 1 && opts.fallback) {
      for (const w of pick(opts.fallback, distractors)) {
        if (distractors.length >= optionCount - 1) break;
        if (!distractors.some((x) => x.simplified === w.simplified || clashes(x, w, type))) distractors.push(w);
      }
    }
    for (const w of [t, ...distractors]) words[w.simplified] = w;
    return { word: t.simplified, type, options: shuffle([t.simplified, ...distractors.map((d) => d.simplified)], rng) };
  });
  return { questions, words, queue: questions.map((_, i) => i), attempts: [] };
}

export interface AnswerResult {
  state: QuizState;
  correct: boolean;
  /** True the first time this question is answered (only then does it count for the score). */
  firstTry: boolean;
}

/** Answer the question at the head of the queue. Wrong answers are repeated at the end. */
export function answerQuiz(state: QuizState, questionIndex: number, choice: string): AnswerResult {
  if (state.queue[0] !== questionIndex) throw new Error("That question is not the current one");
  const q = state.questions[questionIndex];
  const correct = choice === q.word;
  const firstTry = !state.attempts.some((a) => a.question === questionIndex);
  const queue = state.queue.slice(1);
  if (!correct) queue.push(questionIndex);
  return {
    state: { ...state, queue, attempts: [...state.attempts, { question: questionIndex, choice, correct }] },
    correct,
    firstTry,
  };
}

export function quizScore(state: QuizState): { correct: number; total: number; done: boolean; wrongWords: string[] } {
  const first = new Map<number, boolean>();
  for (const a of state.attempts) if (!first.has(a.question)) first.set(a.question, a.correct);
  const wrongWords = [...first.entries()].filter(([, c]) => !c).map(([q]) => state.questions[q].word);
  return {
    correct: [...first.values()].filter(Boolean).length,
    total: state.questions.length,
    done: state.queue.length === 0,
    wrongWords,
  };
}
