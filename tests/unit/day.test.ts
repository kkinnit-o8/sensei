import { describe, expect, it } from "vitest";
import { addDays, dayEnd, dayStart, daysBetween, longestStreak, streak, studyDay } from "@/lib/day";

// vitest.config.mts sets TZ=Europe/Oslo (CET/CEST), which has daylight saving time.
const local = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min);

describe("study day rollover at 04:00", () => {
  it("runs the time zone the tests expect", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("Europe/Oslo");
  });

  it("counts times before 04:00 as the previous day", () => {
    expect(studyDay(local(2026, 11, 11, 3, 59))).toBe("2026-11-10");
    expect(studyDay(local(2026, 11, 11, 4, 0))).toBe("2026-11-11");
    expect(studyDay(local(2026, 11, 11, 23, 59))).toBe("2026-11-11");
    expect(studyDay(local(2026, 11, 12, 0, 30))).toBe("2026-11-11");
  });

  it("handles month and year boundaries", () => {
    expect(studyDay(local(2027, 1, 1, 2))).toBe("2026-12-31");
    expect(studyDay(local(2026, 3, 1, 1))).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("is correct across daylight saving changes", () => {
    // Spring forward: 2026-03-29 02:00 -> 03:00 in Oslo.
    expect(studyDay(local(2026, 3, 29, 3, 30))).toBe("2026-03-28");
    expect(studyDay(local(2026, 3, 29, 4, 30))).toBe("2026-03-29");
    expect(dayStart("2026-03-29").getHours()).toBe(4);
    // Fall back: 2026-10-25 03:00 -> 02:00.
    expect(studyDay(local(2026, 10, 25, 2, 30))).toBe("2026-10-24");
    expect(studyDay(local(2026, 10, 25, 4, 1))).toBe("2026-10-25");
    // A study day around DST is 23 or 25 hours long, but always ends at 04:00.
    expect(dayEnd(local(2026, 3, 28, 12)).getTime() - dayStart("2026-03-28").getTime()).toBe(23 * 3600e3);
    expect(dayEnd(local(2026, 10, 24, 12)).getTime() - dayStart("2026-10-24").getTime()).toBe(25 * 3600e3);
  });

  it("gives the end of the current study day", () => {
    expect(dayEnd(local(2026, 11, 11, 22))).toEqual(local(2026, 11, 12, 4));
    expect(dayEnd(local(2026, 11, 12, 3))).toEqual(local(2026, 11, 12, 4));
  });

  it("counts days between dates", () => {
    expect(daysBetween("2026-11-01", "2026-11-11")).toBe(10);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });
});

describe("streak", () => {
  const today = "2026-11-11";
  it("counts consecutive completed days ending today", () => {
    expect(streak(["2026-11-09", "2026-11-10", "2026-11-11"], today)).toBe(3);
  });
  it("keeps yesterday's streak while today is not done yet", () => {
    expect(streak(["2026-11-09", "2026-11-10"], today)).toBe(2);
  });
  it("breaks after a missed day", () => {
    expect(streak(["2026-11-07", "2026-11-08", "2026-11-10", "2026-11-11"], today)).toBe(2);
    expect(streak(["2026-11-08", "2026-11-09"], today)).toBe(0);
  });
  it("is zero with no completed days", () => {
    expect(streak([], today)).toBe(0);
  });
  it("works across month boundaries and finds the longest run", () => {
    expect(streak(["2026-10-30", "2026-10-31", "2026-11-01"], "2026-11-01")).toBe(3);
    expect(longestStreak(["2026-01-01", "2026-01-02", "2026-01-03", "2026-02-01", "2026-02-02"])).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});
