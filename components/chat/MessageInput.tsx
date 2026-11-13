"use client";

import { useState } from "react";
import { Button } from "../ui";
import type { SpeechInput } from "@/lib/client/listen";

/**
 * The text box used by the chat and the game: type characters or pinyin, or speak with the
 * microphone. Enter sends (but not while a Chinese input method is composing).
 */
export function MessageInput({
  text,
  setText,
  onSend,
  disabled,
  mic,
  placeholder = "Reply in characters or pinyin (wo3 xi3huan1 cha2)…",
}: {
  text: string;
  setText: (t: string) => void;
  onSend: () => void;
  disabled: boolean;
  mic: SpeechInput;
  placeholder?: string;
}) {
  const [micNote, setMicNote] = useState<string | null>(null);

  function toggleMic() {
    if (mic.availability === "insecure") {
      setMicNote(
        "The browser only lets the app use the microphone on the computer it runs on (http://localhost). On your phone, tap the microphone key on your keyboard (with a Chinese keyboard added) to dictate instead.",
      );
      return;
    }
    if (mic.listening) mic.stop();
    else mic.start();
  }

  return (
    <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-2 rounded-3xl bg-bg/95 p-2 backdrop-blur md:bottom-3">
      {mic.listening ? (
        <div className="mb-2 flex items-center gap-2 rounded-2xl bg-danger-soft px-3 py-2 text-sm" role="status">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-danger" aria-hidden />
          <span className="text-danger">Listening… say it in Chinese</span>
          {mic.interim ? (
            <span className="zh truncate text-lg" lang="zh-CN">
              {mic.interim}
            </span>
          ) : null}
        </div>
      ) : null}
      {mic.error || micNote ? (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-2xl bg-warn-soft px-3 py-2 text-sm">
          <span>{mic.error ?? micNote}</span>
          <button
            type="button"
            className="shrink-0 text-muted"
            aria-label="Dismiss"
            onClick={() => {
              mic.clearError();
              setMicNote(null);
            }}
          >
            ×
          </button>
        </div>
      ) : null}
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 focus-within:border-accent">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          maxLength={500}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Your message"
          className="zh max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-lg outline-none [field-sizing:content] placeholder:font-sans placeholder:text-sm"
        />
        {mic.availability === "ok" || mic.availability === "insecure" ? (
          <button
            type="button"
            onClick={toggleMic}
            disabled={disabled}
            aria-pressed={mic.listening}
            aria-label={mic.listening ? "Stop listening" : "Speak instead of typing"}
            title={mic.listening ? "Stop listening" : "Speak instead of typing"}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
              mic.listening ? "animate-pulse border-danger bg-danger text-white" : "border-border text-accent hover:bg-accent-soft"
            } ${mic.availability === "insecure" ? "opacity-60" : ""}`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
        ) : null}
        <Button onClick={onSend} disabled={!text.trim() || disabled} className="h-11 shrink-0">
          Send
        </Button>
      </div>
    </div>
  );
}
