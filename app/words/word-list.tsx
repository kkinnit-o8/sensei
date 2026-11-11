"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { HanziWord, TonePinyin, syllablesFromNum } from "@/components/ZhText";
import { useApp } from "@/components/AppProvider";
import { pinyinKey } from "@/lib/zh/pinyin";

/** Compact row: s=simplified, n=numeric pinyin, p=pinyin, m=meaning, h=HSK (0 = custom), r=rank, l=learned, q=queued. */
export interface WordRow {
  s: string;
  n: string;
  p: string;
  m: string;
  h: number;
  r: number;
  l: boolean;
  q: boolean;
}

type Status = "all" | "learned" | "new" | "queued";
const PAGE = 100;

export function WordList({ rows }: { rows: WordRow[] }) {
  const { learned: learnedNow } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [level, setLevel] = useState<number | "all">("all");
  const [limit, setLimit] = useState(PAGE);
  const q = useDeferredValue(query.trim());

  const isLearned = (r: WordRow) => r.l || learnedNow.has(r.s);
  const filtered = useMemo(() => {
    const key = pinyinKey(q);
    const toned = q.toLowerCase().replace(/\s+/g, "");
    const lower = q.toLowerCase();
    return rows.filter((r) => {
      if (level !== "all" && r.h !== level) return false;
      const l = r.l || learnedNow.has(r.s);
      if (status === "learned" && !l) return false;
      if (status === "new" && l) return false;
      if (status === "queued" && !r.q) return false;
      if (!q) return true;
      if (r.s.includes(q)) return true;
      // Pinyin: "jintian", "jin1tian1" and "jīntiān" all match 今天.
      if (key && (pinyinKey(r.n).startsWith(key) || r.p.toLowerCase().replace(/'/g, "").includes(toned))) return true;
      if (/[a-z]/i.test(q) && toned.match(/[1-5]/) && r.n.replace(/\s+/g, "").startsWith(toned)) return true;
      return lower.length > 1 && r.m.toLowerCase().includes(lower);
    });
  }, [rows, q, status, level, learnedNow]);

  const learnedCount = rows.filter(isLearned).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Words</h1>
        <span className="text-sm text-muted">
          {learnedCount} of {rows.length.toLocaleString()} learned
        </span>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
          placeholder="Search characters, pinyin (jintian, jin1tian1) or meaning"
          aria-label="Search words"
          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5"
        />
        <div className="flex flex-wrap gap-2">
          {(["all", "learned", "new", "queued"] as Status[]).map((s) => (
            <Chip key={s} active={status === s} onClick={() => { setStatus(s); setLimit(PAGE); }}>
              {s === "all" ? "All" : s === "learned" ? "Learned" : s === "new" ? "Not learned" : "In queue"}
            </Chip>
          ))}
          <span className="mx-1 w-px self-stretch bg-border" />
          {(["all", 1, 2, 3, 0] as const).map((h) => (
            <Chip key={String(h)} active={level === h} onClick={() => { setLevel(h); setLimit(PAGE); }}>
              {h === "all" ? "All levels" : h === 0 ? "Custom" : `HSK ${h}`}
            </Chip>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted">{filtered.length.toLocaleString()} words</p>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {filtered.slice(0, limit).map((r) => (
          <li key={r.s}>
            <Link href={`/words/${encodeURIComponent(r.s)}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
              <span className="w-10 shrink-0 text-right text-xs text-muted tabular-nums">{r.r || "★"}</span>
              <HanziWord token={{ syllables: syllablesFromNum(r.s, r.n) }} className="w-20 shrink-0 text-xl sm:w-24" />
              <span className="min-w-0 flex-1">
                <TonePinyin num={r.n} className="text-sm" />
                <span className="block truncate text-sm text-muted">{r.m}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="rounded bg-surface-2 px-1.5 text-[11px] text-muted">{r.h ? `HSK ${r.h}` : "custom"}</span>
                {isLearned(r) ? <span className="text-[11px] text-ok">learned</span> : r.q ? <span className="text-[11px] text-accent">queued</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {filtered.length > limit ? (
        <button type="button" onClick={() => setLimit((l) => l + PAGE * 2)} className="w-full rounded-full border border-border bg-surface py-2.5 text-sm">
          Show more ({(filtered.length - limit).toLocaleString()} left)
        </button>
      ) : null}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-text"}`}
    >
      {children}
    </button>
  );
}
