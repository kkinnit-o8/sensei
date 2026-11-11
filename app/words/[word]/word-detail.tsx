"use client";

import { useState } from "react";
import { AudioButton } from "@/components/AudioButton";
import { StrokeOrder } from "@/components/StrokeOrder";
import { HanziWord, TonePinyin, ZhText, syllablesFromNum } from "@/components/ZhText";
import { useApp } from "@/components/AppProvider";
import type { WordInfo } from "@/lib/server/word-info";
import type { Token } from "@/lib/zh/types";

export function WordDetail({ info, exampleTokens }: { info: WordInfo; exampleTokens?: Token[] }) {
  const { learned } = useApp();
  const [mode, setMode] = useState<"watch" | "write">("watch");
  const [queued, setQueued] = useState(info.queued);
  const [error, setError] = useState<string | null>(null);
  const isLearned = learned.has(info.simplified) || info.learned;

  async function queue() {
    const res = await fetch("/api/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: info.simplified }) });
    if (res.ok) setQueued(true);
    else setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't add the word.");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <HanziWord token={{ syllables: syllablesFromNum(info.simplified, info.pinyinNum) }} className="text-6xl leading-tight" />
            <div className="mt-2 text-xl">
              <TonePinyin num={info.pinyinNum} />
            </div>
            {info.traditional !== info.simplified ? <div className="zh mt-1 text-sm text-muted">Traditional: {info.traditional}</div> : null}
          </div>
          <AudioButton text={info.simplified} size="lg" />
        </div>
        <p className="mt-4 text-xl">{info.meaning}</p>
        {info.meanings.length > 1 ? (
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted">
            {info.meanings.slice(0, 8).map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        ) : null}
        {info.otherReadings.length ? (
          <p className="mt-3 text-sm text-muted">
            Also read:{" "}
            {info.otherReadings.map((r, i) => (
              <span key={i}>
                {i ? "; " : ""}
                <TonePinyin num={r.pinyinNum} /> {r.meaning}
              </span>
            ))}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
          {info.hsk ? <span className="rounded bg-surface-2 px-2 py-1">HSK {info.hsk}</span> : null}
          {info.rank ? <span className="rounded bg-surface-2 px-2 py-1">#{info.rank} most common</span> : null}
          {info.source === "custom" ? <span className="rounded bg-surface-2 px-2 py-1">custom word</span> : null}
          {info.source === "dictionary" ? <span className="rounded bg-surface-2 px-2 py-1">from CC-CEDICT (not in the word list)</span> : null}
          {isLearned ? (
            <span className="rounded bg-ok-soft px-2 py-1 text-ok">learned</span>
          ) : queued ? (
            <span className="rounded bg-accent-soft px-2 py-1 text-accent">in your learning queue</span>
          ) : (
            <button type="button" onClick={queue} className="rounded-full bg-accent px-3 py-1.5 text-sm text-accent-text">
              Add to my learning queue
            </button>
          )}
        </div>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </section>

      {info.example ? (
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-2 text-sm font-medium text-muted">Example</h2>
          <div className="flex items-start justify-between gap-3">
            <ZhText text={info.example.zh} tokens={exampleTokens} size="lg" alsoLearned={[info.simplified]} />
            <AudioButton text={info.example.zh} size="sm" label="Play sentence" />
          </div>
          <p className="mt-1 text-muted">{info.example.en}</p>
        </section>
      ) : null}

      {info.parts.length > 1 ? (
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-2 text-sm font-medium text-muted">Made of</h2>
          <ul className="space-y-1">
            {info.parts.map((p) => (
              <li key={p.simplified} className="flex items-baseline gap-3">
                <HanziWord token={{ syllables: syllablesFromNum(p.simplified, p.pinyinNum) }} className="text-2xl" />
                <TonePinyin num={p.pinyinNum} />
                <span className="text-muted">{p.meaning}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted">Stroke order</h2>
          <div className="flex rounded-full border border-border p-0.5 text-sm">
            {(["watch", "write"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 ${mode === m ? "bg-accent text-accent-text" : "text-muted"}`}
              >
                {m === "watch" ? "Watch" : "Write it"}
              </button>
            ))}
          </div>
        </div>
        <StrokeOrder text={info.simplified} size={mode === "write" ? 200 : 140} practice={mode === "write"} />
        {mode === "write" ? <p className="mt-2 text-sm text-muted">Draw each stroke in order with your mouse or finger. A hint appears after two misses.</p> : null}
      </section>
    </div>
  );
}
