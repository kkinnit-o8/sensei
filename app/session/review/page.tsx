import { connection } from "next/server";
import { now } from "@/lib/server/clock";
import { getOrCreateDay } from "@/lib/server/session";
import { reviewView } from "@/lib/server/review-view";
import { ReviewStep } from "./review-step";

export default async function ReviewPage() {
  await connection();
  const t = now();
  return <ReviewStep initial={reviewView(getOrCreateDay(t), t)} />;
}
