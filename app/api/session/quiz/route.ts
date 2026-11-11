import { z } from "zod";
import { now } from "@/lib/server/clock";
import { answerTodayQuiz, getOrCreateDay, getOrCreateQuiz } from "@/lib/server/session";
import { quizScore } from "@/lib/quiz";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), audio: z.boolean() }),
  z.object({ action: z.literal("answer"), question: z.number().int().min(0), choice: z.string() }),
]);

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const t = now();
  const rec = getOrCreateDay(t);
  if (parsed.data.action === "start") {
    const quiz = getOrCreateQuiz(rec, t, parsed.data.audio);
    return Response.json({ quiz, score: quiz ? quizScore(quiz) : null });
  }
  try {
    const res = answerTodayQuiz(rec, parsed.data.question, parsed.data.choice, t);
    return Response.json({ quiz: res.state, correct: res.correct, score: quizScore(res.state) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 409 });
  }
}
