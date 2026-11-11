"use client";

import { useEffect, useRef, useState } from "react";
import { AudioButton } from "@/components/AudioButton";
import { StrokeOrder } from "@/components/StrokeOrder";
import { CardWord, WordDetails } from "@/components/WordCard";
import { Button, ButtonLink, Card, Kbd, StepHeader, StickyActions } from "@/components/ui";
import { HanziWord, TonePinyin, syllablesFromNum } from "@/components/ZhText";
import { useApp } from "@/components/AppProvider";
import { speak } from "@/lib/client/speech";
import type { StudyCard } from "@/lib/server/study-card";

export function LearnStep({ cards, initiallyLearned }: { cards: StudyCard[]; initiallyLearned: string[] }) {
  const { settings, addLearned } = useApp();
  const [learned, setLearned] = useState(() => new Set(initiallyLearned));
  const [index, setIndex] = useState(() => {
    const i = cards.findIndex((c) => !initiallyLearned.includes(c.simplified));
    return i === -1 ? cards.length : i;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userActed = useRef(false);
  const card = cards[index];

  // Say each new word once the learner has started clicking (browsers block audio before that).
  useEffect(() => {
    if (card && userActed.current) speak(card.simplified, settings.audioRate);
  }, [card, settings.audioRate]);

  async function next() {
    if (!card || busy) return;
    userActed.current = true;
    if (learned.has(card.simplified)) {
      setIndex((i) => i + 1);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/session/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: card.simplified }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save");
      setLearned((s) => new Set(s).add(card.simplified));
      addLearned([card.simplified]);
      setIndex((i) => i + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Enter" || e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (cards.length === 0) {
    return (
      <div>
        <StepHeader step={2} title="Learn" />
        <Card className="space-y-4 text-center">
          <p className="text-xl font-medium">No new words today.</p>
          <p className="text-muted">You have learned every word in the list, or new words per day is set to 0.</p>
          <ButtonLink href="/session/quiz">Next: quick check</ButtonLink>
        </Card>
      </div>
    );
  }

  if (!card) {
    return (
      <div>
        <StepHeader step={2} title="Learn" done={cards.length} total={cards.length} />
        <Card className="space-y-5">
          <p className="text-center text-xl font-medium">You met {cards.length} new word{cards.length === 1 ? "" : "s"} today</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cards.map((c) => (
              <li key={c.simplified} className="rounded-xl bg-surface-2 p-3">
                <HanziWord token={{ syllables: syllablesFromNum(c.simplified, c.pinyinNum) }} className="text-2xl" />
                <div className="text-sm">
                  <TonePinyin num={c.pinyinNum} />
                </div>
                <div className="truncate text-xs text-muted">{c.meaning}</div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => setIndex(0)}>
              Look again
            </Button>
            <ButtonLink href="/session/quiz">Next: quick check</ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <StepHeader step={2} title="Learn" done={learned.size} total={cards.length} />
      <Card className="space-y-6">
        <div className="flex items-start justify-between">
          <span className="text-xs text-muted">
            New word {index + 1} of {cards.length}
            {card.hsk ? ` · HSK ${card.hsk}` : card.custom ? " · from your chat" : ""}
          </span>
          <AudioButton text={card.simplified} />
        </div>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
          <CardWord card={card} colored />
          <StrokeOrder key={card.simplified} text={card.simplified} size={110} />
        </div>
        <WordDetails card={card} />
      </Card>
      <StickyActions className="flex gap-2">
        <Button variant="secondary" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} aria-label="Previous word">
          ←
        </Button>
        <Button className="flex-1 py-3.5 text-base" onClick={next} disabled={busy}>
          {learned.has(card.simplified) ? "Next" : "Got it"} <Kbd>Enter</Kbd>
        </Button>
      </StickyActions>
      {error ? <p className="mt-2 text-center text-sm text-danger">{error}</p> : null}
    </div>
  );
}
