import { DateTime } from "luxon";

/**
 * Splits a session interval into one segment per calendar day in the given timezone.
 * Each segment runs from its day's boundary (start of day or session start, end of day or session end).
 */
export function splitSessionAtMidnight(
  startedAt: Date,
  endedAt: Date,
  timezone: string
): Array<{ started_at: Date; ended_at: Date }> {
  const tz = timezone || "UTC";
  const start = DateTime.fromJSDate(startedAt, { zone: tz });
  const end = DateTime.fromJSDate(endedAt, { zone: tz });

  if (!start.isValid || !end.isValid || end <= start) {
    return [];
  }

  const startDay = start.startOf("day");
  const endDay = end.startOf("day");

  if (startDay.equals(endDay)) {
    return [{ started_at: startedAt, ended_at: endedAt }];
  }

  const segments: Array<{ started_at: Date; ended_at: Date }> = [];
  let currentDay = startDay;

  while (currentDay <= endDay) {
    const dayStart = currentDay.startOf("day");
    const dayEnd = currentDay.endOf("day");

    const segStart = currentDay.equals(startDay) ? start : dayStart;
    const segEnd = currentDay.equals(endDay) ? end : dayEnd;

    segments.push({
      started_at: segStart.toJSDate(),
      ended_at: segEnd.toJSDate(),
    });

    currentDay = currentDay.plus({ days: 1 });
  }

  return segments;
}
