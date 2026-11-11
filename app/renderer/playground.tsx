"use client";

import { useState } from "react";
import { ZhText } from "@/components/ZhText";
import { useApp } from "@/components/AppProvider";

const SAMPLES = [
  "你今天吃了什么？",
  "我们一起去银行吧，行不行？",
  "他跑得很快，我得走了。",
  "我有一点儿累，你要不要喝茶？",
  "不是，一个人一起去。",
  "我有3个iPhone！",
];

/** Try the display rule on any text, with your real learned words plus pretend ones. */
export function RendererPlayground() {
  const { learned } = useApp();
  const [text, setText] = useState(SAMPLES[0]);
  const [extra, setExtra] = useState("你 今天 了 什么");
  const pretend = extra.split(/[\s,，]+/).filter(Boolean);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Renderer playground</h1>
        <p className="mt-1 text-sm text-muted">
          See how any Chinese text is shown to you: learned words in characters, everything else in pinyin. Tap a word to look it up.
          You have learned {learned.size} word{learned.size === 1 ? "" : "s"} so far.
        </p>
      </div>
      <label className="block">
        <span className="text-sm font-medium">Chinese text</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="zh mt-1 w-full rounded-xl border border-border bg-surface p-3 text-lg"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button key={s} type="button" onClick={() => setText(s)} className="zh rounded-full border border-border bg-surface px-3 py-1 text-sm">
            {s}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-sm font-medium">Pretend I have also learned (separate with spaces)</span>
        <input value={extra} onChange={(e) => setExtra(e.target.value)} className="zh mt-1 w-full rounded-xl border border-border bg-surface p-3" />
      </label>
      <div className="rounded-2xl border border-border bg-surface p-5">
        <ZhText key={text} text={text} size="xl" alsoLearned={pretend} />
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-1 text-sm text-muted">With pinyin above every character</div>
        <ZhText text={text} size="xl" ruby />
      </div>
    </div>
  );
}
