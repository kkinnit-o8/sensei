import { connection } from "next/server";
import { now } from "@/lib/server/clock";
import { progressStats } from "@/lib/server/progress";
import { Card, ProgressBar } from "@/components/ui";
import { Heatmap } from "./heatmap";
import { InfoTip } from "@/components/InfoTip";

export const metadata = { title: "Progress · Chinese Teacher" };

const pct = (x: number) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;

export default async function ProgressPage() {
  await connection();
  const s = progressStats(now());
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Progress</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={s.learnedCount.toLocaleString()} label="words learned" />
        <Stat value={String(s.dueTomorrow)} label="reviews due tomorrow" />
        <Stat value={`${s.streak.current}`} label={`day streak · best ${s.streak.longest}`} />
        <Stat value={s.totalReviews.toLocaleString()} label="reviews done" />
      </div>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">How much everyday Chinese you can read</h2>
          <InfoTip label="How is this estimated?">
            <p>
              This is the share of <b>words</b> in typical modern Chinese text that are words you have learned. It uses word frequencies
              from <i>wordfreq</i>, which counts words in film subtitles, Wikipedia, news, books and the web.
            </p>
            <p className="mt-2">
              Each word you learn adds its frequency: 的 alone is about 6.5% of all words, so the first few words count a lot and rare
              words very little. Words are counted as whole words, so knowing 中 and 国 does not count 中国.
            </p>
            <p className="mt-2">
              It is an estimate: it ignores names, numbers and grammar, and reading comfortably usually needs about 95% of the words in a
              text.
            </p>
          </InfoTip>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-semibold">{pct(s.coverage)}</span>
          <span className="pb-1 text-sm text-muted">of words in everyday text</span>
        </div>
        <ProgressBar value={s.coverage} max={1} />
        <p className="text-sm text-muted">
          Learning all {s.bankCount.toLocaleString()} words in your list would cover about {pct(s.bankCoverage)}.
          {s.milestones.length
            ? ` Milestones: ${s.milestones.map((m) => `${pct(m.share)} after ${m.words.toLocaleString()} words`).join(" · ")}.`
            : ""}
        </p>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Study calendar</h2>
        <Heatmap days={s.activity} today={s.today} />
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">By HSK level</h2>
        {s.learnedByHsk.map((l) => (
          <div key={l.level} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>HSK {l.level}</span>
              <span className="text-muted">
                {l.learned} / {l.total}
              </span>
            </div>
            <ProgressBar value={l.learned} max={l.total} />
          </div>
        ))}
        {s.customLearned ? <p className="text-sm text-muted">Plus {s.customLearned} words you added from chats.</p> : null}
      </Card>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card className="p-4 sm:p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </Card>
  );
}
