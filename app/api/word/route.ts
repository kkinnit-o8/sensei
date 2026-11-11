import { wordInfo } from "@/lib/server/word-info";

/** GET /api/word?w=今天 -> WordInfo */
export async function GET(req: Request) {
  const w = new URL(req.url).searchParams.get("w")?.trim();
  if (!w || w.length > 16) return Response.json({ error: "Missing word" }, { status: 400 });
  return Response.json(wordInfo(w));
}
