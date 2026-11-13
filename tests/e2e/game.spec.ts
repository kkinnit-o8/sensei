import { expect, test } from "@playwright/test";
import { installSpeechFakes, spoken } from "./fakes";

test.beforeEach(async ({ page }) => {
  await installSpeechFakes(page);
});

test("City Adventures: play the café mission to three stars", async ({ page }) => {
  await page.goto("/play");
  await expect(page.getByRole("heading", { name: "City Adventures" })).toBeVisible();
  for (const name of ["Café", "Convenience store", "Restaurant", "Train station", "Street market"]) {
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
  await page.getByRole("link", { name: /Café/ }).click();

  // Briefing: pick the mission, see goals and useful words.
  await expect(page).toHaveURL(/\/play\/cafe$/);
  await page.getByRole("tab", { name: /Coffee for two/ }).click();
  await expect(page.getByRole("heading", { name: "Coffee for two" })).toBeVisible();
  await expect(page.getByText("Ask Měiměi what she wants")).toBeVisible();
  await expect(page.getByText("奶茶").first()).toBeVisible();
  await page.getByRole("button", { name: "Start the mission" }).click();

  // The barista greets you; the line is read aloud and shown with the renderer.
  const goals = page.getByRole("list", { name: "Mission goals" });
  await expect(goals).toBeVisible();
  await expect.poll(() => spoken(page)).toContain("你好！欢迎光临！你要什么？");
  await expect(page.getByRole("img", { name: /小林 Xiǎo Lín/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /美美 Měiměi/ })).toBeVisible();

  const input = page.getByLabel("Your message");
  const say = async (text: string, last = false) => {
    await input.fill(text);
    await input.press("Enter");
    if (last) return; // the mission ends and the input disappears
    await expect(input).toHaveValue("");
    await expect(input).toBeEnabled();
  };

  // English costs a heart.
  await expect(page.getByLabel("Patience: 3 of 3 hearts")).toBeVisible();
  await say("I want a coffee please");
  await expect(page.getByText(/doesn't understand English/)).toBeVisible();
  await expect(page.getByLabel("Patience: 2 of 3 hearts")).toBeVisible();

  // Each message in Chinese completes a goal (mock game master); both characters can answer.
  await say("我要咖啡");
  await expect(goals.getByText("(done)")).toHaveCount(1);
  await expect(page.getByText("Nice! Just add 一杯.")).toBeVisible();
  await expect.poll(() => spoken(page)).toContain("我也要喝茶！");
  await say("美美，你要什么？");
  await say("她要冰奶茶");
  await say("wo3 men yi2 gong4 duo1shao qian2?", true);

  // Mission complete: lost one heart and used no hints, so three stars.
  await expect(page.getByText("Mission complete")).toBeVisible();
  await expect(page.getByLabel("3 of 3 stars").first()).toBeVisible();
  await expect(input).toHaveCount(0);

  // The scene list shows the result.
  await page.goto("/play");
  await expect(page.getByLabel("3 of 6 stars")).toBeVisible();
});

test("City Adventures: the cast gallery shows every character", async ({ page }) => {
  await page.goto("/play/cast");
  for (const name of ["小林", "美美", "王叔叔", "陈阿姨", "小明", "李先生", "张奶奶"]) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "annoyed" }).click();
  await expect(page.getByRole("img", { name: "Wáng shūshu" })).toBeVisible();
});
