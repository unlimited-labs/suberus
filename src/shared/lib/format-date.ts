import { format, formatDistanceToNow, isValid } from "date-fns";

const DATE_FORMAT_VALUES = [
	"DD.MM.YYYY",
	"DD/MM/YYYY",
	"MM/DD/YYYY",
	"YYYY-MM-DD",
	"DD-MM-YYYY",
	"D MMM YYYY",
	"MMM D, YYYY",
	"D MMMM YYYY",
	"MMMM D, YYYY",
] as const;

export type DateFormatValue = (typeof DATE_FORMAT_VALUES)[number];

// Map the stored (moment-style) format values to date-fns patterns.
// Note: date-fns tokens are case-sensitive (DD = day-of-year, YYYY = week-year),
// so day-of-month is `dd` and calendar year is `yyyy`.
const DATE_FORMAT_PATTERNS: Record<DateFormatValue, string> = {
	"DD.MM.YYYY": "dd.MM.yyyy",
	"DD/MM/YYYY": "dd/MM/yyyy",
	"MM/DD/YYYY": "MM/dd/yyyy",
	"YYYY-MM-DD": "yyyy-MM-dd",
	"DD-MM-YYYY": "dd-MM-yyyy",
	"D MMM YYYY": "d MMM yyyy",
	"MMM D, YYYY": "MMM d, yyyy",
	"D MMMM YYYY": "d MMMM yyyy",
	"MMMM D, YYYY": "MMMM d, yyyy",
};

export function getDateFormats(
	now = new Date(),
): Array<{ value: DateFormatValue; label: string }> {
	return DATE_FORMAT_VALUES.map((value) => ({
		value,
		label:
			value === "YYYY-MM-DD"
				? `${formatDate(now, value)} (ISO)`
				: formatDate(now, value),
	}));
}

function toDate(date: Date | string): Date {
	return date instanceof Date ? date : new Date(date);
}

export function formatDate(date: Date | string, dateFormat: string): string {
	const d = toDate(date);
	if (!isValid(d)) return "";
	const pattern =
		DATE_FORMAT_PATTERNS[dateFormat as DateFormatValue] ??
		DATE_FORMAT_PATTERNS["DD.MM.YYYY"];
	return format(d, pattern);
}

export function formatTime(date: Date | string, timeFormat: string): string {
	const d = toDate(date);
	if (!isValid(d)) return "";
	return format(d, timeFormat === "12h" ? "h:mm a" : "HH:mm");
}

export function formatDateTime(
	date: Date | string,
	dateFormat: string,
	timeFormat: string,
): string {
	const datePart = formatDate(date, dateFormat);
	const timePart = formatTime(date, timeFormat);
	if (!datePart) return "";
	return `${datePart}, ${timePart}`;
}

export function formatRelativeTime(date: Date | string): string {
	const d = toDate(date);
	if (!isValid(d)) return "";
	return formatDistanceToNow(d, { addSuffix: true });
}

/** Compact duration label from a minute count, e.g. "0 min", "45 min", "2h", "2h 30m". */
export function formatDurationShort(min: number): string {
	if (min <= 0) return "0 min";
	const h = Math.floor(min / 60);
	const m = Math.round(min % 60);
	if (h === 0) return `${m} min`;
	if (m === 0) return `${h}h`;
	return `${h}h ${m}m`;
}
