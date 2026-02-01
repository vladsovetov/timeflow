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
 * Formats a date for display with locale-aware day names.
 * Returns translated "Today", "Yesterday", "Tomorrow", weekday name, or formatted date.
 */
export function formatDateLabel(
  dt: DateTime,
  zone: string,
  t: TranslateFn,
  i18nLocale?: string
): string {
  const today = now(zone).startOf("day");
  const dayStart = dt.startOf("day");
  const diffDays = dayStart.diff(today, "days").days;
  const locale =
    i18nLocale && LUXON_LOCALE_MAP[i18nLocale]
      ? LUXON_LOCALE_MAP[i18nLocale]
      : "en";

  if (diffDays === 0) return t("today");
  if (diffDays === -1) return t("yesterday");
  if (diffDays === 1) return t("tomorrow");
  if (diffDays > -7 && diffDays < 0)
    return dayStart.setLocale(locale).toFormat("cccc");
  if (diffDays > 0 && diffDays < 7)
    return dayStart.setLocale(locale).toFormat("cccc");
  return dayStart.setLocale(locale).toFormat("MMM d, yyyy");
}
