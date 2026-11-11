import { connection } from "next/server";
import { exportAll, importAll } from "@/lib/server/backup";

/** Download all progress as JSON. */
export async function GET() {
  await connection();
  const data = exportAll();
  const day = data.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(data, null, 1), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="chinese-teacher-backup-${day}.json"`,
    },
  });
}

/** Replace all progress with an uploaded backup. */
export async function POST(req: Request) {
  const data = await req.json().catch(() => null);
  try {
    return Response.json({ ok: true, counts: importAll(data) });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
