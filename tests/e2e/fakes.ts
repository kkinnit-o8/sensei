import type { Page } from "@playwright/test";

/**
 * The test browser can't speak or listen, so replace both with fakes:
 * - speech is recorded in window.__spoken and "finishes" right away;
 * - a fake recognizer "hears" the next phrase from window.__toHear (or nothing).
 */
export async function installSpeechFakes(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __spoken: string[]; __toHear: string[]; SpeechRecognition: unknown; webkitSpeechRecognition: unknown };
    w.__spoken = [];
    w.__toHear = [];
    const synth = window.speechSynthesis;
    synth.speak = (u: SpeechSynthesisUtterance) => {
      w.__spoken.push(u.text);
      setTimeout(() => u.onend?.(new Event("end") as SpeechSynthesisEvent), 30);
    };
    synth.cancel = () => {};
    class FakeRecognition {
      lang = "";
      interimResults = false;
      continuous = false;
      maxAlternatives = 1;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        const heard = w.__toHear.shift();
        setTimeout(() => {
          if (heard) this.onresult?.({ resultIndex: 0, results: { length: 1, 0: Object.assign([{ transcript: heard }], { isFinal: true }) } });
          else this.onerror?.({ error: "no-speech" });
          this.onend?.();
        }, 50);
      }
      stop() {}
      abort() {}
    }
    // Newer Chromium has the unprefixed name built in; replace both.
    w.SpeechRecognition = FakeRecognition;
    w.webkitSpeechRecognition = FakeRecognition;
  });
}

export const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
