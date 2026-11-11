/** Pull the first JSON object out of model output (handles ```json fences and stray text). */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const tryParse = (s: string) => {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      return undefined;
    }
  };
  const direct = tryParse(trimmed);
  if (direct !== undefined && typeof direct === "object" && direct !== null) return direct;
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed);
  if (fence) {
    const v = tryParse(fence[1].trim());
    if (v !== undefined && typeof v === "object" && v !== null) return v;
  }
  // First balanced {...} block, respecting strings.
  const start = trimmed.indexOf("{");
  if (start >= 0) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const v = tryParse(trimmed.slice(start, i + 1));
          if (v !== undefined) return v;
          break;
        }
      }
    }
  }
  return undefined;
}
