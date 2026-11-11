/**
 * Validate an example sentence against the "only earlier words" rule.
 * Shared by `npm run build:words` and `npm run validate:words`.
 */
import { tokenize } from "../zh/annotate";
import type { Lexicon } from "../zh/types";

export interface ExampleCheck {
  containsTarget: boolean;
  /** Bank words ranked after the target. */
  later: string[];
  /** Words that can't be built from bank words. */
  outside: string[];
  hanLength: number;
  ok: boolean;
  /** Lower is better; used to keep the best of several attempts. */
  score: number;
  problems: string[];
}

/** For the first words of the list it is impossible to use only earlier words. */
export const EARLY_RANK = 100;
export const EARLY_TOLERATED_RANK = 150;
export const EARLY_TOLERATED_COUNT = 2;
export const MAX_HAN_LENGTH = 22;

/**
 * Split a word into bank words so that the highest rank used is as low as possible.
 * Returns the parts, or null if the word can't be built from bank words.
 */
export function decompose(word: string, rankOf: (w: string) => number | undefined, maxLen = 8): string[] | null {
  const chars = Array.from(word);
  const n = chars.length;
  // best[i] = [maxRank, parts] for chars[0..i)
  const best: ([number, string[]] | null)[] = new Array(n + 1).fill(null);
  best[0] = [0, []];
  for (let i = 0; i < n; i++) {
    const cur = best[i];
    if (!cur) continue;
    for (let len = 1; len <= Math.min(maxLen, n - i); len++) {
      const w = chars.slice(i, i + len).join("");
      const r = rankOf(w);
      if (r === undefined) continue;
      const cand: [number, string[]] = [Math.max(cur[0], r), [...cur[1], w]];
      const prev = best[i + len];
      if (!prev || cand[0] < prev[0] || (cand[0] === prev[0] && cand[1].length < prev[1].length)) best[i + len] = cand;
    }
  }
  return best[n]?.[1] ?? null;
}

export function checkExample(
  sentence: string,
  target: { simplified: string; rank: number },
  lex: Lexicon,
  rankOf: (w: string) => number | undefined,
): ExampleCheck {
  const containsTarget = sentence.includes(target.simplified);
  const later = new Set<string>();
  const outside = new Set<string>();
  // The target itself counts as known, even inside a longer segment.
  const rankWithTarget = (w: string) => (w === target.simplified ? 0 : rankOf(w));

  for (const t of tokenize(sentence, lex)) {
    if (t.kind !== "word") continue;
    const parts = decompose(t.text, rankWithTarget, lex.maxLen);
    if (!parts) {
      outside.add(t.text);
      continue;
    }
    for (const p of parts) {
      const r = rankWithTarget(p)!;
      if (r > target.rank) later.add(p);
    }
  }

  const hanLength = Array.from(sentence).filter((c) => /[一-鿿]/.test(c)).length;
  const laterList = [...later];
  const tolerated =
    target.rank <= EARLY_RANK &&
    laterList.length <= EARLY_TOLERATED_COUNT &&
    laterList.every((w) => (rankOf(w) ?? Infinity) <= EARLY_TOLERATED_RANK);

  const problems: string[] = [];
  if (!containsTarget) problems.push(`does not contain ${target.simplified}`);
  if (outside.size) problems.push(`uses words outside the word bank: ${[...outside].join(", ")}`);
  if (laterList.length && !tolerated) problems.push(`uses words not learned yet: ${laterList.join(", ")}`);
  if (hanLength > MAX_HAN_LENGTH) problems.push(`too long (${hanLength} characters)`);

  const score =
    (containsTarget ? 0 : 100) + outside.size * 10 + (tolerated ? 0 : laterList.length * 3) + (hanLength > MAX_HAN_LENGTH ? 2 : 0);

  return {
    containsTarget,
    later: laterList,
    outside: [...outside],
    hanLength,
    ok: problems.length === 0,
    score,
    problems,
  };
}
