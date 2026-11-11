"use client";

import { useCallback, useEffect, useState } from "react";
import { AudioButton } from "@/components/AudioButton";
import { CardWord, WordDetails } from "@/components/WordCard";
import { Button, ButtonLink, Card, Kbd, StepHeader, StickyActions } from "@/components/ui";
import { formatInterval, RATING_LABELS, type Rating } from "@/lib/srs";
import type { ReviewCard } from "@/lib/server/review-view";

type View = { queue: ReviewCard[]; done: number; total: number };

const RATING_STYLE: Record<Rating, string> = {
  1: "bg-danger-soft text-danger",
  2: "bg-warn-soft text-warn",
  3: "bg-ok-soft text-ok",
  4: "bg-accent-soft text-accent",
};

export function ReviewStep({ initial }: { initial: View }) {
  const [view, setView] = useState(initial);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const card = view.queue[0];

  const rate = useCallback(
    async (rating: Rating) => {
      if (!card || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/session/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word: card.simplified, rating }),
        });
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save");
        setView(await res.json());
        setRevealed(false);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [card, busy],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        rate(Number(e.key) as Rating);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, rate]);

  if (!card) {
    return (
      <div>
        <StepHeader step={1} title="Review" done={view.total} total={view.total} />
        <Card className="space-y-4 text-center">
          <p className="text-xl font-medium">{view.total === 0 ? "Nothing to review today." : "Review done!"}</p>
          <p className="text-muted">
            {view.total === 0 ? "No words are due. On to new words." : `You reviewed ${view.total} word${view.total === 1 ? "" : "s"}.`}
          </p>
          <ButtonLink href="/session/learn">Next: learn new words</ButtonLink>
        </Card>
      </div>
    );
  }

  const repeat = card.intervals === null;
  return (
    <div>
      <StepHeader step={1} title="Review" done={view.done} total={view.total} />
      <Card className="space-y-6">
        <div className="flex items-start justify-between">
          <span className="text-xs text-muted">{repeat ? "Once more (you pressed Again)" : "Do you remember this word?"}</span>
          <AudioButton text={card.simplified} />
        </div>
        <div className="text-center">
          <CardWord card={card} colored={revealed} />
        </div>
        {revealed ? (
          <div className="animate-fade-in">
            <WordDetails card={card} />
          </div>
        ) : null}
      </Card>

      <StickyActions>
        {!revealed ? (
          <Button className="w-full py-3.5 text-base" onClick={() => setRevealed(true)}>
            Show answer <Kbd>Space</Kbd>
          </Button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as Rating[]).map((r) => (
              <button
                key={r}
                type="button"
                disabled={busy}
                onClick={() => rate(r)}
                className={`flex flex-col items-center rounded-2xl px-2 py-3 text-sm font-medium transition hover:opacity-90 disabled:opacity-50 ${RATING_STYLE[r]}`}
              >
                <span>{RATING_LABELS[r]}</span>
                <span className="text-xs opacity-80">
                  {card.intervals ? formatInterval(card.intervals[r]) : r === 1 ? "again" : "ok"} <Kbd>{r}</Kbd>
                </span>
              </button>
            ))}
          </div>
        )}
        {error ? <p className="mt-2 text-center text-sm text-danger">{error}</p> : null}
      </StickyActions>
    </div>
  );
}
