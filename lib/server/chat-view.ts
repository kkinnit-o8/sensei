/** Everything the chat screen needs, with Chinese text pre-tokenized. */
import "server-only";
import { awaitingReply, exchangeCount, getConversation, messagesOf, type MessageRow } from "./chat";
import { tokenizeText } from "./lexicon";
import { learnedWords } from "./learned";
import { isQueued } from "./queue";
import { bankWord, customWords } from "./words";
import { lookup } from "./dict";
import { wordsLearnedOn } from "./session";
import { shortGloss } from "@/lib/wordbank/gloss";
import { isReferenceDefinition } from "@/lib/cedict";
import { unlearnedWords, wordPinyin } from "@/lib/zh/render";
import { pinyinKey, stripTones } from "@/lib/zh/pinyin";
import type { Token } from "@/lib/zh/types";

export interface ChatMessageView {
  id: number;
  role: "teacher" | "user";
  text: string;
  tokens: Token[];
  translation: string | null;
  hint: string | null;
  hintTokens: Token[] | null;
  correction: { explanation: string; corrected: string; correctedTokens: Token[] | null } | null;
  /** The teacher's reply couldn't be parsed; `text` is the raw model output. */
  raw: boolean;
}

export interface ChatWord {
  simplified: string;
  pinyin: string;
  meaning: string;
  inBank: boolean;
  queued: boolean;
  /** Has a dictionary entry, so it can be queued. */
  learnable: boolean;
}

export interface ChatView {
  id: number;
  studyDay: string;
  topic: string;
  model: string;
  isDaily: boolean;
  target: number;
  exchanges: number;
  cost: number;
  awaitingReply: boolean;
  messages: ChatMessageView[];
  wordsFromChat: ChatWord[];
}

export function meaningOf(word: string): { meaning: string; inBank: boolean; learnable: boolean } {
  const b = bankWord(word);
  if (b) return { meaning: b.meaning, inBank: true, learnable: true };
  const c = customWords().find((x) => x.simplified === word);
  if (c) return { meaning: c.meaning, inBank: false, learnable: true };
  const e = lookup(word).find((x) => x.definitions.some((d) => !isReferenceDefinition(d))) ?? lookup(word)[0];
  return e ? { meaning: shortGloss(e.definitions), inBank: false, learnable: true } : { meaning: "", inBank: false, learnable: false };
}

function messageView(m: MessageRow): ChatMessageView {
  const correction = m.correction ? (JSON.parse(m.correction) as { explanation: string; corrected: string }) : null;
  return {
    id: m.id,
    role: m.role,
    text: m.text,
    tokens: tokenizeText(m.text),
    translation: m.translation,
    hint: m.hint,
    hintTokens: m.hint ? tokenizeText(m.hint) : null,
    correction: correction
      ? { ...correction, correctedTokens: correction.corrected ? tokenizeText(correction.corrected) : null }
      : null,
    raw: !!m.raw,
  };
}

export function chatView(id: number): ChatView | null {
  const conv = getConversation(id);
  if (!conv) return null;
  const msgs = messagesOf(id);
  const views = msgs.map(messageView);
  const learned = new Set(learnedWords());

  // Unlearned words the teacher used (shown in pinyin), newest first.
  const seen = new Set<string>();
  const words: ChatWord[] = [];
  for (const v of [...views].reverse()) {
    if (v.role !== "teacher" || v.raw) continue;
    for (const t of unlearnedWords(v.tokens, learned)) {
      if (seen.has(t.text)) continue;
      seen.add(t.text);
      const info = meaningOf(t.text);
      words.push({ simplified: t.text, pinyin: wordPinyin(t), meaning: info.meaning, inBank: info.inBank, queued: isQueued(t.text), learnable: info.learnable });
    }
  }

  return {
    id: conv.id,
    studyDay: conv.study_day,
    topic: conv.topic,
    model: conv.model,
    isDaily: !!conv.is_daily,
    target: conv.target_exchanges,
    exchanges: exchangeCount(msgs),
    cost: conv.cost,
    awaitingReply: awaitingReply(msgs),
    messages: views,
    wordsFromChat: words,
  };
}

/**
 * Did the student use a word? Matches characters, or pinyin with or without tone numbers
 * ("jintian", "jin1tian1", "jin1 tian1").
 */
export function studentUsed(word: string, pinyinNum: string, text: string): boolean {
  if (text.includes(word)) return true;
  const target = pinyinKey(pinyinNum);
  if (!target) return false;
  const parts = stripTones(text)
    .split(/[^a-zü]+/)
    .filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    let joined = "";
    for (let j = i; j < Math.min(parts.length, i + 4); j++) {
      joined += parts[j];
      if (joined === target) return true;
      if (joined.length >= target.length) break;
    }
  }
  return false;
}

/** For the summary: which of today's words the teacher and the student used. */
export function todaysWordUsage(convId: number | null, day: string) {
  const today = wordsLearnedOn(day);
  const msgs = convId ? messagesOf(convId) : [];
  const teacherText = msgs.filter((m) => m.role === "teacher").map((m) => m.text).join("\n");
  const userTexts = msgs.filter((m) => m.role === "user").map((m) => m.text);
  return today.map((w) => {
    const b = bankWord(w) ?? customWords().find((c) => c.simplified === w);
    const pinyinNum = b?.pinyinNum ?? "";
    return {
      word: w,
      meaning: b?.meaning ?? "",
      pinyinNum,
      teacher: teacherText.includes(w),
      student: userTexts.some((t) => studentUsed(w, pinyinNum, t)),
    };
  });
}
