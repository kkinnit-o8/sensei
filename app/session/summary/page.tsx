import { connection } from "next/server";
import { now } from "@/lib/server/clock";
import { daySummary } from "@/lib/server/summary";
import { StepHeader } from "@/components/ui";
import { SummaryView } from "./summary-view";

export default async function SummaryPage() {
  await connection();
  return (
    <div>
      <StepHeader step={5} title="Summary" />
      <SummaryView initial={daySummary(now())} />
    </div>
  );
}
