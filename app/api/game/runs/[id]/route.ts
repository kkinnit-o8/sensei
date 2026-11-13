import { runView } from "@/lib/server/game-view";

export async function GET(_req: Request, ctx: RouteContext<"/api/game/runs/[id]">) {
  const { id } = await ctx.params;
  const view = runView(Number(id));
  if (!view) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(view);
}
