"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink, Card } from "@/components/ui";
import { HanziWord, TonePinyin, ZhText, syllablesFromNum } from "@/components/ZhText";
import type { DaySummary } from "@/lib/server/summary";

export function SummaryView({ initial }: { initial: DaySummary }) {
  const [s, setS] = useState(initial);
  const [queued, setQueued] = useState<Set<string>>(() => new Set(initial.wordsFromChat.filter((w) => w.queued).map((w) => w.simplified)));

  // Opening the summary finishes the day once every other step is done.
  useEffect(() => {
    if (!initial.ready || initial.completed) return;
    fetch("/api/session/summary", { method: "POST" })
      .then((r) => r.json())
      .then(setS)
      .catch(() => {});
  }, [initial.ready, initial.completed]);

  async function queue(w: string) {
    const res = await fetch("/api/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: w }) });
    if (res.ok) setQueued((q) => new Set(q).add(w));
  }

  return (
    <div className="space-y-5">
      {s.completed ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-ok bg-ok-soft">
          <div>
            <p className="text-xl font-semibold text-ok">Day complete! 今天的学习完成了。</p>
            <p className="text-sm">Come back tomorrow to keep your streak going.</p>
          </div>
          <StreakBadge n={s.streak.current} />
        </Card>
      ) : !s.ready ? (
        <Card className="border-warn bg-warn-soft">
          <p className="font-medium text-warn">Not finished yet</p>
          <p className="text-sm">
            Finish the earlier steps to complete today. <Link href="/" className="underline">Back to today</Link>
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="new words" value={String(s.learned.length)} />
        <Stat label="reviews" value={String(s.reviews.total)} sub={s.reviews.again ? `${s.reviews.again} forgotten` : undefined} />
        <Stat label="quick check" value={s.quiz ? `${s.quiz.correct}/${s.quiz.total}` : "–"} sub="right first time" />
      </div>

      {s.learned.length ? (
        <Card>
          <h2 className="mb-3 font-semibold">Words learned today</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {s.learned.map((w) => (
              <li key={w.word} className="flex items-baseline gap-3">
                <HanziWord token={{ syllables: syllablesFromNum(w.word, w.pinyinNum) }} className="text-2xl" />
                <TonePinyin num={w.pinyinNum} />
                <span className="truncate text-sm text-muted">{w.meaning}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {s.usage.length && s.conversation ? (
        <Card>
          <h2 className="mb-1 font-semibold">Today&apos;s words in the conversation</h2>
          <p className="mb-3 text-sm text-muted">Which of today&apos;s new words your teacher and you actually used.</p>
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-1 font-normal">Word</th>
                <th className="py-1 text-center font-normal">Teacher</th>
                <th className="py-1 text-center font-normal">You</th>
              </tr>
            </thead>
            <tbody>
              {s.usage.map((u) => (
                <tr key={u.word} className="border-t border-border">
                  <td className="py-1.5">
                    <span className="zh text-lg">{u.word}</span> <span className="text-muted">{u.meaning}</span>
                  </td>
                  <td className="text-center">{u.teacher ? <span className="text-ok">✓</span> : <span className="text-muted">–</span>}</td>
                  <td className="text-center">{u.student ? <span className="text-ok">✓</span> : <span className="text-muted">–</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-3 font-semibold">Teacher&apos;s corrections</h2>
        {s.corrections.length === 0 ? (
          <p className="text-sm text-muted">{s.conversation ? "No corrections today. 很好！" : "No conversation yet today."}</p>
        ) : (
          <ul className="space-y-3">
            {s.corrections.map((c, i) => (
              <li key={i} className="rounded-xl bg-surface-2 p-3 text-sm">
                <div className="text-muted line-through decoration-danger/60">
                  <ZhText text={c.original} size="sm" />
                </div>
                {c.corrected ? (
                  <div className="mt-1">
                    <ZhText text={c.corrected} size="md" />
                  </div>
                ) : null}
                <p className="mt-1">{c.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {s.wordsFromChat.length ? (
        <Card>
          <h2 className="mb-1 font-semibold">New words seen in the chat</h2>
          <p className="mb-3 text-sm text-muted">Add any to learn them first tomorrow.</p>
          <ul className="space-y-2">
            {s.wordsFromChat.map((w) => (
              <li key={w.simplified} className="flex items-center gap-3">
                <span className="zh text-lg">{w.simplified}</span>
                <span className="text-sm text-pinyin">{w.pinyin}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted">{w.meaning}</span>
                {queued.has(w.simplified) ? (
                  <span className="text-xs text-ok">Queued ✓</span>
                ) : w.learnable ? (
                  <button type="button" onClick={() => queue(w.simplified)} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent">
                    Learn tomorrow
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>
          {s.conversation ? `Conversation: ${s.conversation.exchanges} exchanges about ${s.conversation.topic}` : ""}
          {s.conversation && s.conversation.cost > 0 ? ` · cost ≈ $${s.conversation.cost.toFixed(4)}` : ""}
        </span>
        <span>
          Streak: {s.streak.current} day{s.streak.current === 1 ? "" : "s"} · best {s.streak.longest}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/">Back to today</ButtonLink>
        {s.conversation ? (
          <ButtonLink href="/session/chat" variant="secondary">
            Keep chatting
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4 sm:p-4">
      <div className="text-3xl font-semibold">{value}</div>
      <div className="text-sm text-muted">{label}</div>
      {sub ? <div className="text-xs text-muted">{sub}</div> : null}
    </Card>
  );
}

export function StreakBadge({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-2 shadow-sm" aria-label={`${n} day streak`}>
      <span className="text-2xl" aria-hidden>
        🔥
      </span>
      <span className="text-2xl font-semibold">{n}</span>
      <span className="text-sm text-muted">day{n === 1 ? "" : "s"}</span>
    </div>
  );
}
