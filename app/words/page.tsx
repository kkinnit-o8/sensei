import { connection } from "next/server";
import { customWords, loadBank } from "@/lib/server/words";
import { learnedWords } from "@/lib/server/learned";
import { queuedWords } from "@/lib/server/queue";
import { WordList, type WordRow } from "./word-list";

export const metadata = { title: "Words · Chinese Teacher" };

export default async function WordsPage() {
  await connection();
  const learned = new Set(learnedWords());
  const queued = new Set(queuedWords());
  const rows: WordRow[] = [
    ...loadBank().words.map((w) => ({
      s: w.simplified,
      n: w.pinyinNum,
      p: w.pinyin,
      m: w.meaning,
      h: w.hsk,
      r: w.rank,
      l: learned.has(w.simplified),
      q: queued.has(w.simplified),
    })),
    ...customWords().map((c) => ({ s: c.simplified, n: c.pinyinNum, p: c.pinyin, m: c.meaning, h: 0, r: 0, l: learned.has(c.simplified), q: queued.has(c.simplified) })),
  ];
  return <WordList rows={rows} />;
}
