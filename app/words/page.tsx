import { connection } from "next/server";
import { loadBank } from "@/lib/server/words";

export default async function WordsPage() {
  await connection();
  const { words } = loadBank();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Words</h1>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {words.slice(0, 200).map((w) => (
          <li key={w.id} className="flex items-baseline gap-3 px-4 py-2.5">
            <span className="w-10 text-right text-xs text-muted tabular-nums">{w.rank}</span>
            <span className="zh text-xl">{w.simplified}</span>
            <span className="text-sm text-pinyin">{w.pinyin}</span>
            <span className="truncate text-sm text-muted">{w.meaning}</span>
            <span className="ml-auto shrink-0 rounded bg-surface-2 px-1.5 text-xs text-muted">HSK {w.hsk}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
