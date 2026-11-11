/**
 * npm run build:words
 *
 * Builds data/words.json, the ~2,200-word bank (HSK 3.0 levels 1–3, most frequent first).
 *
 * Stage 1 (deterministic, no network after the first download):
 *   - downloads the HSK dataset (drkameleon/complete-hsk-vocabulary, MIT) into data/cache/
 *   - picks each word's main reading, canonical pinyin from CC-CEDICT, frequency from wordfreq
 *   - sorts by frequency and keeps ids stable across rebuilds
 *   - keeps example sentences and glosses that already exist, and applies the hand-written
 *     ones in data/manual-examples.json
 *
 * Stage 2 (needs OPENROUTER_API_KEY; resumable):
 *   - asks the model, in batches, for a short English gloss and one example sentence per word
 *   - validates each sentence (contains the word; uses only earlier words) and retries failures
 *     with feedback, keeping the best attempt and flagging it if it still breaks the rules
 *   - saves data/words.json after every batch, so you can stop (Ctrl+C) and rerun at any time
 *
 * Options:
 *   --skip-llm            only run stage 1
 *   --model <id>          OpenRouter model (default: deepseek/deepseek-v4-flash, or $WORDS_MODEL)
 *   --batch <n>           words per request (default 12)
 *   --attempts <n>        attempts per word before flagging (default 3)
 *   --limit <n>           stop after n words this run
 *   --redo-flagged        regenerate sentences that were flagged last time
 *   --refresh-hsk         download the HSK dataset again
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { pinyin as pinyinPro } from "pinyin-pro";
import { parseCedictLine, isProperNoun, isReferenceDefinition, type CedictEntry } from "../lib/cedict";
import { joinSyllables, marksToNum, numToMarks, pinyinKey, splitSyllables, stripTones } from "../lib/zh/pinyin";
import { tokenize, tokensToPinyinSentence } from "../lib/zh/annotate";
import { loadFreqTable, wordFreq } from "../lib/wordbank/freq";
import { makeLexicon } from "../lib/wordbank/lexicon";
import { checkExample } from "../lib/wordbank/check-example";
import { shortGloss } from "../lib/wordbank/gloss";
import type { BankWord, OtherReading, WordBankFile } from "../lib/wordbank/types";
import { chat, DEFAULT_MODEL, extractJson, OpenRouterError } from "../lib/openrouter";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const CACHE = path.join(DATA, "cache");
const OUT = path.join(DATA, "words.json");
const MANUAL = path.join(DATA, "manual-examples.json");
const HSK_URL = "https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json";
const HSK_FILE = path.join(CACHE, "complete-hsk-vocabulary.json");

/* ----------------------------- arguments ----------------------------- */

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const opt = (name: string, def?: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const MODEL = opt("model", process.env.WORDS_MODEL || DEFAULT_MODEL)!;
const BATCH = Number(opt("batch", "12"));
const ATTEMPTS = Number(opt("attempts", "3"));
const LIMIT = Number(opt("limit", "0")) || Infinity;

loadEnvLocal();

/* ----------------------------- input data ----------------------------- */

interface HskForm {
  traditional: string;
  transcriptions: { pinyin: string; numeric: string };
  meanings: string[];
  classifiers: string[];
}
interface HskEntry {
  simplified: string;
  level: string[];
  frequency: number;
  pos: string[];
  forms: HskForm[];
}

function loadEnvLocal() {
  const f = path.join(ROOT, ".env.local");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function loadHsk(): Promise<HskEntry[]> {
  fs.mkdirSync(CACHE, { recursive: true });
  if (!fs.existsSync(HSK_FILE) || flag("refresh-hsk")) {
    console.log(`Downloading HSK vocabulary from ${HSK_URL} ...`);
    const res = await fetch(HSK_URL);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    fs.writeFileSync(HSK_FILE, await res.text());
  }
  return JSON.parse(fs.readFileSync(HSK_FILE, "utf8"));
}

function loadCedict(): Map<string, CedictEntry[]> {
  const file = fs.readdirSync(path.join(DATA, "sources")).find((f) => /^cedict.*\.txt\.gz$/.test(f));
  if (!file) throw new Error("CC-CEDICT not found in data/sources/");
  const text = zlib.gunzipSync(fs.readFileSync(path.join(DATA, "sources", file))).toString("utf8");
  const map = new Map<string, CedictEntry[]>();
  for (const line of text.split("\n")) {
    const e = parseCedictLine(line);
    if (!e) continue;
    const list = map.get(e.simplified);
    if (list) list.push(e);
    else map.set(e.simplified, [e]);
  }
  return map;
}

/* --------------------------- stage 1 helpers -------------------------- */

/** Main readings for common single-character polyphones (the most frequent use for a learner). */
const MAIN_READING: Record<string, string> = {
  的: "de", 了: "le", 得: "de", 地: "de", 着: "zhe", 过: "guò", 还: "hái", 都: "dōu", 行: "xíng", 长: "cháng",
  好: "hǎo", 为: "wèi", 只: "zhǐ", 和: "hé", 要: "yào", 会: "huì", 种: "zhǒng", 重: "zhòng", 少: "shǎo",
  数: "shù", 教: "jiāo", 干: "gàn", 乐: "lè", 差: "chà", 空: "kōng", 难: "nán", 当: "dāng", 头: "tóu",
  东西: "dōngxi", 吧: "ba", 吗: "ma", 呢: "ne", 啊: "a", 哪: "nǎ", 那: "nà", 把: "bǎ", 给: "gěi", 大: "dà", 看: "kàn",
  打: "dǎ", 发: "fā", 分: "fēn", 几: "jǐ", 间: "jiān", 见: "jiàn", 角: "jiǎo", 片: "piàn", 上: "shàng",
  说: "shuō", 通: "tōng", 万: "wàn", 喂: "wèi", 系: "xì", 向: "xiàng", 约: "yuē", 中: "zhōng", 转: "zhuǎn",
  正: "zhèng", 倒: "dào", 调: "diào", 传: "chuán", 朝: "cháo", 车: "chē", 称: "chēng", 场: "chǎng",
  厂: "chǎng", 查: "chá", 比: "bǐ", 别: "bié", 背: "bèi", 合: "hé", 号: "hào", 喝: "hē", 化: "huà",
  亲: "qīn", 强: "qiáng", 省: "shěng", 属: "shǔ", 提: "tí", 听: "tīng", 雨: "yǔ", 远: "yuǎn", 咱: "zán",
  脏: "zāng", 占: "zhàn", 追: "zhuī", 鸟: "niǎo", 女: "nǚ", 骑: "qí", 离: "lí", 累: "lèi", 弄: "nòng",
  胖: "pàng", 跑: "pǎo", 页: "yè", 汤: "tāng", 句: "jù", 读: "dú", 度: "dù", 弟: "dì", 卡: "kǎ",
  没: "méi", 更: "gèng", 个: "gè", 边: "biān", 压: "yā", 往: "wǎng", 区: "qū", 任: "rèn", 假: "jià",
  子: "zǐ", 东: "dōng", 西: "xī", 一: "yī", 不: "bù", 量: "liàng", 便: "biàn", 觉: "jué", 结: "jié",
  相: "xiāng", 应: "yīng", 处: "chù", 参: "cān", 曾: "céng", 解: "jiě", 散: "sàn", 冲: "chōng",
  藏: "cáng", 刻: "kè", 尽: "jìn", 似: "sì", 供: "gōng", 降: "jiàng", 挣: "zhèng", 恶: "è",
  答: "dá", 盛: "shèng", 漂: "piào", 钻: "zuān", 塞: "sāi", 兴: "xìng", 卷: "juǎn", 观: "guān",
  露: "lù", 薄: "báo", 血: "xuè", 舍: "shě", 夹: "jiā", 扇: "shàn", 晕: "yūn", 缝: "fèng",
};

/** Normalised marked pinyin of a dataset form, for grouping duplicate forms. */
function formKey(f: HskForm): string {
  return f.transcriptions.pinyin.normalize("NFC").replace(/\s+/g, "").toLowerCase();
}

/** Canonical numeric pinyin for a reading, preferring CC-CEDICT's spelling. */
function canonicalNum(word: string, markedPinyin: string, cedict: Map<string, CedictEntry[]>): string {
  const entries = (cedict.get(word) ?? []).filter((e) => !isProperNoun(e));
  const want = markedPinyin.normalize("NFC").replace(/\s+/g, "").toLowerCase();
  const exact = entries.find((e) => e.pinyin.replace(/\s+/g, "").toLowerCase() === want);
  if (exact) return exact.pinyinNum.toLowerCase();
  const key = pinyinKey(markedPinyin);
  const sameKey = entries.filter((e) => pinyinKey(e.pinyin) === key);
  if (sameKey.length === 1) return sameKey[0].pinyinNum.toLowerCase();
  // Fall back to splitting the dataset's own spelling.
  const syl: string[] = [];
  for (const chunk of markedPinyin.trim().split(/\s+/)) {
    const parts = splitSyllables(stripTones(chunk)) ? splitMarked(chunk) : [chunk];
    syl.push(...parts);
  }
  return syl.map((s) => marksToNum(s.toLowerCase())).join(" ");
}

/** Split a marked chunk like "yīhuǐr" into ["yī","huǐ","r"] using the toneless split as a guide. */
function splitMarked(chunk: string): string[] {
  const plain = stripTones(chunk);
  const parts = splitSyllables(plain) ?? [plain];
  const out: string[] = [];
  let pos = 0;
  const chars = Array.from(chunk.normalize("NFC"));
  for (const p of parts) {
    out.push(chars.slice(pos, pos + p.length).join(""));
    pos += p.length;
  }
  return out;
}

function buildBase(hsk: HskEntry[], cedict: Map<string, CedictEntry[]>, freqTable: ReturnType<typeof loadFreqTable>) {
  const levelOf = (e: HskEntry) =>
    Math.min(...e.level.filter((l) => /^new-\d$/.test(l)).map((l) => Number(l.slice(4))));
  const selected = hsk.filter((e) => levelOf(e) <= 3);

  const words: Omit<BankWord, "id" | "rank">[] = selected.map((e) => {
    // Drop proper-noun forms (capitalised pinyin) when there are others, then group by reading.
    const isProper = (f: HskForm) => /^[A-ZĀÁǍÀĒÉĚÈŌÓǑÒ]/.test(f.transcriptions.pinyin.trim());
    const forms = e.forms.some((f) => !isProper(f)) ? e.forms.filter((f) => !isProper(f)) : e.forms;
    const groups = new Map<string, HskForm[]>();
    for (const f of forms) {
      const k = formKey(f);
      groups.set(k, [...(groups.get(k) ?? []), f]);
    }
    const readings = [...groups.entries()].map(([k, fs]) => ({
      key: k,
      forms: fs,
      pinyin: fs[0].transcriptions.pinyin.toLowerCase(),
      meanings: [...new Set(fs.flatMap((f) => f.meanings))],
    }));

    let main = readings[0];
    const override = MAIN_READING[e.simplified];
    const pro = pinyinPro(e.simplified, { toneSandhi: false }).replace(/\s+/g, "");
    const byKey = (k: string) => readings.find((r) => r.key === k.normalize("NFC"));
    if (override && byKey(override)) main = byKey(override)!;
    else if (byKey(pro)) main = byKey(pro)!;
    else main = readings.find((r) => r.meanings.some((m) => !isReferenceDefinition(m))) ?? readings[0];

    const pinyinNum = canonicalNum(e.simplified, main.pinyin, cedict);
    const others: OtherReading[] = readings
      .filter((r) => r !== main)
      .map((r) => {
        const num = canonicalNum(e.simplified, r.pinyin, cedict);
        return { pinyin: joinSyllables(num.split(" ").map(numToMarks)), pinyinNum: num, meaning: shortGloss(r.meanings, e.pos) };
      })
      .filter((r, i, arr) => r.pinyinNum !== pinyinNum && arr.findIndex((x) => x.pinyinNum === r.pinyinNum) === i);

    const meanings = main.meanings.filter((m) => !isReferenceDefinition(m));
    return {
      simplified: e.simplified,
      traditional: main.forms[0].traditional,
      pinyin: joinSyllables(pinyinNum.split(" ").map(numToMarks)),
      pinyinNum,
      meaning: shortGloss(main.meanings, e.pos),
      meanings: meanings.length ? meanings : main.meanings,
      glossSource: "auto" as const,
      pos: e.pos,
      hsk: levelOf(e),
      corpusRank: e.frequency >= 1_000_000 ? null : e.frequency,
      freq: wordFreq(freqTable, e.simplified),
      otherReadings: others,
      example: null,
    };
  });

  // Sort by the dataset's frequency rank (it looks subtitle-based, i.e. close to everyday speech).
  // Words without a rank, and erhua words (corpora mostly write 一点 for 一点儿), are placed
  // next to the ranked word whose wordfreq frequency is closest.
  const ranked = words.filter((w) => w.corpusRank !== null && !isErhua(w.simplified));
  const rankFromFreq = (freq: number) => {
    if (!freq || ranked.length === 0) return 1e7;
    let best = ranked[0];
    const d = (x: number) => Math.abs(Math.log(x || 1) - Math.log(freq));
    for (const r of ranked) if (d(r.freq) < d(best.freq)) best = r;
    return best.corpusRank! + 0.5;
  };
  const sortKey = new Map(
    words.map((w) => {
      let key = w.corpusRank ?? rankFromFreq(w.freq);
      if (isErhua(w.simplified)) key = Math.min(key, rankFromFreq(w.freq));
      return [w.simplified, key];
    }),
  );
  words.sort(
    (a, b) =>
      sortKey.get(a.simplified)! - sortKey.get(b.simplified)! || a.hsk - b.hsk || b.freq - a.freq || a.simplified.localeCompare(b.simplified),
  );
  return words;
}

/** Words like 一点儿 where 儿 is the erhua suffix (not 女儿 "daughter"). */
function isErhua(word: string): boolean {
  return word.length > 1 && word.endsWith("儿") && !["女儿", "儿子", "婴儿"].includes(word);
}

/* ------------------------------ helpers ------------------------------ */

function saveAtomic(file: string, data: unknown) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1) + "\n");
  fs.renameSync(tmp, file);
}

function writeBank(words: BankWord[]) {
  const file: WordBankFile = {
    version: 1,
    generatedAt: new Date().toISOString(),
    count: words.length,
    sources: {
      vocabulary: "HSK 3.0 levels 1–3 from drkameleon/complete-hsk-vocabulary (MIT); meanings from CC-CEDICT (CC BY-SA 4.0)",
      pinyin: "CC-CEDICT readings; sentence pinyin via pinyin-pro (MIT)",
      frequency: "wordfreq 3.1 (CC BY-SA 4.0)",
      examples: "hand-written (source=manual) or generated with an LLM via OpenRouter (source=llm)",
    },
    words,
  };
  saveAtomic(OUT, file);
}

/* -------------------------------- main -------------------------------- */

async function main() {
  const hsk = await loadHsk();
  const cedict = loadCedict();
  const freqTable = loadFreqTable();
  const base = buildBase(hsk, cedict, freqTable);

  // Stable ids: keep ids from the previous build, give new words fresh ids.
  const previous: WordBankFile | null = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : null;
  const prevBy = new Map((previous?.words ?? []).map((w) => [w.simplified, w]));
  let nextId = Math.max(0, ...(previous?.words ?? []).map((w) => w.id)) + 1;
  const words: BankWord[] = base.map((w, i) => {
    const prev = prevBy.get(w.simplified);
    const id = prev?.id ?? (previous ? nextId++ : i + 1);
    return {
      ...w,
      id,
      rank: i + 1,
      meaning: prev && prev.glossSource !== "auto" ? prev.meaning : w.meaning,
      glossSource: prev?.glossSource ?? "auto",
      example: prev?.example ?? null,
    };
  });

  // Hand-written examples and glosses always win.
  const manual: Record<string, { meaning?: string; zh: string; en: string }> = fs.existsSync(MANUAL)
    ? JSON.parse(fs.readFileSync(MANUAL, "utf8"))
    : {};
  const bySimp = new Map(words.map((w) => [w.simplified, w]));
  for (const [simp, m] of Object.entries(manual)) {
    const w = bySimp.get(simp);
    if (!w) {
      console.warn(`manual-examples.json: ${simp} is not in the word bank`);
      continue;
    }
    if (m.meaning) {
      w.meaning = m.meaning;
      w.glossSource = "manual";
    }
    w.example = { zh: m.zh, en: m.en, pinyin: "", source: "manual", later: [], outside: [], flagged: false };
  }

  // Lexicon for segmentation/pinyin of example sentences.
  const rankOf = new Map(words.map((w) => [w.simplified, w.rank]));
  const lex = makeLexicon({
    bank: new Map(words.map((w) => [w.simplified, { readings: [w.pinyinNum, ...w.otherReadings.map((r) => r.pinyinNum)], pos: w.pos }])),
    dictWords: new Set(cedict.keys()),
    dictReadings: (word) => {
      const list = cedict.get(word) ?? [];
      return [...list.filter((e) => !isProperNoun(e)), ...list.filter(isProperNoun)].map((e) => e.pinyinNum.toLowerCase());
    },
    freq: (word) => freqTable.map.get(word) ?? 0,
  });
  const check = (zh: string, w: BankWord) => checkExample(zh, w, lex, (x) => rankOf.get(x));
  const finishExample = (w: BankWord) => {
    if (!w.example) return;
    const c = check(w.example.zh, w);
    w.example.pinyin = tokensToPinyinSentence(tokenize(w.example.zh, lex));
    w.example.later = c.later;
    w.example.outside = c.outside;
    w.example.flagged = !c.ok;
  };
  words.forEach(finishExample);
  writeBank(words);
  const withEx = words.filter((w) => w.example).length;
  console.log(`Stage 1 done: ${words.length} words, ${withEx} with example sentences → ${path.relative(ROOT, OUT)}`);

  if (flag("skip-llm")) return;
  if (!process.env.OPENROUTER_API_KEY) {
    console.log("\nNo OPENROUTER_API_KEY found (environment or .env.local), so example sentences were not generated.");
    console.log("Add the key to .env.local and run `npm run build:words` again. It resumes where it stopped.");
    return;
  }
  await stage2(words, check, finishExample);
}

/* ------------------------------ stage 2 ------------------------------ */

const SCHEMA = {
  name: "word_examples",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["word", "gloss", "sentence", "translation"],
          properties: {
            word: { type: "string" },
            gloss: { type: "string" },
            sentence: { type: "string" },
            translation: { type: "string" },
          },
        },
      },
    },
  },
};

function vocabBlock(words: BankWord[], upToRank: number): string {
  const lines: string[] = [];
  const list = words.filter((w) => w.rank < upToRank);
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    lines.push(`[${chunk[0].rank}-${chunk[chunk.length - 1].rank}] ${chunk.map((w) => w.simplified).join(" ")}`);
  }
  return lines.join("\n");
}

async function stage2(
  words: BankWord[],
  check: (zh: string, w: BankWord) => ReturnType<typeof checkExample>,
  finishExample: (w: BankWord) => void,
) {
  const pending = words.filter(
    (w) => !w.example || (flag("redo-flagged") && w.example.source === "llm" && w.example.flagged),
  );
  console.log(`\nStage 2: ${pending.length} words need an example sentence (model ${MODEL}).`);
  let done = 0;
  let cost = 0;

  for (let i = 0; i < pending.length && done < LIMIT; i += BATCH) {
    const batch = pending.slice(i, Math.min(i + BATCH, i + LIMIT - done));
    const best = new Map<string, { gloss: string; zh: string; en: string; score: number; ok: boolean }>();
    let todo = batch;
    for (let attempt = 1; attempt <= ATTEMPTS && todo.length; attempt++) {
      const maxRank = Math.max(...todo.map((w) => w.rank));
      const targets = todo
        .map((w) => {
          const prev = best.get(w.simplified);
          const feedback = prev ? ` PREVIOUS ATTEMPT "${prev.zh}" WAS REJECTED: ${check(prev.zh, w).problems.join("; ")}.` : "";
          return `#${w.rank} ${w.simplified} (${w.pinyin}): ${w.meanings.slice(0, 3).join(" / ")}.${feedback}`;
        })
        .join("\n");
      const messages = [
        {
          role: "system" as const,
          content:
            "You write example sentences for a beginner's Chinese (simplified, Mandarin) vocabulary list, " +
            "ordered by frequency. For each target word write: a short English gloss (1–4 words, the most common " +
            "meaning, e.g. 'today', 'to eat', 'possessive particle'), and ONE short, natural, everyday sentence " +
            "(4–14 characters) that contains the target word exactly as written. The learner only knows the " +
            "words numbered BEFORE the target, so build the sentence ONLY from the target and words with a smaller " +
            "number in the ALLOWED list (exact words, no other words, no names, no other compounds). Arabic digits " +
            "are fine. Then give a natural English translation. Reply with JSON only.",
        },
        {
          role: "user" as const,
          content: `ALLOWED (numbered by frequency rank):\n${vocabBlock(words, maxRank)}\n\nTARGETS:\n${targets}\n\nReturn {"items":[{"word","gloss","sentence","translation"}]} with one item per target, in order.`,
        },
      ];
      let items: { word: string; gloss: string; sentence: string; translation: string }[] = [];
      try {
        const res = await chat({ model: MODEL, messages, schema: SCHEMA, temperature: attempt === 1 ? 0.6 : 0.9 });
        cost += res.usage.cost;
        const parsed = extractJson(res.content) as { items?: typeof items } | undefined;
        items = Array.isArray(parsed?.items) ? parsed!.items : [];
      } catch (e) {
        if (e instanceof OpenRouterError && (e.kind === "auth" || e.kind === "credits" || e.kind === "no_key" || e.kind === "model")) {
          console.error(`\n${e.message}`);
          process.exit(1);
        }
        console.warn(`  request failed (${(e as Error).message}); retrying`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      for (const w of todo) {
        const item = items.find((x) => x.word?.trim() === w.simplified) ?? items[todo.indexOf(w)];
        if (!item || typeof item.sentence !== "string") continue;
        const zh = item.sentence.trim();
        const c = check(zh, w);
        const prev = best.get(w.simplified);
        if (!prev || c.score < prev.score) {
          best.set(w.simplified, { gloss: String(item.gloss ?? "").trim(), zh, en: String(item.translation ?? "").trim(), score: c.score, ok: c.ok });
        }
      }
      todo = todo.filter((w) => !best.get(w.simplified)?.ok);
    }

    for (const w of batch) {
      const b = best.get(w.simplified);
      if (!b) continue;
      if (b.gloss && b.gloss.length <= 60 && w.glossSource === "auto") {
        w.meaning = b.gloss;
        w.glossSource = "llm";
      }
      w.example = { zh: b.zh, en: b.en, pinyin: "", source: "llm", later: [], outside: [], flagged: false };
      finishExample(w);
      done++;
    }
    writeBank(words);
    const flagged = batch.filter((w) => w.example?.flagged).length;
    console.log(
      `  ${Math.min(i + batch.length, pending.length)}/${pending.length} (ranks ${batch[0].rank}–${batch[batch.length - 1].rank})` +
        `${flagged ? `, ${flagged} flagged` : ""} · cost so far $${cost.toFixed(4)}`,
    );
  }
  const totalFlagged = words.filter((w) => w.example?.flagged).length;
  const missing = words.filter((w) => !w.example).length;
  console.log(`\nDone. ${missing} words still without a sentence, ${totalFlagged} flagged. Run \`npm run validate:words\` for the report.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
