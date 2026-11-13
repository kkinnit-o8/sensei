"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import { speak, useChineseVoices } from "@/lib/client/speech";
import { useSilent } from "@/lib/client/modes";

/** Plays Chinese text with the browser's zh-CN voice. Hidden in silent mode. */
export function AudioButton({ text, label = "Play audio", size = "md", className = "" }: { text: string; label?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const { settings } = useApp();
  const { voices, ready, supported } = useChineseVoices();
  const [warn, setWarn] = useState(false);
  const [silent] = useSilent();
  if (silent) return null;
  const missing = ready && (!supported || voices.length === 0);
  const dims = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => {
          if (missing) setWarn((w) => !w);
          else speak(text, settings.audioRate);
        }}
        className={`${dims} inline-flex items-center justify-center rounded-full border border-border bg-surface text-accent transition-colors hover:bg-accent-soft ${className}`}
      >
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
        </svg>
      </button>
      {warn && missing ? (
        <span className="absolute top-full left-0 z-50 mt-2 w-64 rounded-xl border border-border bg-surface p-3 text-left text-sm shadow-lg" role="status">
          No Chinese voice is installed in this browser.{" "}
          <Link href="/settings#audio" className="text-accent underline">
            How to add one
          </Link>
        </span>
      ) : null}
    </span>
  );
}
