import { openRouterBaseUrl } from "@/lib/openrouter";

/** GET /api/models?id=x — check a model ID against OpenRouter's model list (needs network). */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  try {
    const res = await fetch(`${openRouterBaseUrl()}/models`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`OpenRouter answered ${res.status}`);
    const { data } = (await res.json()) as { data: { id: string; name?: string; pricing?: { prompt?: string; completion?: string } }[] };
    const m = data.find((x) => x.id === id);
    if (!m) {
      const close = data.filter((x) => x.id.includes(id.split("/").pop() ?? id)).slice(0, 5).map((x) => x.id);
      return Response.json({ exists: false, suggestions: close });
    }
    const perM = (p?: string) => (p ? Number(p) * 1e6 : null);
    return Response.json({ exists: true, name: m.name ?? m.id, inputPerMillion: perM(m.pricing?.prompt), outputPerMillion: perM(m.pricing?.completion) });
  } catch (e) {
    return Response.json({ error: `Couldn't reach OpenRouter: ${(e as Error).message}` }, { status: 502 });
  }
}
