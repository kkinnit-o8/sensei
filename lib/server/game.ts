/** City Adventures: game rounds stored in SQLite, one AI call per turn. */
import "server-only";
import { getDb } from "./db";
import { getSettings } from "./settings";
import { learnedWords } from "./learned";
import { chat, OpenRouterError, type ChatMessage } from "@/lib/openrouter";
import { GAME_OPENING_MESSAGE, gameSchema, gameSystemPrompt } from "@/lib/game/prompt";
import { parseGameTurn } from "@/lib/game/parse";
import { isNotChinese, mergeGoals, stars } from "@/lib/game/rules";
import { MAX_HEARTS, missionById, sceneById, type Mission, type Scene } from "@/lib/game/scenes";

export interface RunRow {
  id: number;
  scene_id: string;
  mission_id: string;
  started_at: string;
  finished_at: string | null;
  goals: string;
  hearts: number;
  hints: number;
  complete: number;
  stars: number;
  model: string;
  cost: number;
}

export interface GameMessageRow {
  id: number;
  run_id: number;
  turn: number;
  role: "player" | "npc";
  speaker: string | null;
  text: string;
  translation: string | null;
  expression: string | null;
  hint: string | null;
  hint_used: number;
  correction: string | null;
  not_chinese: number;
  raw: string | null;
  created_at: string;
}

export type TurnOutcome = { ok: true } | { ok: false; kind: string; message: string };

export function getRun(id: number): RunRow | null {
  return (getDb().prepare("SELECT * FROM game_runs WHERE id = ?").get(id) as RunRow | undefined) ?? null;
}

export function runMessages(id: number): GameMessageRow[] {
  return getDb().prepare("SELECT * FROM game_messages WHERE run_id = ? ORDER BY id").all(id) as GameMessageRow[];
}

export function sceneAndMission(run: Pick<RunRow, "scene_id" | "mission_id">): { scene: Scene; mission: Mission } {
  const scene = sceneById(run.scene_id);
  const mission = scene && missionById(scene, run.mission_id);
  if (!scene || !mission) throw new Error(`Unknown scene or mission: ${run.scene_id}/${run.mission_id}`);
  return { scene, mission };
}

/** The unfinished round for a scene, if any (to resume). */
export function openRun(sceneId: string): RunRow | null {
  return (
    (getDb().prepare("SELECT * FROM game_runs WHERE scene_id = ? AND finished_at IS NULL ORDER BY id DESC LIMIT 1").get(sceneId) as
      | RunRow
      | undefined) ?? null
  );
}

/** Best stars per scene and mission. */
export function bestResults(): Record<string, Record<string, number>> {
  const rows = getDb()
    .prepare("SELECT scene_id, mission_id, MAX(stars) AS best FROM game_runs WHERE complete = 1 GROUP BY scene_id, mission_id")
    .all() as { scene_id: string; mission_id: string; best: number }[];
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) (out[r.scene_id] ??= {})[r.mission_id] = r.best;
  return out;
}

/** Start a round. Without a mission id, picks one the player hasn't completed yet if possible. */
export function createRun(sceneId: string, missionId: string | undefined, now: Date, rng: () => number = Math.random): RunRow {
  const scene = sceneById(sceneId);
  if (!scene) throw new Error("Unknown scene");
  let mission = missionId ? missionById(scene, missionId) : undefined;
  if (!mission) {
    const best = bestResults()[sceneId] ?? {};
    const fresh = scene.missions.filter((m) => !best[m.id]);
    const pool = fresh.length ? fresh : scene.missions;
    mission = pool[Math.floor(rng() * pool.length)];
  }
  // Leave any unfinished round of this scene.
  getDb().prepare("UPDATE game_runs SET finished_at = ? WHERE scene_id = ? AND finished_at IS NULL").run(now.toISOString(), sceneId);
  const info = getDb()
    .prepare("INSERT INTO game_runs (scene_id, mission_id, started_at, hearts, model) VALUES (?, ?, ?, ?, ?)")
    .run(sceneId, mission.id, now.toISOString(), MAX_HEARTS, getSettings().model);
  return getRun(Number(info.lastInsertRowid))!;
}

export function awaitingReply(msgs: GameMessageRow[]): boolean {
  return msgs.length === 0 || msgs[msgs.length - 1].role === "player";
}

/** The player says something. Writing in English costs a heart (decided by code, not the AI). */
export function addPlayerMessage(runId: number, text: string, now: Date): GameMessageRow {
  const db = getDb();
  const run = getRun(runId)!;
  const turn = runMessages(runId).filter((m) => m.role === "player").length + 1;
  const notChinese = isNotChinese(text);
  const info = db
    .prepare("INSERT INTO game_messages (run_id, turn, role, text, not_chinese, created_at) VALUES (?, ?, 'player', ?, ?, ?)")
    .run(runId, turn, text.trim(), notChinese ? 1 : 0, now.toISOString());
  if (notChinese && run.hearts > 0) db.prepare("UPDATE game_runs SET hearts = hearts - 1 WHERE id = ?").run(runId);
  return db.prepare("SELECT * FROM game_messages WHERE id = ?").get(info.lastInsertRowid) as GameMessageRow;
}

/** History for the model: each NPC turn as one assistant JSON message, player turns as user messages. */
function history(msgs: GameMessageRow[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  let npc: { speaker: string | null; text: string }[] = [];
  const flush = () => {
    if (npc.length) out.push({ role: "assistant", content: JSON.stringify({ lines: npc }) });
    npc = [];
  };
  for (const m of msgs) {
    if (m.role === "npc") npc.push({ speaker: m.speaker, text: m.text });
    else {
      flush();
      out.push({ role: "user", content: m.text });
    }
  }
  flush();
  return out;
}

/** Ask the AI for the characters' next lines. Bad JSON is retried once; then the raw text is shown. */
export async function npcTurn(runId: number, now: Date): Promise<TurnOutcome> {
  const run = getRun(runId);
  if (!run) return { ok: false, kind: "not_found", message: "Game not found" };
  const msgs = runMessages(runId);
  if (!awaitingReply(msgs)) return { ok: true };
  const { scene, mission } = sceneAndMission(run);
  const settings = getSettings();
  const done: string[] = JSON.parse(run.goals);
  const players = msgs.filter((m) => m.role === "player");
  const last = players[players.length - 1];
  const turn = players.length;

  const system = gameSystemPrompt({
    scene,
    mission,
    done,
    learnedWords: learnedWords(),
    hearts: run.hearts,
    lastWasNotChinese: !!last?.not_chinese,
    turn,
    explanationLanguage: settings.explanationLanguage,
  });
  const base: ChatMessage[] = [{ role: "system", content: system }, ...history(msgs)];
  if (msgs.length === 0) base.push({ role: "user", content: GAME_OPENING_MESSAGE });

  let raw = "";
  let parsed: ReturnType<typeof parseGameTurn> | null = null;
  let cost = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const messages: ChatMessage[] =
        attempt === 0
          ? base
          : [
              ...base,
              { role: "assistant", content: raw },
              { role: "user", content: 'That answer was not valid. Reply again with ONLY the JSON object {"lines", "goals_completed", "correction", "hint", "rude"}.' },
            ];
      const res = await chat({ model: settings.model, messages, schema: gameSchema(mission), temperature: 0.8, maxTokens: 2000 });
      cost += res.usage.cost;
      promptTokens += res.usage.promptTokens;
      completionTokens += res.usage.completionTokens;
      raw = res.content;
      parsed = parseGameTurn(raw, mission);
      if (parsed.ok) break;
    }
  } catch (e) {
    const err = e instanceof OpenRouterError ? e : new OpenRouterError((e as Error).message, "server");
    return { ok: false, kind: err.kind, message: err.message };
  } finally {
    getDb()
      .prepare("UPDATE game_runs SET cost = cost + ?, prompt_tokens = prompt_tokens + ?, completion_tokens = completion_tokens + ? WHERE id = ?")
      .run(cost, promptTokens, completionTokens, runId);
  }

  const db = getDb();
  db.transaction(() => {
    const insert = db.prepare(
      "INSERT INTO game_messages (run_id, turn, role, speaker, text, translation, expression, hint, raw, created_at) VALUES (?, ?, 'npc', ?, ?, ?, ?, ?, ?, ?)",
    );
    if (!parsed?.ok) {
      insert.run(runId, turn, mission.cast[0], raw.trim() || "…", null, "confused", null, raw, now.toISOString());
      return;
    }
    const v = parsed.value;
    v.lines.forEach((l, i) => insert.run(runId, turn, l.speaker, l.text, l.translation || null, l.expression, i === v.lines.length - 1 ? v.hint || null : null, null, now.toISOString()));
    if (v.correction && last) db.prepare("UPDATE game_messages SET correction = ? WHERE id = ?").run(JSON.stringify(v.correction), last.id);
    // Rudeness costs a heart, but not twice in one turn (English was already penalised).
    let hearts = getRun(runId)!.hearts;
    if (v.rude && last && !last.not_chinese && hearts > 0) hearts--;
    const goals = mergeGoals(done, v.goalsCompleted, mission.goals.map((g) => g.id));
    const complete = goals.length === mission.goals.length && !run.complete;
    db.prepare("UPDATE game_runs SET goals = ?, hearts = ? WHERE id = ?").run(JSON.stringify(goals), hearts, runId);
    if (complete) {
      const s = stars(true, MAX_HEARTS - hearts, getRun(runId)!.hints);
      db.prepare("UPDATE game_runs SET complete = 1, stars = ?, finished_at = ? WHERE id = ?").run(s.total, now.toISOString(), runId);
    }
  })();
  return { ok: true };
}

/** The player opened the hint of an NPC line: counts once per line. */
export function recordHint(runId: number, messageId: number) {
  const db = getDb();
  const m = db.prepare("SELECT * FROM game_messages WHERE id = ? AND run_id = ?").get(messageId, runId) as GameMessageRow | undefined;
  if (!m || m.hint_used || !m.hint) return;
  const run = getRun(runId);
  if (!run || run.complete) return;
  db.transaction(() => {
    db.prepare("UPDATE game_messages SET hint_used = 1 WHERE id = ?").run(messageId);
    db.prepare("UPDATE game_runs SET hints = hints + 1 WHERE id = ?").run(runId);
  })();
}

/** Leave a round without finishing it. */
export function leaveRun(runId: number, now: Date) {
  getDb().prepare("UPDATE game_runs SET finished_at = ? WHERE id = ? AND finished_at IS NULL").run(now.toISOString(), runId);
}
