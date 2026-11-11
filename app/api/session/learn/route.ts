import { connection } from "next/server";
import { z } from "zod";
import { now } from "@/lib/server/clock";
import { getOrCreateDay, learnPlan, markLearned, maybeCompleteDay } from "@/lib/server/session";
import { learnedWords } from "@/lib/server/learned";
import { studyCard, type StudyCard } from "@/lib/server/study-card";

function view() {
  const rec = getOrCreateDay(now());
  const learned = new Set(learnedWords());
  const words = learnPlan(rec);
  return {
    cards: words.map(studyCard).filter((c): c is StudyCard => !!c),
    learned: words.filter((w) => learned.has(w)),
  };
}

export async function GET() {
  await connection();
  return Response.json(view());
}

const body = z.object({ word: z.string().min(1) });

/** The learner has been introduced to this word: it now counts as learned and gets a review card. */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Expected {word}" }, { status: 400 });
  const t = now();
  const rec = getOrCreateDay(t);
  if (!learnPlan(rec).includes(parsed.data.word)) return Response.json({ error: "That word is not in today's plan" }, { status: 409 });
  markLearned(parsed.data.word, t);
  maybeCompleteDay(rec, t);
  return Response.json(view());
}
