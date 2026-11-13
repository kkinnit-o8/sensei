/** Parse and validate the game master's JSON reply. Pure; unit-tested. */
import { z } from "zod";
import { extractJsonObject } from "../json";
import { cleanReply } from "../teacher/parse";
import { EXPRESSIONS, type Expression, type Mission } from "./scenes";

export interface GameLine {
  speaker: string;
  text: string;
  translation: string;
  expression: Expression;
}

export interface GameTurn {
  lines: GameLine[];
  goalsCompleted: string[];
  correction: { explanation: string; corrected: string } | null;
  hint: string;
  rude: boolean;
}

const HAN = /[㐀-鿿]/;

const lineSchema = z.object({
  speaker: z.string(),
  text: z.string(),
  translation: z.string().optional().default(""),
  expression: z.string().optional().default("neutral"),
});

const turnSchema = z.object({
  lines: z.array(lineSchema).min(1),
  goals_completed: z.array(z.string()).optional().default([]),
  correction: z
    .union([z.null(), z.literal(""), z.object({ explanation: z.string().optional().default(""), corrected: z.string().optional().default("") })])
    .optional()
    .default(null),
  hint: z.string().optional().default(""),
  rude: z.boolean().optional().default(false),
});

export type GameParseResult = { ok: true; value: GameTurn } | { ok: false; error: string };

export function parseGameTurn(raw: string, mission: Mission): GameParseResult {
  const obj = extractJsonObject(raw) as Record<string, unknown> | undefined;
  if (!obj) return { ok: false, error: "The reply was not JSON" };
  // Accept a single line given at the top level, too.
  const input = !obj.lines && typeof obj.text === "string" ? { ...obj, lines: [obj] } : obj;
  const parsed = turnSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad fields" };

  const lines: GameLine[] = [];
  for (const l of parsed.data.lines.slice(0, 2)) {
    const text = cleanReply(l.text);
    if (!HAN.test(text)) continue;
    const speaker = mission.cast.includes(l.speaker) ? l.speaker : mission.cast[0];
    const expression = (EXPRESSIONS as string[]).includes(l.expression) ? (l.expression as Expression) : "neutral";
    lines.push({ speaker, text, translation: l.translation.trim(), expression });
  }
  if (lines.length === 0) return { ok: false, error: "No Chinese line" };

  const valid = mission.goals.map((g) => g.id);
  const c = parsed.data.correction;
  const correction = c && typeof c === "object" && (c.explanation.trim() || c.corrected.trim()) ? { explanation: c.explanation.trim(), corrected: c.corrected.trim() } : null;
  return {
    ok: true,
    value: {
      lines,
      goalsCompleted: [...new Set(parsed.data.goals_completed.filter((g) => valid.includes(g)))],
      correction,
      hint: cleanReply(parsed.data.hint),
      rude: parsed.data.rude,
    },
  };
}
