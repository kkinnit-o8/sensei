import { now } from "@/lib/server/clock";
import { generateReply, getConversation } from "@/lib/server/chat";
import { chatView } from "@/lib/server/chat-view";

/** Try again to get the teacher's message after an error. */
export async function POST(_req: Request, ctx: RouteContext<"/api/chat/[id]/retry">) {
  const { id } = await ctx.params;
  const convId = Number(id);
  if (!getConversation(convId)) return Response.json({ error: { kind: "not_found", message: "Conversation not found" } }, { status: 404 });
  const outcome = await generateReply(convId, now());
  return Response.json({ view: chatView(convId), error: outcome.ok ? null : outcome });
}
