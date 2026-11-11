import { connection } from "next/server";
import { now } from "@/lib/server/clock";
import { getOrCreateDay, learnPlan } from "@/lib/server/session";
import { learnedWords } from "@/lib/server/learned";
import { studyCard, type StudyCard } from "@/lib/server/study-card";
import { LearnStep } from "./learn-step";

export default async function LearnPage() {
  await connection();
  const rec = getOrCreateDay(now());
  const words = learnPlan(rec);
  const learned = new Set(learnedWords());
  return (
    <LearnStep
      cards={words.map(studyCard).filter((c): c is StudyCard => !!c)}
      initiallyLearned={words.filter((w) => learned.has(w))}
    />
  );
}
