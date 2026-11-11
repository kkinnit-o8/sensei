import { getSettings, saveSettings } from "@/lib/server/settings";
import { settingsSchema } from "@/lib/settings";
import { connection } from "next/server";

export async function GET() {
  await connection();
  return Response.json(getSettings());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.partial().safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 400 });
  return Response.json(saveSettings(parsed.data));
}
