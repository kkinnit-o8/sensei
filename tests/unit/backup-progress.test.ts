import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { setDbForTests, getDb } from "@/lib/server/db";
import { saveSettings, getSettings } from "@/lib/server/settings";
import { exportAll, importAll } from "@/lib/server/backup";
import { getOrCreateDay, learnPlan, markLearned } from "@/lib/server/session";
import { progressStats } from "@/lib/server/progress";
import { dayStart } from "@/lib/day";

const now = new Date(dayStart("2026-11-11").getTime() + 6 * 3600e3);

beforeEach(() => setDbForTests(new Database(":memory:")));

describe("backup", () => {
  it("round-trips all progress", () => {
    saveSettings({ newWordsPerDay: 7, theme: "dark" });
    for (const w of learnPlan(getOrCreateDay(now))) markLearned(w, now);
    const backup = JSON.parse(JSON.stringify(exportAll(now)));
    expect(backup.app).toBe("chinese-teacher");
    expect(backup.tables.learned).toHaveLength(7);

    setDbForTests(new Database(":memory:"));
    expect(getSettings().newWordsPerDay).toBe(10);
    const counts = importAll(backup);
    expect(counts.learned).toBe(7);
    expect(getSettings()).toMatchObject({ newWordsPerDay: 7, theme: "dark" });
    expect((getDb().prepare("SELECT COUNT(*) n FROM cards").get() as { n: number }).n).toBe(7);
  });

  it("rejects files that are not backups and leaves data alone", () => {
    saveSettings({ newWordsPerDay: 5 });
    expect(() => importAll({ hello: 1 })).toThrow(/not a Chinese Teacher backup/);
    expect(() => importAll({ app: "chinese-teacher", format: 1, schemaVersion: 999, tables: {} })).toThrow(/newer version/);
    expect(getSettings().newWordsPerDay).toBe(5);
  });

  it("rolls back a broken import", () => {
    saveSettings({ newWordsPerDay: 5 });
    const bad = { app: "chinese-teacher", format: 1, schemaVersion: 1, tables: { settings: [{ key: "x", value: "1" }], learned: "oops" } };
    expect(() => importAll(bad)).toThrow();
    expect(getSettings().newWordsPerDay).toBe(5);
  });
});

describe("progress", () => {
  it("estimates reading coverage from word frequencies", () => {
    const before = progressStats(now);
    expect(before.coverage).toBe(0);
    expect(before.bankCoverage).toBeGreaterThan(0.6);
    expect(before.bankCoverage).toBeLessThan(0.95);
    for (const w of learnPlan(getOrCreateDay(now))) markLearned(w, now);
    const after = progressStats(now);
    // The ten most frequent words (的, 了, 我, 是, ...) already cover a big share of text.
    expect(after.coverage).toBeGreaterThan(0.1);
    expect(after.learnedCount).toBe(10);
    expect(after.activity.at(-1)).toMatchObject({ day: "2026-11-11", learned: 10 });
    expect(after.learnedByHsk[0].learned).toBeGreaterThan(0);
  });
});
