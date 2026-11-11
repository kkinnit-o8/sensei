import { describe, expect, it } from "vitest";
import { cleanReply, parseTeacherReply } from "@/lib/teacher/parse";
import { pickTopic, systemPrompt, TOPICS, type PromptInput } from "@/lib/teacher/prompt";
import { extractJsonObject } from "@/lib/json";

const good = { reply: "你好！你今天吃了什么？", translation: "Hello! What did you eat today?", correction: null, hint: "我吃了米饭。" };

describe("parsing the teacher's reply", () => {
  it("accepts a valid reply", () => {
    expect(parseTeacherReply(JSON.stringify(good))).toEqual({ ok: true, value: good });
  });

  it("accepts a reply with a correction", () => {
    const r = parseTeacherReply(
      JSON.stringify({ ...good, correction: { explanation: "Put 了 after the verb.", corrected: "我吃了饭。" } }),
    );
    expect(r.ok && r.value.correction).toEqual({ explanation: "Put 了 after the verb.", corrected: "我吃了饭。" });
  });

  it("finds JSON inside a code fence or surrounding text", () => {
    expect(parseTeacherReply("```json\n" + JSON.stringify(good) + "\n```").ok).toBe(true);
    expect(parseTeacherReply("Sure! Here you go: " + JSON.stringify(good) + " Hope that helps.").ok).toBe(true);
  });

  it("tolerates braces inside strings", () => {
    const tricky = { ...good, translation: "Use {curly} braces?" };
    const r = parseTeacherReply("prefix " + JSON.stringify(tricky));
    expect(r.ok && r.value.translation).toBe("Use {curly} braces?");
  });

  it("normalises empty or textual corrections", () => {
    for (const c of ["", "none", "null", { explanation: "", corrected: "" }]) {
      const r = parseTeacherReply(JSON.stringify({ ...good, correction: c }));
      expect(r.ok && r.value.correction).toBeNull();
    }
    const r = parseTeacherReply(JSON.stringify({ ...good, correction: "Say 我吃了 instead." }));
    expect(r.ok && r.value.correction).toEqual({ explanation: "Say 我吃了 instead.", corrected: "" });
  });

  it("fills in missing optional fields", () => {
    const r = parseTeacherReply(JSON.stringify({ reply: "你好！" }));
    expect(r).toEqual({ ok: true, value: { reply: "你好！", translation: "", correction: null, hint: "" } });
  });

  it("removes pinyin the model added in brackets", () => {
    const r = parseTeacherReply(JSON.stringify({ ...good, reply: "你好！(nǐ hǎo) 你吃饭了吗？（nǐ chī fàn le ma?）" }));
    expect(r.ok && r.value.reply).toBe("你好！ 你吃饭了吗？");
    expect(cleanReply("我有3个苹果（3 apples）")).toBe("我有3个苹果");
  });

  it("rejects bad output", () => {
    expect(parseTeacherReply("I can't do that").ok).toBe(false);
    expect(parseTeacherReply("{not json").ok).toBe(false);
    expect(parseTeacherReply(JSON.stringify({ translation: "hi" })).ok).toBe(false);
    expect(parseTeacherReply(JSON.stringify({ ...good, reply: "" })).ok).toBe(false);
    expect(parseTeacherReply(JSON.stringify({ ...good, reply: "Hello there!" })).ok).toBe(false);
    expect(parseTeacherReply("[1,2,3]").ok).toBe(false);
  });

  it("extractJsonObject returns undefined when there is no object", () => {
    expect(extractJsonObject("no json here")).toBeUndefined();
    expect(extractJsonObject('{"a": {"b": 1}} trailing')).toEqual({ a: { b: 1 } });
  });
});

describe("system prompt", () => {
  const base: PromptInput = {
    learnedWords: ["你", "好", "今天", "吃"],
    todaysWords: [{ simplified: "喝", meaning: "to drink" }, { simplified: "茶", meaning: "tea" }],
    unusedTodaysWords: ["茶"],
    topic: "drinks and cafés",
    exchange: 3,
    totalExchanges: 10,
    explanationLanguage: "English",
  };

  it("includes learned words, today's words, the topic and the exchange count", () => {
    const p = systemPrompt(base);
    expect(p).toContain("你 好 今天 吃");
    expect(p).toContain("喝 (to drink), 茶 (tea)");
    expect(p).toContain("Not used yet in this conversation: 茶");
    expect(p).toContain("TOPIC: drinks and cafés");
    expect(p).toContain("exchange 3 of 10 (7 more after this one)");
    expect(p).toMatch(/1–2 short sentences/);
    expect(p).toMatch(/at most 1–2 words per message that are not in the lists/);
    expect(p).toMatch(/pinyin with or without tone numbers/);
  });

  it("asks for an opening greeting, a wrap-up on the last exchange, and open chat after", () => {
    expect(systemPrompt({ ...base, exchange: 0 })).toMatch(/opening message/);
    expect(systemPrompt({ ...base, exchange: 10 })).toMatch(/LAST one\. Wrap up/);
    expect(systemPrompt({ ...base, exchange: 12 })).toMatch(/keep chatting/);
  });

  it("uses the explanation language setting", () => {
    expect(systemPrompt({ ...base, explanationLanguage: "Norwegian" })).toContain("written in Norwegian");
  });

  it("handles a complete beginner", () => {
    expect(systemPrompt({ ...base, learnedWords: [], todaysWords: [], unusedTodaysWords: [] })).toContain("complete beginner");
  });

  it("picks topics from the list", () => {
    expect(TOPICS).toContain(pickTopic(() => 0.5));
  });
});
