import { TZDate } from "@date-fns/tz";
import { endOfDay } from "date-fns";

/**
 * Inclusive cutoff for a date-only deadline: the end (23:59:59.999) of the
 * deadline's calendar day in `timezone`. Empty `timezone` falls back to UTC, so
 * the result is independent of the host/Docker process timezone.
 *
 * `deadline` is the stored `YYYY-MM-DD` string; `.slice(0, 10)` tolerates a
 * trailing time component (e.g. `2026-04-15T00:00:00Z`).
 */
export function deadlineCutoff(deadline: string, timezone: string): Date {
	const tz = timezone || "UTC";
	const [year, month, day] = deadline.slice(0, 10).split("-").map(Number);
	return endOfDay(new TZDate(year, month - 1, day, tz));
}

export function isDeadlinePassed(
	deadline: string,
	timezone: string,
	now: Date,
): boolean {
	return now.getTime() > deadlineCutoff(deadline, timezone).getTime();
}
