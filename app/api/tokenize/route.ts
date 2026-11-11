import { tokenizeText } from "@/lib/server/lexicon";
import { z } from "zod";

const body = z.object({ texts: z.array(z.string().max(4000)).max(200) });

/** POST {texts: string[]} -> {tokens: Token[][]}. Segmentation + pinyin run on the server. */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Expected {texts: string[]}" }, { status: 400 });
  return Response.json({ tokens: parsed.data.texts.map(tokenizeText) });
}
