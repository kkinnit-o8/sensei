"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink, Card, Kbd, StepHeader, StickyActions } from "@/components/ui";
import { HanziWord, TonePinyin, syllablesFromNum } from "@/components/ZhText";
import { useApp } from "@/components/AppProvider";
import { speak, useChineseVoices } from "@/lib/client/speech";
import { useSilent } from "@/lib/client/silent";
import { quizScore, type QuizState } from "@/lib/quiz";

type Feedback = { choice: string; correct: boolean; next: QuizState } | null;

export function QuizStep({ initialQuiz }: { initialQuiz: QuizState | null }) {
  const { settings } = useApp();
  const voices = useChineseVoices();
  const [silent] = useSilent();
  // Listening questions need sound and a Chinese voice; otherwise they show pinyin to read.
  const canListen = !silent && voices.supported && voices.voices.length > 0;
  const [quiz, setQuiz] = useState<QuizState | null>(initialQuiz);
  const [none, setNone] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  // Create today's quiz. It always includes listening questions: without sound they become
  // "read the pinyin" questions, so the quiz works the same with or without audio.
  useEffect(() => {
    if (quiz || started.current) return;
    started.current = true;
    fetch("/api/session/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", audio: true }),
    })
      .then((r) => r.json())
      .then((d: { quiz: QuizState | null }) => (d.quiz ? setQuiz(d.quiz) : setNone(true)))
      .catch(() => setError("Couldn't start the quiz."));
  }, [quiz]);

  const qIndex = quiz?.queue[0];
  const q = quiz && qIndex !== undefined ? quiz.questions[qIndex] : null;

  // Play the word for listening questions.
  useEffect(() => {
    if (q?.type === "audio" && canListen && !feedback) speak(q.word, settings.audioRate);
  }, [q, qIndex, feedback, settings.audioRate, canListen]);

  const answer = useCallback(
    async (choice: string) => {
      if (!quiz || qIndex === undefined || feedback || busy) return;
      setBusy(true);
      try {
        const res = await fetch("/api/session/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "answer", question: qIndex, choice }),
        });
        const d = (await res.json()) as { quiz: QuizState; correct: boolean; error?: string };
        if (!res.ok) throw new Error(d.error ?? "Couldn't save");
        // Keep the old question on screen until the learner moves on.
        setFeedback({ choice, correct: d.correct, next: d.quiz });
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [quiz, qIndex, feedback, busy],
  );

  const advance = useCallback(() => {
    if (!feedback) return;
    setQuiz(feedback.next);
    setFeedback(null);
  }, [feedback]);

  // Correct answers move on by themselves after a moment.
  useEffect(() => {
    if (!feedback?.correct) return;
    const t = setTimeout(advance, 900);
    return () => clearTimeout(t);
  }, [feedback, advance]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q) return;
      if (feedback && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        advance();
      } else if (!feedback && ["1", "2", "3", "4"].includes(e.key)) {
        const opt = q.options[Number(e.key) - 1];
        if (opt) answer(opt);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, feedback, advance, answer]);

  if (none) {
    return (
      <div>
        <StepHeader step={3} title="Quick check" />
        <Card className="space-y-4 text-center">
          <p className="text-xl font-medium">No words to check today.</p>
          <ButtonLink href="/session/chat">Next: conversation</ButtonLink>
        </Card>
      </div>
    );
  }
  if (!quiz) {
    return (
      <div>
        <StepHeader step={3} title="Quick check" />
        <Card>{error ? <p className="text-danger">{error}</p> : <p className="text-muted">Preparing your quiz…</p>}</Card>
      </div>
    );
  }

  const score = quizScore(quiz);
  if (!q) {
    return (
      <div>
        <StepHeader step={3} title="Quick check" done={score.total} total={score.total} />
        <Card className="space-y-4 text-center">
          <p className="text-4xl font-semibold">
            {score.correct} / {score.total}
          </p>
          <p className="text-muted">right on the first try</p>
          {score.wrongWords.length ? (
            <div className="space-y-2">
              <p className="text-sm">These will come back in tomorrow&apos;s review:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {score.wrongWords.map((w) => (
                  <span key={w} className="rounded-xl bg-surface-2 px-3 py-2">
                    <HanziWord token={{ syllables: syllablesFromNum(w, quiz.words[w].pinyinNum) }} className="text-2xl" />{" "}
                    <span className="text-sm text-muted">{quiz.words[w].meaning}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-ok">Perfect!</p>
          )}
          <ButtonLink href="/session/chat">Next: conversation</ButtonLink>
        </Card>
      </div>
    );
  }

  const target = quiz.words[q.word];
  const answered = quiz.questions.length - new Set(quiz.queue).size;
  const isRepeat = quiz.attempts.some((a) => a.question === qIndex);
  return (
    <div>
      <StepHeader step={3} title="Quick check" done={answered} total={quiz.questions.length} />
      <Card className="space-y-6">
        <div className="text-xs text-muted">
          {q.type === "meaning"
            ? "What does this mean?"
            : q.type === "audio"
              ? canListen
                ? "Which word do you hear?"
                : "Which word is this?"
              : "Which word means this?"}
          {isRepeat ? " · second try" : ""}
        </div>
        <div className="flex min-h-28 items-center justify-center text-center">
          {q.type === "meaning" ? (
            <span className="zh text-6xl" lang="zh-CN">
              {q.word}
            </span>
          ) : q.type === "audio" && !voices.ready ? (
            <span className="h-24 w-24 animate-pulse rounded-full bg-surface-2" aria-busy="true" />
          ) : q.type === "audio" && !canListen ? (
            <div className="space-y-2">
              <TonePinyin num={target.pinyinNum} className="text-4xl font-medium" />
              <p className="text-xs text-muted">
                {silent ? "Silent mode: read the pinyin instead of listening." : "No Chinese voice on this device: read the pinyin instead."}
              </p>
            </div>
          ) : q.type === "audio" ? (
            <button
              type="button"
              onClick={() => speak(q.word, settings.audioRate)}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-accent text-accent-text shadow-sm"
              aria-label="Play the word again"
            >
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
              </svg>
            </button>
          ) : (
            <span className="text-2xl font-medium">{target.meaning}</span>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((o, i) => {
            const w = quiz.words[o];
            const isAnswer = o === q.word;
            const chosen = feedback?.choice === o;
            const state = feedback ? (isAnswer ? "border-ok bg-ok-soft" : chosen ? "border-danger bg-danger-soft" : "opacity-60") : "hover:bg-surface-2";
            return (
              <button
                key={o}
                type="button"
                disabled={!!feedback || busy}
                onClick={() => answer(o)}
                className={`flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition ${state}`}
              >
                <Kbd>{i + 1}</Kbd>
                {q.type === "meaning" ? (
                  <span>{w.meaning}</span>
                ) : (
                  <span className="zh text-2xl" lang="zh-CN">
                    {o}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {feedback ? (
          <div className={`animate-fade-in rounded-xl p-4 ${feedback.correct ? "bg-ok-soft" : "bg-danger-soft"}`}>
            <p className={`font-medium ${feedback.correct ? "text-ok" : "text-danger"}`}>{feedback.correct ? "Correct!" : "Not quite."}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <HanziWord token={{ syllables: syllablesFromNum(target.simplified, target.pinyinNum) }} className="text-3xl" />
              <TonePinyin num={target.pinyinNum} className="text-lg" />
              <span>{target.meaning}</span>
            </div>
            {!feedback.correct ? <p className="mt-1 text-sm">You&apos;ll see this one again at the end.</p> : null}
          </div>
        ) : null}
      </Card>
      {feedback && !feedback.correct ? (
        <StickyActions>
          <Button className="w-full py-3.5 text-base" onClick={advance}>
            Next <Kbd>Enter</Kbd>
          </Button>
        </StickyActions>
      ) : null}
      {error ? <p className="mt-2 text-center text-sm text-danger">{error}</p> : null}
    </div>
  );
}
