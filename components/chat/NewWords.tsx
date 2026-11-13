"use client";

import Link from "next/link";
import { useState } from "react";
import type { ChatWord } from "@/lib/server/chat-view";

/** New words met in a chat or game, each can be queued for tomorrow's Learn step. */
export function NewWords({
  title,
  description,
  words,
  onQueued,
  open = true,
}: {
  title: string;
  description: string;
  words: ChatWord[];
  onQueued: (word: string) => void;
  open?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function queue(w: string) {
    setBusy(w);
    setError(null);
    const res = await fetch("/api/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: w }) });
    setBusy(null);
    if (res.ok) onQueued(w);
    else setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't add it.");
  }
  return (
    <details className="group rounded-2xl border border-border bg-surface p-4" open={open}>
      <summary className="cursor-pointer list-none text-sm font-medium">
        {title} <span className="text-muted">({words.length})</span>
      </summary>
      <p className="mt-1 text-xs text-muted">{description}</p>
      {words.length === 0 ? <p className="mt-3 text-sm text-muted">None yet.</p> : null}
      <ul className="mt-3 space-y-2">
        {words.map((w) => (
          <li key={w.simplified} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <span className="zh text-lg">{w.simplified}</span> <span className="text-sm text-pinyin">{w.pinyin}</span>
              <div className="truncate text-xs text-muted">{w.meaning || "no dictionary entry"}</div>
            </div>
            {w.queued ? (
              <span className="shrink-0 text-xs text-ok">Queued ✓</span>
            ) : w.learnable ? (
              <button type="button" disabled={busy === w.simplified} onClick={() => queue(w.simplified)} className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent disabled:opacity-50">
                Learn tomorrow
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      {words.length ? (
        <p className="mt-3 text-xs text-muted">
          Tap a word for its meaning, or see <Link className="underline" href="/words">all words</Link>.
        </p>
      ) : null}
    </details>
  );
}
