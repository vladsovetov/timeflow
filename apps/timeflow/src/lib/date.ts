import { DateTime } from "luxon";
import * as Localization from "expo-localization";

/**
 * Gets the user's timezone from device settings
 * Falls back to system timezone if unavailable
 */
export function getDeviceTimezone(): string {
  try {
    const timezone = Localization.getCalendars()[0]?.timeZone;
    return timezone || DateTime.now().zoneName || "UTC";
  } catch {
    return DateTime.now().zoneName || "UTC";
  }
}

/**
 * Resolves timezone: uses provided zone or falls back to device timezone
 */
function resolveZone(zone?: string): string {
  return zone ?? getDeviceTimezone();
}

/**
 * Creates a DateTime instance from an ISO string
 * Parses the ISO string (which may be in UTC) and converts it to the given timezone (or device timezone)
 */
export function parseDateTime(isoString: string, zone?: string): DateTime {
  return DateTime.fromISO(isoString).setZone(resolveZone(zone));
}

/**
 * Gets the current DateTime in the given timezone (or device timezone)
 */
export function now(zone?: string): DateTime {
  return DateTime.now().setZone(resolveZone(zone));
}

const LUXON_LOCALE_MAP: Record<string, string> = {
  en: "en",
  uk: "uk",
  ru: "ru",
};

type TranslateFn = (key: string) => string;

/**
 * Formats a date for display in the navigation header.
 * Always returns the month's day and month name (e.g. "1 February"), plus year if not current year.
 */
export function formatDateLabel(
  dt: DateTime,
  zone: string,
  _t: TranslateFn,
  i18nLocale?: string
): string {
  const dayStart = dt.startOf("day");
  const locale =
    i18nLocale && LUXON_LOCALE_MAP[i18nLocale]
      ? LUXON_LOCALE_MAP[i18nLocale]
      : "en";
  const currentYear = now(zone).year;
  const format = dayStart.year !== currentYear ? "d MMMM yyyy" : "d MMMM";
  return dayStart.setLocale(locale).toFormat(format);
}

/**
 * Splits duration in seconds into HH:MM: and ss for display (seconds de-emphasized).
 * Always uses HH:MM:ss format, e.g. 00:05:30 for 5m 30s.
 */
export function formatDurationParts(seconds: number): { main: string; seconds: string } {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const main = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:`;
  const secondsPart = secs.toString().padStart(2, "0");
  return { main, seconds: secondsPart };
}
