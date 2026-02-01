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
