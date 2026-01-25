import { DateTime } from "luxon";
import * as Localization from "expo-localization";

/**
 * Gets the user's timezone from device settings
 * Falls back to system timezone if unavailable
 */
export function getUserTimezone(): string {
  try {
    const timezone = Localization.getCalendars()[0]?.timeZone;
    return timezone || DateTime.now().zoneName || "UTC";
  } catch {
    return DateTime.now().zoneName || "UTC";
  }
}

/**
 * Creates a DateTime instance from an ISO string
 * Parses the ISO string (which may be in UTC) and converts it to the user's timezone
 */
export function parseDateTime(isoString: string): DateTime {
  // Parse the ISO string (which may include timezone info)
  // Then convert to user's timezone
  return DateTime.fromISO(isoString).setZone(getUserTimezone());
}

/**
 * Gets the current DateTime in the user's timezone
 */
export function now(): DateTime {
  return DateTime.now().setZone(getUserTimezone());
}
