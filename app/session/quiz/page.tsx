import { connection } from "next/server";
import { now } from "@/lib/server/clock";
import { getOrCreateDay } from "@/lib/server/session";
import { QuizStep } from "./quiz-step";

export default async function QuizPage() {
  await connection();
  const rec = getOrCreateDay(now());
  return <QuizStep initialQuiz={rec.state.quiz} />;
}
