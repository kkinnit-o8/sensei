import { z } from "zod";
import { now } from "@/lib/server/clock";
import { createRun, npcTurn } from "@/lib/server/game";
import { runView } from "@/lib/server/game-view";
import { sceneById } from "@/lib/game/scenes";

const body = z.object({ sceneId: z.string(), missionId: z.string().optional() });

/** Start a new round in a scene; the characters open the scene. */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !sceneById(parsed.data.sceneId)) {
    return Response.json({ error: { kind: "bad_request", message: "Unknown scene" } }, { status: 400 });
  }
  const t = now();
  const run = createRun(parsed.data.sceneId, parsed.data.missionId, t);
  const outcome = await npcTurn(run.id, t);
  return Response.json({ view: runView(run.id), error: outcome.ok ? null : outcome });
}
