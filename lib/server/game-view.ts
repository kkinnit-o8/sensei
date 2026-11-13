/** Everything the game screen needs, with Chinese text pre-tokenized. */
import "server-only";
import { awaitingReply, getRun, runMessages, sceneAndMission, type GameMessageRow } from "./game";
import { tokenizeText } from "./lexicon";
import { learnedWords } from "./learned";
import { isQueued } from "./queue";
import { meaningOf, type ChatWord } from "./chat-view";
import { stars, type StarResult } from "@/lib/game/rules";
import { MAX_HEARTS, type Expression } from "@/lib/game/scenes";
import { unlearnedWords, wordPinyin } from "@/lib/zh/render";
import type { Token } from "@/lib/zh/types";

export interface GameMessageView {
  id: number;
  turn: number;
  role: "player" | "npc";
  speaker: string | null;
  text: string;
  tokens: Token[];
  translation: string | null;
  expression: Expression;
  hint: string | null;
  hintTokens: Token[] | null;
  hintUsed: boolean;
  correction: { explanation: string; corrected: string; correctedTokens: Token[] | null } | null;
  notChinese: boolean;
  raw: boolean;
}

export interface RunView {
  id: number;
  sceneId: string;
  missionId: string;
  goals: { id: string; text: string; done: boolean }[];
  hearts: number;
  maxHearts: number;
  hints: number;
  complete: boolean;
  finished: boolean;
  stars: StarResult;
  cost: number;
  awaitingReply: boolean;
  messages: GameMessageView[];
  wordsFromGame: ChatWord[];
}

function messageView(m: GameMessageRow): GameMessageView {
  const c = m.correction ? (JSON.parse(m.correction) as { explanation: string; corrected: string }) : null;
  return {
    id: m.id,
    turn: m.turn,
    role: m.role,
    speaker: m.speaker,
    text: m.text,
    tokens: tokenizeText(m.text),
    translation: m.translation,
    expression: (m.expression as Expression) || "neutral",
    hint: m.hint,
    hintTokens: m.hint ? tokenizeText(m.hint) : null,
    hintUsed: !!m.hint_used,
    correction: c ? { ...c, correctedTokens: c.corrected ? tokenizeText(c.corrected) : null } : null,
    notChinese: !!m.not_chinese,
    raw: !!m.raw,
  };
}

export function runView(id: number): RunView | null {
  const run = getRun(id);
  if (!run) return null;
  const { mission } = sceneAndMission(run);
  const msgs = runMessages(id);
  const done: string[] = JSON.parse(run.goals);
  const views = msgs.map(messageView);
  const learned = new Set(learnedWords());

  const seen = new Set<string>();
  const words: ChatWord[] = [];
  for (const v of views) {
    if (v.role !== "npc" || v.raw) continue;
    for (const t of unlearnedWords(v.tokens, learned)) {
      if (seen.has(t.text)) continue;
      seen.add(t.text);
      const info = meaningOf(t.text);
      words.push({ simplified: t.text, pinyin: wordPinyin(t), meaning: info.meaning, inBank: info.inBank, queued: isQueued(t.text), learnable: info.learnable });
    }
  }

  return {
    id: run.id,
    sceneId: run.scene_id,
    missionId: run.mission_id,
    goals: mission.goals.map((g) => ({ ...g, done: done.includes(g.id) })),
    hearts: run.hearts,
    maxHearts: MAX_HEARTS,
    hints: run.hints,
    complete: !!run.complete,
    finished: !!run.finished_at,
    stars: stars(!!run.complete, MAX_HEARTS - run.hearts, run.hints),
    cost: run.cost,
    awaitingReply: !run.finished_at && awaitingReply(msgs),
    messages: views,
    wordsFromGame: words,
  };
}
