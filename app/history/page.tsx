import Link from "next/link";
import { connection } from "next/server";
import { listConversations } from "@/lib/server/chat";
import { Card } from "@/components/ui";

function formatDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default async function HistoryPage() {
  await connection();
  const convs = listConversations();
  const total = convs.reduce((s, c) => s + c.cost, 0);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Past conversations</h1>
        <p className="text-sm text-muted">Every chat is saved here. {total > 0 ? `Total cost so far ≈ $${total.toFixed(3)}.` : ""}</p>
      </div>
      {convs.length === 0 ? (
        <Card>
          <p className="text-muted">No conversations yet. Your first one is step 4 of today&apos;s session.</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {convs.map((c) => (
            <li key={c.id}>
              <Link href={`/history/${c.id}`} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-muted">{formatDay(c.study_day)}</div>
                  <div className="font-medium">{c.topic}</div>
                </div>
                <div className="shrink-0 text-right text-sm text-muted">
                  <div>
                    {c.exchanges} exchange{c.exchanges === 1 ? "" : "s"}
                  </div>
                  {c.cost > 0 ? <div className="text-xs">≈ ${c.cost.toFixed(4)}</div> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
