import { z } from "zod";
import { now } from "@/lib/server/clock";
import { addPlayerMessage, awaitingReply, getRun, npcTurn, runMessages } from "@/lib/server/game";
import { runView } from "@/lib/server/game-view";

const body = z.object({ text: z.string().trim().min(1).max(500) });

/** The player speaks; the characters answer. */
export async function POST(req: Request, ctx: RouteContext<"/api/game/runs/[id]/turn">) {
  const { id } = await ctx.params;
  const runId = Number(id);
  const run = getRun(runId);
  if (!run) return Response.json({ error: { kind: "not_found", message: "Game not found" } }, { status: 404 });
  if (run.finished_at) return Response.json({ view: runView(runId), error: { kind: "finished", message: "This round is over." } }, { status: 409 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: { kind: "bad_request", message: "Say something first." } }, { status: 400 });
  if (awaitingReply(runMessages(runId))) {
    return Response.json({ view: runView(runId), error: { kind: "pending", message: "Waiting for an answer. Press Retry." } }, { status: 409 });
  }
  const t = now();
  addPlayerMessage(runId, parsed.data.text, t);
  const outcome = await npcTurn(runId, t);
  return Response.json({ view: runView(runId), error: outcome.ok ? null : outcome });
}
