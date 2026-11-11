import { describe, expect, it } from "vitest";
import {
  addToneMark,
  formatSyllable,
  joinSyllables,
  marksToNum,
  numStringToMarks,
  numToMarks,
  parseMarked,
  pinyinKey,
  splitSyllables,
  stripTones,
  toneOf,
} from "@/lib/zh/pinyin";

describe("pinyin helpers", () => {
  it("places tone marks by the standard rules", () => {
    expect(addToneMark("hao", 3)).toBe("hǎo");
    expect(addToneMark("xie", 4)).toBe("xiè");
    expect(addToneMark("dou", 1)).toBe("dōu");
    expect(addToneMark("gui", 4)).toBe("guì");
    expect(addToneMark("liu", 2)).toBe("liú");
    expect(addToneMark("nü", 3)).toBe("nǚ");
    expect(addToneMark("lüe", 4)).toBe("lüè");
    expect(addToneMark("Zhong", 1)).toBe("Zhōng");
  });

  it("converts numbers to marks", () => {
    expect(numToMarks("ni3")).toBe("nǐ");
    expect(numToMarks("nu:3")).toBe("nǚ");
    expect(numToMarks("lv4")).toBe("lǜ");
    expect(numToMarks("ma5")).toBe("ma");
    expect(numToMarks("r5")).toBe("r");
    expect(numStringToMarks("ni3 hao3")).toBe("nǐ hǎo");
  });

  it("converts marks to numbers and reads tones", () => {
    expect(marksToNum("hǎo")).toBe("hao3");
    expect(marksToNum("ma")).toBe("ma5");
    expect(parseMarked("nǚ")).toEqual({ base: "nü", tone: 3 });
    expect(toneOf("shì")).toBe(4);
    expect(toneOf("shi4")).toBe(4);
    expect(toneOf("de")).toBe(5);
  });

  it("strips tones", () => {
    expect(stripTones("Nǐ hǎo3")).toBe("ni hao");
    expect(pinyinKey("Nǐ hǎo!")).toBe("nihao");
  });

  it("formats syllables and words", () => {
    expect(formatSyllable("hǎo", "numbers")).toBe("hao3");
    expect(formatSyllable("le", "numbers")).toBe("le");
    expect(joinSyllables(["tiān", "ān", "mén"])).toBe("tiān'ānmén");
    expect(joinSyllables(["jīn", "tiān"], "numbers")).toBe("jin1tian1");
  });

  it("splits typed pinyin into syllables", () => {
    expect(splitSyllables("nihao")).toEqual(["ni", "hao"]);
    expect(splitSyllables("ni3hao3")).toEqual(["ni3", "hao3"]);
    expect(splitSyllables("woaini")).toEqual(["wo", "ai", "ni"]);
    expect(splitSyllables("xian")).toEqual(["xian"]);
    expect(splitSyllables("zhongguoren")).toEqual(["zhong", "guo", "ren"]);
    expect(splitSyllables("qwrt")).toBeNull();
  });
});
