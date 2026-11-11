import { z } from "zod";
import { now } from "@/lib/server/clock";
import { createConversation, dailyConversation, generateReply } from "@/lib/server/chat";
import { chatView } from "@/lib/server/chat-view";
import { studyDay } from "@/lib/day";

const body = z.object({ topic: z.string().max(80).optional() });

/** Start today's conversation (or return it if it already exists). The teacher opens the chat. */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: { kind: "bad_request", message: "Bad request" } }, { status: 400 });
  const t = now();
  const conv = dailyConversation(studyDay(t)) ?? createConversation(t, parsed.data.topic, true);
  const outcome = await generateReply(conv.id, t);
  return Response.json({ view: chatView(conv.id), error: outcome.ok ? null : outcome });
}
