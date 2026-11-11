/** Conversations with the AI teacher (stored in SQLite). */
import "server-only";
import { getDb } from "./db";
import { getSettings } from "./settings";
import { learnedWords } from "./learned";
import { studyWord } from "./words";
import { tokenizeText } from "./lexicon";
import { getDay, getOrCreateDay, maybeCompleteDay, saveState, wordsLearnedOn } from "./session";
import { chat, OpenRouterError, type ChatMessage } from "@/lib/openrouter";
import { OPENING_USER_MESSAGE, pickTopic, systemPrompt, TEACHER_SCHEMA } from "@/lib/teacher/prompt";
import { parseTeacherReply } from "@/lib/teacher/parse";
import { studyDay } from "@/lib/day";

export interface ConversationRow {
  id: number;
  study_day: string;
  topic: string;
  model: string;
  target_exchanges: number;
  is_daily: number;
  created_at: string;
  cost: number;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface MessageRow {
  id: number;
  conversation_id: number;
  role: "teacher" | "user";
  text: string;
  translation: string | null;
  hint: string | null;
  correction: string | null;
  raw: string | null;
  created_at: string;
}

export function getConversation(id: number): ConversationRow | null {
  return (getDb().prepare("SELECT * FROM conversations WHERE id = ?").get(id) as ConversationRow | undefined) ?? null;
}

export function dailyConversation(day: string): ConversationRow | null {
  return (
    (getDb().prepare("SELECT * FROM conversations WHERE study_day = ? AND is_daily = 1 ORDER BY id LIMIT 1").get(day) as
      | ConversationRow
      | undefined) ?? null
  );
}

export function listConversations(): (ConversationRow & { messages: number; exchanges: number; preview: string | null })[] {
  return getDb()
    .prepare(
      `SELECT c.*,
         (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS messages,
         (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.role = 'user') AS exchanges,
         (SELECT text FROM messages m WHERE m.conversation_id = c.id AND m.role = 'teacher' ORDER BY id LIMIT 1) AS preview
       FROM conversations c ORDER BY c.study_day DESC, c.id DESC`,
    )
    .all() as (ConversationRow & { messages: number; exchanges: number; preview: string | null })[];
}

export function messagesOf(convId: number): MessageRow[] {
  return getDb().prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY id").all(convId) as MessageRow[];
}

/** Completed exchanges: student messages that got a teacher reply. */
export function exchangeCount(msgs: MessageRow[]): number {
  let n = 0;
  msgs.forEach((m, i) => {
    if (m.role === "user" && msgs.slice(i + 1).some((x) => x.role === "teacher")) n++;
  });
  return n;
}

/** Is the conversation waiting for a teacher message (opening or reply)? */
export function awaitingReply(msgs: MessageRow[]): boolean {
  return msgs.length === 0 || msgs[msgs.length - 1].role === "user";
}

export function createConversation(now: Date, topic: string | undefined, daily: boolean): ConversationRow {
  const settings = getSettings();
  const info = getDb()
    .prepare(
      "INSERT INTO conversations (study_day, topic, model, target_exchanges, is_daily, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(studyDay(now), topic?.trim() || pickTopic(), settings.model, settings.exchangesPerDay, daily ? 1 : 0, now.toISOString());
  const conv = getConversation(Number(info.lastInsertRowid))!;
  if (daily) {
    const rec = getOrCreateDay(now);
    rec.state.conversationId = conv.id;
    saveState(rec.studyDay, rec.state);
  }
  return conv;
}

export function addUserMessage(convId: number, text: string, now: Date): MessageRow {
  const info = getDb()
    .prepare("INSERT INTO messages (conversation_id, role, text, created_at) VALUES (?, 'user', ?, ?)")
    .run(convId, text.trim(), now.toISOString());
  return getDb().prepare("SELECT * FROM messages WHERE id = ?").get(info.lastInsertRowid) as MessageRow;
}

function teacherHistory(msgs: MessageRow[]): ChatMessage[] {
  return msgs.map((m) =>
    m.role === "teacher"
      ? { role: "assistant" as const, content: JSON.stringify({ reply: m.text }) }
      : { role: "user" as const, content: m.text },
  );
}

/** Words of `words` the teacher has used so far in this conversation. */
function usedByTeacher(msgs: MessageRow[], words: string[]): Set<string> {
  const text = msgs.filter((m) => m.role === "teacher").map((m) => m.text).join("\n");
  return new Set(words.filter((w) => text.includes(w)));
}

export type ReplyOutcome = { ok: true } | { ok: false; kind: string; message: string };

/**
 * Ask the teacher for the next message (the opening, or a reply to the student's last message).
 * Bad JSON is retried once; if it's still bad the raw text is stored and shown instead.
 */
export async function generateReply(convId: number, now: Date): Promise<ReplyOutcome> {
  const conv = getConversation(convId);
  if (!conv) return { ok: false, kind: "not_found", message: "Conversation not found" };
  const msgs = messagesOf(convId);
  if (!awaitingReply(msgs)) return { ok: true };

  const settings = getSettings();
  const userCount = msgs.filter((m) => m.role === "user").length;
  const todays = wordsLearnedOn(conv.study_day)
    .map(studyWord)
    .filter((w): w is NonNullable<ReturnType<typeof studyWord>> => !!w)
    .map((w) => ({ simplified: w.simplified, meaning: w.meaning }));
  const used = usedByTeacher(msgs, todays.map((w) => w.simplified));
  const system = systemPrompt({
    learnedWords: learnedWords(),
    todaysWords: todays,
    unusedTodaysWords: todays.map((w) => w.simplified).filter((w) => !used.has(w)),
    topic: conv.topic,
    exchange: userCount,
    totalExchanges: conv.target_exchanges,
    explanationLanguage: settings.explanationLanguage,
  });
  const history: ChatMessage[] = [{ role: "system", content: system }, ...teacherHistory(msgs)];
  if (msgs.length === 0) history.push({ role: "user", content: OPENING_USER_MESSAGE });

  let cost = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let parsed: ReturnType<typeof parseTeacherReply> | null = null;
  let raw = "";
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const messages =
        attempt === 0
          ? history
          : [
              ...history,
              { role: "assistant" as const, content: raw },
              {
                role: "user" as const,
                content:
                  'That answer was not valid. Reply again with ONLY the JSON object {"reply", "translation", "correction", "hint"}, with "reply" in Chinese characters.',
              },
            ];
      const res = await chat({ model: settings.model, messages, schema: TEACHER_SCHEMA, temperature: 0.8, maxTokens: 2000 });
      cost += res.usage.cost;
      promptTokens += res.usage.promptTokens;
      completionTokens += res.usage.completionTokens;
      raw = res.content;
      parsed = parseTeacherReply(raw);
      if (parsed.ok) break;
    }
  } catch (e) {
    const err = e instanceof OpenRouterError ? e : new OpenRouterError((e as Error).message, "server");
    return { ok: false, kind: err.kind, message: err.message };
  } finally {
    getDb()
      .prepare("UPDATE conversations SET cost = cost + ?, prompt_tokens = prompt_tokens + ?, completion_tokens = completion_tokens + ?, model = ? WHERE id = ?")
      .run(cost, promptTokens, completionTokens, settings.model, convId);
  }

  const db = getDb();
  db.transaction(() => {
    if (parsed?.ok) {
      const v = parsed.value;
      db.prepare("INSERT INTO messages (conversation_id, role, text, translation, hint, created_at) VALUES (?, 'teacher', ?, ?, ?, ?)").run(
        convId,
        v.reply,
        v.translation || null,
        v.hint || null,
        now.toISOString(),
      );
      const lastUser = [...msgs].reverse().find((m) => m.role === "user");
      if (v.correction && lastUser && msgs[msgs.length - 1].id === lastUser.id) {
        db.prepare("UPDATE messages SET correction = ? WHERE id = ?").run(JSON.stringify(v.correction), lastUser.id);
      }
    } else {
      // Still not valid: keep the raw text so the conversation can go on.
      const text = raw.trim() || "(The teacher sent an empty reply.)";
      db.prepare("INSERT INTO messages (conversation_id, role, text, raw, created_at) VALUES (?, 'teacher', ?, ?, ?)").run(
        convId,
        text,
        raw,
        now.toISOString(),
      );
    }
  })();

  // Daily target reached?
  if (conv.is_daily) {
    const rec = getDay(conv.study_day);
    if (rec && !rec.state.conversationDone && exchangeCount(messagesOf(convId)) >= conv.target_exchanges) {
      rec.state.conversationDone = true;
      saveState(rec.studyDay, rec.state);
      maybeCompleteDay(rec, now);
    }
  }
  return { ok: true };
}

/** Tokens for a message's text (server-side, so the client needs no extra request). */
export function tokens(text: string | null) {
  return text ? tokenizeText(text) : null;
}
