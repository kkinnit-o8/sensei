import { connection } from "next/server";
import { overview } from "@/lib/server/session";
import { now } from "@/lib/server/clock";

export async function GET() {
  await connection();
  return Response.json(overview(now()));
}
