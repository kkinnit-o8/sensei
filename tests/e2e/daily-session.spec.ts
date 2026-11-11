import { expect, test, type Page } from "@playwright/test";

type Quiz = {
  questions: { word: string; type: string; options: string[] }[];
  words: Record<string, { meaning: string }>;
  queue: number[];
};

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
  await expect(page.getByText(/What does this mean\?|Which word means this\?/)).toBeVisible();
  let wrongDone = false;
  for (let guard = 0; guard < 12; guard++) {
    const quiz = await currentQuiz(page);
    if (quiz.queue.length === 0) break;
    const q = quiz.questions[quiz.queue[0]];
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

  // The core rule: 了 (learned) in characters, words not learned yet in pinyin.
  const opening = page.locator("li").filter({ hasText: "jīntiān" }).first();
  await expect(opening).toContainText("了");
  await expect(opening).toContainText("shénme");
  await expect(opening).not.toContainText("今天");

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
