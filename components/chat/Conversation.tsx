"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AudioButton } from "../AudioButton";
import { ZhText } from "../ZhText";
import { Button, ButtonLink, Card } from "../ui";
import type { ChatMessageView, ChatView, ChatWord } from "@/lib/server/chat-view";

export type ChatError = { kind: string; message: string } | null;

const ERROR_HELP: Record<string, string> = {
  no_key: "Add OPENROUTER_API_KEY=… to the file .env.local in the app folder, then restart the app (npm run dev).",
  auth: "Check that the key in .env.local is correct and still active on openrouter.ai.",
  credits: "Add credits on openrouter.ai, then retry.",
  network: "Check your internet connection. Everything else in the app works offline.",
  model: "Check the model ID in Settings.",
};

export function Conversation({
  initial,
  initialError = null,
  readOnly = false,
}: {
  initial: ChatView;
  initialError?: ChatError;
  readOnly?: boolean;
}) {
  const [view, setView] = useState(initial);
  const [error, setError] = useState<ChatError>(initialError);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [keepChatting, setKeepChatting] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [view.messages.length, sending]);

  async function call(url: string, body?: unknown) {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = (await res.json()) as { view?: ChatView; error?: ChatError };
      if (d.view) setView(d.view);
      setError(d.error ?? (res.ok ? null : { kind: "server", message: "Something went wrong." }));
      return res.ok && !d.error;
    } catch {
      setError({ kind: "network", message: "Couldn't reach the app's server." });
      return false;
    } finally {
      setSending(false);
    }
  }

  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setText("");
    const ok = await call(`/api/chat/${view.id}/messages`, { text: t });
    if (!ok && !view.awaitingReply) setText(t);
  }

  const reachedTarget = view.isDaily && view.exchanges >= view.target;
  const showInput = !readOnly && (!reachedTarget || keepChatting || !view.isDaily);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">Topic: {view.topic}</span>
          <span>
            {Math.min(view.exchanges, view.target)} / {view.target} exchanges
            {view.exchanges > view.target ? ` (+${view.exchanges - view.target})` : ""}
          </span>
          {view.cost > 0 ? <span title={`Model: ${view.model}`}>≈ ${view.cost < 0.01 ? view.cost.toFixed(4) : view.cost.toFixed(3)}</span> : null}
        </div>

        <ul className="space-y-4" aria-live="polite">
          {view.messages.map((m) => (
            <li key={m.id}>{m.role === "teacher" ? <TeacherMessage m={m} /> : <UserMessage m={m} />}</li>
          ))}
          {sending ? (
            <li className="flex items-center gap-2 text-sm text-muted">
              <span className="inline-flex gap-1" aria-hidden>
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
              </span>
              Your teacher is writing…
            </li>
          ) : null}
        </ul>

        {error && !sending ? (
          <div className="rounded-2xl border border-danger bg-danger-soft p-4 text-sm" role="alert">
            <p className="font-medium text-danger">{error.message}</p>
            {ERROR_HELP[error.kind] ? <p className="mt-1">{ERROR_HELP[error.kind]}</p> : null}
            {!readOnly && view.awaitingReply ? (
              <Button variant="secondary" className="mt-3" onClick={() => call(`/api/chat/${view.id}/retry`)}>
                Retry
              </Button>
            ) : null}
          </div>
        ) : null}

        {!readOnly && reachedTarget && !keepChatting ? (
          <Card className="space-y-3 border-ok bg-ok-soft">
            <p className="font-medium text-ok">
              That&apos;s today&apos;s {view.target} exchanges. 很好！
            </p>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/session/summary">See today&apos;s summary</ButtonLink>
              <Button variant="secondary" onClick={() => setKeepChatting(true)}>
                Keep chatting
              </Button>
            </div>
          </Card>
        ) : null}

        {showInput ? (
          <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-2 rounded-3xl bg-bg/95 p-2 backdrop-blur md:bottom-3">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 focus-within:border-accent">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  // Don't send while a Chinese input method is still composing.
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                maxLength={1000}
                disabled={sending || view.awaitingReply}
                placeholder="Reply in characters or pinyin (wo3 xi3huan1 cha2)…"
                aria-label="Your message"
                className="zh max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-lg outline-none [field-sizing:content] placeholder:font-sans placeholder:text-sm"
              />
              <Button onClick={send} disabled={!text.trim() || sending || view.awaitingReply} className="h-11 shrink-0">
                Send
              </Button>
            </div>
          </div>
        ) : null}
        <div ref={bottom} />
      </div>

      <aside className="space-y-2 lg:sticky lg:top-20 lg:self-start">
        <WordsFromChat words={view.wordsFromChat} onQueued={(w) => setView((v) => ({ ...v, wordsFromChat: v.wordsFromChat.map((x) => (x.simplified === w ? { ...x, queued: true } : x)) }))} />
      </aside>
    </div>
  );
}

function TeacherMessage({ m }: { m: ChatMessageView }) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [showHint, setShowHint] = useState(false);
  if (m.raw) {
    return (
      <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-warn bg-warn-soft p-4 text-sm">
        <p className="mb-1 font-medium text-warn">The teacher&apos;s reply couldn&apos;t be read properly. Here is what it said:</p>
        <p className="whitespace-pre-wrap break-words">{m.text}</p>
      </div>
    );
  }
  return (
    <div className="max-w-[92%] space-y-2">
      <div className="rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3">
        <ZhText text={m.text} tokens={m.tokens} size="lg" />
        {showTranslation && m.translation ? <p className="mt-1 text-sm text-muted">{m.translation}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {m.translation ? (
          <button type="button" onClick={() => setShowTranslation((s) => !s)} className="rounded-full border border-border px-3 py-1.5 hover:bg-surface-2" aria-pressed={showTranslation}>
            {showTranslation ? "Hide translation" : "Translate"}
          </button>
        ) : null}
        <AudioButton text={m.text} size="sm" label="Play audio" />
        {m.hint ? (
          <button type="button" onClick={() => setShowHint((s) => !s)} className="rounded-full border border-border px-3 py-1.5 hover:bg-surface-2" aria-pressed={showHint}>
            {showHint ? "Hide hint" : "Hint"}
          </button>
        ) : null}
      </div>
      {showHint && m.hint ? (
        <div className="animate-fade-in flex items-start justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
          <div>
            <div className="text-xs text-muted">You could say:</div>
            <ZhText text={m.hint} tokens={m.hintTokens ?? undefined} size="md" />
          </div>
          <AudioButton text={m.hint} size="sm" label="Play hint" />
        </div>
      ) : null}
    </div>
  );
}

function UserMessage({ m }: { m: ChatMessageView }) {
  return (
    <div className="ml-auto max-w-[92%] space-y-2">
      <div className="ml-auto w-fit rounded-2xl rounded-tr-sm bg-accent-soft px-4 py-3">
        <ZhText text={m.text} tokens={m.tokens} size="lg" />
      </div>
      {m.correction ? (
        <div className="animate-fade-in rounded-xl border border-warn bg-warn-soft px-3 py-2 text-sm">
          <div className="font-medium text-warn">✎ Correction</div>
          {m.correction.explanation ? <p className="mt-0.5">{m.correction.explanation}</p> : null}
          {m.correction.corrected ? (
            <div className="mt-1 flex items-start justify-between gap-2">
              <ZhText text={m.correction.corrected} tokens={m.correction.correctedTokens ?? undefined} size="md" />
              <AudioButton text={m.correction.corrected} size="sm" label="Play corrected sentence" />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function WordsFromChat({ words, onQueued }: { words: ChatWord[]; onQueued: (w: string) => void }) {
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
    <details className="group rounded-2xl border border-border bg-surface p-4" open>
      <summary className="cursor-pointer list-none text-sm font-medium">
        Words from chat <span className="text-muted">({words.length})</span>
      </summary>
      <p className="mt-1 text-xs text-muted">New words the teacher used. Add one to put it first in tomorrow&apos;s new words.</p>
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
          Tap a word in the chat for its meaning, or see <Link className="underline" href="/words">all words</Link>.
        </p>
      ) : null}
    </details>
  );
}
