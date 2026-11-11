import { chatView } from "@/lib/server/chat-view";

export async function GET(_req: Request, ctx: RouteContext<"/api/chat/[id]">) {
  const { id } = await ctx.params;
  const view = chatView(Number(id));
  if (!view) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(view);
}
