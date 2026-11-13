/**
 * Playwright global setup: open the main pages once so the dev server compiles them before
 * the tests start (a cold compile can take longer than a test's timeouts). Only pages without
 * side effects: /session/learn would fix today's word list before the test changes settings.
 */
export default async function warmup() {
  const base = "http://localhost:3211";
  for (const path of ["/", "/session/quiz", "/session/chat", "/session/summary", "/history", "/words", "/play", "/play/cafe", "/play/cast"]) {
    try {
      await fetch(base + path, { signal: AbortSignal.timeout(120_000) });
    } catch {
      /* the test itself will report a real problem */
    }
  }
}
