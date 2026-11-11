import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { setDbForTests } from "@/lib/server/db";
import { saveSettings } from "@/lib/server/settings";
import { addUserMessage, createConversation, generateReply, getConversation, messagesOf } from "@/lib/server/chat";
import { chatView, studentUsed, todaysWordUsage } from "@/lib/server/chat-view";
import { getOrCreateDay, learnPlan, markLearned } from "@/lib/server/session";
import { dayStart } from "@/lib/day";

const now = new Date(dayStart("2026-11-11").getTime() + 6 * 3600e3);

type Reply = string | { status: number; body: unknown };
let replies: Reply[] = [];
let requests: { messages: { role: string; content: string }[]; response_format?: unknown }[] = [];

function mockFetch() {
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (String(url).endsWith("/models")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
    requests.push(JSON.parse(String(init?.body)));
    const r = replies.shift() ?? "{}";
    if (typeof r !== "string") return new Response(JSON.stringify(r.body), { status: r.status });
    return new Response(JSON.stringify({ choices: [{ message: { content: r } }], usage: { prompt_tokens: 100, completion_tokens: 20, cost: 0.001 } }), {
      status: 200,
    });
  });
}

const teacher = (reply: string, correction: unknown = null) =>
  JSON.stringify({ reply, translation: "translation", correction, hint: "我很好。" });

beforeEach(() => {
  setDbForTests(new Database(":memory:"));
  process.env.OPENROUTER_API_KEY = "test-key";
  replies = [];
  requests = [];
  mockFetch();
  saveSettings({ exchangesPerDay: 2 });
  const rec = getOrCreateDay(now);
  for (const w of learnPlan(rec)) markLearned(w, now);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("teacher chat (server)", () => {
  it("opens the conversation with a structured request and today's words in the prompt", async () => {
    replies = [teacher("你好！你今天怎么样？")];
    const conv = createConversation(now, "my day", true);
    expect(await generateReply(conv.id, now)).toEqual({ ok: true });
    const req = requests[0];
    expect(req.response_format).toMatchObject({ type: "json_schema" });
    expect(req.messages[0].role).toBe("system");
    expect(req.messages[0].content).toContain("TOPIC: my day");
    expect(req.messages[0].content).toContain("的 (of; ’s (possessive))");
    expect(messagesOf(conv.id).map((m) => m.text)).toEqual(["你好！你今天怎么样？"]);
  });

  it("attaches a correction to the student's message and counts cost", async () => {
    replies = [teacher("你好！"), teacher("很好！", { explanation: "Word order.", corrected: "我很好。" })];
    const conv = createConversation(now, "my day", true);
    await generateReply(conv.id, now);
    addUserMessage(conv.id, "我好很", now);
    await generateReply(conv.id, now);
    const view = chatView(conv.id)!;
    expect(view.messages[1].correction).toMatchObject({ explanation: "Word order.", corrected: "我很好。" });
    expect(view.exchanges).toBe(1);
    expect(getConversation(conv.id)!.cost).toBeCloseTo(0.002);
    // History goes back to the model with the teacher's turns as JSON.
    expect(requests[1].messages.slice(1)).toEqual([
      { role: "assistant", content: JSON.stringify({ reply: "你好！" }) },
      { role: "user", content: "我好很" },
    ]);
  });

  it("retries once when the JSON is bad", async () => {
    replies = ["not json at all", teacher("你好！")];
    const conv = createConversation(now, "my day", true);
    await generateReply(conv.id, now);
    expect(requests).toHaveLength(2);
    expect(requests[1].messages.at(-1)!.content).toMatch(/not valid/);
    expect(chatView(conv.id)!.messages[0]).toMatchObject({ text: "你好！", raw: false });
  });

  it("keeps the raw text when the JSON is still bad", async () => {
    replies = ["oops", "still not json 你好"];
    const conv = createConversation(now, "my day", true);
    await generateReply(conv.id, now);
    expect(chatView(conv.id)!.messages[0]).toMatchObject({ text: "still not json 你好", raw: true });
  });

  it("reports a missing or invalid key clearly and lets you retry", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const conv = createConversation(now, "my day", true);
    expect(await generateReply(conv.id, now)).toMatchObject({ ok: false, kind: "no_key" });
    process.env.OPENROUTER_API_KEY = "bad";
    replies = [{ status: 401, body: { error: { message: "No auth" } } }];
    expect(await generateReply(conv.id, now)).toMatchObject({ ok: false, kind: "auth" });
    expect(chatView(conv.id)!.awaitingReply).toBe(true);
    replies = [teacher("你好！")];
    expect(await generateReply(conv.id, now)).toEqual({ ok: true });
    expect(chatView(conv.id)!.awaitingReply).toBe(false);
  });

  it("marks the conversation step done after the daily number of exchanges", async () => {
    replies = [teacher("你好！"), teacher("好的。"), teacher("再见！")];
    const conv = createConversation(now, "my day", true);
    await generateReply(conv.id, now);
    addUserMessage(conv.id, "你好", now);
    await generateReply(conv.id, now);
    expect(getOrCreateDay(now).state.conversationDone).toBe(false);
    addUserMessage(conv.id, "再见", now);
    await generateReply(conv.id, now);
    expect(requests[2].messages[0].content).toMatch(/LAST one/);
    expect(getOrCreateDay(now).state.conversationDone).toBe(true);
  });

  it("lists unlearned words the teacher used", async () => {
    replies = [teacher("你喜欢喝茶吗？")];
    const conv = createConversation(now, "drinks", true);
    await generateReply(conv.id, now);
    const words = chatView(conv.id)!.wordsFromChat.map((w) => w.simplified);
    expect(words).toContain("喝茶");
    expect(words).not.toContain("你"); // learned on day one
  });

  it("knows which of today's words were used, in characters or pinyin", async () => {
    replies = [teacher("我是你的老师。")];
    const conv = createConversation(now, "my day", true);
    await generateReply(conv.id, now);
    addUserMessage(conv.id, "wo3 you3 ni3", now);
    const usage = todaysWordUsage(conv.id, "2026-11-11");
    const by = Object.fromEntries(usage.map((u) => [u.word, u]));
    expect(by["是"].teacher).toBe(true);
    expect(by["有"].student).toBe(true);
    expect(by["有"].teacher).toBe(false);
  });
});

describe("studentUsed", () => {
  it("matches characters and pinyin with or without tones", () => {
    expect(studentUsed("今天", "jin1 tian1", "我今天很好")).toBe(true);
    expect(studentUsed("今天", "jin1 tian1", "wo jintian hen hao")).toBe(true);
    expect(studentUsed("今天", "jin1 tian1", "wo3 jin1 tian1 hen3 hao3")).toBe(true);
    expect(studentUsed("今天", "jin1 tian1", "wǒ jīntiān hěn hǎo")).toBe(true);
    expect(studentUsed("吃", "chi1", "wo chibi")).toBe(false);
    expect(studentUsed("吃", "chi1", "wo chi le")).toBe(true);
  });
});

describe("day completion and streak", () => {
  async function finishDay(day: string) {
    const { getOrCreateDay: god, learnPlan: lp, markLearned: ml, getOrCreateQuiz, answerTodayQuiz, reviewQueue } = await import("@/lib/server/session");
    const { rateWord } = await import("@/lib/server/cards");
    const { markSummarySeen } = await import("@/lib/server/summary");
    const t = new Date(dayStart(day).getTime() + 6 * 3600e3);
    const rec = god(t);
    for (const w of reviewQueue(rec, t)) rateWord(w, 3, "review", t);
    for (const w of lp(rec)) ml(w, t);
    let quiz = getOrCreateQuiz(god(t), t, false);
    while (quiz && quiz.queue.length) quiz = answerTodayQuiz(god(t), quiz.queue[0], quiz.questions[quiz.queue[0]].word, t).state;
    replies = [teacher("你好！"), teacher("好。"), teacher("再见！")];
    const conv = createConversation(t, "my day", true);
    await generateReply(conv.id, t);
    for (const text of ["你好", "再见"]) {
      addUserMessage(conv.id, text, t);
      await generateReply(conv.id, t);
    }
    return markSummarySeen(t);
  }

  it("completes a day only after the summary and counts consecutive days", async () => {
    // The beforeEach already learned day one's words; finish that day properly.
    let s = await finishDay("2026-11-11");
    expect(s.completed).toBe(true);
    expect(s.streak.current).toBe(1);
    s = await finishDay("2026-11-12");
    expect(s.streak.current).toBe(2);
    expect(s.learned.length).toBeGreaterThan(0);
    s = await finishDay("2026-11-14"); // skipped the 13th
    expect(s.streak.current).toBe(1);
    expect(s.streak.longest).toBe(2);
  });

  it("does not complete the day from the summary while steps are unfinished", async () => {
    const { markSummarySeen } = await import("@/lib/server/summary");
    const s = markSummarySeen(now);
    expect(s.ready).toBe(false);
    expect(s.completed).toBe(false);
    expect(s.streak.current).toBe(0);
  });
});
