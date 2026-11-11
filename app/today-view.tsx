import Link from "next/link";
import { ButtonLink, Card, ProgressBar } from "@/components/ui";
import type { Overview, Step } from "@/lib/server/session";

const ICONS: Record<Step["id"], string> = {
  review: "↺",
  learn: "＋",
  quiz: "✓",
  conversation: "💬",
  summary: "★",
};

function formatDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export function TodayView({ overview, streak, todayDone }: { overview: Overview; streak: number; todayDone: boolean }) {
  const current = overview.steps.find((s) => s.id === overview.current);
  const started = overview.steps.some((s) => s.status === "in_progress" || s.status === "done");
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{formatDay(overview.studyDay)}</p>
          <h1 className="text-3xl font-semibold">Today&apos;s session</h1>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${todayDone ? "bg-ok-soft text-ok" : "bg-surface-2 text-muted"}`}
          title={todayDone ? "Today counts towards your streak" : "Finish all 5 steps to extend your streak"}
          aria-label={`Streak: ${streak} day${streak === 1 ? "" : "s"}`}
        >
          <span aria-hidden>🔥</span>
          <span className="font-semibold">{streak}</span>
          <span>day{streak === 1 ? "" : "s"}</span>
        </div>
      </div>

      {overview.completed ? (
        <Card className="border-ok bg-ok-soft">
          <p className="text-lg font-medium text-ok">All done for today. 做得好！</p>
          <p className="mt-1 text-sm">
            See your <Link href="/session/summary" className="underline">summary</Link>.
          </p>
          <p className="mt-1 text-sm">
            Come back tomorrow for new words. You can{" "}
            <Link href="/session/chat" className="underline">
              keep chatting
            </Link>{" "}
            or browse your{" "}
            <Link href="/words" className="underline">
              words
            </Link>
            .
          </p>
        </Card>
      ) : current ? (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted">{started ? "Continue with" : "Start with"}</div>
            <div className="text-xl font-semibold">{current.title}</div>
            <div className="text-sm text-muted">{current.detail}</div>
          </div>
          <ButtonLink href={current.href} className="px-7 py-3 text-base">
            {started ? "Continue" : "Start"}
          </ButtonLink>
        </Card>
      ) : null}

      <ol className="space-y-3">
        {overview.steps.map((s, i) => (
          <li key={s.id}>
            <StepRow step={s} index={i + 1} current={s.id === overview.current} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepRow({ step, index, current }: { step: Step; index: number; current: boolean }) {
  const finished = step.status === "done" || step.status === "skipped";
  const chip =
    step.status === "done"
      ? { text: "Done", cls: "bg-ok-soft text-ok" }
      : step.status === "skipped"
        ? { text: "Skipped", cls: "bg-surface-2 text-muted" }
        : step.status === "in_progress"
          ? { text: "In progress", cls: "bg-accent-soft text-accent" }
          : step.status === "locked"
            ? { text: "Later", cls: "bg-surface-2 text-muted" }
            : { text: "Ready", cls: "bg-accent-soft text-accent" };
  const inner = (
    <div
      className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
        current ? "border-accent bg-surface shadow-sm" : "border-border bg-surface"
      } ${step.status === "locked" ? "opacity-60" : "hover:bg-surface-2"}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
          finished ? "bg-ok-soft text-ok" : current ? "bg-accent text-accent-text" : "bg-surface-2 text-muted"
        }`}
        aria-hidden
      >
        {finished ? "✓" : ICONS[step.id]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted">{index}</span>
          <span className="font-medium">{step.title}</span>
        </div>
        <div className="truncate text-sm text-muted">{step.detail}</div>
        {step.total > 0 && step.status !== "skipped" && step.id !== "summary" ? (
          <ProgressBar value={step.done} max={step.total} className="mt-2" />
        ) : null}
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${chip.cls}`}>{chip.text}</span>
    </div>
  );
  if (step.status === "locked") return inner;
  return (
    <Link href={step.href} className="block">
      {inner}
    </Link>
  );
}
