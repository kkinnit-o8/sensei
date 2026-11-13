import { now } from "@/lib/server/clock";
import { leaveRun } from "@/lib/server/game";

/** Leave the round without finishing it. */
export async function POST(_req: Request, ctx: RouteContext<"/api/game/runs/[id]/leave">) {
  const { id } = await ctx.params;
  leaveRun(Number(id), now());
  return Response.json({ ok: true });
}
