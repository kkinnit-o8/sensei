"use client";

import { useEffect, useRef, useState } from "react";
import type HanziWriterType from "hanzi-writer";

type Writer = InstanceType<typeof HanziWriterType>;

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

type CharDataLoader = NonNullable<Parameters<typeof HanziWriterType.create>[2]>["charDataLoader"];

const loadChar: CharDataLoader = (char, onLoad, onError) => {
  fetch(`/api/strokes/${encodeURIComponent(char)}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then(onLoad)
    .catch(onError);
};

/**
 * Stroke-order animation for each character of a word (Hanzi Writer, local data).
 * With `practice`, each character becomes a "write it" quiz.
 */
export function StrokeOrder({ text, size = 120, practice = false }: { text: string; size?: number; practice?: boolean }) {
  const chars = Array.from(text).filter((c) => /\p{Script=Han}/u.test(c));
  return (
    <div className="flex flex-wrap gap-3">
      {chars.map((c, i) => (
        <OneChar key={`${c}-${i}-${practice}`} char={c} size={size} practice={practice} />
      ))}
    </div>
  );
}

function OneChar({ char, size, practice }: { char: string; size: number; practice: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const writer = useRef<Writer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "done">("loading");
  const [mistakes, setMistakes] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const el = ref.current;
    if (!el) return;
    import("hanzi-writer").then(({ default: HanziWriter }) => {
      if (cancelled) return;
      el.innerHTML = "";
      const w = HanziWriter.create(el, char, {
        width: size,
        height: size,
        padding: 6,
        showOutline: true,
        showCharacter: !practice,
        strokeColor: cssVar("--text", "#1f2328"),
        radicalColor: cssVar("--accent", "#2f6f6a"),
        outlineColor: cssVar("--border", "#e4e1da"),
        drawingColor: cssVar("--accent", "#2f6f6a"),
        highlightColor: cssVar("--tone-4", "#2563c9"),
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 180,
        charDataLoader: loadChar,
        onLoadCharDataSuccess: () => !cancelled && setStatus("ready"),
        onLoadCharDataError: () => !cancelled && setStatus("missing"),
      });
      writer.current = w;
      if (practice) {
        w.quiz({
          showHintAfterMisses: 2,
          onMistake: () => setMistakes((m) => m + 1),
          onComplete: () => setStatus("done"),
        });
      } else {
        w.animateCharacter();
      }
    });
    return () => {
      cancelled = true;
      writer.current = null;
    };
  }, [char, size, practice]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={ref}
        className="rounded-xl border border-border bg-surface"
        style={{
          width: size,
          height: size,
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: `${size / 2}px ${size / 2}px`,
          backgroundPosition: `${size / 4}px ${size / 4}px`,
        }}
        aria-label={`Stroke order for ${char}`}
        role="img"
      />
      {status === "missing" ? (
        <span className="text-xs text-muted">No stroke data</span>
      ) : practice ? (
        <span className="text-xs text-muted">{status === "done" ? `Done · ${mistakes} mistake${mistakes === 1 ? "" : "s"}` : "Draw each stroke"}</span>
      ) : (
        <button type="button" className="text-xs text-accent underline" onClick={() => writer.current?.animateCharacter()} disabled={status !== "ready"}>
          Replay
        </button>
      )}
    </div>
  );
}
