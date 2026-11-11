import { connection } from "next/server";
import { overview } from "@/lib/server/session";
import { now } from "@/lib/server/clock";
import { streakInfo } from "@/lib/server/summary";
import { TodayView } from "./today-view";

export default async function Home() {
  await connection();
  const t = now();
  const o = overview(t);
  const s = streakInfo(t);
  return <TodayView overview={o} streak={s.current} todayDone={s.todayDone} />;
}
