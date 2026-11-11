/**
 * Minimal OpenRouter Chat Completions client. Server-side only: it reads
 * OPENROUTER_API_KEY from the environment and must never be imported by
 * client components. Also used by the word bank build script.
 */

export { DEFAULT_MODEL } from "./models";

export function openRouterBaseUrl(): string {
  return (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public kind: "no_key" | "auth" | "credits" | "rate_limit" | "model" | "network" | "server" | "bad_request",
    public status?: number,
  ) {
    super(message);
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  /** Cost in USD (OpenRouter credits), when reported. */
  cost: number;
}

export interface ChatResult {
  content: string;
  usage: Usage;
  model: string;
}

type ReasoningInfo = { mandatory?: boolean; supported_efforts?: string[] | null } | undefined;
const reasoningCache = new Map<string, { info: ReasoningInfo; at: number }>();

/** Look up a model's reasoning options from /models (cached for a day). Failures are ignored. */
async function reasoningInfo(model: string, apiKey: string): Promise<ReasoningInfo> {
  const hit = reasoningCache.get(model);
  if (hit && Date.now() - hit.at < 24 * 3600e3) return hit.info;
  try {
    const res = await fetch(`${openRouterBaseUrl()}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { data?: { id: string; reasoning?: ReasoningInfo }[] };
    for (const m of json.data ?? []) reasoningCache.set(m.id, { info: m.reasoning, at: Date.now() });
    return reasoningCache.get(model)?.info;
  } catch {
    return undefined;
  }
}

/** Pick the lowest reasoning effort the model accepts; we want quick, short replies. */
function lowestEffort(info: ReasoningInfo): { effort: string } | undefined {
  if (!info) return undefined;
  const efforts = info.supported_efforts;
  if (!efforts || efforts.length === 0) return info.mandatory ? undefined : { effort: "none" };
  for (const e of ["none", "minimal", "low", "medium", "high", "xhigh", "max"]) {
    if (e === "none" && info.mandatory) continue;
    if (efforts.includes(e)) return { effort: e };
  }
  return undefined;
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  /** JSON schema for structured output. */
  schema?: { name: string; schema: Record<string, unknown> };
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  timeoutMs?: number;
}

function classify(status: number, body: string): OpenRouterError {
  let msg = body;
  try {
    const j = JSON.parse(body) as { error?: { message?: string } };
    if (j.error?.message) msg = j.error.message;
  } catch {
    /* keep raw body */
  }
  if (status === 401) return new OpenRouterError("OpenRouter rejected the API key (401). Check OPENROUTER_API_KEY in .env.local.", "auth", status);
  if (status === 402) return new OpenRouterError("Your OpenRouter account is out of credits (402).", "credits", status);
  if (status === 429) return new OpenRouterError("OpenRouter rate limit reached (429). Wait a moment and retry.", "rate_limit", status);
  if (status === 404 || /model/i.test(msg) && status === 400)
    return new OpenRouterError(`Model problem: ${msg}`, "model", status);
  if (status >= 500) return new OpenRouterError(`OpenRouter server error (${status}): ${msg}`, "server", status);
  return new OpenRouterError(`OpenRouter error (${status}): ${msg}`, "bad_request", status);
}

/**
 * Send a chat completion. With a schema it asks for strict JSON output and falls back
 * to plain JSON mode if no provider supports structured outputs for the model.
 */
export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const apiKey = opts.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError("No OpenRouter API key. Add OPENROUTER_API_KEY=... to .env.local and restart the app.", "no_key");
  }
  const reasoning = lowestEffort(await reasoningInfo(opts.model, apiKey));

  const attempts: Record<string, unknown>[] = [];
  const base: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 4000,
  };
  if (reasoning) base.reasoning = reasoning;
  if (opts.schema) {
    attempts.push({
      ...base,
      response_format: { type: "json_schema", json_schema: { name: opts.schema.name, strict: true, schema: opts.schema.schema } },
      provider: { require_parameters: true },
    });
    attempts.push({ ...base, response_format: { type: "json_object" } });
  } else attempts.push(base);
  // Last resort: drop the reasoning parameter in case the model rejects it.
  if (reasoning) attempts.push({ ...attempts[attempts.length - 1], reasoning: undefined });

  let lastError: OpenRouterError | null = null;
  for (const body of attempts) {
    let res: Response;
    try {
      res = await fetch(`${openRouterBaseUrl()}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "chinese-teacher",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
      });
    } catch (e) {
      throw new OpenRouterError(`Could not reach OpenRouter: ${(e as Error).message}`, "network");
    }
    const text = await res.text();
    if (!res.ok) {
      const err = classify(res.status, text);
      // Only fall through to the next attempt for parameter-support problems.
      if (res.status === 400 || res.status === 404) {
        lastError = err;
        if (err.kind === "model" && !/support|parameter|response_format|reasoning|provider/i.test(err.message)) throw err;
        continue;
      }
      throw err;
    }
    let json: {
      choices?: { message?: { content?: string | null }; finish_reason?: string }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
      model?: string;
      error?: { message?: string };
    };
    try {
      json = JSON.parse(text);
    } catch {
      throw new OpenRouterError("OpenRouter returned a response that is not JSON.", "server");
    }
    if (json.error?.message) throw new OpenRouterError(json.error.message, "server");
    const content = json.choices?.[0]?.message?.content ?? "";
    return {
      content,
      model: json.model ?? opts.model,
      usage: {
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: json.usage?.completion_tokens ?? 0,
        cost: json.usage?.cost ?? 0,
      },
    };
  }
  throw lastError ?? new OpenRouterError("OpenRouter request failed.", "server");
}

export { extractJsonObject as extractJson } from "./json";
