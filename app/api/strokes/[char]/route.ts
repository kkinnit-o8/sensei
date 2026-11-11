import fs from "node:fs/promises";
import path from "node:path";

/**
 * Stroke data for one character, served from the hanzi-writer-data package in node_modules
 * (about 9,500 characters), so stroke order works offline.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/strokes/[char]">) {
  const { char } = await ctx.params;
  const ch = decodeURIComponent(char);
  if (Array.from(ch).length !== 1 || !/\p{Script=Han}/u.test(ch)) {
    return Response.json({ error: "One Chinese character expected" }, { status: 400 });
  }
  const file = path.join(/*turbopackIgnore: true*/ process.cwd(), "node_modules", "hanzi-writer-data", `${ch}.json`);
  try {
    const data = await fs.readFile(file, "utf8");
    return new Response(data, {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return Response.json({ error: `No stroke data for ${ch}` }, { status: 404 });
  }
}
