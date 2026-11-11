import { z } from "zod";
import { now } from "@/lib/server/clock";
import { addUserMessage, awaitingReply, generateReply, getConversation, messagesOf } from "@/lib/server/chat";
import { chatView } from "@/lib/server/chat-view";

const body = z.object({ text: z.string().trim().min(1).max(1000) });

/** Send the student's message and get the teacher's reply. */
export async function POST(req: Request, ctx: RouteContext<"/api/chat/[id]/messages">) {
  const { id } = await ctx.params;
  const convId = Number(id);
  if (!getConversation(convId)) return Response.json({ error: { kind: "not_found", message: "Conversation not found" } }, { status: 404 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: { kind: "bad_request", message: "Type a message first." } }, { status: 400 });
  if (awaitingReply(messagesOf(convId))) {
    return Response.json({ view: chatView(convId), error: { kind: "pending", message: "The teacher hasn't answered yet. Press Retry." } }, { status: 409 });
  }
  const t = now();
  addUserMessage(convId, parsed.data.text, t);
  const outcome = await generateReply(convId, t);
  return Response.json({ view: chatView(convId), error: outcome.ok ? null : outcome });
}
