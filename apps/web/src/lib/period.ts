/** Calendar helpers for Colombia (America/Bogota, UTC−5 year-round). */

export const BOGOTA_OFFSET = "-05:00";

export type SalesPeriod = "today" | "yesterday" | "week";

export type DayRange = {
  from: string;
  to: string;
  start: Date;
  end: Date;
};

const bogotaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Returns `YYYY-MM-DD` for the instant in Bogota. */
export function bogotaDateString(date: Date = new Date()): string {
  return bogotaDateFormatter.format(date);
}

export function parseBogotaDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00${BOGOTA_OFFSET}`);
}

export function addDays(dateStr: string, days: number): string {
  const base = parseBogotaDay(dateStr);
  base.setTime(base.getTime() + days * 86_400_000);
  return bogotaDateString(base);
}

/** Monday of the week that contains `dateStr` (ISO: Mon=0). */
export function weekMonday(dateStr: string): string {
  const start = parseBogotaDay(dateStr);
  // getUTCDay with fixed offset: use local parts via formatter weekday
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    weekday: "short",
  }).format(start);
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offset = map[weekday] ?? 0;
  return addDays(dateStr, -offset);
}

export function dayRange(dateStr: string): DayRange {
  const start = parseBogotaDay(dateStr);
  const end = parseBogotaDay(addDays(dateStr, 1));
  return { from: dateStr, to: dateStr, start, end };
}

export function periodRange(
  period: SalesPeriod,
  now: Date = new Date(),
): DayRange {
  const today = bogotaDateString(now);
  if (period === "today") {
    return dayRange(today);
  }
  if (period === "yesterday") {
    return dayRange(addDays(today, -1));
  }
  const monday = weekMonday(today);
  const sunday = addDays(monday, 6);
  return {
    from: monday,
    to: sunday,
    start: parseBogotaDay(monday),
    end: parseBogotaDay(addDays(sunday, 1)),
  };
}

export function isInRange(iso: string, range: DayRange): boolean {
  const t = new Date(iso).getTime();
  return t >= range.start.getTime() && t < range.end.getTime();
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function bogotaHour(date: Date = new Date()): number {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      hour: "numeric",
      hour12: false,
    }).format(date),
  );
  // en-US hour12:false can yield "24" for midnight in some engines
  return hour === 24 ? 0 : hour;
}
