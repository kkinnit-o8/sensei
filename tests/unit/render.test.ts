import { describe, expect, it } from "vitest";
import { realLexicon } from "../helpers/lexicon";
import { tokenize } from "@/lib/zh/annotate";
import { renderPlain, renderTokens, showAsHanzi, splitsIntoLearned, unlearnedWords, wordPinyin } from "@/lib/zh/render";
import { parseMarked } from "@/lib/zh/pinyin";
import type { Token, WordToken } from "@/lib/zh/types";

/* ------------------------- synthetic tokens (no dictionary) ------------------------- */

function w(text: string, pinyin: string, bank = true): WordToken {
  const syl = pinyin.split(" ");
  return {
    kind: "word",
    text,
    bank,
    dict: true,
    syllables: Array.from(text).map((char, i) => ({ char, pinyin: syl[i], tone: parseMarked(syl[i]).tone })),
  };
}
const p = (text: string): Token => ({ kind: "punct", text });

// 你今天吃了什么？
const SPEC: Token[] = [w("你", "nǐ"), w("今天", "jīn tiān"), w("吃", "chī"), w("了", "le"), w("什么", "shén me"), p("？")];

describe("renderer: core rule (synthetic tokens)", () => {
  it("matches the example from the spec", () => {
    const learned = new Set(["你", "今天", "了", "什么"]);
    expect(renderPlain(SPEC, learned)).toBe("你今天 chī 了什么？");
  });

  it("shows everything in pinyin when nothing is learned", () => {
    expect(renderPlain(SPEC, new Set())).toBe("nǐ jīntiān chī le shénme？");
  });

  it("shows the original text when everything is learned", () => {
    const learned = new Set(["你", "今天", "吃", "了", "什么"]);
    expect(renderPlain(SPEC, learned)).toBe("你今天吃了什么？");
  });

  it("uses tone numbers when asked (neutral tone has no number)", () => {
    expect(renderPlain(SPEC, new Set(["你"]), "numbers")).toBe("你 jin1tian1 chi1 le shen2me？");
  });

  it("separates adjacent pinyin words but not adjacent characters", () => {
    const learned = new Set(["今天", "吃"]);
    expect(renderPlain(SPEC, learned)).toBe("nǐ 今天吃 le shénme？");
  });

  it("shows a non-bank compound in characters only if it splits fully into learned words", () => {
    const tokens = [w("我", "wǒ"), w("喜欢", "xǐ huan"), w("喝茶", "hē chá", false)];
    expect(renderPlain(tokens, new Set(["我", "喜欢", "喝"]))).toBe("我喜欢 hēchá");
    expect(renderPlain(tokens, new Set(["我", "喜欢", "喝", "茶"]))).toBe("我喜欢喝茶");
  });

  it("shows a learned custom compound in characters", () => {
    const tokens = [w("咖啡馆", "kā fēi guǎn", true)];
    expect(renderPlain(tokens, new Set(["咖啡"]))).toBe("kāfēiguǎn");
    expect(renderPlain(tokens, new Set(["咖啡馆"]))).toBe("咖啡馆");
  });

  it("requires word-bank words to be learned themselves, even if their characters are known", () => {
    const token = w("这个", "zhè ge", true);
    expect(showAsHanzi(token, new Set(["这", "个"]))).toBe(false);
    expect(showAsHanzi(token, new Set(["这个"]))).toBe(true);
  });

  it("passes punctuation, numbers, Latin text and spaces through unchanged", () => {
    const tokens: Token[] = [
      w("我", "wǒ"),
      w("有", "yǒu"),
      { kind: "number", text: "3" },
      w("个", "gè"),
      { kind: "latin", text: "iPhone" },
      p("！"),
      { kind: "space", text: " " },
      p("("),
      { kind: "latin", text: "OK" },
      p(")"),
    ];
    expect(renderPlain(tokens, new Set(["我", "有", "个"]))).toBe("我有3个iPhone！ (OK)");
    expect(renderPlain(tokens, new Set())).toBe("wǒ yǒu 3 gè iPhone！ (OK)");
  });

  it("adds a space after ASCII punctuation before pinyin, never before punctuation", () => {
    const tokens: Token[] = [w("你好", "nǐ hǎo"), p(","), w("我", "wǒ"), p("."), p("！")];
    expect(renderPlain(tokens, new Set(["你好"]))).toBe("你好, wǒ.！");
    expect(renderPlain(tokens, new Set())).toBe("nǐhǎo, wǒ.！");
  });

  it("does not add spaces next to existing whitespace", () => {
    const tokens: Token[] = [w("你", "nǐ"), { kind: "space", text: " " }, w("好", "hǎo")];
    expect(renderPlain(tokens, new Set())).toBe("nǐ hǎo");
  });

  it("writes apostrophes and erhua correctly", () => {
    expect(wordPinyin(w("西安", "xī ān"))).toBe("xī'ān");
    expect(wordPinyin(w("一点儿", "yì diǎn r"))).toBe("yìdiǎnr");
    expect(wordPinyin(w("女儿", "nǚ ér"))).toBe("nǚ'ér");
  });

  it("ruby mode shows every word in characters", () => {
    const d = renderTokens(SPEC, new Set(), { ruby: true });
    expect(d.filter((x) => x.mode === "pinyin")).toHaveLength(0);
    expect(d.every((x) => !x.spaceBefore)).toBe(true);
  });

  it("lists unlearned words once each", () => {
    const tokens = [w("我", "wǒ"), w("吃", "chī"), w("吃", "chī"), w("饭", "fàn"), p("。")];
    expect(unlearnedWords(tokens, new Set(["我"])).map((t) => t.text)).toEqual(["吃", "饭"]);
  });

  it("handles empty input", () => {
    expect(renderPlain([], new Set())).toBe("");
  });

  it("splitsIntoLearned finds splits that need backtracking", () => {
    const learned = new Set(["中", "中国", "国人", "人"]);
    expect(splitsIntoLearned("中国人", learned)).toBe(true);
    expect(splitsIntoLearned("中国话", learned)).toBe(false);
    expect(splitsIntoLearned("", learned)).toBe(true);
  });
});

/* -------------------- real tokenizer: segmentation + pinyin + rule -------------------- */

describe("renderer with the real tokenizer", () => {
  const render = (text: string, learned: string[], style: "marks" | "numbers" = "marks") =>
    renderPlain(tokenize(text, realLexicon().lex), new Set(learned), style);

  it("matches the spec example end to end", () => {
    expect(render("你今天吃了什么？", ["你", "今天", "了", "什么"])).toBe("你今天 chī 了什么？");
  });

  it("nothing learned / everything learned", () => {
    expect(render("我喜欢喝咖啡。", [])).toBe("wǒ xǐhuan hē kāfēi。");
    expect(render("我喜欢喝咖啡。", ["我", "喜欢", "喝", "咖啡"])).toBe("我喜欢喝咖啡。");
  });

  it("works out polyphones from the sentence", () => {
    expect(render("我们去银行吧，行不行？", [])).toBe("wǒmen qù yínháng ba，xíng bùxíng？");
    expect(render("他跑得很快，我得走了。", [])).toBe("tā pǎo de hěn kuài，wǒ děi zǒu le。");
    expect(render("她长得很高，长城很长。", [])).toBe("tā zhǎng de hěn gāo，chángchéng hěn cháng。");
    expect(render("我觉得你应该去睡觉。", [])).toBe("wǒ juéde nǐ yīnggāi qù shuìjiào。");
    expect(render("我受不了了。", ["我"])).toBe("我 shòubùliǎo le。");
    expect(render("他还没还书。", [])).toBe("tā hái méi huán shū。");
    expect(render("你吃过饭了吗？", [])).toBe("nǐ chī guo fàn le ma？");
  });

  it("applies the tone changes of 一 and 不 and neutral tones", () => {
    expect(render("不是，一个人一起去。", [])).toBe("bú shì，yíge rén yìqǐ qù。");
    expect(render("第一天", [])).toBe("dìyī tiān");
    expect(render("谢谢你！", [])).toBe("xièxie nǐ！");
  });

  it("handles erhua", () => {
    expect(render("我有一点儿累。", ["我", "有", "累"])).toBe("我有 yìdiǎnr 累。");
  });

  it("shows an unknown compound in characters once all its parts are learned", () => {
    const tokens = tokenize("你要不要喝茶？", realLexicon().lex);
    const tea = tokens.find((t) => t.kind === "word" && t.text === "喝茶") as WordToken;
    expect(tea).toBeTruthy();
    expect(tea.bank).toBe(false);
    expect(render("你要不要喝茶？", ["你", "要", "不要", "喝"])).toBe("你要不要 hēchá？");
    expect(render("你要不要喝茶？", ["你", "要", "不要", "喝", "茶"])).toBe("你要不要喝茶？");
  });

  it("keeps numbers, Latin text and punctuation", () => {
    expect(render("我有3个iPhone！", [])).toBe("wǒ yǒu 3 gè iPhone！");
    expect(render("你好, Tom.", ["你"])).toBe("你 hǎo, Tom.");
    expect(render("《你好》“再见”", ["你", "好"])).toBe("《你好》“zàijiàn”");
  });

  it("uses tone numbers", () => {
    expect(render("你今天吃了什么？", ["你"], "numbers")).toBe("你 jin1tian1 chi1 le shen2me？");
  });

  it("colours characters by their tone in context", () => {
    const tokens = tokenize("一个", realLexicon().lex);
    const t = tokens[0] as WordToken;
    expect(t.syllables.map((s) => s.tone)).toEqual([2, 5]);
  });
});
