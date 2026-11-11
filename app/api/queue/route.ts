import { queueWord, queuedWords, unqueueWord } from "@/lib/server/queue";
import { connection } from "next/server";
import { z } from "zod";

const body = z.object({ word: z.string().trim().min(1).max(16) });

export async function GET() {
  await connection();
  return Response.json({ queue: queuedWords() });
}

/** Add a word to the front of the next Learn steps (custom word from CC-CEDICT if needed). */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Expected {word}" }, { status: 400 });
  const res = queueWord(parsed.data.word);
  if (!res.ok) return Response.json({ error: res.error }, { status: 409 });
  return Response.json(res);
}

export async function DELETE(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Expected {word}" }, { status: 400 });
  unqueueWord(parsed.data.word);
  return Response.json({ ok: true });
}
