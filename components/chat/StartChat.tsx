"use client";

import { useState } from "react";
import { Button, Card } from "../ui";
import { Conversation, type ChatError } from "./Conversation";
import { TOPICS } from "@/lib/teacher/prompt";
import type { ChatView } from "@/lib/server/chat-view";

/** Choose a topic (or let the teacher pick) and start today's conversation. */
export function StartChat({ exchanges }: { exchanges: number }) {
  const [topic, setTopic] = useState<string>("");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState<{ view: ChatView; error: ChatError } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: custom.trim() || topic || undefined }),
      });
      const d = (await res.json()) as { view: ChatView | null; error: ChatError };
      if (!d.view) throw new Error(d.error?.message ?? "Couldn't start the chat");
      setStarted({ view: d.view, error: d.error });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (started) return <Conversation initial={started.view} initialError={started.error} speakOpening />;

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Chat with your teacher</h2>
        <p className="text-sm text-muted">
          {exchanges} exchanges (your message + the teacher&apos;s reply). Words you know appear in characters, others in pinyin: tap any
          word to look it up. You can type characters or pinyin.
        </p>
      </div>
      <div>
        <div className="mb-2 text-sm font-medium">Topic</div>
        <div className="flex flex-wrap gap-2">
          <TopicChip active={!topic && !custom} onClick={() => { setTopic(""); setCustom(""); }}>
            Surprise me
          </TopicChip>
          {TOPICS.map((t) => (
            <TopicChip key={t} active={topic === t && !custom} onClick={() => { setTopic(t); setCustom(""); }}>
              {t}
            </TopicChip>
          ))}
        </div>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          maxLength={80}
          placeholder="…or type your own topic"
          className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>
      <Button onClick={start} disabled={busy} className="w-full py-3 text-base">
        {busy ? "Your teacher is writing…" : "Start the conversation"}
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </Card>
  );
}

function TopicChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${active ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-surface-2"}`}
    >
      {children}
    </button>
  );
}
