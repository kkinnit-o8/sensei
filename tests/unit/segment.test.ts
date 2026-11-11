import { describe, expect, it } from "vitest";
import { realLexicon } from "../helpers/lexicon";
import { segmentRun, segmentText, splitRuns, type SegmentAlgorithm } from "@/lib/zh/segment";

/**
 * Hand-segmented beginner sentences. Several segmentations are listed when more than one is
 * reasonable for a learner (e.g. 中国人 as one word or as 中国 + 人).
 */
const GOLD: [string, ...string[]][] = [
  ["你|今天|吃|了|什么"],
  ["我们|一起|去|银行|吧"],
  ["他|是|中国|人", "他|是|中国人"],
  ["我|喜欢|喝|咖啡"],
  ["明天|天气|怎么样"],
  ["你|叫|什么|名字"],
  ["我|想|买|一|件|衣服"],
  ["这个|苹果|很|好吃"],
  ["我|在|学习|中文"],
  ["他|的|女儿|在|哪儿"],
  ["我们|研究|生命|起源"],
  ["结婚|的|和|尚未|结婚|的"],
  ["我|有|一点儿|累", "我|有一点儿|累"],
  ["他|每天|都|去|跑步"],
  ["我|昨天|没有|去|上班"],
  ["你|会|说|汉语|吗"],
  ["外面|下雨|了"],
  ["我|觉得|这|本|书|很|有意思"],
  ["请问|洗手间|在|哪里"],
  ["我们|下个星期|见", "我们|下|个|星期|见"],
  ["他|已经|吃|过|饭|了", "他|已经|吃过|饭|了"],
  ["我|妈妈|做|的|菜|特别|好吃"],
  ["你|能|帮|我|一下|吗"],
  ["我|对|中国|文化|很|感兴趣"],
  ["他们|正在|开会"],
  ["这|件|事情|我|不|知道"],
  ["我|早上|七|点|起床"],
  ["学生|们|都|很|努力", "学生们|都|很|努力"],
  ["今天|比|昨天|冷"],
  ["你|最近|怎么样"],
  ["我们|坐|地铁|去|吧"],
  ["他|跑|得|很|快"],
  ["长城|很|长"],
  ["我|的|手机|没|电|了", "我|的|手机|没电|了"],
  ["这儿|的|东西|很|贵"],
  ["欢迎|你|来|北京"],
  ["我|还|没|想|好", "我|还|没|想好"],
  ["我|会|帮|你|的"],
  ["我|爱|我|的|家"],
  ["多少|钱|一|斤"],
  ["你|周末|打算|做|什么"],
  ["我|上个月|去|了|上海", "我|上|个|月|去|了|上海"],
  ["这|家|饭馆|的|菜|不|太|好吃", "这|家|饭馆|的|菜|不太|好吃"],
  ["她|长|得|很|漂亮", "她|长得|很|漂亮"],
  ["我|得|走|了"],
  ["你|说|得|对"],
  ["下雪|的|时候|我|喜欢|在家|看书", "下雪|的|时候|我|喜欢|在|家|看书"],
  ["我们|班|有|二十|个|学生"],
  ["他|说|的|话|很|有道理", "他|说|的|话|很|有|道理"],
  ["我们|明天|见"],
  ["我|女朋友|的|生日|快|到|了"],
  ["这|是|我|第一|次|来|中国", "这|是|我|第一次|来|中国"],
  ["你|要|不要|喝|茶", "你|要不要|喝|茶", "你|要|不要|喝茶"],
  ["他|把|门|打开|了"],
  ["我|从来|没|去|过|日本", "我|从来|没|去过|日本"],
  ["吃饭|了|吗"],
  ["我们|一边|吃|一边|聊"],
  ["你|可以|再|说|一|遍|吗", "你|可以|再|说|一遍|吗"],
  ["他|工作|很|忙"],
  ["我|小时候|住|在|农村", "我|小时候|住在|农村"],
];

function score(algo: SegmentAlgorithm) {
  const { lex } = realLexicon();
  let exact = 0;
  let tp = 0;
  let predicted = 0;
  let gold = 0;
  const misses: string[] = [];
  for (const accepted of GOLD) {
    const sentence = accepted[0].replace(/\|/g, "");
    const got = segmentRun(sentence, lex, algo).join("|");
    if (accepted.includes(got)) exact++;
    else misses.push(`${got}  (want ${accepted[0]})`);
    // Word-level F1 against the closest accepted segmentation.
    const spans = (seg: string) => {
      const out = new Set<string>();
      let pos = 0;
      for (const w of seg.split("|")) {
        out.add(`${pos}:${w.length}`);
        pos += w.length;
      }
      return out;
    };
    const p = spans(got);
    const best = accepted.map(spans).reduce((a, b) => ([...b].filter((x) => p.has(x)).length > [...a].filter((x) => p.has(x)).length ? b : a));
    tp += [...best].filter((x) => p.has(x)).length;
    predicted += p.size;
    gold += best.size;
  }
  const precision = tp / predicted;
  const recall = tp / gold;
  return { exact: exact / GOLD.length, f1: (2 * precision * recall) / (precision + recall), misses };
}

describe("word segmentation", () => {
  it("the unigram model beats maximum matching and Intl.Segmenter on the gold set", () => {
    const results = Object.fromEntries(
      (["unigram", "forward", "backward", "bidirectional", "intl"] as const).map((a) => [a, score(a)]),
    );
    console.table(Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { exact: v.exact.toFixed(3), f1: v.f1.toFixed(3) }])));
    if (results.unigram.misses.length) console.log("unigram misses:\n" + results.unigram.misses.join("\n"));
    for (const other of ["forward", "backward", "bidirectional", "intl"]) {
      expect(results.unigram.f1).toBeGreaterThan(results[other].f1);
    }
    expect(results.unigram.exact).toBeGreaterThanOrEqual(0.95);
    expect(results.unigram.f1).toBeGreaterThanOrEqual(0.98);
  });

  it("avoids classic ambiguity traps", () => {
    const { lex } = realLexicon();
    expect(segmentRun("研究生命起源", lex)).toEqual(["研究", "生命", "起源"]);
    expect(segmentRun("结婚的和尚未结婚的", lex)).toEqual(["结婚", "的", "和", "尚未", "结婚", "的"]);
  });

  it("keeps non-Chinese text in separate pieces", () => {
    const { lex } = realLexicon();
    expect(splitRuns("我有3个iPhone！")).toEqual([
      { text: "我有", han: true },
      { text: "3", han: false },
      { text: "个", han: true },
      { text: "iPhone！", han: false },
    ]);
    expect(segmentText("谢谢, Tom.", lex).map((p) => p.text)).toEqual(["谢谢", ", Tom."]);
  });

  it("handles empty text and text without Chinese", () => {
    const { lex } = realLexicon();
    expect(segmentText("", lex)).toEqual([]);
    expect(segmentText("hello 123", lex)).toEqual([{ text: "hello 123", han: false }]);
  });

  it("splits unknown characters one by one", () => {
    const { lex } = realLexicon();
    // 𠮷 is outside the main CJK block; 囧 is a rare character on its own.
    expect(segmentRun("囧囧", lex)).toEqual(["囧", "囧"]);
  });
});
