import { connection } from "next/server";
import { z } from "zod";
import { now } from "@/lib/server/clock";
import { getOrCreateDay, maybeCompleteDay, reviewQueue } from "@/lib/server/session";
import { rateWord } from "@/lib/server/cards";
import { reviewView } from "@/lib/server/review-view";

export async function GET() {
  await connection();
  const t = now();
  return Response.json(reviewView(getOrCreateDay(t), t));
}

const body = z.object({ word: z.string().min(1), rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]) });

/** Rate the current review card; returns the updated queue. */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Expected {word, rating 1-4}" }, { status: 400 });
  const t = now();
  const rec = getOrCreateDay(t);
  if (!reviewQueue(rec, t).includes(parsed.data.word)) return Response.json({ error: "That word is not in today's review" }, { status: 409 });
  rateWord(parsed.data.word, parsed.data.rating, "review", t);
  maybeCompleteDay(rec, t);
  return Response.json(reviewView(rec, t));
}
