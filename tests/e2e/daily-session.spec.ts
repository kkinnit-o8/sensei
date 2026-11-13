import { expect, test, type Page } from "@playwright/test";

type Quiz = {
  questions: { word: string; type: string; options: string[] }[];
  words: Record<string, { meaning: string }>;
  queue: number[];
};

/**
 * The test browser can't speak or listen, so replace both with fakes:
 * - speech is recorded in window.__spoken and "finishes" right away;
 * - a fake recognizer "hears" the next phrase from window.__toHear (or nothing).
 */
test.beforeEach(async ({ page }) => {
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
});

const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);

async function currentQuiz(page: Page): Promise<Quiz> {
  // "start" returns today's existing quiz without changing it.
  const res = await page.request.post("/api/session/quiz", { data: { action: "start", audio: false } });
  return (await res.json()).quiz as Quiz;
}

test("a full daily session: review, learn, quiz, conversation, summary", async ({ page }) => {
  // Keep it short: 3 new words and 2 exchanges.
  await page.request.post("/api/settings", { data: { newWordsPerDay: 3, exchangesPerDay: 2, theme: "light" } });

  // Home: five steps; nothing to review on day one.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Today's session" })).toBeVisible();
  const steps = page.locator("ol > li");
  await expect(steps).toHaveCount(5);
  await expect(steps.nth(0)).toContainText("Skipped");
  await expect(page.getByLabel("Streak: 0 days")).toBeVisible();
  await page.getByRole("link", { name: "Start", exact: true }).click();

  // Learn: three words in frequency order.
  await expect(page).toHaveURL(/\/session\/learn$/);
  await expect(page.getByText("New word 1 of 3")).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: /Got it/ }).click();
  await expect(page.getByText("You met 3 new words today")).toBeVisible();

  // Leaving and coming back resumes where we were.
  await page.goto("/");
  await expect(steps.nth(1)).toContainText("Done");
  await page.getByRole("link", { name: "Continue", exact: true }).click();

  // Quick check: get the first question wrong, the rest right.
  await expect(page).toHaveURL(/\/session\/quiz$/);
  await expect(page.getByText(/What does this mean\?|Which word means this\?|Which word is this\?/)).toBeVisible();
  let wrongDone = false;
  for (let guard = 0; guard < 12; guard++) {
    const quiz = await currentQuiz(page);
    if (quiz.queue.length === 0) break;
    const q = quiz.questions[quiz.queue[0]];
    // The test browser has no Chinese voice, so listening questions show pinyin to read.
    if (q.type === "audio") await expect(page.getByText("Which word is this?")).toBeVisible();
    const choice = wrongDone ? q.word : q.options.find((o) => o !== q.word)!;
    const label = q.type === "meaning" ? quiz.words[choice].meaning : choice;
    await page.locator("button", { hasText: label }).first().click();
    if (!wrongDone) {
      await expect(page.getByText("Not quite.")).toBeVisible();
      await page.getByRole("button", { name: /^Next/ }).click();
      wrongDone = true;
    } else {
      await expect(page.getByText("Correct!")).toBeVisible();
      await expect(page.getByText("Correct!")).toBeHidden();
    }
  }
  await expect(page.getByText("right on the first try")).toBeVisible();
  await expect(page.getByText("2 / 3")).toBeVisible();
  await page.getByRole("link", { name: "Next: conversation" }).click();

  // Conversation with the (mocked) teacher.
  await expect(page).toHaveURL(/\/session\/chat$/);
  await page.getByRole("button", { name: "food and cooking" }).click();
  await page.getByRole("button", { name: "Start the conversation" }).click();
  await expect(page.getByText("Topic: food and cooking")).toBeVisible();
  // The teacher's opening is read aloud without pressing anything.
  await expect.poll(() => spoken(page)).toContain("你好！你今天吃了什么？");

  // The core rule: 了 (learned) in characters, words not learned yet in pinyin.
  const opening = page.locator("li").filter({ hasText: "jīntiān" }).first();
  await expect(opening).toContainText("了");
  await expect(opening).toContainText("shénme");
  await expect(opening).not.toContainText("今天");

  // Silent mode (header toggle) hides every audio button; turning it off brings them back.
  const playButtons = page.getByRole("button", { name: "Play audio" }).filter({ visible: true });
  await expect(playButtons.first()).toBeVisible();
  await page.getByRole("button", { name: "Silent mode" }).click();
  await expect(playButtons).toHaveCount(0);
  await page.getByRole("button", { name: "Silent mode" }).click();
  await expect(playButtons.first()).toBeVisible();

  // Tap a word: the popup explains it.
  await opening.getByRole("button", { name: "jīntiān" }).click();
  await expect(page.getByRole("dialog")).toContainText("today");
  await page.getByRole("button", { name: "Close" }).click();

  const input = page.getByLabel("Your message");
  await input.fill("我吃米饭了");
  await input.press("Enter");
  await expect(page.getByText("Put 了 right after the verb.")).toBeVisible();
  await page.getByRole("button", { name: "Translate" }).last().click();
  await expect(page.getByText("Very good! Do you like drinking tea?")).toBeVisible();
  await page.getByRole("button", { name: "Hint" }).last().click();
  await expect(page.getByText("You could say:")).toBeVisible();

  // Queue a word the teacher used.
  const wordsPanel = page.locator("details", { hasText: "Words from chat" });
  await wordsPanel.getByRole("button", { name: "Learn tomorrow" }).first().click();
  await expect(wordsPanel.getByText("Queued ✓")).toBeVisible();

  await input.fill("wo3 xi3huan1 he1 cha2");
  await input.press("Enter");
  await expect(page.getByText("That's today's 2 exchanges.")).toBeVisible();
  await page.getByRole("link", { name: "See today's summary" }).click();

  // Summary completes the day. (Next keeps the previous page mounted but hidden, so only
  // look at visible elements.)
  await expect(page).toHaveURL(/\/session\/summary$/);
  const visible = (text: string) => page.getByText(text).filter({ visible: true });
  await expect(visible("Day complete!")).toBeVisible();
  await expect(visible("Words learned today")).toBeVisible();
  await expect(visible("Put 了 right after the verb.")).toBeVisible();
  await expect(visible("Today's words in the conversation")).toBeVisible();
  await expect(page.getByLabel("1 day streak")).toBeVisible();

  // Home shows the finished day and the streak.
  await page.goto("/");
  await expect(visible("All done for today.")).toBeVisible();
  await expect(page.getByLabel("Streak: 1 day")).toBeVisible();

  // The conversation is saved for later.
  await page.goto("/history");
  await expect(visible("food and cooking")).toBeVisible();
});

test("voice: the mic writes for you, and speaking mode is hands-free", async ({ page }) => {
  await page.goto("/session/chat");
  // Continue today's conversation (or start one if this test runs alone).
  const start = page.getByRole("button", { name: "Start the conversation" });
  if (await start.isVisible().catch(() => false)) await start.click();
  const keepGoing = page.getByRole("button", { name: "Keep chatting" });
  if (await keepGoing.isVisible().catch(() => false)) await keepGoing.click();
  const input = page.getByLabel("Your message");
  await expect(input).toBeVisible();

  // Mic button: speech goes into the text box, to check before sending.
  await page.evaluate(() => (window as unknown as { __toHear: string[] }).__toHear.push("我喜欢喝茶"));
  await page.getByRole("button", { name: "Speak instead of typing" }).click();
  await expect(input).toHaveValue("我喜欢喝茶");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(input).toHaveValue("");
  // The reply is read aloud as soon as it arrives.
  const before = (await spoken(page)).length;
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(before);

  // Speaking mode: listens right away, sends what it hears, reads the reply, listens again.
  await page.evaluate(() => (window as unknown as { __toHear: string[] }).__toHear.push("我今天在家"));
  const count = (await spoken(page)).length;
  await page.getByRole("button", { name: /Speaking mode/ }).click();
  await expect.poll(async () => (await spoken(page)).length, { timeout: 20_000 }).toBeGreaterThan(count);
  const view = await (await page.request.post("/api/chat", { data: {} })).json();
  const texts = view.view.messages.map((m: { text: string }) => m.text);
  expect(texts).toContain("我今天在家");
  // After the reply it listened again; the fake heard nothing this time.
  await expect(page.getByText("I didn't hear anything.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /Speaking mode/ }).click();
});
