import "server-only";
import { getDb } from "./db";

/** Every word introduced in a Learn step (simplified). */
export function learnedWords(): string[] {
  return (getDb().prepare("SELECT word FROM learned ORDER BY learned_at").all() as { word: string }[]).map((r) => r.word);
}

export function isLearned(word: string): boolean {
  return !!getDb().prepare("SELECT 1 FROM learned WHERE word = ?").get(word);
}
