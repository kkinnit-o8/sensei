import { z } from "zod";
import { recordHint } from "@/lib/server/game";
import { runView } from "@/lib/server/game-view";

const body = z.object({ messageId: z.number().int() });

/** The player opened a hint (counts once per line, for the stars). */
export async function POST(req: Request, ctx: RouteContext<"/api/game/runs/[id]/hint">) {
  const { id } = await ctx.params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Expected {messageId}" }, { status: 400 });
  recordHint(Number(id), parsed.data.messageId);
  return Response.json({ view: runView(Number(id)) });
}
