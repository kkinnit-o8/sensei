import { describe, expect, it } from "vitest";
import { formatInterval, isDue, newCard, previewIntervals, rate } from "@/lib/srs";
import { addDays, dayStart } from "@/lib/day";

const at = (day: string, hour = 10) => new Date(dayStart(day).getTime() + (hour - 4) * 3600e3);

describe("review scheduling (FSRS, whole days)", () => {
  it("a new card is due on the day it is created and every rating moves it to a later day", () => {
    const now = at("2026-11-11");
    const card = newCard(now);
    expect(isDue(card, now)).toBe(true);
    const iv = previewIntervals(card, now);
    expect(iv[1]).toBeGreaterThanOrEqual(1);
    expect(iv[1]).toBeLessThanOrEqual(iv[2]);
    expect(iv[2]).toBeLessThanOrEqual(iv[3]);
    expect(iv[3]).toBeLessThan(iv[4]);
  });

  it("uses no minute-level learning steps: Again means tomorrow, not in 1 minute", () => {
    const now = at("2026-11-11");
    const again = rate(newCard(now), 1, now, false);
    expect(isDue(again, now)).toBe(false);
    expect(isDue(again, at("2026-11-12"))).toBe(true);
    expect(again.state).toBe(2); // Review
  });

  it("grows intervals with repeated Good ratings", () => {
    let now = at("2026-11-11");
    let card = rate(newCard(now), 3, now, false);
    const intervals: number[] = [card.scheduledDays];
    for (let i = 0; i < 4; i++) {
      now = new Date(card.due);
      card = rate(card, 3, now, false);
      intervals.push(card.scheduledDays);
    }
    for (let i = 1; i < intervals.length; i++) expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
  });

  it("a lapse (Again on a mature card) shortens the interval and counts a lapse", () => {
    let now = at("2026-11-11");
    let card = rate(newCard(now), 4, now, false);
    now = new Date(card.due);
    card = rate(card, 3, now, false);
    const before = card.scheduledDays;
    now = new Date(card.due);
    card = rate(card, 1, now, false);
    expect(card.lapses).toBe(1);
    expect(card.scheduledDays).toBeLessThan(before);
  });

  it("treats a card due later today (before 04:00 tomorrow) as due today", () => {
    const now = at("2026-11-11", 9);
    expect(isDue({ due: at("2026-11-11", 23).toISOString() }, now)).toBe(true);
    expect(isDue({ due: at("2026-11-12", 3.5).toISOString() }, now)).toBe(true);
    expect(isDue({ due: at(addDays("2026-11-11", 1), 5).toISOString() }, now)).toBe(false);
  });

  it("formats intervals", () => {
    expect(formatInterval(0)).toBe("<1d");
    expect(formatInterval(3)).toBe("3d");
    expect(formatInterval(45)).toBe("2mo");
    expect(formatInterval(400)).toBe("1.1y");
  });
});
