/**
 * Turn Chinese text into tokens with context-aware pinyin.
 *
 * 1. Segment the text into words (see segment.ts).
 * 2. Get pinyin for the whole sentence from pinyin-pro, which handles polyphones
 *    in context and the tone changes of 一 and 不.
 * 3. For multi-character dictionary words, prefer the dictionary reading
 *    (it knows neutral tones like 谢谢 xièxie and erhua like 一点儿 yìdiǎnr),
 *    choosing the reading that agrees with pinyin-pro's syllables.
 * 4. Fix a few single-character polyphones pinyin-pro gets wrong (得, 长得).
 *
 * Runs on the server and in scripts (pinyin-pro is large; kept out of the browser).
 */
import { pinyin as pinyinPro } from "pinyin-pro";
import { numToMarks, parseMarked, stripTones, toneOf, type Tone } from "./pinyin";
import { segmentText, type SegmentAlgorithm } from "./segment";
import type { Lexicon, Syllable, Token } from "./types";

type ProChar = { origin: string; pinyin: string; num: number; isZh: boolean };

const NON_HAN_RE =
  /(\s+)|([0-9０-９]+(?:[.,:][0-9０-９]+)*%?)|([A-Za-zÀ-ɏ̀-ͯ]+(?:['’][A-Za-zÀ-ɏ]+)*)|([^\sA-Za-z0-9０-９À-ɏ]+)/gu;

function splitNonHan(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(NON_HAN_RE)) {
    if (m[1]) out.push({ kind: "space", text: m[1] });
    else if (m[2]) out.push({ kind: "number", text: m[2] });
    else if (m[3]) out.push({ kind: "latin", text: m[3] });
    else if (m[4]) out.push({ kind: "punct", text: m[4] });
  }
  return out;
}

/** Compare syllable lists ignoring tones; erhua "r" matches pinyin-pro's "er". */
function sameToneless(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => {
    const p = stripTones(x);
    const q = stripTones(b[i]);
    return p === q || (p === "r" && q === "er") || (p === "er" && q === "r");
  });
}

function syllablesFromNum(num: string): string[] {
  return num.split(/\s+/).filter(Boolean).map((s) => numToMarks(s.toLowerCase()));
}

const PRONOUN_LIKE = new Set(["我", "你", "他", "她", "它", "我们", "你们", "他们", "她们", "咱们", "也", "还", "就", "都", "又", "总", "可", "真", "必须", "一定", "那", "大家"]);

const RETURN_CONTEXT = new Set(["没", "没有", "不", "要", "去", "来", "会", "想", "能", "得", "该", "应该", "快", "请", "别", "必须", "忘了", "记得"]);

/** Fix single-character polyphones using neighbouring words. Returns a marked syllable or null. */
function fixSingle(word: string, prev: string | undefined, next: string | undefined, lex: Lexicon): string | null {
  if (word === "得") {
    if (next === "了") return "dé";
    const nextIsVerb = next ? (lex.pos(next) ?? []).includes("v") : false;
    if (prev && PRONOUN_LIKE.has(prev) && nextIsVerb) return "děi";
    if (prev) return "de";
    return null;
  }
  if (word === "长" && next === "得") return "zhǎng";
  // On its own, 了 is the particle le (liǎo only appears inside words like 了解, 受不了).
  if (word === "了") return "le";
  // 还 "to give back" after a negation or modal verb: 没还书 méi huán shū, 要还钱 yào huán qián.
  if (word === "还" && prev && RETURN_CONTEXT.has(prev) && next && !["是", "有", "在", "没", "不", "要", "会", "能", "很", "好"].includes(next)) {
    return "huán";
  }
  // Aspect particle: 去过 qùguo, 吃过 chīguo (but 过马路 guò).
  if (word === "过" && prev && (lex.pos(prev) ?? []).includes("v") && next !== "了") return "guo";
  return null;
}

/**
 * Tokenize text. `lex` provides the dictionary; `algo` picks the segmentation algorithm.
 */
export function tokenize(text: string, lex: Lexicon, algo: SegmentAlgorithm = "unigram"): Token[] {
  const pieces = segmentText(text, lex, algo);

  // pinyin-pro over the whole text: one entry per UTF-16 code unit position of each char.
  const pro = pinyinPro(text, { type: "all", toneSandhi: true }) as unknown as ProChar[];
  const proByChar: string[] = [];
  for (const p of pro) proByChar.push(...Array.from(p.origin, () => (p.isZh ? p.pinyin : "")));

  const hanWords = pieces.filter((p) => p.han).map((p) => p.text);
  const tokens: Token[] = [];
  let charPos = 0;
  let hanIdx = 0;

  for (const piece of pieces) {
    const chars = Array.from(piece.text);
    if (!piece.han) {
      tokens.push(...splitNonHan(piece.text));
      charPos += chars.length;
      continue;
    }
    const word = piece.text;
    const proSyl = chars.map((_, i) => proByChar[charPos + i] || "");
    let syl = [...proSyl];

    if (chars.length > 1) {
      const candidates = lex.readings(word).map(syllablesFromNum).filter((s) => s.length === chars.length);
      const match = candidates.find((c) => sameToneless(c, proSyl)) ?? (lex.inBank(word) ? candidates[0] : undefined);
      if (match) {
        syl = match.map((s, i) => {
          // Keep pinyin-pro's context tone for 一 and 不 (tone sandhi), unless the dictionary says neutral.
          if ((chars[i] === "一" || chars[i] === "不") && toneOf(s) !== 5 && stripTones(proSyl[i]) === stripTones(s)) {
            return proSyl[i];
          }
          return s;
        });
      }
    } else {
      const fixed = fixSingle(word, hanWords[hanIdx - 1], hanWords[hanIdx + 1], lex);
      if (fixed) syl = [fixed];
    }

    const syllables: Syllable[] = chars.map((char, i) => {
      let p = syl[i] || proSyl[i] || "";
      // Erhua: the dictionary writes 儿 as "r"; show it attached to the previous syllable.
      if (char === "儿" && i > 0 && stripTones(p) === "r") p = "r";
      const tone: Tone = p ? parseMarked(p).tone : 5;
      return { char, pinyin: p, tone };
    });

    tokens.push({ kind: "word", text: word, syllables, bank: lex.inBank(word), dict: lex.has(word) });
    charPos += chars.length;
    hanIdx++;
  }
  return mergeAdjacent(tokens);
}

/** Merge consecutive punctuation tokens and consecutive space tokens. */
function mergeAdjacent(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (const t of tokens) {
    const last = out[out.length - 1];
    if (last && last.kind === t.kind && (t.kind === "punct" || t.kind === "space")) {
      out[out.length - 1] = { ...last, text: last.text + t.text } as Token;
    } else out.push(t);
  }
  return out;
}

/** Plain pinyin for a token list: "Nǐ jīntiān chī le shénme?" (used for stored example pinyin). */
export function tokensToPinyinSentence(tokens: Token[]): string {
  let out = "";
  for (const t of tokens) {
    if (t.kind === "word") {
      const w = t.syllables.map((s, i) => (i > 0 && /^[aoeāáǎàōóǒòēéěè]/.test(s.pinyin) ? "'" : "") + s.pinyin).join("");
      if (out && !/[\s(“"'‘]$/.test(out)) out += " ";
      out += w;
    } else if (t.kind === "punct") {
      out += toAsciiPunct(t.text);
    } else if (t.kind === "space") {
      if (!out.endsWith(" ")) out += " ";
    } else {
      if (out && !/\s$/.test(out)) out += " ";
      out += t.text;
    }
  }
  out = out.trim();
  return out.charAt(0).toUpperCase() + out.slice(1);
}

function toAsciiPunct(p: string): string {
  const map: Record<string, string> = {
    "，": ", ", "。": ". ", "？": "? ", "！": "! ", "：": ": ", "；": "; ", "、": ", ",
    "“": " \"", "”": "\" ", "‘": " '", "’": "' ", "（": " (", "）": ") ", "《": " «", "》": "» ", "…": "… ", "——": " — ",
  };
  let out = "";
  for (const ch of p) out += map[ch] ?? ch;
  return out;
}
