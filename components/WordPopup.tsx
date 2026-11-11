"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AudioButton } from "./AudioButton";
import { StrokeOrder } from "./StrokeOrder";
import { HanziWord, PinyinWord, TonePinyin, ZhText, syllablesFromNum } from "./ZhText";
import { useApp } from "./AppProvider";
import type { WordToken } from "@/lib/zh/types";
import type { WordInfo } from "@/lib/server/word-info";

interface PopupCtx {
  open: (token: Pick<WordToken, "text" | "syllables">) => void;
}

const Ctx = createContext<PopupCtx>({ open: () => {} });

export function useWordPopup() {
  return useContext(Ctx);
}

/** Provides the tap-a-word popup for every ZhText below it. */
export function WordPopupProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<Pick<WordToken, "text" | "syllables"> | null>(null);
  const open = useCallback((t: Pick<WordToken, "text" | "syllables">) => setToken(t), []);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {token ? <WordPopup key={token.text} token={token} onClose={() => setToken(null)} /> : null}
    </Ctx.Provider>
  );
}

function WordPopup({ token, onClose }: { token: Pick<WordToken, "text" | "syllables">; onClose: () => void }) {
  const { settings, learned } = useApp();
  const [info, setInfo] = useState<WordInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queueState, setQueueState] = useState<"idle" | "saving" | "queued">("idle");
  const [showStrokes, setShowStrokes] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/word?w=${encodeURIComponent(token.text)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("lookup failed"))))
      .then((d: WordInfo) => alive && setInfo(d))
      .catch(() => alive && setError("Couldn't look this word up."));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      window.removeEventListener("keydown", onKey);
    };
  }, [token.text, onClose]);

  const isLearned = learned.has(token.text) || !!info?.learned;
  const queued = queueState === "queued" || !!info?.queued;

  async function addToQueue() {
    setQueueState("saving");
    const res = await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: token.text }),
    });
    if (res.ok) setQueueState("queued");
    else {
      setQueueState("idle");
      setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't add the word.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Word: ${token.text}`}
        className="animate-fade-in max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <HanziWord token={token} className="text-5xl leading-tight" />
            <div className="mt-1 text-lg">
              {/* Pinyin as read in this sentence (tone changes included). */}
              <PinyinWord syllables={token.syllables} style={settings.toneStyle} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AudioButton text={token.text} />
            <button type="button" onClick={onClose} className="h-10 w-10 rounded-full text-2xl text-muted hover:bg-surface-2" aria-label="Close">
              ×
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {!info && !error ? <div className="h-5 w-40 animate-pulse rounded bg-surface-2" /> : null}
          {info ? (
            <>
              {info.meaning ? <p className="text-lg">{info.meaning}</p> : <p className="text-muted">No dictionary entry for this word.</p>}
              {info.meanings.length > 1 ? (
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">
                  {info.meanings.slice(0, 5).map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              ) : null}
              {info.pinyinNum && info.pinyin.replace(/'/g, "") !== token.syllables.map((s) => s.pinyin).join("") ? (
                <p className="text-sm text-muted">
                  Dictionary form: <TonePinyin num={info.pinyinNum} />
                </p>
              ) : null}
              {info.otherReadings.length ? (
                <p className="text-sm text-muted">
                  Also read:{" "}
                  {info.otherReadings.map((r, i) => (
                    <span key={i}>
                      {i ? "; " : ""}
                      <TonePinyin num={r.pinyinNum} /> {r.meaning}
                    </span>
                  ))}
                </p>
              ) : null}
              {info.parts.length > 1 ? (
                <div className="rounded-xl bg-surface-2 p-3 text-sm">
                  <div className="mb-1 text-muted">Made of</div>
                  <ul className="space-y-1">
                    {info.parts.map((p) => (
                      <li key={p.simplified} className="flex items-baseline gap-2">
                        <HanziWord token={{ syllables: syllablesFromNum(p.simplified, p.pinyinNum) }} className="text-lg" />
                        <TonePinyin num={p.pinyinNum} />
                        <span className="text-muted">{p.meaning}</span>
                        {p.learned ? <span className="ml-auto text-xs text-ok">learned</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {info.example ? (
                <div className="text-sm">
                  <ZhText text={info.example.zh} size="md" interactive={false} alsoLearned={[info.simplified]} />
                  <div className="text-muted">{info.example.en}</div>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                {info.hsk ? <span className="rounded bg-surface-2 px-1.5 py-0.5">HSK {info.hsk}</span> : null}
                {info.rank ? <span className="rounded bg-surface-2 px-1.5 py-0.5">#{info.rank} most common</span> : null}
                {info.source === "dictionary" ? <span className="rounded bg-surface-2 px-1.5 py-0.5">not in the word list</span> : null}
                {info.source === "custom" ? <span className="rounded bg-surface-2 px-1.5 py-0.5">custom word</span> : null}
              </div>
            </>
          ) : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div>
            <button type="button" className="text-sm text-accent underline" onClick={() => setShowStrokes((s) => !s)}>
              {showStrokes ? "Hide stroke order" : "Show stroke order"}
            </button>
            {showStrokes ? (
              <div className="mt-2">
                <StrokeOrder text={token.text} size={96} />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {isLearned ? (
              <span className="rounded-full bg-ok-soft px-3 py-2 text-sm text-ok">You know this word</span>
            ) : queued ? (
              <span className="rounded-full bg-accent-soft px-3 py-2 text-sm text-accent">In your learning queue</span>
            ) : (
              <button
                type="button"
                onClick={addToQueue}
                disabled={queueState === "saving" || info?.source === "none"}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-text disabled:opacity-50"
              >
                Add to my learning queue
              </button>
            )}
            {info && info.source !== "none" ? (
              <Link href={`/words/${encodeURIComponent(token.text)}`} onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm">
                Word page
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
