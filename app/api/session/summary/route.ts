import { now } from "@/lib/server/clock";
import { markSummarySeen } from "@/lib/server/summary";

/** The learner has opened the summary: completes the day (and the streak) if all steps are done. */
export async function POST() {
  return Response.json(markSummarySeen(now()));
}
