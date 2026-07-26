import {
  addDays,
  format,
  nextMonday,
  parse,
  previousMonday,
  startOfWeek,
} from "date-fns";

const WEEK_RANGE_REGEX =
  /(?<startMonth>[A-Za-z]+)\s+(?<startDay>\d{1,2})\s*[–-]\s*(?:(?<endMonth>[A-Za-z]+)\s+)?(?<endDay>\d{1,2}),?\s+(?<year>\d{4})/;

export function currentWeekStart(now = new Date()): Date {
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  return monday;
}

export function nextCrumblWeekStart(now = new Date()): Date {
  const day = now.getDay();
  if (day === 1) return startOfWeek(now, { weekStartsOn: 1 });
  return nextMonday(now);
}

export function weekEnd(startDate: Date): Date {
  return addDays(startDate, 6);
}

export function formatWeekLabel(startDate: Date): string {
  const end = weekEnd(startDate);
  const sameMonth = startDate.getMonth() === end.getMonth();
  const startStr = format(startDate, "MMM d");
  const endStr = sameMonth ? format(end, "d, yyyy") : format(end, "MMM d, yyyy");
  return `${startStr} – ${endStr}`;
}

export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function parseWeekRange(input: string, fallbackYear?: number):
  | { start: Date; end: Date }
  | null {
  const match = input.match(WEEK_RANGE_REGEX);
  if (!match?.groups) {
    const yearFallback = fallbackYear ?? new Date().getFullYear();
    const simple = input.match(/([A-Za-z]+)\s+(\d{1,2})\s*[–-]\s*(\d{1,2})/);
    if (simple) {
      const start = parse(
        `${simple[1]} ${simple[2]} ${yearFallback}`,
        "MMMM d yyyy",
        new Date(),
      );
      const end = parse(
        `${simple[1]} ${simple[3]} ${yearFallback}`,
        "MMMM d yyyy",
        new Date(),
      );
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return { start: alignToMonday(start), end: addDays(alignToMonday(start), 6) };
      }
    }
    return null;
  }
  const { startMonth, startDay, endMonth, endDay, year } = match.groups;
  const start = parse(
    `${startMonth} ${startDay} ${year}`,
    "MMMM d yyyy",
    new Date(),
  );
  const end = parse(
    `${endMonth ?? startMonth} ${endDay} ${year}`,
    "MMMM d yyyy",
    new Date(),
  );
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const aligned = alignToMonday(start);
  return { start: aligned, end: addDays(aligned, 6) };
}

function alignToMonday(d: Date): Date {
  const day = d.getDay();
  if (day === 1) return d;
  return previousMonday(addDays(d, 1));
}
