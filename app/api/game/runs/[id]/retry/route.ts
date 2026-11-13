import { now } from "@/lib/server/clock";
import { getRun, npcTurn } from "@/lib/server/game";
import { runView } from "@/lib/server/game-view";

/** Try again to get the characters' answer after an error. */
export async function POST(_req: Request, ctx: RouteContext<"/api/game/runs/[id]/retry">) {
  const { id } = await ctx.params;
  const runId = Number(id);
  if (!getRun(runId)) return Response.json({ error: { kind: "not_found", message: "Game not found" } }, { status: 404 });
  const outcome = await npcTurn(runId, now());
  return Response.json({ view: runView(runId), error: outcome.ok ? null : outcome });
}
