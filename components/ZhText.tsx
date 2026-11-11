"use client";

import { Fragment } from "react";
import { useApp } from "./AppProvider";
import { useWordPopup } from "./WordPopup";
import { useTokens } from "@/lib/client/tokens";
import { formatSyllable, numToMarks, parseMarked } from "@/lib/zh/pinyin";
import { renderTokens, type DisplayToken } from "@/lib/zh/render";
import type { Syllable, Token, WordToken } from "@/lib/zh/types";

const SIZES = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl leading-relaxed",
  xl: "text-3xl leading-relaxed",
} as const;

export interface ZhTextProps {
  /** Chinese text; tokenized on the server unless `tokens` are given. */
  text: string;
  tokens?: Token[];
  size?: keyof typeof SIZES;
  className?: string;
  /** Override the ruby setting (characters with pinyin above). */
  ruby?: boolean;
  /** Treat these words as learned too (e.g. the word being studied on a card). */
  alsoLearned?: string[];
  /** Words can be tapped to open the word popup (default true). */
  interactive?: boolean;
}

/**
 * Renders Chinese with the core rule: learned words in characters, other words in pinyin.
 * Every word can be tapped to open the word popup.
 */
export function ZhText({ text, tokens: given, size = "md", className = "", ruby, alsoLearned, interactive = true }: ZhTextProps) {
  const { settings, learned } = useApp();
  const { tokens, failed } = useTokens(text, given);
  const useRuby = ruby ?? settings.ruby;

  if (!tokens) {
    // Never flash the raw characters: they may include words not learned yet.
    return (
      <span className={`${SIZES[size]} ${className} inline-block min-w-16 animate-pulse rounded bg-surface-2 text-transparent`} aria-busy="true">
        {failed ? "?" : "…"}
      </span>
    );
  }

  const learnedSet = alsoLearned?.length ? new Set([...learned, ...alsoLearned]) : learned;
  const display = renderTokens(tokens, learnedSet, { ruby: useRuby });
  return (
    <span className={`zh ${SIZES[size]} ${className}`} lang="zh-CN">
      {display.map((d, i) => (
        <Fragment key={i}>
          {d.spaceBefore ? " " : null}
          <DisplayPiece d={d} ruby={useRuby} style={settings.toneStyle} interactive={interactive} />
        </Fragment>
      ))}
    </span>
  );
}

function DisplayPiece({ d, ruby, style, interactive }: { d: DisplayToken; ruby: boolean; style: "marks" | "numbers"; interactive: boolean }) {
  const popup = useWordPopup();
  if (d.mode === "other") return <>{d.token.text}</>;
  const token = d.token;
  const content =
    d.mode === "hanzi" ? (
      ruby ? (
        <RubyChars syllables={token.syllables} style={style} />
      ) : (
        <ToneChars syllables={token.syllables} />
      )
    ) : (
      <PinyinWord syllables={token.syllables} style={style} />
    );
  if (!interactive) return <span className={d.mode === "pinyin" ? "py-word" : ""}>{content}</span>;
  return (
    <button
      type="button"
      onClick={() => popup.open(token)}
      className={`cursor-pointer rounded-sm align-baseline transition-colors hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent ${
        d.mode === "pinyin" ? "py-word font-sans text-[0.8em]" : ""
      }`}
      title={d.mode === "pinyin" ? token.text : undefined}
    >
      {content}
    </button>
  );
}

export function ToneChars({ syllables }: { syllables: Syllable[] }) {
  return (
    <>
      {syllables.map((s, i) => (
        <span key={i} className={`tone-${s.tone}`}>
          {s.char}
        </span>
      ))}
    </>
  );
}

function RubyChars({ syllables, style }: { syllables: Syllable[]; style: "marks" | "numbers" }) {
  return (
    <>
      {syllables.map((s, i) => (
        <ruby key={i} className={`tone-${s.tone}`}>
          {s.char}
          <rt>{s.pinyin === "r" ? "r" : formatSyllable(s.pinyin, style)}</rt>
        </ruby>
      ))}
    </>
  );
}

export function PinyinWord({ syllables, style }: { syllables: Syllable[]; style: "marks" | "numbers" }) {
  return (
    <>
      {syllables.map((s, i) => {
        const apostrophe = i > 0 && s.pinyin !== "r" && /^[aoeāáǎàōóǒòēéěè]/.test(s.pinyin);
        return (
          <Fragment key={i}>
            {apostrophe ? "'" : ""}
            <span className={`tone-${s.tone}`}>{formatSyllable(s.pinyin, style)}</span>
          </Fragment>
        );
      })}
    </>
  );
}

/** A word's pinyin coloured by tone, from numeric pinyin like "jin1 tian1" or "yi1 dian3 r5". */
export function TonePinyin({ num, className = "" }: { num: string; className?: string }) {
  const { settings } = useApp();
  const syllables = num
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => {
      const pinyin = numToMarks(n);
      return { char: "", pinyin, tone: parseMarked(pinyin).tone };
    });
  return (
    <span className={className}>
      <PinyinWord syllables={syllables} style={settings.toneStyle} />
    </span>
  );
}

/** Syllables for a word from its characters and numeric pinyin (for HanziWord). */
export function syllablesFromNum(text: string, num: string): Syllable[] {
  const nums = num.toLowerCase().split(/\s+/).filter(Boolean);
  return Array.from(text).map((char, i) => {
    const pinyin = nums[i] ? numToMarks(nums[i]) : "";
    return { char, pinyin, tone: pinyin ? parseMarked(pinyin).tone : 5 };
  });
}

/** A single word shown big in tone-coloured characters (cards, popup, word page). */
export function HanziWord({ token, className = "" }: { token: Pick<WordToken, "syllables">; className?: string }) {
  return (
    <span className={`zh ${className}`} lang="zh-CN">
      <ToneChars syllables={token.syllables} />
    </span>
  );
}
