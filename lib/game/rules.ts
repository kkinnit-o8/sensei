/** Game rules that must not depend on the AI: patience, stars, goals. Pure; unit-tested. */
import { splitSyllables, stripTones } from "../zh/pinyin";

const HAN = /[㐀-鿿]/;

/**
 * Did the player write in English (or another language) instead of Chinese? Chinese characters
 * or pinyin (with or without tone numbers) count as Chinese.
 */
export function isNotChinese(text: string): boolean {
  if (HAN.test(text)) return false;
  const tokens = stripTones(text)
    .toLowerCase()
    .split(/[^a-zü]+/)
    .filter(Boolean);
  if (tokens.length === 0) return false; // only numbers or punctuation: not a language
  const pinyin = tokens.filter((t) => splitSyllables(t) !== null).length;
  return pinyin / tokens.length < 0.6;
}

export interface StarResult {
  total: number;
  complete: boolean;
  patient: boolean;
  fewHints: boolean;
}

/** ★ mission complete, ★ lost at most one heart, ★ used at most one hint. Only for completed missions. */
export function stars(complete: boolean, heartsLost: number, hints: number): StarResult {
  const patient = complete && heartsLost <= 1;
  const fewHints = complete && hints <= 1;
  return { total: complete ? 1 + (patient ? 1 : 0) + (fewHints ? 1 : 0) : 0, complete, patient, fewHints };
}

/** Add newly reported goals; goals are never un-completed and unknown ids are ignored. */
export function mergeGoals(done: string[], reported: string[], valid: string[]): string[] {
  const out = [...done];
  for (const g of reported) if (valid.includes(g) && !out.includes(g)) out.push(g);
  return out;
}
