import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { isNotChinese, mergeGoals, stars } from "@/lib/game/rules";
import { gameSchema, gameSystemPrompt } from "@/lib/game/prompt";
import { parseGameTurn } from "@/lib/game/parse";
import { CHARACTERS, SCENES, sceneById, missionById, EXPRESSIONS } from "@/lib/game/scenes";
import { setDbForTests } from "@/lib/server/db";
import { addPlayerMessage, bestResults, createRun, getRun, npcTurn, openRun, recordHint } from "@/lib/server/game";
import { runView } from "@/lib/server/game-view";

const cafe = sceneById("cafe")!;
const coffee = missionById(cafe, "coffee-for-two")!;

describe("game data", () => {
  it("has five scenes, each with missions whose cast exists", () => {
    expect(SCENES.map((s) => s.id)).toEqual(["cafe", "store", "restaurant", "station", "market"]);
    for (const s of SCENES) {
      expect(s.missions.length).toBeGreaterThanOrEqual(2);
      for (const m of s.missions) {
        expect(m.goals.length).toBeGreaterThanOrEqual(3);
        for (const c of m.cast) expect(CHARACTERS[c]).toBeTruthy();
        expect(new Set(m.goals.map((g) => g.id)).size).toBe(m.goals.length);
      }
    }
  });

  it("gives every character a different look", () => {
    const looks = Object.values(CHARACTERS).map((c) => `${c.look.hair.style}/${c.look.outfit.style}`);
    expect(new Set(looks).size).toBe(looks.length);
  });
});

describe("game rules", () => {
  it("tells English from Chinese and pinyin", () => {
    expect(isNotChinese("I want a coffee please")).toBe(true);
    expect(isNotChinese("hello")).toBe(true);
    expect(isNotChinese("我要一杯咖啡")).toBe(false);
    expect(isNotChinese("wo yao yi bei kafei")).toBe(false);
    expect(isNotChinese("wo3 yao4 ka1fei1")).toBe(false);
    expect(isNotChinese("wǒ yào kāfēi")).toBe(false);
    expect(isNotChinese("我要 latte")).toBe(false);
    expect(isNotChinese("88888888")).toBe(false);
  });

  it("gives up to three stars", () => {
    expect(stars(true, 0, 0).total).toBe(3);
    expect(stars(true, 1, 1).total).toBe(3);
    expect(stars(true, 2, 0)).toMatchObject({ total: 2, patient: false, fewHints: true });
    expect(stars(true, 3, 4).total).toBe(1);
    expect(stars(false, 0, 0).total).toBe(0);
  });

  it("merges goals without un-completing or inventing them", () => {
    expect(mergeGoals(["a"], ["b", "x", "a"], ["a", "b", "c"])).toEqual(["a", "b"]);
    expect(mergeGoals(["a", "b"], [], ["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("game master prompt and parsing", () => {
  const input = {
    scene: cafe,
    mission: coffee,
    done: ["own"],
    learnedWords: ["我", "你", "要"],
    hearts: 3,
    lastWasNotChinese: false,
    turn: 2,
    explanationLanguage: "English",
  };

  it("describes the scene, cast, mission, facts and progress", () => {
    const p = gameSystemPrompt(input);
    expect(p).toContain("咖啡馆");
    expect(p).toContain('"xiaolin": 小林');
    expect(p).toContain('"meimei": 美美');
    expect(p).toContain('"own": Order a drink for yourself (DONE)');
    expect(p).toContain("Still to do: ask-friend, friend, price");
    expect(p).toContain("拿铁 22");
    expect(p).toContain("WORDS THE PLAYER KNOWS: 我 你 要");
  });

  it("tells the AI which mission words are known and which are new", () => {
    const p = gameSystemPrompt({ ...input, learnedWords: ["我", "你", "要", "咖啡", "多少钱"] });
    expect(p).toContain("already known: 咖啡 多少钱");
    expect(p).toContain("new to the player: 奶茶 冰的 一共");
    expect(p).toMatch(/at most 1–2 new words per line/);
    expect(gameSystemPrompt({ ...input, learnedWords: coffee.words })).toContain("the player knows all of them");
  });

  it("reacts to English and to lost patience", () => {
    expect(gameSystemPrompt({ ...input, lastWasNotChinese: true })).toMatch(/NOT in Chinese/);
    expect(gameSystemPrompt({ ...input, hearts: 0 })).toMatch(/out of patience/);
    expect(gameSystemPrompt({ ...input, done: coffee.goals.map((g) => g.id) })).toMatch(/wrap up/);
  });

  it("restricts speakers, expressions and goal ids in the schema", () => {
    const s = gameSchema(coffee).schema.properties;
    expect(s.lines.items.properties.speaker.enum).toEqual(["xiaolin", "meimei"]);
    expect(s.lines.items.properties.expression.enum).toEqual(EXPRESSIONS);
    expect(s.goals_completed.items.enum).toEqual(["own", "ask-friend", "friend", "price"]);
  });

  it("parses a turn and cleans it up", () => {
    const raw = JSON.stringify({
      lines: [
        { speaker: "xiaolin", text: "你好！(nǐ hǎo) 你要喝什么？", translation: "Hi! What would you like?", expression: "happy" },
        { speaker: "nobody", text: "我也要！", translation: "Me too!", expression: "dancing" },
        { speaker: "meimei", text: "third line is dropped", translation: "", expression: "happy" },
      ],
      goals_completed: ["own", "bogus", "own"],
      correction: { explanation: "", corrected: "" },
      hint: "我要一杯拿铁。",
      rude: false,
    });
    const r = parseGameTurn(raw, coffee);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lines).toEqual([
      { speaker: "xiaolin", text: "你好！ 你要喝什么？", translation: "Hi! What would you like?", expression: "happy" },
      { speaker: "xiaolin", text: "我也要！", translation: "Me too!", expression: "neutral" },
    ]);
    expect(r.value.goalsCompleted).toEqual(["own"]);
    expect(r.value.correction).toBeNull();
  });

  it("accepts a single top-level line and rejects junk", () => {
    expect(parseGameTurn(JSON.stringify({ speaker: "xiaolin", text: "欢迎！" }), coffee).ok).toBe(true);
    expect(parseGameTurn("no json", coffee).ok).toBe(false);
    expect(parseGameTurn(JSON.stringify({ lines: [{ speaker: "xiaolin", text: "Hello" }] }), coffee).ok).toBe(false);
  });
});

/* --------------------------- server rounds (AI stubbed) --------------------------- */

let replies: string[] = [];
let requests: { messages: { role: string; content: string }[] }[] = [];
const now = new Date("2026-11-13T12:00:00Z");

const turn = (lines: { speaker: string; text: string; expression?: string }[], goals: string[] = [], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ lines: lines.map((l) => ({ translation: "", expression: "neutral", ...l })), goals_completed: goals, correction: null, hint: "我要一杯咖啡。", rude: false, ...extra });

beforeEach(() => {
  setDbForTests(new Database(":memory:"));
  process.env.OPENROUTER_API_KEY = "test";
  replies = [];
  requests = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (String(url).endsWith("/models")) return new Response(JSON.stringify({ data: [] }));
    requests.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ choices: [{ message: { content: replies.shift() ?? "{}" } }], usage: { cost: 0.0002 } }));
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("a game round on the server", () => {
  it("opens the scene, tracks goals, costs hearts for English, and gives stars at the end", async () => {
    const run = createRun("cafe", "coffee-for-two", now);
    replies = [turn([{ speaker: "xiaolin", text: "欢迎光临！你想喝什么？", expression: "happy" }])];
    await npcTurn(run.id, now);
    let v = runView(run.id)!;
    expect(v.messages).toHaveLength(1);
    expect(v.messages[0]).toMatchObject({ role: "npc", speaker: "xiaolin", expression: "happy" });
    expect(requests[0].messages[0].content).toContain("ROLE-PLAY GAME");

    // English costs a heart, decided by code.
    addPlayerMessage(run.id, "I want a latte", now);
    replies = [turn([{ speaker: "xiaolin", text: "对不起，我不懂。请说中文。", expression: "confused" }])];
    await npcTurn(run.id, now);
    v = runView(run.id)!;
    expect(v.hearts).toBe(2);
    expect(v.messages[1].notChinese).toBe(true);
    expect(requests[1].messages[0].content).toMatch(/NOT in Chinese/);

    // Use a hint once (counted once even if opened again).
    const lastNpc = v.messages[v.messages.length - 1];
    recordHint(run.id, lastNpc.id);
    recordHint(run.id, lastNpc.id);
    expect(getRun(run.id)!.hints).toBe(1);

    addPlayerMessage(run.id, "我要一杯拿铁。美美，你要什么？", now);
    replies = [
      turn(
        [
          { speaker: "xiaolin", text: "好的！" },
          { speaker: "meimei", text: "嗯……我要冰奶茶！" },
        ],
        ["own", "ask-friend"],
      ),
    ];
    await npcTurn(run.id, now);
    v = runView(run.id)!;
    expect(v.goals.filter((g) => g.done).map((g) => g.id)).toEqual(["own", "ask-friend"]);
    expect(v.messages.slice(-2).map((m) => m.speaker)).toEqual(["xiaolin", "meimei"]);
    // History groups both lines of that turn into one assistant message.
    addPlayerMessage(run.id, "她要一杯冰奶茶。一共多少钱？", now);
    replies = [turn([{ speaker: "xiaolin", text: "一共三十七块。" }], ["own", "ask-friend", "friend", "price"])];
    await npcTurn(run.id, now);
    const hist = requests[3].messages.filter((m) => m.role === "assistant");
    expect(JSON.parse(hist[hist.length - 1].content).lines).toHaveLength(2);

    v = runView(run.id)!;
    expect(v.complete).toBe(true);
    expect(v.finished).toBe(true);
    expect(v.stars).toMatchObject({ total: 3, patient: true, fewHints: true });
    expect(bestResults()).toEqual({ cafe: { "coffee-for-two": 3 } });
    expect(openRun("cafe")).toBeNull();
    expect(v.cost).toBeCloseTo(0.0008);
  });

  it("keeps raw text when the AI's JSON is still bad, and reports a missing key", async () => {
    const run = createRun("store", undefined, now, () => 0);
    replies = ["oops", "still oops 你好"];
    await npcTurn(run.id, now);
    expect(runView(run.id)!.messages[0]).toMatchObject({ raw: true, text: "still oops 你好" });

    const run2 = createRun("market", "apples", now);
    delete process.env.OPENROUTER_API_KEY;
    expect(await npcTurn(run2.id, now)).toMatchObject({ ok: false, kind: "no_key" });
    expect(runView(run2.id)!.awaitingReply).toBe(true);
  });

  it("starting a new round leaves the unfinished one, and picks unplayed missions first", async () => {
    const a = createRun("cafe", "coffee-for-two", now);
    expect(openRun("cafe")!.id).toBe(a.id);
    const b = createRun("cafe", undefined, now, () => 0);
    expect(getRun(a.id)!.finished_at).not.toBeNull();
    expect(openRun("cafe")!.id).toBe(b.id);
  });

  it("rudeness costs a heart", async () => {
    const run = createRun("market", "apples", now);
    replies = [turn([{ speaker: "zhangnainai", text: "你好！要什么？" }])];
    await npcTurn(run.id, now);
    addPlayerMessage(run.id, "你太笨了", now);
    replies = [turn([{ speaker: "zhangnainai", text: "哎呀！你怎么这么说话？", expression: "annoyed" }], [], { rude: true })];
    await npcTurn(run.id, now);
    expect(runView(run.id)!.hearts).toBe(2);
  });
});
