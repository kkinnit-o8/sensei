"use client";
/**
 * Client cache for tokenized text. Requests made in the same tick are batched into one
 * POST /api/tokenize call. Server components can pre-seed the cache by passing tokens.
 */
import { useEffect, useSyncExternalStore } from "react";
import type { Token } from "@/lib/zh/types";

const cache = new Map<string, Token[]>();
const waiting = new Map<string, ((t: Token[] | null) => void)[]>();
const failures = new Set<string>();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit() {
  listeners.forEach((l) => l());
}

async function flush() {
  timer = null;
  const texts = [...waiting.keys()];
  const callbacks = new Map(waiting);
  waiting.clear();
  for (let i = 0; i < texts.length; i += 100) {
    const chunk = texts.slice(i, i + 100);
    try {
      const res = await fetch("/api/tokenize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: chunk }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { tokens } = (await res.json()) as { tokens: Token[][] };
      chunk.forEach((t, j) => {
        cache.set(t, tokens[j]);
        failures.delete(t);
        callbacks.get(t)?.forEach((cb) => cb(tokens[j]));
      });
    } catch {
      chunk.forEach((t) => {
        failures.add(t);
        callbacks.get(t)?.forEach((cb) => cb(null));
      });
    }
    emit();
  }
}

export function fetchTokens(text: string): Promise<Token[] | null> {
  const hit = cache.get(text);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve) => {
    const list = waiting.get(text);
    if (list) list.push(resolve);
    else waiting.set(text, [resolve]);
    if (!timer) timer = setTimeout(flush, 0);
  });
}

export function primeTokens(text: string, tokens: Token[]) {
  cache.set(text, tokens);
  emit();
}

/** Forget cached tokens (e.g. after custom words change how text is segmented). */
export function clearTokenCache() {
  cache.clear();
  failures.clear();
  emit();
}

/** Tokens for a text; null while loading. `failed` is true if the server couldn't be reached. */
export function useTokens(text: string, initial?: Token[]): { tokens: Token[] | null; failed: boolean } {
  // Seed the browser cache with server-provided tokens (never on the server: the cache is per tab).
  if (initial && typeof window !== "undefined" && !cache.has(text)) cache.set(text, initial);
  const tokens = useSyncExternalStore(
    subscribe,
    () => cache.get(text) ?? null,
    () => initial ?? null,
  );
  const failed = useSyncExternalStore(
    subscribe,
    () => failures.has(text),
    () => false,
  );
  useEffect(() => {
    if (!cache.has(text)) fetchTokens(text);
  }, [text]);
  return { tokens, failed };
}
