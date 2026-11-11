import type { DayActivity } from "@/lib/server/progress";

/** GitHub-style calendar: one square per study day, darker = more done, ringed = all steps completed. */
export function Heatmap({ days, today }: { days: DayActivity[]; today: string }) {
  // Pad the start so columns are weeks starting on Monday.
  const first = days[0];
  const [y, m, d] = first.day.split("-").map(Number);
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7; // Monday = 0
  const cells: (DayActivity | null)[] = [...Array(weekday).fill(null), ...days];
  const weeks: (DayActivity | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const level = (a: DayActivity) => {
    const n = a.reviews + a.learned * 2 + a.messages;
    if (n === 0) return 0;
    if (n < 10) return 1;
    if (n < 25) return 2;
    if (n < 50) return 3;
    return 4;
  };
  const shades = ["bg-surface-2", "bg-accent/25", "bg-accent/50", "bg-accent/75", "bg-accent"];

  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1" role="img" aria-label="Study calendar for the last months">
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {w.map((a, j) =>
              a ? (
                <div
                  key={j}
                  title={`${a.day}: ${a.reviews} reviews, ${a.learned} new words, ${a.messages} chat messages${a.completed ? " · session completed" : ""}`}
                  className={`h-3.5 w-3.5 rounded-[3px] ${shades[level(a)]} ${a.completed ? "ring-2 ring-ok ring-offset-1 ring-offset-surface" : ""} ${
                    a.day === today ? "outline outline-1 outline-text/40" : ""
                  }`}
                />
              ) : (
                <div key={j} className="h-3.5 w-3.5" />
              ),
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          Less
          {shades.map((s) => (
            <span key={s} className={`inline-block h-3 w-3 rounded-[3px] ${s}`} />
          ))}
          More
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-[3px] bg-surface-2 ring-2 ring-ok ring-offset-1 ring-offset-surface" /> all 5 steps done
        </span>
      </div>
    </div>
  );
}
