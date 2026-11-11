import { isReferenceDefinition } from "../cedict";

/** Deterministic short gloss from dictionary definitions (the LLM stage replaces it). */
export function shortGloss(meanings: string[], pos: string[] = []): string {
  const parts: string[] = [];
  for (const m of meanings) {
    if (isReferenceDefinition(m)) continue;
    for (const raw of m.split(";")) {
      let p = raw.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
      if (!p) p = raw.replace(/[()]/g, "").trim(); // e.g. "(completed action marker)"
      if (!p || /^(surname|abbr\.|also pr\.|old |archaic|variant|see |used in|CL:|Taiwan pr\.|bound form)/i.test(p)) continue;
      if (/^classifier for/i.test(p) && !pos.includes("q")) continue;
      if (!parts.includes(p)) parts.push(p);
    }
  }
  if (parts.length === 0) return (meanings[0] ?? "").replace(/\([^)]*\)/g, "").trim();
  let gloss = parts[0];
  for (const p of parts.slice(1, 3)) {
    if ((gloss + "; " + p).length > 32) break;
    gloss += "; " + p;
  }
  return gloss.length > 48 ? gloss.slice(0, 45).replace(/[;,]?\s+\S*$/, "") + "…" : gloss;
}

