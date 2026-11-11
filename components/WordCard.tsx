"use client";

import { AudioButton } from "./AudioButton";
import { HanziWord, TonePinyin, ZhText, syllablesFromNum } from "./ZhText";
import type { StudyCard } from "@/lib/server/study-card";

/** The back of a card: pinyin, meaning, other readings and the example sentence. */
export function WordDetails({ card }: { card: StudyCard }) {
  return (
    <div className="space-y-4">
      <div>
        <TonePinyin num={card.pinyinNum} className="text-2xl" />
        <p className="mt-1 text-xl">{card.meaning}</p>
        {card.meanings.length > 1 ? (
          <p className="mt-1 text-sm text-muted">{card.meanings.slice(0, 3).join(" · ")}</p>
        ) : null}
        {card.otherReadings.length ? (
          <p className="mt-1 text-sm text-muted">
            Also:{" "}
            {card.otherReadings.map((r, i) => (
              <span key={i}>
                {i ? "; " : ""}
                <TonePinyin num={r.pinyinNum} /> {r.meaning}
              </span>
            ))}
          </p>
        ) : null}
      </div>
      {card.example ? (
        <div className="rounded-xl bg-surface-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <ZhText text={card.example.zh} tokens={card.example.tokens} size="lg" alsoLearned={[card.simplified]} />
            <AudioButton text={card.example.zh} size="sm" label="Play sentence" />
          </div>
          <p className="mt-1 text-sm text-muted">{card.example.en}</p>
        </div>
      ) : (
        <p className="text-sm text-muted">No example sentence yet (run npm run build:words to generate them).</p>
      )}
    </div>
  );
}

/** Big characters for a card; plain (no tone colours) until the answer is shown. */
export function CardWord({ card, colored }: { card: StudyCard; colored: boolean }) {
  const syllables = syllablesFromNum(card.simplified, card.pinyinNum);
  return colored ? (
    <HanziWord token={{ syllables }} className="text-7xl leading-tight sm:text-8xl" />
  ) : (
    <span className="zh text-7xl leading-tight sm:text-8xl" lang="zh-CN">
      {card.simplified}
    </span>
  );
}
