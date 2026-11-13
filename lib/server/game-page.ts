/** Data for the City Adventures pages (scene list and mission briefings). */
import "server-only";
import { bestResults, openRun } from "./game";
import { runView, type RunView } from "./game-view";
import { wordInfo } from "./word-info";
import { SCENES, sceneById } from "@/lib/game/scenes";

export interface KeyWord {
  word: string;
  pinyinNum: string;
  meaning: string;
  known: boolean;
}

export interface MissionBriefing {
  id: string;
  best: number;
  keyWords: KeyWord[];
}

export interface SceneSummary {
  id: string;
  best: Record<string, number>;
  /** Total stars earned in this scene, out of 3 per mission. */
  stars: number;
  maxStars: number;
  inProgress: boolean;
}

export function sceneSummaries(): SceneSummary[] {
  const best = bestResults();
  return SCENES.map((s) => {
    const b = best[s.id] ?? {};
    return {
      id: s.id,
      best: b,
      stars: Object.values(b).reduce((a, n) => a + n, 0),
      maxStars: s.missions.length * 3,
      inProgress: !!openRun(s.id),
    };
  });
}

export function sceneBriefing(sceneId: string): { briefings: MissionBriefing[]; openRun: RunView | null } | null {
  const scene = sceneById(sceneId);
  if (!scene) return null;
  const best = bestResults()[sceneId] ?? {};
  const briefings = scene.missions.map((m) => ({
    id: m.id,
    best: best[m.id] ?? 0,
    keyWords: m.words.map((w) => {
      const info = wordInfo(w);
      return { word: w, pinyinNum: info.pinyinNum, meaning: info.meaning, known: info.learned };
    }),
  }));
  const open = openRun(sceneId);
  return { briefings, openRun: open ? runView(open.id) : null };
}
