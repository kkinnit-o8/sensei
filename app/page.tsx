import { connection } from "next/server";
import { overview } from "@/lib/server/session";
import { now } from "@/lib/server/clock";
import { TodayView } from "./today-view";

export default async function Home() {
  await connection();
  const o = overview(now());
  return <TodayView overview={o} />;
}
