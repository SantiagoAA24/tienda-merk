import { describe, expect, it } from "vitest";

import {
  addDays,
  bogotaDateString,
  dayRange,
  greetingForHour,
  isInRange,
  periodRange,
  weekMonday,
} from "./period";

describe("period helpers", () => {
  it("formats Bogota calendar dates", () => {
    // 2026-11-22 02:00 UTC = 2026-11-21 21:00 Bogota
    expect(bogotaDateString(new Date("2026-11-22T02:00:00Z"))).toBe(
      "2026-11-21",
    );
  });

  it("builds day and week ranges", () => {
    const day = dayRange("2026-11-21");
    expect(day.from).toBe("2026-11-21");
    expect(day.start.toISOString()).toBe("2026-11-21T05:00:00.000Z");
    expect(day.end.toISOString()).toBe("2026-11-22T05:00:00.000Z");

    expect(weekMonday("2026-11-21")).toBe("2026-11-16");
    const week = periodRange(
      "week",
      new Date("2026-11-21T15:00:00-05:00"),
    );
    expect(week.from).toBe("2026-11-16");
    expect(week.to).toBe("2026-11-22");
  });

  it("detects membership in a range", () => {
    const range = dayRange("2026-11-21");
    expect(isInRange("2026-11-21T20:00:00-05:00", range)).toBe(true);
    expect(isInRange("2026-11-22T00:00:00-05:00", range)).toBe(false);
  });

  it("adds days and greets by hour", () => {
    expect(addDays("2026-11-21", -1)).toBe("2026-11-20");
    expect(greetingForHour(8)).toBe("Buenos días");
    expect(greetingForHour(15)).toBe("Buenas tardes");
    expect(greetingForHour(21)).toBe("Buenas noches");
  });
});
