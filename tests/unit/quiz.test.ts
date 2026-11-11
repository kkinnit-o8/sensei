import { describe, expect, it } from "vitest";
import { answerQuiz, buildQuiz, quizScore, seededRandom, type QuizWord } from "@/lib/quiz";

const W = (simplified: string, pinyinNum: string, meaning: string): QuizWord => ({ simplified, pinyin: pinyinNum, pinyinNum, meaning });

const today = [W("今天", "jin1 tian1", "today"), W("吃", "chi1", "to eat"), W("什么", "shen2 me5", "what"), W("喝", "he1", "to drink")];
const learned = [
  ...today,
  W("你", "ni3", "you"),
  W("我", "wo3", "I; me"),
  W("明天", "ming2 tian1", "tomorrow"),
  W("昨天", "zuo2 tian1", "yesterday"),
  W("是", "shi4", "to be"),
  W("事", "shi4", "matter; thing"),
  W("时", "shi2", "time"),
  W("十", "shi2", "ten"),
  W("看", "kan4", "to look"),
  W("见", "jian4", "to see"),
];

describe("quiz generation", () => {
  it("asks one question per word and mixes the three types", () => {
    const quiz = buildQuiz(today, learned, { audio: true, rng: seededRandom(1) });
    expect(quiz.questions.map((q) => q.word).sort()).toEqual(today.map((w) => w.simplified).sort());
    const types = new Set(quiz.questions.map((q) => q.type));
    expect(types).toEqual(new Set(["meaning", "audio", "reverse"]));
  });

  it("gives 4 distinct options including the answer, wrong ones from other learned words", () => {
    const quiz = buildQuiz(today, learned, { audio: true, rng: seededRandom(2) });
    for (const q of quiz.questions) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.word);
      for (const o of q.options) expect(learned.map((w) => w.simplified)).toContain(o);
      for (const o of q.options) expect(quiz.words[o]).toBeTruthy();
    }
  });

  it("prefers wrong options with the same number of characters", () => {
    const quiz = buildQuiz([today[0]], learned, { audio: false, rng: seededRandom(3) });
    const lens = quiz.questions[0].options.map((o) => Array.from(o).length);
    // 今天 plus three of 明天, 昨天, 什么: all two characters.
    expect(lens).toEqual([2, 2, 2, 2]);
  });

  it("never uses a homophone as a wrong option for an audio question", () => {
    const target = W("是", "shi4", "to be");
    for (let seed = 0; seed < 20; seed++) {
      const quiz = buildQuiz([target], learned, { audio: true, rng: seededRandom(seed) });
      const q = quiz.questions[0];
      if (q.type !== "audio") continue;
      expect(q.options).not.toContain("事");
      expect(q.options).not.toContain("时");
      expect(q.options).not.toContain("十");
    }
  });

  it("leaves out audio questions when there is no Chinese voice", () => {
    const quiz = buildQuiz(today, learned, { audio: false, rng: seededRandom(4) });
    expect(quiz.questions.some((q) => q.type === "audio")).toBe(false);
  });

  it("falls back to other words when too few are learned (day one)", () => {
    const fallback = [W("好", "hao3", "good"), W("大", "da4", "big"), W("小", "xiao3", "small")];
    const quiz = buildQuiz([today[1]], [today[1]], { audio: false, rng: seededRandom(5), fallback });
    expect(quiz.questions[0].options).toHaveLength(4);
  });

  it("is deterministic for a given seed", () => {
    expect(buildQuiz(today, learned, { audio: true, rng: seededRandom(9) })).toEqual(
      buildQuiz(today, learned, { audio: true, rng: seededRandom(9) }),
    );
  });
});

describe("answering", () => {
  it("repeats wrong answers at the end and scores first tries only", () => {
    let quiz = buildQuiz(today.slice(0, 3), learned, { audio: false, rng: seededRandom(7) });
    const [a, b, c] = quiz.queue;
    const wrongChoice = (i: number) => quiz.questions[i].options.find((o) => o !== quiz.questions[i].word)!;

    let r = answerQuiz(quiz, a, quiz.questions[a].word);
    expect(r.correct).toBe(true);
    quiz = r.state;
    r = answerQuiz(quiz, b, wrongChoice(b));
    expect(r.correct).toBe(false);
    expect(r.firstTry).toBe(true);
    quiz = r.state;
    expect(quiz.queue).toEqual([c, b]);
    quiz = answerQuiz(quiz, c, quiz.questions[c].word).state;
    r = answerQuiz(quiz, b, quiz.questions[b].word);
    expect(r.firstTry).toBe(false);
    quiz = r.state;

    expect(quizScore(quiz)).toEqual({ correct: 2, total: 3, done: true, wrongWords: [quiz.questions[b].word] });
  });

  it("refuses to answer a question out of order", () => {
    const quiz = buildQuiz(today, learned, { audio: false, rng: seededRandom(8) });
    expect(() => answerQuiz(quiz, quiz.queue[1], "x")).toThrow();
  });
});
